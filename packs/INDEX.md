# Pack coverage matrix

Coverage = company tags x domains x bug_classes (enumerated in
`future-sprints/PACK_REALISM_GUIDE.md`). Stop condition (generate-pack.md Step 1):
every company tag has >= 1 pack per difficulty level (1,2,3) AND every bug_class
appears >= 2 times.

| pack-id | company | domain | bug_class | difficulty | status | date |
|---------|---------|--------|-----------|------------|--------|------|
| palantir-foundry-usage-rollup | palantir-fdse | data-pipeline | double-count | 2 | validated | 2026-07-15 |
| palantir-ontology-link-rollup | palantir-fdse | ontology-processing | silent-boundary | 1 | validated | 2026-07-15 |
| stripe-webhook-idempotency | stripe-bug-squash | payments | wrong-dedup-key | 1 | validated | 2026-07-15 |
| datadog-metric-window-rollup | datadog-debugging | observability | off-by-one-window | 2 | validated | 2026-07-15 |
| generic-log-error-rollup | generic-fdse | log-ingestion | accumulator-wrong-scope | 1 | validated | 2026-07-15 |
| datadog-endpoint-latency-peak | datadog-debugging | observability | accumulator-wrong-scope | 1 | validated | 2026-07-15 |
| palantir-entity-resolution-merge | palantir-fdse | entity-resolution | wrong-dedup-key | 2 | validated | 2026-07-15 |
