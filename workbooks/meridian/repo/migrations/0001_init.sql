-- Meridian initial schema: tenants, the claims they submit, and the documents attached to
-- each claim.

-- One row per insurance partner. `webhook_url`/`webhook_secret` are nullable because not
-- every tenant has finished onboarding to webhook delivery yet.
create table tenants (
  id text primary key,
  name text not null,
  webhook_url text,
  webhook_secret text,
  created_at timestamptz not null default now()
);

-- `external_ref` is whatever reference number the insurer's own system uses - it is not
-- unique across tenants, only meaningful to the tenant that sent it.
create table claims (
  id text primary key,
  tenant_id text not null references tenants(id),
  external_ref text not null,
  status text not null default 'submitted',
  amount double precision not null,
  currency text not null default 'USD',
  claimant_name text not null,
  loss_date date not null,
  created_at timestamptz not null default now()
);

-- Photos, estimates, and adjuster notes attached to a claim. The extraction worker only
-- ever sees a claim_id off the queue envelope, so there is no tenant_id here yet.
create table documents (
  id text primary key,
  claim_id text not null references claims(id),
  file_name text not null,
  content_type text not null,
  legacy_path text not null,
  created_at timestamptz not null default now()
);
