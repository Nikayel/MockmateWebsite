"""Resolve duplicate ontology entities and count links per entity.

The ontology reconciliation job reads the link feed emitted by the resolver and
reports, for each entity, how many distinct links resolved to it. The registry
team reads this every morning to confirm the reconciliation run did not drop or
double-assign links. Duplicate entity records and redelivered links are part of
normal input; see task.md for the column layout and the delivery contract the
feed is allowed to violate.
"""

import sys

REGISTERED_NAMESPACES = ("commercial", "gov")


def normalize_name(raw):
    """Entity names are case-insensitive and may carry incidental whitespace,
    so fold them to a canonical form before comparing."""
    return raw.strip().lower()


def parse_line(raw):
    """Turn one feed line into a link record, or None when the line is a
    comment, malformed, or targets an unregistered namespace."""
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = line.split(",")
    if len(parts) != 3:
        return None
    namespace, name, link_id = (part.strip() for part in parts)
    if namespace not in REGISTERED_NAMESPACES:
        return None
    if name == "" or link_id == "":
        return None
    return {
        "namespace": namespace,
        "name": normalize_name(name),
        "link_id": link_id,
    }


def parse_links(path):
    """Read the feed and keep only well-formed link records."""
    records = []
    with open(path) as handle:
        for raw in handle:
            record = parse_line(raw)
            if record is not None:
                records.append(record)
    return records


def dedupe_links(records):
    """Drop redeliveries: the bus is at-least-once, so the same link_id can
    arrive more than once. Keep the first occurrence of each link_id."""
    seen = set()
    unique = []
    for record in records:
        if record["link_id"] in seen:
            continue
        seen.add(record["link_id"])
        unique.append(record)
    return unique


def entity_key(namespace, name):
    """The identity that decides whether two records describe one entity and so
    should have their links merged into a single count."""
    return name


def count_links(records):
    """Count how many links resolved to each entity identity."""
    counts = {}
    for record in records:
        key = entity_key(record["namespace"], record["name"])
        counts[key] = counts.get(key, 0) + 1
    return counts


def distinct_entities(records):
    """Every (namespace, name) entity seen in the feed, ordered by name then
    namespace so entities that share a name are listed together."""
    entities = {}
    for record in records:
        entities[(record["namespace"], record["name"])] = True
    return sorted(entities, key=lambda pair: (pair[1], pair[0]))


def format_row(namespace, name, total):
    """One report line: the entity's full path and its link count."""
    return namespace + "/" + name + ": " + str(total)


def print_report(records):
    counts = count_links(records)
    print("=== Links resolved per entity ===")
    for namespace, name in distinct_entities(records):
        total = counts[entity_key(namespace, name)]
        print(format_row(namespace, name, total))


def main():
    records = dedupe_links(parse_links(sys.argv[1]))
    print_report(records)


if __name__ == "__main__":
    main()
