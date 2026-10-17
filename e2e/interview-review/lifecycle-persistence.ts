/** Authenticated persistence is covered by route/service tests; this fixture exercises guest HTTP saves. */
export async function saveSessionState() {
  throw new Error("Unexpected authenticated fixture save")
}
