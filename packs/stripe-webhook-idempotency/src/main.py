import sys

COLUMNS = 5
CREDIT_TYPES = ("charge",)
DEBIT_TYPES = ("refund",)


def parse_events(path):
    events = []
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            parts = [part.strip() for part in line.split(",")]
            if len(parts) != COLUMNS:
                continue
            event_id, event_type, merchant, amount, received_at = parts
            if not event_id or not merchant:
                continue
            try:
                amount_cents = int(amount)
            except ValueError:
                continue
            events.append(
                {
                    "event_id": event_id,
                    "type": event_type,
                    "merchant": merchant,
                    "amount": amount_cents,
                    "received_at": received_at,
                }
            )
    return events


def in_arrival_order(events):
    return sorted(events, key=lambda event: event["received_at"])


def dedupe(events):
    seen = set()
    unique = []
    for event in events:
        key = (event["merchant"], event["type"], event["amount"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(event)
    return unique


def compute_balances(events):
    balances = {}
    for event in events:
        merchant = event["merchant"]
        if event["type"] in CREDIT_TYPES:
            balances[merchant] = balances.get(merchant, 0) + event["amount"]
        elif event["type"] in DEBIT_TYPES:
            balances[merchant] = balances.get(merchant, 0) - event["amount"]
    return balances


def main():
    events = parse_events(sys.argv[1])
    ordered = in_arrival_order(events)
    unique = dedupe(ordered)
    balances = compute_balances(unique)
    print("=== Net balance (cents) by merchant ===")
    for merchant in sorted(balances):
        print(merchant + ": " + str(balances[merchant]))


if __name__ == "__main__":
    main()
