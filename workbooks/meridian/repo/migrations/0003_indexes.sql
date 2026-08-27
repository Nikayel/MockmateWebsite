-- The query patterns we actually have today: look up a tenant's own claims, find a claim by
-- the reference number the insurer sent us, and look up deliveries for a claim.
create index claims_tenant_id_idx on claims(tenant_id);
create index claims_external_ref_idx on claims(external_ref);
create index webhook_deliveries_claim_id_idx on webhook_deliveries(claim_id);
