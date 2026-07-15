"""Nightly ledger posting job.

Reads the day's settlement transactions and prints each account's balance in
cents. Transactions arrive in batches, and a settlement can re-send an
overlapping window, so the same transaction id may appear in more than one
batch. Each such re-send is the same transaction, not a new one.
"""

import sys

COLUMNS = 6
CREDIT_TYPES = ("charge",)
DEBIT_TYPES = ("refund",)


def iter_rows(path):
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            yield [part.strip() for part in line.split(",")]


def to_cents(amount):
    whole, frac = amount.split(".")
    return int(whole) * 100 + int(frac)


def parse_transactions(path):
    transactions = []
    for parts in iter_rows(path):
        if len(parts) != COLUMNS:
            continue
        batch_id, txn_id, account, txn_type, amount, posted_at = parts
        if not batch_id or not txn_id or not account:
            continue
        try:
            amount_cents = to_cents(amount)
        except ValueError:
            continue
        transactions.append(
            {
                "batch_id": batch_id,
                "txn_id": txn_id,
                "account": account,
                "type": txn_type,
                "amount": amount_cents,
                "posted_at": posted_at,
            }
        )
    return transactions


def in_posting_order(transactions):
    return sorted(transactions, key=lambda txn: txn["posted_at"])


def dedupe(transactions):
    seen = set()
    unique = []
    for txn in transactions:
        if txn["txn_id"] in seen:
            continue
        seen.add(txn["txn_id"])
        unique.append(txn)
    return unique


def group_by_batch(transactions):
    batches = {}
    for txn in transactions:
        batches.setdefault(txn["batch_id"], []).append(txn)
    return batches


def apply_transaction(balances, txn):
    account = txn["account"]
    if txn["type"] in CREDIT_TYPES:
        balances[account] = balances.get(account, 0) + txn["amount"]
    elif txn["type"] in DEBIT_TYPES:
        balances[account] = balances.get(account, 0) - txn["amount"]


def post(transactions):
    balances = {}
    batches = group_by_batch(transactions)
    posted = []
    for batch_id in batches:
        posted.extend(dedupe(batches[batch_id]))
    for txn in posted:
        apply_transaction(balances, txn)
    return balances


def main():
    transactions = parse_transactions(sys.argv[1])
    ordered = in_posting_order(transactions)
    balances = post(ordered)
    print("=== Ledger balance (cents) by account ===")
    for account in sorted(balances):
        print(account + ": " + str(balances[account]))


if __name__ == "__main__":
    main()
