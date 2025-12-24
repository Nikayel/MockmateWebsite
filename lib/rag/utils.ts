/**
 * Shared utility functions for RAG operations
 */

import { logger } from '@/lib/logger'

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * Timeout wrapper for async operations
 * Prevents RAG operations from hanging indefinitely
 */
export class TimeoutError extends Error {
    constructor(message: string, public timeoutMs: number) {
        super(message)
        this.name = 'TimeoutError'
    }
}

export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000,
    operationName: string = 'RAG operation'
): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new TimeoutError(
                `${operationName} timed out after ${timeoutMs}ms`,
                timeoutMs
            ))
        }, timeoutMs)
    })

    try {
        const result = await Promise.race([promise, timeoutPromise])
        clearTimeout(timeoutId)
        return result
    } catch (error) {
        clearTimeout(timeoutId)
        throw error
    }
}

/**
 * RAG Input Validation
 * Validates and sanitizes inputs to prevent injection and abuse
 */
export interface RAGValidationResult {
    valid: boolean
    sanitized?: string
    error?: string
}

// Maximum lengths for different input types
const MAX_QUERY_LENGTH = 5000
const MAX_CODE_LENGTH = 50000
const MAX_PROBLEM_TEXT_LENGTH = 10000

// Patterns that might indicate injection attempts
const SUSPICIOUS_PATTERNS = [
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/g,  // Control characters
]

export function validateRAGQuery(query: string): RAGValidationResult {
    if (!query || typeof query !== 'string') {
        return { valid: false, error: 'Query is required and must be a string' }
    }

    const trimmed = query.trim()

    if (trimmed.length === 0) {
        return { valid: false, error: 'Query cannot be empty' }
    }

    if (trimmed.length > MAX_QUERY_LENGTH) {
        return { valid: false, error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` }
    }

    // Sanitize: remove control characters but preserve normal text
    let sanitized = trimmed
    for (const pattern of SUSPICIOUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '')
    }

    return { valid: true, sanitized }
}

export function validateProblemText(text: string): RAGValidationResult {
    if (!text || typeof text !== 'string') {
        return { valid: false, error: 'Problem text is required' }
    }

    const trimmed = text.trim()

    if (trimmed.length === 0) {
        return { valid: false, error: 'Problem text cannot be empty' }
    }

    if (trimmed.length > MAX_PROBLEM_TEXT_LENGTH) {
        return { valid: false, error: `Problem text exceeds maximum length of ${MAX_PROBLEM_TEXT_LENGTH} characters` }
    }

    let sanitized = trimmed
    for (const pattern of SUSPICIOUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '')
    }

    return { valid: true, sanitized }
}

export function validateUserCode(code: string): RAGValidationResult {
    if (!code || typeof code !== 'string') {
        // Code is often optional
        return { valid: true, sanitized: '' }
    }

    if (code.length > MAX_CODE_LENGTH) {
        return { valid: false, error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` }
    }

    // For code, we're more lenient but still remove dangerous control chars
    let sanitized = code
    for (const pattern of SUSPICIOUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '')
    }

    return { valid: true, sanitized }
}

/**
 * Sanitize output to prevent XSS when rendering RAG results
 */
export function sanitizeRAGOutput(text: string, maxLength: number = 10000): string {
    if (!text || typeof text !== 'string') {
        return ''
    }

    let sanitized = text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .substring(0, maxLength)

    return sanitized
}

/**
 * Circuit breaker for external services (OpenAI, vector DB)
 * Prevents cascading failures by failing fast when a service is down
 */
export interface CircuitBreakerState {
    failures: number
    lastFailure: number
    isOpen: boolean
}

const circuitBreakers = new Map<string, CircuitBreakerState>()

const CIRCUIT_BREAKER_THRESHOLD = 5  // Number of failures before opening
const CIRCUIT_BREAKER_TIMEOUT = 60000  // Time to wait before retrying (1 minute)

export function getCircuitBreakerState(serviceName: string): CircuitBreakerState {
    if (!circuitBreakers.has(serviceName)) {
        circuitBreakers.set(serviceName, {
            failures: 0,
            lastFailure: 0,
            isOpen: false
        })
    }
    return circuitBreakers.get(serviceName)!
}

export function recordFailure(serviceName: string): void {
    const state = getCircuitBreakerState(serviceName)
    state.failures++
    state.lastFailure = Date.now()

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        state.isOpen = true
        logger.warn(`[CircuitBreaker] ${serviceName} circuit opened after ${state.failures} failures`)
    }
}

export function recordSuccess(serviceName: string): void {
    const state = getCircuitBreakerState(serviceName)
    state.failures = 0
    state.isOpen = false
}

export function isCircuitOpen(serviceName: string): boolean {
    const state = getCircuitBreakerState(serviceName)

    if (!state.isOpen) {
        return false
    }

    // Check if we should try to close the circuit (half-open state)
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
        logger.info(`[CircuitBreaker] ${serviceName} circuit half-open, allowing retry`)
        return false
    }

    return true
}

export async function withCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
): Promise<T> {
    if (isCircuitOpen(serviceName)) {
        if (fallback) {
            logger.info(`[CircuitBreaker] ${serviceName} circuit open, using fallback`)
            return fallback()
        }
        throw new Error(`${serviceName} service is temporarily unavailable`)
    }

    try {
        const result = await operation()
        recordSuccess(serviceName)
        return result
    } catch (error) {
        recordFailure(serviceName)
        if (fallback && isCircuitOpen(serviceName)) {
            logger.info(`[CircuitBreaker] ${serviceName} failed, using fallback`)
            return fallback()
        }
        throw error
    }
}

