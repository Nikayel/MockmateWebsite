export const starter = `from window_store import StoreUnavailableError


def allow_request(store, client_id, now, limit, window_ms):
    key = "rl:" + client_id
    try:
        store.remove_before(key, now - window_ms)
        if store.count(key) >= limit:
            return False
        store.add(key, now)
        return True
    except Exception:
        # Keep the gateway responsive when the store cannot answer.
        return True


def simulate_burst(store, client_id, count, now, limit, window_ms):
    allowed = 0
    for _ in range(count):
        if allow_request(store, client_id, now, limit, window_ms):
            allowed += 1
    return allowed
`

export const windowStore = `class StoreUnavailableError(Exception):
    pass


class WindowStore:
    def __init__(self):
        self.records = {}

    def add(self, key, timestamp):
        self.records.setdefault(key, []).append(timestamp)

    def count(self, key):
        return len(self.records.get(key, []))

    def remove_before(self, key, minimum):
        self.records[key] = [time for time in self.records.get(key, []) if time >= minimum]
`
