export const visibleTests = `from window_store import WindowStore, StoreUnavailableError
from rate_limiter import allow_request, simulate_burst


def run_tests(record):
    def healthy_requests():
        store = WindowStore()
        assert allow_request(store, "client", 1000, 3, 60000) is True
        assert simulate_burst(store, "client", 5, 1000, 3, 60000) == 2
        assert store.count("rl:client") == 3

    def storage_outage():
        store = WindowStore()
        def unavailable(key):
            raise StoreUnavailableError("read timed out")
        store.count = unavailable
        assert allow_request(store, "client", 1000, 3, 60000) is False
        assert store.records.get("rl:client", []) == []

    def unexpected_error():
        store = WindowStore()
        failure = TypeError("invalid store response")
        def invalid(key):
            raise failure
        store.count = invalid
        try:
            allow_request(store, "client", 1000, 3, 60000)
        except TypeError as error:
            assert error is failure
        else:
            raise AssertionError("The unexpected error never reached the caller")

    record("healthy single requests and bursts respect the plan", healthy_requests)
    record("a storage outage does not admit an unverified request", storage_outage)
    record("an unexpected error remains visible to the caller", unexpected_error)
`

export const hiddenTests = `from window_store import WindowStore, StoreUnavailableError
from rate_limiter import allow_request, simulate_burst


def raises_same(fn, failure):
    try:
        fn()
    except BaseException as error:
        assert error is failure, "The original exception must reach the caller unchanged"
    else:
        raise AssertionError("Expected the original exception to propagate")


def failing_method(failure):
    def fail(*args):
        raise failure
    return fail


def run_tests(record):
    def cleanup_failure():
        store = WindowStore()
        later_calls = []
        store.remove_before = failing_method(StoreUnavailableError("cleanup timed out"))
        store.count = store.add = lambda *args: later_calls.append(args)
        assert allow_request(store, "client", 1000, 3, 60000) is False
        assert later_calls == []

    def failed_reservation():
        store = WindowStore()
        attempts = []
        def add(*args):
            attempts.append(args)
            raise StoreUnavailableError("write timed out")
        store.add = add
        assert allow_request(store, "client", 1000, 3, 60000) is False
        assert len(attempts) == 1
        assert store.count("rl:client") == 0

    def lost_acknowledgment():
        store = WindowStore()
        original_add = store.add
        attempts = []
        def add(key, timestamp):
            attempts.append((key, timestamp))
            original_add(key, timestamp)
            raise StoreUnavailableError("acknowledgment lost")
        store.add = add
        assert allow_request(store, "client", 1000, 3, 60000) is False
        assert len(attempts) == 1
        assert store.count("rl:client") == 1
        store.add = original_add
        assert simulate_burst(store, "client", 5, 1001, 3, 60000) == 2

    def recovery():
        store = WindowStore()
        original_count = store.count
        store.count = failing_method(StoreUnavailableError("temporarily unavailable"))
        assert allow_request(store, "client", 1000, 1, 60000) is False
        store.count = original_count
        assert allow_request(store, "client", 1001, 1, 60000) is True
        assert allow_request(store, "client", 1002, 1, 60000) is False

    def unexpected_failures():
        for operation in ("remove_before", "count", "add"):
            store = WindowStore()
            failure = ValueError("unexpected " + operation + " failure")
            setattr(store, operation, failing_method(failure))
            raises_same(lambda: allow_request(store, "client", 1000, 3, 60000), failure)

    def unrelated_class():
        # A matching class name or message is not the exported outage type.
        impostor = type("StoreUnavailableError", (Exception,), {})
        for failure in (impostor("read timed out"), RuntimeError("StoreUnavailableError")):
            store = WindowStore()
            store.count = failing_method(failure)
            raises_same(lambda: allow_request(store, "client", 1000, 3, 60000), failure)

    def process_control():
        for failure in (KeyboardInterrupt(), SystemExit(2), GeneratorExit()):
            store = WindowStore()
            store.count = failing_method(failure)
            raises_same(lambda: allow_request(store, "client", 1000, 3, 60000), failure)

    def burst_failures():
        store = WindowStore()
        store.count = failing_method(StoreUnavailableError("read timed out"))
        assert simulate_burst(store, "client", 4, 1000, 3, 60000) == 0
        failure = ValueError("invalid timestamp")
        store.count = failing_method(failure)
        raises_same(lambda: simulate_burst(store, "client", 4, 1000, 3, 60000), failure)

    def healthy_boundaries():
        store = WindowStore()
        store.add("rl:client", 39999)
        store.add("rl:client", 40000)
        assert simulate_burst(store, "client", 5, 100000, 3, 60000) == 2
        assert allow_request(store, "client", 100000, 3, 60000) is False
        assert allow_request(store, "other", 100000, 1, 60000) is True
        assert store.count("rl:client") == 3

    record("cleanup failure ends the decision before later store calls", cleanup_failure)
    record("a failed reservation is denied without a retry", failed_reservation)
    record("a lost write acknowledgment neither retries nor rolls back usage", lost_acknowledgment)
    record("the next request can succeed after storage recovers", recovery)
    record("unexpected failures propagate unchanged from every store operation", unexpected_failures)
    record("an error name or message alone does not identify a storage outage", unrelated_class)
    record("process-control exceptions propagate unchanged", process_control)
    record("a burst excludes unavailable decisions and preserves unexpected failures", burst_failures)
    record("expiry, inclusive boundaries, identical timestamps and client isolation still work", healthy_boundaries)
`
