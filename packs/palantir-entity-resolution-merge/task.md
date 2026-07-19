# Ontology reconciliation: links resolved per entity

## Who reads this
The registry team runs this reconciliation report every morning after the
overnight resolver finishes. For each entity it lists how many distinct links
resolved to it, and the team uses that count to confirm the run did not drop or
double-assign links. This morning one entity name shows far more resolved links
than the registry dashboard reports for it, so the team paused downstream
publishing until the report is trusted again.

## The program
`resolve_entities.py` reads the resolver's link feed and prints, per entity, how
many links resolved to it.

An entity lives in a namespace (the owning tenant) and has a name. The resolver
merges duplicate records of the same entity, then counts the distinct links that
resolved to each entity. The same name can belong to a different entity in a
different tenant, so an entity is the pair of its namespace and its name.

## Data contract (all of this is intended; the correct output tolerates it)
- Columns are `namespace,entity_name,link_id`.
- Lines starting with `#` are comments.
- An entity is identified by its `namespace` and its `entity_name` together. The
  same name can appear in more than one namespace, and those are different
  entities (a shared vendor name owned by two tenants is two entities).
- Entity names are case-insensitive and may carry incidental leading or trailing
  whitespace; `Acme ` and `acme` are the same entity.
- The bus is at-least-once, so the same link (identified by `link_id`) can arrive
  more than once. Repeats of a `link_id` are the same link, counted once. A
  `link_id` identifies exactly one link resolution.
- Only namespaces in the registered tenant set (`commercial`, `gov`) are
  reported; rows in any other namespace are ignored.
- A line that is truncated (not exactly three columns) or missing its
  `entity_name` or `link_id` is malformed and is skipped.
- Links can arrive out of order.

Output lists one line per entity as `namespace/entity_name: count`, ordered by
name and then namespace so entities that share a name sit together.

## Run it
```
python3 src/resolve_entities.py fixtures/input.txt
```

## Expected output
```
=== Links resolved per entity ===
commercial/acme: 3
gov/acme: 2
commercial/globex: 4
commercial/initech: 2
gov/umbrella: 1
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
