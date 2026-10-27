"""Simple independent algorithms for small-domain differential checks."""
from __future__ import annotations

import itertools

from ..contracts import Json, Oracle


def two_sum(inputs: dict[str, Json]) -> Json:
    nums, target = inputs["nums"], inputs["target"]
    pairs = [[i, j] for i in range(len(nums)) for j in range(i + 1, len(nums))
             if nums[i] + nums[j] == target]
    if len(pairs) != 1:
        raise ValueError("Two Sum benchmark inputs must have exactly one solution")
    return pairs[0]


def palindrome(inputs: dict[str, Json]) -> Json:
    cleaned = "".join(c.lower() for c in inputs["s"] if c.isalnum())
    return cleaned == cleaned[::-1]


def parentheses(inputs: dict[str, Json]) -> Json:
    remaining = inputs["s"]
    while True:
        reduced = remaining.replace("()", "").replace("[]", "").replace("{}", "")
        if reduced == remaining:
            return not remaining
        remaining = reduced


def substring(inputs: dict[str, Json]) -> Json:
    s = inputs["s"]
    best = 0
    for start in range(len(s)):
        seen = set()
        for c in s[start:]:
            if c in seen:
                break
            seen.add(c)
            best = max(best, len(seen))
    return best


def binary_search(inputs: dict[str, Json]) -> Json:
    try:
        return inputs["nums"].index(inputs["target"])
    except ValueError:
        return -1


def robber(inputs: dict[str, Json]) -> Json:
    nums = inputs["nums"]
    return max(sum(nums[i] for i in range(len(nums)) if mask & (1 << i))
               for mask in range(1 << len(nums)) if not mask & (mask << 1))


def courses(inputs: dict[str, Json]) -> Json:
    n = inputs["numCourses"]
    reachable = [[False] * n for _ in range(n)]
    for course, prerequisite in inputs["prerequisites"]:
        reachable[prerequisite][course] = True
    for middle in range(n):
        for start in range(n):
            for end in range(n):
                reachable[start][end] |= reachable[start][middle] and reachable[middle][end]
    return not any(reachable[i][i] for i in range(n))


def subsets(inputs: dict[str, Json]) -> Json:
    nums = inputs["nums"]
    return [list(group) for n in range(len(nums) + 1) for group in itertools.combinations(nums, n)]


def intervals(inputs: dict[str, Json]) -> Json:
    groups = [list(pair) for pair in inputs["intervals"]]
    while True:
        for i, j in itertools.combinations(range(len(groups)), 2):
            a, b = groups[i], groups[j]
            if max(a[0], b[0]) <= min(a[1], b[1]):
                groups[i] = [min(a[0], b[0]), max(a[1], b[1])]
                groups.pop(j)
                break
        else:
            return sorted(groups)


def stones(inputs: dict[str, Json]) -> Json:
    pile = list(inputs["stones"])
    while len(pile) > 1:
        pile.sort()
        heavy, light = pile.pop(), pile.pop()
        if heavy != light:
            pile.append(heavy - light)
    return pile[0] if pile else 0


ORACLES: dict[str, Oracle] = {
    "dsa-two-sum": two_sum, "dsa-valid-palindrome": palindrome,
    "dsa-valid-parentheses": parentheses,
    "dsa-longest-substring-without-repeating": substring,
    "dsa-binary-search": binary_search, "dsa-house-robber": robber,
    "dsa-course-schedule": courses, "dsa-subsets": subsets,
    "dsa-merge-intervals": intervals, "dsa-last-stone-weight": stones,
}
