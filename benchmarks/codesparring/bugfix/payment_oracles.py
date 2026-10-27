"""Independent reducers for payment, usage, and entity-identity reports."""
from __future__ import annotations

from collections import Counter
from collections.abc import Iterator


def rows(feed: str, fields: int) -> Iterator[list[str]]:
    for line in feed.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) == fields:
            yield parts


def render(header: str, totals: dict[str, int]) -> str:
    return header + "\n" + "".join(f"{name}: {totals[name]}\n" for name in sorted(totals))


def webhook(feed: str) -> str:
    seen, totals = set(), Counter()
    for event_id, kind, merchant, amount, timestamp in rows(feed, 5):
        try:
            cents = int(amount)
        except ValueError:
            continue
        if not event_id or not merchant or event_id in seen:
            continue
        seen.add(event_id)
        if kind in ("charge", "refund"):
            totals[merchant] += cents if kind == "charge" else -cents
    return render("=== Net balance (cents) by merchant ===", totals)


def payouts(feed: str) -> str:
    seen, totals = set(), Counter()
    for payout_id, merchant, currency, amount, status in rows(feed, 5):
        try:
            cents = int(amount)
        except ValueError:
            continue
        if not payout_id or not merchant or currency not in {"usd", "eur", "gbp"}:
            continue
        if status != "pending" or payout_id in seen:
            continue
        seen.add(payout_id)
        totals[merchant] += cents
    return render("=== Scheduled total (cents) by merchant ===", totals)


def usage(feed: str) -> str:
    seen, totals = set(), Counter()
    for stream, account, event_id, seconds in rows(feed, 4):
        try:
            value = int(seconds)
        except ValueError:
            continue
        if stream not in {"primary", "backup"} or event_id in seen:
            continue
        seen.add(event_id)
        totals[account.lower()] += value
    return render("=== Compute-seconds by account ===", totals)


def entities(feed: str) -> str:
    seen, totals = set(), Counter()
    for namespace, name, link_id in rows(feed, 3):
        if namespace not in {"commercial", "gov"} or not name or not link_id or link_id in seen:
            continue
        seen.add(link_id)
        totals[(namespace, name.lower())] += 1
    ordered = sorted(totals, key=lambda pair: (pair[1], pair[0]))
    return "=== Links resolved per entity ===\n" + "".join(
        f"{ns}/{name}: {totals[(ns, name)]}\n" for ns, name in ordered)
