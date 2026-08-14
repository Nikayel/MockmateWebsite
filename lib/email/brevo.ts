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
} from "@getbrevo/brevo"
import { logger } from "@/lib/logger"

// Lazy-initialized API instances with API key configured
let emailApi: TransactionalEmailsApi | null = null
let contactsApi: ContactsApi | null = null

function getEmailApi(): TransactionalEmailsApi {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured")
  }

  if (!emailApi) {
    emailApi = new TransactionalEmailsApi()
    // Set API key using the SDK's setApiKey method
    emailApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey)
    logger.debug("Brevo Email API initialized")
  }
  return emailApi
}

function getContactsApi(): ContactsApi {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured")
  }

  if (!contactsApi) {
    contactsApi = new ContactsApi()
    // Set API key using the SDK's setApiKey method
    contactsApi.setApiKey(ContactsApiApiKeys.apiKey, apiKey)
    logger.debug("Brevo Contacts API initialized")
  }
  return contactsApi
}

// Email sender configuration
// Using personal name improves inbox placement (Primary vs Promotions)
// Research shows emails from "Name from Company" land in Primary more often
const DEFAULT_SENDER = {
  name: "Nikayel from CodeSparring",
  email: "nikayel@codesparring.dev",
}

// Types
export interface EmailRecipient {
  email: string
  name?: string
}

export interface SendEmailOptions {
  to: EmailRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
  sender?: { name: string; email: string }
  replyTo?: { email: string; name?: string }
  tags?: string[]
  params?: Record<string, string>
  /**
   * Custom SMTP headers, e.g. List-Unsubscribe / List-Unsubscribe-Post on
   * reminder-class emails. Brevo expects This-Case-Only header names.
   */
  headers?: Record<string, string>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Helper to wait for a specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Send a transactional email via Brevo with retry logic
 * Retries up to 3 times with exponential backoff for transient failures
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  // Check if API key is configured
  if (!process.env.BREVO_API_KEY) {
    console.warn("[Brevo] API key not configured, skipping email send")
    return { success: false, error: "BREVO_API_KEY not configured" }
  }

  const MAX_RETRIES = 3
  const INITIAL_DELAY_MS = 1000
  let lastError: any

  // Get API instance - this will configure authentication
  let api: TransactionalEmailsApi
  try {
    api = getEmailApi()
  } catch (error: any) {
    console.error("[Brevo] Failed to initialize API:", error?.message || error)
    return { success: false, error: error?.message || "Failed to initialize email API" }
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = new SendSmtpEmail()
      message.subject = options.subject
      message.htmlContent = options.htmlContent
      message.textContent = options.textContent
      message.sender = options.sender || DEFAULT_SENDER
      message.to = options.to.map((r) => ({ email: r.email, name: r.name }))

      if (options.replyTo) {
        message.replyTo = options.replyTo
      }

      if (options.tags) {
        message.tags = options.tags
      }

      if (options.params) {
        message.params = options.params
      }

      if (options.headers) {
        message.headers = options.headers
      }

      const result = await api.sendTransacEmail(message)

      logger.info("Email sent successfully", { recipients: options.to.map((r) => r.email) })

      return {
        success: true,
        messageId: (result.body as any)?.messageId || "sent",
      }
    } catch (error: any) {
      lastError = error
      const statusCode = error?.statusCode || error?.response?.statusCode

      // Only retry on transient errors (5xx, network issues, rate limits)
      const isRetryable =
        statusCode >= 500 ||
        statusCode === 429 ||
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "ENOTFOUND"

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt)
        logger.warn("Brevo transient error, retrying", {
          delayMs,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: error?.body?.message || error?.message,
        })
        await sleep(delayMs)
        continue
      }

      // Non-retryable error or max retries reached
      break
    }
  }

  logger.error("Failed to send email after retries", {
    error: lastError?.body?.message || lastError?.message,
  })
  return {
    success: false,
    error: lastError?.body?.message || lastError?.message || "Unknown error",
  }
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
    logger.warn("Brevo API key not configured, skipping contact upsert")
    return false
  }

  try {
    const api = getContactsApi()

    const contact = new CreateContact()
    contact.email = email
    contact.updateEnabled = true // Update if exists

    if (attributes) {
      contact.attributes = attributes
    }

    if (listIds && listIds.length > 0) {
      contact.listIds = listIds
    }

    await api.createContact(contact)
    logger.debug("Contact upserted", { email })
    return true
  } catch (error: any) {
    // Ignore "contact already exists" errors when updateEnabled is true
    if (error?.body?.code === "duplicate_parameter") {
      return true
    }
    logger.error("Failed to upsert contact", {
      email,
      error: error?.body?.message || error?.message,
    })
    return false
  }
}

// The Ebbinghaus retention estimate and "optimal send hours" helpers were deleted
// 2026-08-14: the retention percentage was pseudo-scientific email copy (the email
// council cut it), and the send-hours helpers had no callers. The content guard
// test keeps the retention math from coming back.
