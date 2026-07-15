import sys

COUNTED_KIND = "request"


def parse_events(path):
    events = []
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) != 4:
                continue
            kind, endpoint, request_id, millis = (part.strip() for part in parts)
            if kind != COUNTED_KIND:
                continue
            try:
                millis_value = int(millis)
            except ValueError:
                continue
            events.append(
                {
                    "endpoint": endpoint,
                    "request_id": request_id,
                    "millis": millis_value,
                }
            )
    return events


def group_by_endpoint(events):
    grouped = {}
    for event in events:
        grouped.setdefault(event["endpoint"], []).append(event)
    return grouped


def build_report(grouped):
    lines = []
    peak = 0
    for endpoint in grouped:
        count = 0
        for event in grouped[endpoint]:
            if event["millis"] > peak:
                peak = event["millis"]
            count += 1
        lines.append(endpoint + ": peak=" + str(peak) + "ms over " + str(count))
    return lines


def main():
    events = parse_events(sys.argv[1])
    grouped = group_by_endpoint(events)
    print("=== Peak latency by endpoint ===")
    for line in build_report(grouped):
        print(line)


if __name__ == "__main__":
    main()
