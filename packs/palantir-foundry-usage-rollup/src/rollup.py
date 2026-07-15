import sys

VALID_STREAMS = ("primary", "backup")


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
            stream, account_id, event_id, seconds = (part.strip() for part in parts)
            if stream not in VALID_STREAMS:
                continue
            if seconds == "":
                continue
            try:
                seconds_value = int(seconds)
            except ValueError:
                continue
            events.append(
                {
                    "stream": stream,
                    "account_id": account_id.lower(),
                    "event_id": event_id,
                    "seconds": seconds_value,
                }
            )
    return events


def dedupe(events):
    seen = set()
    unique = []
    for event in events:
        if event["event_id"] in seen:
            continue
        seen.add(event["event_id"])
        unique.append(event)
    return unique


def rollup(events):
    totals = {}
    primary = dedupe([event for event in events if event["stream"] == "primary"])
    backup = dedupe([event for event in events if event["stream"] == "backup"])
    for event in primary + backup:
        totals[event["account_id"]] = totals.get(event["account_id"], 0) + event["seconds"]
    return totals


def main():
    events = parse_events(sys.argv[1])
    totals = rollup(events)
    print("=== Compute-seconds by account ===")
    for account_id in sorted(totals):
        print(account_id + ": " + str(totals[account_id]))


if __name__ == "__main__":
    main()
