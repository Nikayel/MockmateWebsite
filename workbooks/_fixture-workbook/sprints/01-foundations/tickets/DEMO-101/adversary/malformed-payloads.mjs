// Hostile runner: throws a battery of malformed claim payloads at the
// endpoint and asserts every one is rejected with a 400, never a 500.
export const hostilePayloads = [
  { tenantId: "northwind", amount: "12.5" },
  { tenantId: "northwind", amount: Number.POSITIVE_INFINITY },
  { tenantId: 12345, amount: 12.5 },
  null,
]
