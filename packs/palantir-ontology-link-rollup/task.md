# Ontology link report — active links per object type

## Who reads this
A data-quality reviewer runs this report before signing off on the ontology. This
morning it shows fewer active links for one object type than the graph explorer does,
and the review is blocked until the two reconcile.

## The program
`link_rollup.py` reads a link feed and prints, per object type, how many active links
came from the graph.

## Data contract (all of this is intended; the correct output tolerates it)
- Columns are `source_system,object_type,link_id,status`, one link per line.
- Lines starting with `#` are comments.
- Only links whose `source_system` is `graph` are counted; other systems (e.g.
  `warehouse`) are excluded from this report.
- Only links whose `status` is `active` are counted.
- A line that is truncated or malformed is skipped.
- Links may appear in any order.

## Run it
```
python3 src/link_rollup.py fixtures/input.txt
```

## Expected output
```
=== Active links by object type ===
Asset: 3
Dataset: 2
Sensor: 1
```

The solution file is off-limits.
