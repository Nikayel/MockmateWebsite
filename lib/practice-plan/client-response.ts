export const UNCONFIRMED_SAVE =
  "We couldn't confirm the save. Retry to check it; your feedback is still available."
export function practiceSaveError(data: unknown, needsReauth: boolean, error?: string): string {
  if (needsReauth) return "Sign in again to save your task."
  return typeof data === "object" && data && "error" in data && typeof data.error === "string"
    ? data.error.slice(0, 300)
    : error?.slice(0, 300) || UNCONFIRMED_SAVE
}
