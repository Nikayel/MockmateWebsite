"""In-memory state for one cache-log replay.

Namespaces isolate keys belonging to different application features. A write
replaces the previous entry for that namespace and key; sweep updates the
stored state before a report is requested.
"""


def evict_expired(entries, now):
    """Return the entries that remain after cleanup at the checkpoint."""
    index = 0
    while index < len(entries):
        entry = entries[index]
        if entry["expires_at"] <= now:
            entries.pop(index)
        index += 1
    return entries


class CacheStore:
    """Own the latest entries for one replay, with no external dependencies."""

    def __init__(self):
        self._namespaces = {}

    def write(self, event):
        """Record the latest write without mixing keys across namespaces."""
        namespace = event["namespace"]
        if namespace not in self._namespaces:
            self._namespaces[namespace] = {}
        self._namespaces[namespace][event["key"]] = event

    def sweep(self, now):
        """Update each namespace's stored entries for this checkpoint."""
        for namespace, entries in self._namespaces.items():
            survivors = evict_expired(list(entries.values()), now)
            self._namespaces[namespace] = {
                entry["key"]: entry for entry in survivors
            }

    def counts(self):
        """Include known namespaces even when cleanup left them empty."""
        return {
            namespace: len(entries)
            for namespace, entries in self._namespaces.items()
        }
