"""Contract-valid boundaries and counterexamples; no out-of-domain trick inputs."""
from ..contracts import Json

EDGE_INPUTS: dict[str, list[dict[str, Json]]] = {
    "dsa-two-sum": [
        {"nums": [3, 3], "target": 6}, {"nums": [3, 2, 4], "target": 6},
        {"nums": [0, 4, 3, 0], "target": 0}, {"nums": [-10, 5, 2], "target": -8},
        {"nums": [1, 8, 4, 6], "target": 10}, {"nums": [5, 1, 9], "target": 10},
    ],
    "dsa-valid-palindrome": [
        {"s": "0P"}, {"s": "aA"}, {"s": "?!"}, {"s": "1a2"},
        {"s": "ab_a"}, {"s": "a."}, {"s": "9"}, {"s": "No lemon, no melon!"},
    ],
    "dsa-valid-parentheses": [
        {"s": ""}, {"s": "([)]"}, {"s": ")("}, {"s": "((("},
        {"s": "{[()]}"}, {"s": "()[]{}"}, {"s": "[}"}, {"s": "(()())"},
    ],
    "dsa-longest-substring-without-repeating": [
        {"s": "abba"}, {"s": "dvdf"}, {"s": "tmmzuxt"}, {"s": "a"},
        {"s": ""}, {"s": "a b a"}, {"s": "abcadef"}, {"s": "pwwkew"},
    ],
    "dsa-binary-search": [
        {"nums": [5], "target": 5}, {"nums": [5], "target": -5},
        {"nums": [1, 2], "target": 2}, {"nums": [-9, -2, 4], "target": -2},
        {"nums": [-9, -2, 4], "target": 0}, {"nums": [0], "target": 0},
    ],
    "dsa-house-robber": [
        {"nums": [2, 1, 1, 2]}, {"nums": [3, 4, 3]}, {"nums": [0]},
        {"nums": [400]}, {"nums": [1, 400]}, {"nums": [10, 1, 1, 10, 1, 10]},
    ],
    "dsa-course-schedule": [
        {"numCourses": 1, "prerequisites": []},
        {"numCourses": 1, "prerequisites": [[0, 0]]},
        {"numCourses": 4, "prerequisites": [[2, 3], [3, 2]]},
        {"numCourses": 4, "prerequisites": [[1, 0], [2, 0], [3, 1], [3, 2]]},
        {"numCourses": 5, "prerequisites": [[2, 1]]},
        {"numCourses": 3, "prerequisites": [[1, 0], [2, 1]]},
    ],
    "dsa-subsets": [
        {"nums": [0]}, {"nums": [-2, 5]}, {"nums": [3, 1, 2]},
        {"nums": [-10, 0, 10]}, {"nums": [5, -3, 0, 2]},
    ],
    "dsa-merge-intervals": [
        {"intervals": [[1, 4], [4, 5]]}, {"intervals": [[1, 9], [2, 3]]},
        {"intervals": [[8, 10], [1, 2], [2, 6]]},
        {"intervals": [[0, 0], [0, 0], [1, 1]]},
        {"intervals": [[3, 3], [1, 3], [3, 5]]},
        {"intervals": [[2, 4], [2, 8], [0, 1]]},
    ],
    "dsa-last-stone-weight": [
        {"stones": [2, 2]}, {"stones": [10]}, {"stones": [1, 1, 1]},
        {"stones": [2, 7, 4, 1, 8, 1]}, {"stones": [1, 3, 8]},
        {"stones": [1000, 999]}, {"stones": [3, 3, 3, 3]},
    ],
}

STRESS_CASES: dict[str, tuple[dict[str, Json], Json]] = {
    "dsa-two-sum": ({"nums": list(range(10000)), "target": 19997}, [9998, 9999]),
    "dsa-valid-palindrome": ({"s": "a" * 199999 + "b"}, False),
    "dsa-valid-parentheses": ({"s": "(" * 5000 + ")" * 5000}, True),
    "dsa-longest-substring-without-repeating": ({"s": "abcd" * 12500}, 4),
    "dsa-binary-search": ({"nums": list(range(-5000, 5000)), "target": 4999}, 9999),
    "dsa-house-robber": ({"nums": [400] * 100}, 20000),
    "dsa-course-schedule": ({"numCourses": 2000,
                             "prerequisites": [[i, i - 1] for i in range(1, 2000)]}, True),
    "dsa-merge-intervals": ({"intervals": [[i, i + 1] for i in range(10000)]}, [[0, 10000]]),
    "dsa-last-stone-weight": ({"stones": [1000] * 30}, 0),
}
