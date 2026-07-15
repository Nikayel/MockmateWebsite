"""Nightly reliability rollup.

Reads an application log feed and reports, for each service, how many
ERROR lines it emitted during the window. The on-call engineer reads this
every morning to decide which services to follow up on.

Field layout per line: timestamp service level message
"""

import sys

ERROR_LEVEL = "ERROR"
FIELD_COUNT = 4


def parse_line(raw):
    """Return {service, level} for a usable line, or None to skip it."""
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = line.split(None, FIELD_COUNT - 1)
    if len(parts) < FIELD_COUNT:
        return None
    timestamp, service, level, message = parts
    return {
        "service": service,
        "level": level.strip().upper(),
    }


def read_events(path):
    """Load every usable line from the feed in arrival order."""
    events = []
    with open(path) as handle:
        for raw in handle:
            event = parse_line(raw)
            if event is not None:
                events.append(event)
    return events


def group_by_service(events):
    """Bucket levels under each service, keeping first-seen order."""
    grouped = {}
    for event in events:
        service = event["service"]
        if service not in grouped:
            grouped[service] = []
        grouped[service].append(event["level"])
    return grouped


def build_report(grouped):
    """Count ERROR lines for each service."""
    report = {}
    error_count = 0
    for service in grouped:
        for level in grouped[service]:
            if level == ERROR_LEVEL:
                error_count += 1
        report[service] = error_count
    return report


def main():
    events = read_events(sys.argv[1])
    grouped = group_by_service(events)
    report = build_report(grouped)
    print("=== ERROR lines by service ===")
    for service in report:
        print(service + ": " + str(report[service]))


if __name__ == "__main__":
    main()
