"""Fail closed on fixtures outside the selected scenarios' documented domains."""
from collections import Counter

from ..contracts import Json


def integers(values: Json, minimum: int, maximum: int) -> bool:
    return isinstance(values, list) and all(type(value) is int and minimum <= value <= maximum for value in values)


def valid_inputs(task_id: str, inputs: dict[str, Json]) -> bool:
    if task_id == "dsa-two-sum":
        nums, target = inputs.get("nums"), inputs.get("target")
        if not integers(nums, -10**9, 10**9) or not 2 <= len(nums) <= 10000:
            return False
        if type(target) is not int or not -10**9 <= target <= 10**9:
            return False
        counts = Counter(nums)
        pairs = sum(count * counts[target - value] if value < target - value
                    else count * (count - 1) // 2 if value == target - value else 0
                    for value, count in counts.items())
        return pairs == 1
    if task_id in {"dsa-valid-palindrome", "dsa-valid-parentheses", "dsa-longest-substring-without-repeating"}:
        s = inputs.get("s")
        if not isinstance(s, str):
            return False
        if task_id == "dsa-valid-palindrome":
            return 1 <= len(s) <= 200000 and all(32 <= ord(c) <= 126 for c in s)
        if task_id == "dsa-valid-parentheses":
            return len(s) <= 10000 and all(c in "()[]{}" for c in s)
        return len(s) <= 50000 and all(32 <= ord(c) <= 126 for c in s)
    if task_id == "dsa-binary-search":
        nums, target = inputs.get("nums"), inputs.get("target")
        return (integers(nums, -9999, 9999) and 1 <= len(nums) <= 10000
                and nums == sorted(set(nums)) and type(target) is int and -9999 <= target <= 9999)
    if task_id == "dsa-house-robber":
        nums = inputs.get("nums")
        return integers(nums, 0, 400) and 1 <= len(nums) <= 100
    if task_id == "dsa-course-schedule":
        n, edges = inputs.get("numCourses"), inputs.get("prerequisites")
        return (type(n) is int and 1 <= n <= 2000 and isinstance(edges, list) and len(edges) <= 5000
                and all(integers(pair, 0, n - 1) and len(pair) == 2 for pair in edges)
                and len({tuple(pair) for pair in edges}) == len(edges))
    if task_id == "dsa-subsets":
        nums = inputs.get("nums")
        return integers(nums, -10, 10) and 1 <= len(nums) <= 10 and len(set(nums)) == len(nums)
    if task_id == "dsa-merge-intervals":
        pairs = inputs.get("intervals")
        return (isinstance(pairs, list) and 1 <= len(pairs) <= 10000
                and all(integers(pair, 0, 10000) and len(pair) == 2 and pair[0] <= pair[1] for pair in pairs))
    if task_id == "dsa-last-stone-weight":
        stones = inputs.get("stones")
        return integers(stones, 1, 1000) and 1 <= len(stones) <= 30
    return False
