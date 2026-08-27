# Meridian Architecture

Claims arrive over HTTPS and are queued before any database write happens.

```ts
export function formatCurrency(cents: number) {
  return (cents / 100).toFixed(2)
}
```
