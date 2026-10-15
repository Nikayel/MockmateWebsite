"""Replay cache writes and produce the overnight cleanup report.

This is a local replay of a cache job: no server, network, or wall clock.
Operations compares its output with the cache metrics at the same checkpoint.
"""

import sys

from cache_store import CacheStore
from log_reader import read_events
from reporting import format_report

NOW = 1700000000


def main():
    events = read_events(sys.argv[1])
    cache = CacheStore()
    for event in events:
        cache.write(event)
    cache.sweep(NOW)
    print(format_report(cache.counts()))


if __name__ == "__main__":
    main()
