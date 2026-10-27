"""Authored reference programs and named, plausible misconceptions (private QA)."""
from ..contracts import Program, replace_once

TWO_SUM = '''def two_sum(nums, target):
    seen = {}
    for i, value in enumerate(nums):
        if target - value in seen:
            return [seen[target - value], i]
        seen[value] = i
'''
PALINDROME = '''def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if not s[left].isalnum():
            left += 1
        elif not s[right].isalnum():
            right -= 1
        elif s[left].lower() != s[right].lower():
            return False
        else:
            left += 1
            right -= 1
    return True
'''
PARENTHESES = '''def is_valid(s):
    stack = []
    matching = {')': '(', ']': '[', '}': '{'}
    for character in s:
        if character in '([{':
            stack.append(character)
        elif not stack or stack.pop() != matching[character]:
            return False
    return not stack
'''
SUBSTRING = '''def lengthOfLongestSubstring(s):
    left = 0
    last_seen = {}
    best = 0
    for right, character in enumerate(s):
        if character in last_seen:
            left = max(left, last_seen[character] + 1)
        last_seen[character] = right
        best = max(best, right - left + 1)
    return best
'''
SEARCH = '''def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        middle = (left + right) // 2
        if nums[middle] == target:
            return middle
        if nums[middle] < target:
            left = middle + 1
        else:
            right = middle - 1
    return -1
'''
ROBBER = '''def rob(nums):
    previous, current = 0, 0
    for amount in nums:
        previous, current = current, max(current, previous + amount)
    return current
'''
COURSES = '''from collections import deque

def canFinish(numCourses, prerequisites):
    dependents = [[] for _ in range(numCourses)]
    incoming = [0] * numCourses
    for course, prerequisite in prerequisites:
        dependents[prerequisite].append(course)
        incoming[course] += 1
    ready = deque(i for i, count in enumerate(incoming) if count == 0)
    completed = 0
    while ready:
        prerequisite = ready.popleft()
        completed += 1
        for course in dependents[prerequisite]:
            incoming[course] -= 1
            if incoming[course] == 0:
                ready.append(course)
    return completed == numCourses
'''
SUBSETS = '''def subsets(nums):
    result = []
    def visit(index, chosen):
        result.append(chosen.copy())
        for i in range(index, len(nums)):
            chosen.append(nums[i])
            visit(i + 1, chosen)
            chosen.pop()
    visit(0, [])
    return result
'''
MERGE = '''def merge(intervals):
    ordered = sorted(intervals)
    result = []
    for start, end in ordered:
        if result and start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])
    return result
'''
STONES = '''import heapq

def lastStoneWeight(stones):
    heap = [-weight for weight in stones]
    heapq.heapify(heap)
    while len(heap) > 1:
        heavy, light = -heapq.heappop(heap), -heapq.heappop(heap)
        if heavy != light:
            heapq.heappush(heap, -(heavy - light))
    return -heap[0] if heap else 0
'''

PROGRAMS = {
    "dsa-two-sum": Program("two_sum", TWO_SUM, {
        "reuse-current-index": replace_once(TWO_SUM,
            '        if target - value in seen:', '        seen[value] = i\n        if target - value in seen:'),
        "skip-last-element": TWO_SUM.replace('enumerate(nums)', 'enumerate(nums[:-1])'),
        "lose-original-indices": TWO_SUM.replace('enumerate(nums)', 'enumerate(sorted(nums))'),
    }, (TWO_SUM.replace('return [seen[target - value], i]', 'return [i, seen[target - value]]'),)),
    "dsa-valid-palindrome": Program("is_palindrome", PALINDROME, {
        "ignore-digits": PALINDROME.replace('.isalnum()', '.isalpha()'),
        "case-sensitive": PALINDROME.replace('.lower()', ''),
        "keep-punctuation": 'def is_palindrome(s):\n    return s.lower() == s.lower()[::-1]\n',
    }),
    "dsa-valid-parentheses": Program("is_valid", PARENTHESES, {
        "counts-without-nesting": "def is_valid(s):\n    return all(s.count(a) == s.count(b) for a, b in [('(', ')'), ('[', ']'), ('{', '}')])\n",
        "ignore-unclosed-openers": replace_once(PARENTHESES, 'return not stack', 'return True'),
        "ignore-bracket-type": replace_once(PARENTHESES,
            'elif not stack or stack.pop() != matching[character]:', 'elif not stack:\n            return False\n        elif stack.pop() is None:'),
    }),
    "dsa-longest-substring-without-repeating": Program("lengthOfLongestSubstring", SUBSTRING, {
        "move-left-backwards": SUBSTRING.replace('max(left, last_seen[character] + 1)', 'last_seen[character] + 1'),
        "unique-count-not-contiguous": 'def lengthOfLongestSubstring(s):\n    return len(set(s))\n',
        "window-length-off-by-one": SUBSTRING.replace('right - left + 1', 'right - left'),
    }),
    "dsa-binary-search": Program("search", SEARCH, {
        "exclude-final-position": SEARCH.replace('left <= right', 'left < right'),
        "return-value-not-index": SEARCH.replace('return middle', 'return nums[middle]'),
        "missing-target-is-zero": SEARCH.replace('return -1', 'return 0'),
    }),
    "dsa-house-robber": Program("rob", ROBBER, {
        "alternating-parity-only": 'def rob(nums):\n    return max(sum(nums[::2]), sum(nums[1::2]))\n',
        "largest-house-only": 'def rob(nums):\n    return max(nums)\n',
        "return-previous-state": replace_once(ROBBER, 'return current', 'return previous'),
    }),
    "dsa-course-schedule": Program("canFinish", COURSES, {
        "check-only-course-zero": '''def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[a].append(b)
    active, done = set(), set()
    def visit(course):
        if course in active:
            return False
        if course in done:
            return True
        active.add(course)
        if not all(visit(p) for p in graph[course]):
            return False
        active.remove(course)
        done.add(course)
        return True
    return visit(0)
''',
        "any-dependency-is-cycle": 'def canFinish(numCourses, prerequisites):\n    return not prerequisites\n',
        "ignore-isolated-courses": COURSES.replace('return completed == numCourses', 'return completed == len({v for pair in prerequisites for v in pair})'),
    }),
    "dsa-subsets": Program("subsets", SUBSETS, {
        "omit-empty-subset": replace_once(SUBSETS, 'return result', 'return [row for row in result if row]'),
        "duplicate-subset": replace_once(SUBSETS, 'return result', 'return result + [[]]'),
        "alias-mutable-path": SUBSETS.replace('chosen.copy()', 'chosen'),
    }, ("import itertools\ndef subsets(nums):\n    return [list(reversed(row)) for n in range(len(nums), -1, -1) for row in itertools.combinations(nums, n)]\n",)),
    "dsa-merge-intervals": Program("merge", MERGE, {
        "touching-is-disjoint": MERGE.replace('start <= result[-1][1]', 'start < result[-1][1]'),
        "shrink-containing-interval": MERGE.replace('max(result[-1][1], end)', 'end'),
        "assume-sorted-input": MERGE.replace('sorted(intervals)', 'intervals'),
    }),
    "dsa-last-stone-weight": Program("lastStoneWeight", STONES, {
        "smash-smallest-first": STONES.replace('[-weight for weight in stones]', '[weight for weight in stones]').replace('-heapq.heappop(heap)', 'heapq.heappop(heap)').replace('-(heavy - light)', 'abs(heavy - light)').replace('-heap[0]', 'heap[0]'),
        "retain-equal-stone": STONES.replace('        if heavy != light:', '        if heavy == light:\n            heapq.heappush(heap, -heavy)\n        if heavy != light:'),
        "empty-result-is-one": STONES.replace('if heap else 0', 'if heap else 1'),
    }),
}
