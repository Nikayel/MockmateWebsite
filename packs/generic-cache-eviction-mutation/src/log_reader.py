"""Read cache writes in arrival order.

Each usable row becomes a dictionary shared with the cache store. Input
validation lives here so the rest of the job can work with parsed entries.
"""

MIN_FIELDS = 3
MAX_FIELDS = 4
PINNED_FLAG = "pinned"


def parse_line(raw):
    """Return one parsed entry, or None for a comment or malformed row."""
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = [part.strip() for part in line.split(",")]
    if len(parts) < MIN_FIELDS or len(parts) > MAX_FIELDS:
        return None
    namespace, key, expires_at = parts[0], parts[1], parts[2]
    try:
        expires_value = int(expires_at)
    except ValueError:
        return None
    pinned = len(parts) == MAX_FIELDS and parts[3] == PINNED_FLAG
    return {
        "namespace": namespace,
        "key": key,
        "expires_at": expires_value,
        "pinned": pinned,
    }


def read_events(path):
    """Load usable writes, suppressing repeated deliveries before replay."""
    events = []
    seen = set()
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            event = parse_line(raw)
            if event is not None:
                identity = (event["namespace"], event["key"])
                if identity in seen:
                    continue
                seen.add(identity)
                events.append(event)
    return events
