"""Count distinct alert incidents per monitor from a monitor-state feed.

The on-call engineer reads this rollup to see how many separate times each
monitor paged during a shift. The collector agents write one line per monitor
state transition (a monitor entering OK or ALERT) into a single shared feed, so
the lines for different monitors are interleaved in arrival order. The rollup
folds each monitor's contiguous ALERT run into one incident. See task.md for the
column layout and the delivery contract the feed is allowed to violate.
"""

import sys

VALID_STATES = ("OK", "ALERT")
TARGET_ENV = "prod"
COLUMN_COUNT = 5


def parse_line(raw):
    """Turn one feed line into a transition dict, or None when the line should
    be skipped.

    A usable line has exactly five comma-separated columns
    (timestamp, env, monitor, state, event_id) and a state the rollup reads as
    a monitor transition. A comment, a blank line, a line that does not split
    into exactly five columns, or a transition whose state is neither OK nor
    ALERT is terrain the rollup tolerates by dropping it.
    """
    line = raw.rstrip("\n")
    if not line or line.startswith("#"):
        return None
    parts = line.split(",")
    if len(parts) != COLUMN_COUNT:
        return None
    timestamp, env, monitor, state, event_id = (part.strip() for part in parts)
    if state not in VALID_STATES:
        return None
    return {
        "timestamp": timestamp,
        "env": env,
        "monitor": monitor,
        "state": state,
        "event_id": event_id,
    }


def parse_feed(path):
    """Read the feed file and keep every well-formed transition."""
    transitions = []
    with open(path) as handle:
        for raw in handle:
            transition = parse_line(raw)
            if transition is not None:
                transitions.append(transition)
    return transitions


def dedupe(transitions):
    """Drop at-least-once redeliveries from the feed.

    The bus can deliver the same transition more than once. An ``event_id``
    identifies exactly one transition, so a repeated ``event_id`` is that same
    transition arriving again and is kept only the first time it is seen.
    """
    seen = set()
    unique = []
    for transition in transitions:
        if transition["event_id"] in seen:
            continue
        seen.add(transition["event_id"])
        unique.append(transition)
    return unique


def in_timestamp_order(transitions):
    """Return the transitions ordered by their feed timestamp."""
    return sorted(transitions, key=lambda transition: transition["timestamp"])


def transitions_for_env(transitions, env):
    """Select the transitions emitted by monitors in one environment."""
    return [transition for transition in transitions if transition["env"] == env]


def count_incidents(transitions):
    """Count distinct alert incidents per monitor.

    An incident is a contiguous run of ALERT transitions for a monitor: an
    ALERT opens a new incident only when the most recent transition was not
    already ALERT, so consecutive ALERT transitions with no intervening OK are
    folded into the same incident. Transitions are read in feed order (see
    task.md), the order in which the collector received them.
    """
    incidents = {}
    previous_state = None
    for transition in transitions:
        monitor = transition["monitor"]
        state = transition["state"]
        incidents.setdefault(monitor, 0)
        if state == "ALERT" and previous_state != "ALERT":
            incidents[monitor] += 1
        previous_state = state
    return incidents


def print_report(env, incidents):
    """Print one environment's per-monitor incident counts, monitors sorted."""
    print("=== Alert incidents by monitor (" + env + ") ===")
    for monitor in sorted(incidents):
        print(monitor + ": " + str(incidents[monitor]))


def main():
    transitions = in_timestamp_order(dedupe(parse_feed(sys.argv[1])))
    scoped = transitions_for_env(transitions, TARGET_ENV)
    print_report(TARGET_ENV, count_incidents(scoped))


if __name__ == "__main__":
    main()
