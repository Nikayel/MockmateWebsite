export class RequestTimeoutError extends Error {}

/** Bounds token acquisition as well as fetch; aborting fetch alone cannot bound both. */
export async function requestWithDeadline<T>(
  request: () => Promise<T>,
  controller: AbortController
): Promise<T> {
  const { signal } = controller
  const timeout = setTimeout(() => controller.abort(new RequestTimeoutError()), 15_000)
  let rejectAborted: () => void = () => {}
  try {
    return await Promise.race([
      request(),
      new Promise<never>((_, reject) => {
        rejectAborted = () => reject(signal.reason)
        signal.addEventListener("abort", rejectAborted, { once: true })
        if (signal.aborted) rejectAborted()
      }),
    ])
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener("abort", rejectAborted)
  }
}
