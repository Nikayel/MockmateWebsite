# Meridian

Multi-tenant claims intake for insurance partners. Insurers POST claim documents, we pull out
the fields that matter, apply policy rules, and post results back to their systems over a
webhook.

## Status

Early. `src/http/server.ts` is a small in-house router, not a real framework - see the sprint
board for context. There is no live Postgres yet either: `src/db/memory-db.ts` is what every
test in this repo runs against today, and `migrations/` is the schema it is standing in for.

## Architecture

- `src/http` - the request layer. `server.ts` is a small router with an `inject()` helper for
  tests; `routes/` wires each endpoint to a repository.
- `src/db` - `client.ts` is the interface every repository codes against; `memory-db.ts` is
  the only implementation that exists right now; `repositories/` is one file per table.
- `src/queue` + `src/delivery` - claim events go on an in-process outbox and get delivered to
  a tenant's webhook URL when it drains.
- `src/extract` - pulls fields out of a document's text. Regex today.

## Running the tests

    npm test
