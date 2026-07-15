"""Batch pending payouts and report the amount scheduled for each merchant.

The nightly settlement job reads the pending-payout feed, sets aside currencies
this account cannot pay out and payouts that are not ready to release, counts each
payout once even when the bus redelivers it, packs what remains into per-currency
batches, and prints the total amount it scheduled for every merchant. See task.md
for the column layout and the delivery contract the feed is allowed to carry.
"""

import sys

COLUMNS = 5
SUPPORTED_CURRENCIES = ("usd", "eur", "gbp")
SCHEDULABLE_STATUS = "pending"
BATCH_CAP = 3


def parse_payouts(path):
    """Read the feed into payout records in file order.

    Comment lines and lines that do not carry exactly five fields or whose amount
    is not an integer are not usable payouts and are left out. Each record keeps
    its arrival index so that an identical redelivery stays distinguishable from
    the payout it repeats.
    """
    payouts = []
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            parts = [part.strip() for part in line.split(",")]
            if len(parts) != COLUMNS:
                continue
            payout_id, merchant, currency, amount, status = parts
            if not payout_id or not merchant:
                continue
            try:
                amount_cents = int(amount)
            except ValueError:
                continue
            payouts.append(
                {
                    "seq": len(payouts),
                    "id": payout_id,
                    "merchant": merchant,
                    "currency": currency,
                    "amount": amount_cents,
                    "status": status,
                }
            )
    return payouts


def schedule(pending):
    """Return the payouts that go into a batch tonight.

    A payout is scheduled when its currency is one this account pays out, its
    status is ready to release, and its id has not already been scheduled from an
    earlier delivery on the at-least-once bus.
    """
    seen = set()
    scheduled = []
    for payout in pending:
        if payout["currency"] not in SUPPORTED_CURRENCIES:
            continue
        if payout["status"] != SCHEDULABLE_STATUS:
            continue
        if payout["id"] in seen:
            pending.remove(payout)
            continue
        seen.add(payout["id"])
        scheduled.append(payout)
    return scheduled


def pack_into_batches(scheduled):
    """Group scheduled payouts by currency and cut each currency into batches of
    at most BATCH_CAP payouts, smallest amount first inside a currency."""
    by_currency = {}
    for payout in scheduled:
        by_currency.setdefault(payout["currency"], []).append(payout)
    batches = []
    for currency in SUPPORTED_CURRENCIES:
        group = sorted(by_currency.get(currency, []), key=lambda payout: payout["amount"])
        for start in range(0, len(group), BATCH_CAP):
            batches.append(group[start:start + BATCH_CAP])
    return batches


def merchant_totals(batches):
    """Total the amount scheduled for each merchant across every batch."""
    totals = {}
    for batch in batches:
        for payout in batch:
            merchant = payout["merchant"]
            totals[merchant] = totals.get(merchant, 0) + payout["amount"]
    return totals


def print_totals(header, totals):
    print(header)
    for merchant in sorted(totals):
        print(merchant + ": " + str(totals[merchant]))


def main():
    pending = parse_payouts(sys.argv[1])
    scheduled = schedule(pending)
    batches = pack_into_batches(scheduled)
    totals = merchant_totals(batches)
    print_totals("=== Scheduled total (cents) by merchant ===", totals)


if __name__ == "__main__":
    main()
