import sys

COUNTED_SOURCE = "graph"
COUNTED_STATUS = "active"


def parse_links(path):
    links = []
    with open(path) as handle:
        # Skip the header row before reading the records.
        next(handle, None)
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) != 4:
                continue
            source_system, object_type, link_id, status = (part.strip() for part in parts)
            links.append(
                {
                    "source_system": source_system,
                    "object_type": object_type,
                    "link_id": link_id,
                    "status": status,
                }
            )
    return links


def rollup(links):
    totals = {}
    for link in links:
        if link["source_system"] != COUNTED_SOURCE:
            continue
        if link["status"] != COUNTED_STATUS:
            continue
        object_type = link["object_type"]
        totals[object_type] = totals.get(object_type, 0) + 1
    return totals


def main():
    links = parse_links(sys.argv[1])
    totals = rollup(links)
    print("=== Active links by object type ===")
    for object_type in sorted(totals):
        print(object_type + ": " + str(totals[object_type]))


if __name__ == "__main__":
    main()
