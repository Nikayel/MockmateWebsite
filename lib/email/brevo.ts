/**
 * Brevo (Sendinblue) Email Service
 *
 * Handles all transactional email sending for CodeSparring.
 * Based on Brevo's Node.js SDK: @getbrevo/brevo
 */

import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  ContactsApi,
  ContactsApiApiKeys,
  SendSmtpEmail,
  CreateContact,
} from "@getbrevo/brevo";

// Lazy-initialized API instances with API key configured
let emailApi: TransactionalEmailsApi | null = null;
let contactsApi: ContactsApi | null = null;

function getEmailApi(): TransactionalEmailsApi {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  if (!emailApi) {
    emailApi = new TransactionalEmailsApi();
    // Set API key using the SDK's setApiKey method
    emailApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);
    console.log("[Brevo] Email API initialized successfully");
  }
  return emailApi;
}

function getContactsApi(): ContactsApi {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  if (!contactsApi) {
    contactsApi = new ContactsApi();
    // Set API key using the SDK's setApiKey method
    contactsApi.setApiKey(ContactsApiApiKeys.apiKey, apiKey);
    console.log("[Brevo] Contacts API initialized successfully");
  }
  return contactsApi;
}

// Email sender configuration
// Using personal name improves inbox placement (Primary vs Promotions)
// Research shows emails from "Name from Company" land in Primary more often
const DEFAULT_SENDER = {
  name: "Nikayel from CodeSparring",
  email: "nikayel@codesparring.dev"
};

// Types
export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: { name: string; email: string };
  replyTo?: { email: string; name?: string };
  tags?: string[];
  params?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Helper to wait for a specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a transactional email via Brevo with retry logic
 * Retries up to 3 times with exponential backoff for transient failures
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  // Check if API key is configured
  if (!process.env.BREVO_API_KEY) {
    console.warn("[Brevo] API key not configured, skipping email send");
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 1000;
  let lastError: any;

  // Get API instance - this will configure authentication
  let api: TransactionalEmailsApi;
  try {
    api = getEmailApi();
  } catch (error: any) {
    console.error("[Brevo] Failed to initialize API:", error?.message || error);
    return { success: false, error: error?.message || "Failed to initialize email API" };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = new SendSmtpEmail();
      message.subject = options.subject;
      message.htmlContent = options.htmlContent;
      message.textContent = options.textContent;
      message.sender = options.sender || DEFAULT_SENDER;
      message.to = options.to.map(r => ({ email: r.email, name: r.name }));

      if (options.replyTo) {
        message.replyTo = options.replyTo;
      }

      if (options.tags) {
        message.tags = options.tags;
      }

      if (options.params) {
        message.params = options.params;
      }

      const result = await api.sendTransacEmail(message);

      console.log(`[Brevo] Email sent successfully to ${options.to.map(r => r.email).join(", ")}`);

      return {
        success: true,
        messageId: (result.body as any)?.messageId || "sent"
      };
    } catch (error: any) {
      lastError = error;
      const statusCode = error?.statusCode || error?.response?.statusCode;

      // Only retry on transient errors (5xx, network issues, rate limits)
      const isRetryable =
        statusCode >= 500 ||
        statusCode === 429 ||
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ENOTFOUND';

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Brevo] Transient error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          error?.body?.message || error?.message);
        await sleep(delayMs);
        continue;
      }

      // Non-retryable error or max retries reached
      break;
    }
  }

  console.error("[Brevo] Failed to send email after retries:", lastError?.body || lastError?.message || lastError);
  return {
    success: false,
    error: lastError?.body?.message || lastError?.message || "Unknown error"
  };
}

/**
 * Add or update a contact in Brevo
 */
export async function upsertContact(
  email: string,
  attributes?: Record<string, any>,
  listIds?: number[]
): Promise<boolean> {
  if (!process.env.BREVO_API_KEY) {
    console.warn("[Brevo] API key not configured, skipping contact upsert");
    return false;
  }

  try {
    const api = getContactsApi();

    const contact = new CreateContact();
    contact.email = email;
    contact.updateEnabled = true; // Update if exists

    if (attributes) {
      contact.attributes = attributes;
    }

    if (listIds && listIds.length > 0) {
      contact.listIds = listIds;
    }

    await api.createContact(contact);
    console.log(`[Brevo] Contact upserted: ${email}`);
    return true;
  } catch (error: any) {
    // Ignore "contact already exists" errors when updateEnabled is true
    if (error?.body?.code === "duplicate_parameter") {
      return true;
    }
    console.error("[Brevo] Failed to upsert contact:", error?.body || error?.message || error);
    return false;
  }
}

/**
 * Calculate estimated memory retention based on Ebbinghaus forgetting curve
 * R = e^(-t/S) where t is time in days and S is memory strength
 *
 * @param daysSinceLastPractice - Days since the topic was last practiced
 * @param performanceScore - Last performance score (0-100)
 * @returns Estimated retention percentage (0-100)
 */
export function calculateRetention(daysSinceLastPractice: number, performanceScore: number = 70): number {
  // Memory strength factor based on performance (higher score = stronger memory)
  // S ranges from 3 (weak) to 15 (strong)
  const memoryStrength = 3 + (performanceScore / 100) * 12;

  // Apply forgetting curve formula
  const retention = Math.exp(-daysSinceLastPractice / memoryStrength) * 100;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(retention)));
}

/**
 * Get optimal hours for sending emails based on user timezone
 * Returns hours in user's local time that are best for engagement
 */
export function getOptimalSendHours(): number[] {
  // Based on research: 9-11 AM, 2-4 PM, 7-8 PM are optimal
  return [9, 10, 11, 14, 15, 16, 19, 20];
}

/**
 * Check if current hour is optimal for sending emails
 */
export function isOptimalSendTime(userTimezoneOffset: number = 0): boolean {
  const now = new Date();
  // Adjust for user timezone
  const userHour = (now.getUTCHours() + userTimezoneOffset + 24) % 24;
  return getOptimalSendHours().includes(userHour);
}
