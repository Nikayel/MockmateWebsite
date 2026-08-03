# SEO-006: Post deploy verification sweep

**Phase:** 2, deploy day
**Owner:** repo owner
**Blocking:** no, but run it within an hour of the deploy
**Effort:** about 15 minutes

## Why

Tests prove things about the code. This sweep proves things about **the bytes production actually
served**, which is a different claim. The security check in step 3 is the one to run personally: a
public corpus that leaks reference solutions cannot be un-leaked, and a test passing in CI is not the
same as a page being clean on the wire.

## Do this

Run each block and compare against the expectation.

### 1. A lesson page is genuinely public

Pick a real lesson URL from the live sitemap rather than from memory, so you are testing what shipped:

```bash
URL=$(curl -s https://codesparring.dev/sitemap.xml \
  | grep -o '<loc>[^<]*/learn/[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | grep -E '/learn/[^/]+/[^/]+/[^/]+$' | shuf -n1)
echo "$URL"
curl -sI "$URL" | head -1        # expect: HTTP/2 200
```

### 2. It contains the teaching content, signed out

```bash
curl -s "$URL" | grep -c "<h1"                       # expect: 1
curl -s "$URL" | grep -c 'rel="canonical"'           # expect: 1
curl -s "$URL" | grep -c 'application/ld+json'       # expect: 2 or more
curl -s "$URL" | wc -c                               # expect: tens of KB, not a stub
```

### 3. It leaks nothing (run this one carefully)

```bash
curl -s "$URL" | grep -ci "referenceSolution\|modelAnswerOutline\|hiddenTestPaths\|testCases"
# expect: 0
```

Repeat steps 1 to 3 for **one lesson per track** (python, data-engineering, system-design). System
Design matters most here: it is free response, so its gated payload is model answers rather than
code, and it is the largest track.

### 4. The workspace is gated and noindexed

```bash
curl -sI "$URL/workspace" | grep -iE "^HTTP|^location"
# expect: a redirect to /login

curl -s https://codesparring.dev/sitemap.xml | grep -c "/workspace"
# expect: 0
```

### 5. robots and llms

```bash
curl -s https://codesparring.dev/robots.txt
# expect: Sitemap: line on the canonical host
# expect: NOTHING disallowing /learn
# expect: no Claude-Web or Anthropic-AI (retired tokens; should be ClaudeBot, Claude-User, Claude-SearchBot)

curl -sI https://codesparring.dev/llms.txt | head -1   # expect: HTTP/2 200
```

### 6. Legacy SQL URLs still resolve

```bash
curl -sI https://codesparring.dev/learn/sql | grep -iE "^HTTP|^location"
# expect: 308 to /learn/data-engineering
```

### 7. The flat index is reachable

```bash
curl -sI https://codesparring.dev/learn/all | head -1   # expect: HTTP/2 200
```

## Done when

Every block above matches its expectation, on all three tracks for steps 1 to 3.

## If step 3 ever returns non zero

Stop and treat it as an incident. Do not wait for a fix to be designed: the fastest containment is to
redeploy the previous build, because published answer keys get cached and scraped. Then reproduce
locally with:

```bash
npx vitest run lib/tutorials/__tests__/public-preview-sealing.test.ts
```

That suite runs the public projection over every lesson in the corpus and asserts no gated field
name, no gated value, and no prompt containing its own answer. If it passes while production leaks,
the bug is in a route or a component rather than the projection.
