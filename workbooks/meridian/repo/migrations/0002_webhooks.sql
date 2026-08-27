-- One row per outbound delivery attempt for a claim's status webhook. `status` is set by the
-- application, not derived from anything in this table - see src/delivery/webhooks.ts for
-- when each value gets written.
create table webhook_deliveries (
  id text primary key,
  tenant_id text not null references tenants(id),
  claim_id text not null references claims(id),
  status text not null,
  payload text not null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
