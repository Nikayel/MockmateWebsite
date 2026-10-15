"""Operations report formatting; the store owns entry lifecycle decisions."""

REPORT_HEADER = "=== Live entries by namespace ==="


def format_report(counts):
    """Keep output stable so operations can compare reports between runs."""
    lines = [REPORT_HEADER]
    for namespace in sorted(counts):
        lines.append(namespace + ": " + str(counts[namespace]))
    return "\n".join(lines)
