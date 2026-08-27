/**
 * Retries `fn` up to `attempts` times, immediately, with no backoff and no jitter. Fine as
 * long as the receiving end never asks us to slow down - every attempt goes out back to back,
 * with nothing to say "not right now" and nowhere to record how many attempts something took.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
