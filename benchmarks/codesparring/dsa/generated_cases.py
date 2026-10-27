"""Seeded small-domain fixtures, evaluated by independent algorithms."""
from __future__ import annotations

import random

from ..contracts import Json


def generate(task_id: str, rng: random.Random, count: int = 64) -> list[dict[str, Json]]:
    result = []
    while len(result) < count:
        n = rng.randint(1, 8)
        if task_id == "dsa-two-sum":
            nums = [rng.randint(-12, 12) for _ in range(rng.randint(2, 12))]
            i, j = rng.sample(range(len(nums)), 2)
            target = nums[i] + nums[j]
            if sum(nums[a] + nums[b] == target for a in range(len(nums))
                   for b in range(a + 1, len(nums))) != 1:
                continue
            inputs = {"nums": nums, "target": target}
        elif task_id == "dsa-valid-palindrome":
            s = "".join(rng.choices("aAbB019 ,.!_", k=rng.randint(1, 30)))
            if len(result) % 2 == 0:
                s = s + s[::-1]
            inputs = {"s": s}
        elif task_id == "dsa-valid-parentheses":
            s = "".join(rng.choices("()[]{}", k=rng.randint(0, 20)))
            if len(result) % 2 == 0:
                opening = rng.choices("([{", k=rng.randint(0, 10))
                closing = {"(": ")", "[": "]", "{": "}"}
                s = "".join(opening) + "".join(closing[c] for c in reversed(opening))
            inputs = {"s": s}
        elif task_id == "dsa-longest-substring-without-repeating":
            inputs = {"s": "".join(rng.choices("abcde12 !", k=rng.randint(0, 24)))}
        elif task_id == "dsa-binary-search":
            nums = sorted(rng.sample(range(-99, 100), n))
            inputs = {"nums": nums, "target": rng.choice(nums) if len(result) % 2 else rng.randint(-100, 100)}
        elif task_id == "dsa-house-robber":
            inputs = {"nums": [rng.randint(0, 30) for _ in range(n)]}
        elif task_id == "dsa-course-schedule":
            n = rng.randint(1, 7)
            pairs = [(a, b) for a in range(n) for b in range(n)]
            inputs = {"numCourses": n, "prerequisites": [list(pair) for pair in rng.sample(pairs, rng.randint(0, len(pairs)))]}
        elif task_id == "dsa-subsets":
            inputs = {"nums": rng.sample(range(-10, 11), rng.randint(1, 6))}
        elif task_id == "dsa-merge-intervals":
            inputs = {"intervals": [sorted([rng.randint(0, 40), rng.randint(0, 40)]) for _ in range(n)]}
        elif task_id == "dsa-last-stone-weight":
            inputs = {"stones": [rng.randint(1, 30) for _ in range(rng.randint(1, 30))]}
        else:
            raise ValueError(f"Unknown DSA task: {task_id}")
        result.append(inputs)
    return result
