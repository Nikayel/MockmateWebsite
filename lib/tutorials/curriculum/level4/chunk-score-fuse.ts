/**
 * L4: chunking, cosine scoring, and reciprocal rank fusion, written by hand.
 *
 * No embedding model, and none is missing. The sandbox is Pyodide 0.26.4, which is the CPython 3.12
 * standard library and nothing else, so the vectors and the retriever scores are given. That is the
 * right shape for this material anyway: the interesting content of a retrieval pipeline is the
 * arithmetic between the model calls, and a learner who has written reciprocal rank fusion once
 * stops believing that two retrievers' scores can be added together.
 *
 * Time budget (counted, not guessed). Teach 7: ~950 prose words, three checks, five code fences.
 * Apply 11: 5 provided lines to read, 27 to write across three functions. Practice 32: 50 lines of
 * README, 20 of read-only corpus, 24 to write across two files, plus the two ranked lists to read
 * before any of it. 7 + 11 + 32 = 50, the lesson total.
 *
 * Ramp: practice reference is 24 real lines against an apply reference of 27, a ratio of 0.89x.
 * Apply turns one score list into a ranked answer; Practice turns two incomparable ones into a
 * single ranked answer, which is one idea further on and the whole reason the lesson exists.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const FUSE_README = buildBrief({
  lesson: "py-l4-chunk-score-fuse",
  kind: "bug-report",
  headline: "hybrid search sends the wrong passage to the model",
  body: `The answer quality drop traces to the reranker, not the model. Hybrid search runs two retrievers over
the same query and merges them by adding their scores together. The dense retriever returns cosine
similarity, which lives between 0 and 1. The keyword retriever returns BM25, which has no upper
bound and routinely returns 12 or 18 on this corpus. Adding them means the keyword retriever decides
every ranking on its own, and the dense retriever contributes a rounding error.

There is a second defect in the same merge. A passage that only one retriever returned is dropped
entirely, because the merge walks the passages the two lists have in common.

\`retrieval/corpus.py\` is read-only and holds one query's output from both retrievers, in their own
units, plus \`RRF_K\`. Two files are yours.

## \`retrieval/ranking.py\`

\`\`\`python
rank_by_score(scores)                 # -> [doc_id, ...] best first
reciprocal_rank_fusion(rankings, k)   # -> {doc_id: fused_score}
\`\`\`

\`rank_by_score\` takes a \`{doc_id: score}\` mapping and returns the ids in ranked order, highest
score first. Equal scores are ordered by id, ascending, so the same input always ranks the same way.
A ranking that moves between runs makes every downstream comparison meaningless.

\`reciprocal_rank_fusion\` takes a list of rankings and returns one score per document:

    for each ranking that contains the document, add 1 / (k + rank)

\`rank\` counts from 1, so the top of a list contributes \`1 / (k + 1)\`. A document appearing in two
rankings adds up two terms; a document appearing in one adds up one and still gets a score. \`k\`
defaults to \`RRF_K\`.

## \`retrieval/hybrid.py\`

\`\`\`python
hybrid_search(dense, keyword, top_n, k=RRF_K)  # -> [[doc_id, score], ...]
explain(dense, keyword, doc, k=RRF_K)          # -> where one document placed
\`\`\`

\`hybrid_search\` ranks each retriever on its own scale, fuses the two rankings, and returns the
best \`top_n\` as \`[doc_id, score]\` pairs, ordered by fused score with ties broken by id.
Scores are rounded to 6 decimal places. Asking for more than the corpus holds returns what there is.

\`explain\` answers "why is this passage here", which is the question every retrieval bug starts
with:

\`\`\`python
{"dense_rank": 1, "keyword_rank": 3, "fused": 0.032266}
\`\`\`

A rank is \`None\` when that retriever did not return the document at all, which is different from
returning it last. A document neither retriever returned fuses to \`0.0\` with two \`None\` ranks.
`,
})

const FUSE_CORPUS = String.raw`"""Read-only. What the two retrievers returned for one query, each in its own units."""

# The embedding retriever. Cosine similarity, so every score sits between 0 and 1.
DENSE_SCORES = {"p1": 0.81, "p2": 0.79, "p3": 0.78, "p5": 0.40}

# The keyword retriever. BM25, which has no upper bound and is not comparable to the above.
KEYWORD_SCORES = {"p2": 18.4, "p4": 12.1, "p1": 3.2, "p3": 1.1}

# The damping constant from the reciprocal rank fusion paper.
RRF_K = 60

# What each passage is about, so a failure names a document instead of an id.
TITLES = {
    "p1": "cache warm-up on deploy",
    "p2": "cache eviction policy",
    "p3": "cache key design",
    "p4": "cache stampede and the thundering herd",
    "p5": "CDN edge caching",
}
`

const FUSE_RANKING_STARTER = String.raw`from retrieval.corpus import RRF_K


def rank_by_score(scores):
    """Return the document ids in ranked order, see README.md."""
    # TODO: best score first, and a tie has to land the same way on every run.
    return list(scores)


def reciprocal_rank_fusion(rankings, k=RRF_K):
    """Return {doc_id: fused_score} across every ranking, see README.md."""
    # TODO: what a document contributes comes from where it placed, not from its score.
    return {doc: 0.0 for ranking in rankings for doc in ranking}
`

const FUSE_RANKING_REFERENCE = String.raw`from retrieval.corpus import RRF_K


def rank_by_score(scores):
    return [doc for doc, _ in sorted(scores.items(), key=lambda pair: (-pair[1], pair[0]))]


def reciprocal_rank_fusion(rankings, k=RRF_K):
    fused = {}
    for ranking in rankings:
        for position, doc in enumerate(ranking):
            fused[doc] = fused.get(doc, 0.0) + 1.0 / (k + position + 1)
    return fused
`

const FUSE_HYBRID_STARTER = String.raw`from retrieval.corpus import RRF_K
from retrieval.ranking import rank_by_score, reciprocal_rank_fusion


def hybrid_search(dense, keyword, top_n, k=RRF_K):
    """Return the fused top_n as [[doc_id, score], ...], see README.md."""
    # TODO: rank each retriever on its own scale first, then fuse the two rankings.
    return [[doc, round(score, 6)] for doc, score in dense.items()][:top_n]


def explain(dense, keyword, doc, k=RRF_K):
    """Return where one document placed in each list, and what it fused to. See README.md."""
    # TODO: a document that only one retriever found still has an answer here.
    return {"dense_rank": 1, "keyword_rank": 1, "fused": 0.0}
`

const FUSE_HYBRID_REFERENCE = String.raw`from retrieval.corpus import RRF_K
from retrieval.ranking import rank_by_score, reciprocal_rank_fusion


def hybrid_search(dense, keyword, top_n, k=RRF_K):
    fused = reciprocal_rank_fusion([rank_by_score(dense), rank_by_score(keyword)], k)
    ordered = sorted(fused.items(), key=lambda pair: (-pair[1], pair[0]))
    return [[doc, round(score, 6)] for doc, score in ordered[:top_n]]


def explain(dense, keyword, doc, k=RRF_K):
    dense_ranking = rank_by_score(dense)
    keyword_ranking = rank_by_score(keyword)
    fused = reciprocal_rank_fusion([dense_ranking, keyword_ranking], k)
    return {
        "dense_rank": dense_ranking.index(doc) + 1 if doc in dense_ranking else None,
        "keyword_rank": keyword_ranking.index(doc) + 1 if doc in keyword_ranking else None,
        "fused": round(fused.get(doc, 0.0), 6),
    }
`

const FUSE_TEST_RANKING = String.raw`from retrieval.ranking import rank_by_score, reciprocal_rank_fusion


def run_tests(record):
    def ranks_run_from_the_best_score_down():
        got = rank_by_score({"p1": 0.2, "p2": 0.9, "p3": 0.5})
        assert got == ["p2", "p3", "p1"], f"expected ['p2', 'p3', 'p1'], got {got!r}"

    def a_tie_is_broken_by_id():
        got = rank_by_score({"b": 1.0, "a": 1.0, "c": 0.5})
        assert got == ["a", "b", "c"], f"expected ['a', 'b', 'c'], got {got!r}"

    def the_first_rank_is_one_not_zero():
        fused = reciprocal_rank_fusion([["p1", "p2"]], 1)
        got = round(fused["p1"], 6)
        assert got == 0.5, f"expected 1/(1 + 1) = 0.5 for the top document, got {got}"
        assert round(fused["p2"], 6) == 0.333333, f"expected 1/(1 + 2), got {fused['p2']!r}"

    def two_lists_add_up():
        fused = reciprocal_rank_fusion([["a", "b"], ["b", "a"]], 1)
        assert round(fused["a"], 6) == 0.833333, f"expected 1/2 + 1/3, got {fused['a']!r}"
        assert round(fused["b"], 6) == 0.833333, f"expected 1/3 + 1/2, got {fused['b']!r}"

    record("ranks run from the best score down", ranks_run_from_the_best_score_down)
    record("a tie is broken by id", a_tie_is_broken_by_id)
    record("the first rank is one, not zero", the_first_rank_is_one_not_zero)
    record("two lists add up", two_lists_add_up)
`

const FUSE_TEST_HYBRID = String.raw`from retrieval.corpus import DENSE_SCORES, KEYWORD_SCORES, TITLES
from retrieval.hybrid import explain, hybrid_search


def run_tests(record):
    def the_fused_top_three():
        got = [doc for doc, _ in hybrid_search(DENSE_SCORES, KEYWORD_SCORES, 3)]
        expected = ["p2", "p1", "p3"]
        assert got == expected, (
            f"expected {[TITLES[doc] for doc in expected]}, got {[TITLES[doc] for doc in got]}"
        )

    def the_fused_scores_are_the_reciprocal_ranks():
        got = hybrid_search(DENSE_SCORES, KEYWORD_SCORES, 2)
        expected = [["p2", 0.032522], ["p1", 0.032266]]
        assert got == expected, f"expected {expected}, got {got!r}"

    def a_document_only_one_retriever_found_still_ranks():
        ranked = [doc for doc, _ in hybrid_search(DENSE_SCORES, KEYWORD_SCORES, 5)]
        assert "p4" in ranked, f"p4 is in the keyword list only and was dropped: {ranked!r}"
        assert "p5" in ranked, f"p5 is in the dense list only and was dropped: {ranked!r}"

    def explain_names_both_ranks():
        got = explain(DENSE_SCORES, KEYWORD_SCORES, "p1")
        expected = {"dense_rank": 1, "keyword_rank": 3, "fused": 0.032266}
        assert got == expected, f"expected {expected}, got {got!r}"

    record("the fused top three", the_fused_top_three)
    record("the fused scores are the reciprocal ranks", the_fused_scores_are_the_reciprocal_ranks)
    record("a document only one retriever found still ranks", a_document_only_one_retriever_found_still_ranks)
    record("explain names both ranks", explain_names_both_ranks)
`

const FUSE_TEST_HIDDEN = String.raw`from retrieval.corpus import DENSE_SCORES, KEYWORD_SCORES
from retrieval.hybrid import explain, hybrid_search


def run_tests(record):
    def the_keyword_scale_does_not_win_on_its_own():
        ranked = [doc for doc, _ in hybrid_search(DENSE_SCORES, KEYWORD_SCORES, 5)]
        assert ranked.index("p1") < ranked.index("p4"), (
            "p4 outranked p1, which is what adding the raw scores does: one BM25 score of 12.1 "
            f"buries every cosine in the dense list. Ranking got {ranked!r}"
        )

    def a_missing_document_has_no_rank_there():
        got = explain(DENSE_SCORES, KEYWORD_SCORES, "p4")
        expected = {"dense_rank": None, "keyword_rank": 2, "fused": 0.016129}
        assert got == expected, f"expected {expected}, got {got!r}"

    def an_unknown_document_scores_zero():
        got = explain(DENSE_SCORES, KEYWORD_SCORES, "p9")
        expected = {"dense_rank": None, "keyword_rank": None, "fused": 0.0}
        assert got == expected, f"expected {expected}, got {got!r}"

    def a_fused_tie_is_broken_by_id():
        got = hybrid_search({"a": 1.0, "b": 0.5}, {"b": 9.0, "a": 1.0}, 2)
        expected = [["a", 0.032522], ["b", 0.032522]]
        assert got == expected, f"expected {expected}, got {got!r}"

    def an_empty_retriever_contributes_nothing():
        got = hybrid_search({}, {"x": 4.0, "y": 1.0}, 2)
        expected = [["x", 0.016393], ["y", 0.016129]]
        assert got == expected, f"expected {expected}, got {got!r}"

    def top_n_past_the_end_returns_everything():
        got = hybrid_search(DENSE_SCORES, KEYWORD_SCORES, 99)
        assert len(got) == 5, f"expected all 5 documents, got {len(got)}"

    record("the keyword scale does not win on its own", the_keyword_scale_does_not_win_on_its_own)
    record("a missing document has no rank there", a_missing_document_has_no_rank_there)
    record("an unknown document scores zero", an_unknown_document_scores_zero)
    record("a fused tie is broken by id", a_fused_tie_is_broken_by_id)
    record("an empty retriever contributes nothing", an_empty_retriever_contributes_nothing)
    record("top_n past the end returns everything", top_n_past_the_end_returns_everything)
`

const FUSE_APPLY_TAIL = String.raw`def search(text, size, overlap, vectors, query, k):
    """Graded entry point: the chunks you cut, and the vectors that scored best."""
    windows = chunk_tokens(text.split(), size, overlap)
    return {"chunks": [" ".join(window) for window in windows], "top": top_k(vectors, query, k)}
`

const FUSE_APPLY_STARTER = `import math


def chunk_tokens(tokens, size, overlap):
    """Return the overlapping windows, see the task above."""
    # The step between window starts is not the window size.
    return []


def cosine(left, right):
    """Return the cosine similarity of two equal-length vectors, see the task above."""
    # A dot product, divided by both lengths.
    return 0.0


def top_k(vectors, query, k):
    """Return the k best [index, score] pairs, see the task above."""
    # Score every vector, then order the scores. Ties are decided by index.
    return []


${FUSE_APPLY_TAIL}`

const FUSE_APPLY_REFERENCE = `import math


def chunk_tokens(tokens, size, overlap):
    step = size - overlap
    windows = []
    for start in range(0, len(tokens), step):
        window = tokens[start:start + size]
        if not window:
            break
        windows.append(window)
        if start + size >= len(tokens):
            break
    return windows


def cosine(left, right):
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def top_k(vectors, query, k):
    scored = [(round(cosine(vector, query), 4), index) for index, vector in enumerate(vectors)]
    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    return [[index, score] for score, index in scored[:k]]


${FUSE_APPLY_TAIL}`

export const chunkScoreFuseLesson: PythonLesson = {
  id: "py-l4-chunk-score-fuse",
  title: "Chunk, score and fuse a retrieval set",
  summary:
    "Cut overlapping chunks, score them with cosine similarity, and merge two retrievers by rank instead of by score.",
  estimatedMinutes: 50,
  difficulty: "hard",
  skills: ["retrieval", "chunking", "cosine-similarity", "rank-fusion"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Retrieval is three small functions and one bad habit

Between the embedding model and the language model sits a pipeline that is almost entirely arithmetic: cut the documents up, score the pieces against the query, keep the best few, and merge the results of however many retrievers you are running. None of it needs a library, and writing it once is the difference between using a retrieval stack and being able to debug one. The bad habit in the title is the last step, and it is the one that quietly decides what your model gets to read.

### Chunking, and why the windows overlap

A retriever scores whole chunks, so a chunk has to be small enough to be about one thing and large enough to stand on its own. Cut a document into adjacent, non-overlapping pieces and every boundary lands in the middle of some sentence, splitting a claim from the qualifier that made it true. Overlapping windows buy that back: consecutive chunks share their last few tokens, so a statement that straddles a boundary survives whole inside one of them.

The units here are tokens, and for this lesson a token is a whitespace-separated word. Real tokenizers differ, and the arithmetic does not.

\`\`\`python
def windows(tokens, size, overlap):
    step = size - overlap
    return [tokens[start:start + size] for start in range(0, len(tokens), step)]


print(windows(["a", "b", "c", "d", "e"], 3, 1))
# [['a', 'b', 'c'], ['c', 'd', 'e'], ['e']]
\`\`\`

Two things fall out of that. The step is \`size - overlap\`, not \`size\`, and getting that wrong is the most common chunking bug there is. And the last window can be a stub: \`['e']\` here adds no token that \`['c', 'd', 'e']\` did not already carry, so it is an extra row in the index that can never be the best answer to anything.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "overlap-equals-size",
  "prompt": "A config sets the chunk size to 400 tokens and the overlap to 400, on the reasoning that more overlap means more context. What does the chunker do?",
  "options": [
    {
      "label": "It produces one chunk per document, since every window covers everything",
      "feedback": "That is what full overlap sounds like it should mean. Overlap is subtracted from the size to get the step, so the size and the overlap being equal is a statement about the step, not about the window."
    },
    {
      "label": "The step becomes zero, so it never advances: an empty range or an endless loop",
      "correct": true,
      "feedback": "Right. range with a step of 0 raises ValueError, and the hand-rolled while-loop version of the same code hangs instead. Either way overlap has to stay strictly under size."
    },
    {
      "label": "The overlap is clamped to size minus one, since no chunker would allow a zero step",
      "feedback": "Some libraries do clamp, and if yours does you get a silent config that means something other than what it says. Nothing in the arithmetic itself does that."
    },
    {
      "label": "Every chunk is identical, which is wasteful but harmless",
      "feedback": "Wasteful and harmless would be the good outcome. To produce identical chunks the loop would still have to advance, and advancing is exactly what a zero step does not do."
    }
  ]
}
\`\`\`

### Cosine similarity is a normalized dot product

An embedding is a vector. Two vectors are similar when they point the same way, which is measured by the angle between them, not by the distance. **Cosine similarity** is the dot product divided by both lengths, so it is the dot product with the magnitudes taken out.

\`\`\`python
import math


def cosine(left, right):
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


print(round(cosine([1, 1, 0], [2, 2, 0]), 4))   # 1.0, same direction, different length
print(round(cosine([1, 0, 0], [1, 1, 0]), 4))   # 0.7071
print(round(cosine([1, 0, 0], [0, 1, 0]), 4))   # 0.0, at right angles
\`\`\`

\`zip\` walks two sequences in step, and it stops at the shorter one, which is why mismatched dimensions give a wrong answer rather than an error. The zero-length guard is not decoration either: an all-zero vector has no direction, so the division would raise \`ZeroDivisionError\` on a document that happens to embed to zeros.

### Top-k needs a tie-break or it is not reproducible

Scoring gives you a number per candidate. Taking the best few is a sort, and a sort needs to say what happens when two scores are equal, or the same query returns a different order depending on how the dictionary was built.

\`\`\`python
scored = [(0.9, "b"), (0.7, "c"), (0.9, "a")]
scored.sort(key=lambda pair: (-pair[0], pair[1]))
print(scored)         # [(0.9, 'a'), (0.9, 'b'), (0.7, 'c')]
\`\`\`

The key returns a tuple, so Python compares the first element and falls through to the second only on a tie. Negating the score sorts it descending while the id stays ascending, which is one sort rather than two.

### Two retrievers, two scales, one answer

Production retrieval runs at least two retrievers over the same query: a dense one over embeddings, which finds passages that mean the right thing, and a sparse keyword one, which finds passages containing the exact rare term the user typed. They are good at different failures, so you want both. Now you have two ranked lists and have to produce one.

The obvious merge is to add each document's two scores together. Look at what the two retrievers actually return:

\`\`\`python
dense   = {"p1": 0.81, "p2": 0.79, "p3": 0.78}   # cosine, always between 0 and 1
keyword = {"p2": 18.4, "p4": 12.1, "p1": 3.2}    # BM25, no upper bound at all
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "adding-two-retriever-scores",
  "prompt": "You merge those two by adding each document's scores. p1 is the dense retriever's number one at 0.81 and the keyword retriever's number three at 3.2. p4 is the keyword retriever's number two at 12.1 and does not appear in the dense list at all. Which ranks higher, and what does that tell you?",
  "options": [
    {
      "label": "p1, because being a retriever's top result is the strongest signal available",
      "feedback": "It is the strongest signal, and a merge that respected it would be the one you want. Addition does not respect signals, it respects magnitudes, and 4.01 against 12.1 is the entire comparison."
    },
    {
      "label": "p4, because BM25's numbers are large enough that the dense scores barely register",
      "correct": true,
      "feedback": "Right, and the consequence is worse than one bad ranking: the dense retriever has effectively been switched off, so you are paying for two retrievers and consulting one."
    },
    {
      "label": "p1, since the dense score is a similarity and similarities are weighted more heavily",
      "feedback": "Nothing in a plain sum weights anything. Weighting is a thing you can add, and once you do you have to pick the weights, which is a per-corpus tuning job that has to be redone whenever either retriever changes."
    },
    {
      "label": "They tie, because each is one retriever's high result and one retriever's absence",
      "feedback": "That is what a fair merge would say, near enough, and it is the answer rank-based fusion gives. Addition cannot say it: the two numbers being added are not measurements of the same thing."
    }
  ]
}
\`\`\`

Normalizing first is the usual next suggestion, and it is harder than it looks: min-max normalization needs both full score distributions, it changes with every query, and it still has nothing to say about a document one retriever never returned. The two scores are not measurements of the same quantity, and no amount of rescaling makes them one.

### Reciprocal rank fusion

What the two lists genuinely share is **position**. Both of them said "this is my first, this is my second", and that statement means the same thing in both. So throw the scores away and fuse the ranks:

\`\`\`python
def reciprocal_rank_fusion(rankings, k=60):
    fused = {}
    for ranking in rankings:
        for position, doc in enumerate(ranking):
            fused[doc] = fused.get(doc, 0.0) + 1.0 / (k + position + 1)
    return fused


print(reciprocal_rank_fusion([["p1", "p2"], ["p2", "p1"]], k=60))
# {'p1': 0.03226..., 'p2': 0.03252...}
\`\`\`

That is the whole algorithm. Three properties are worth naming because each is doing a job:

- **\`dict.get(doc, 0.0)\`** starts a document at zero the first time it is seen, so a document in one list only is scored rather than dropped. The "merge the documents both lists agree on" version of this loop is the second bug in the practice.
- **\`position + 1\`** makes ranks count from one. Off by one here and the top result of every list divides by \`k\` instead of \`k + 1\`, which is survivable, but the rank-zero document gets an outsized share.
- **\`k\`**, conventionally 60, damps the top. Without it the first result scores 1.0 and the second 0.5, so one retriever's favorite wins outright. With it the gap between rank 1 and rank 2 is \`1/61\` against \`1/62\`, tiny enough that agreement between retrievers matters more than any single retriever's confidence. That is the entire design goal.

The fused score has no meaning on its own. It is not a probability, not a similarity, and not comparable between queries. It exists to order one result set, and that is all it is for.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "rrf-damping-constant",
  "prompt": "Someone sets the fusion constant to 0, arguing that it is an arbitrary magic number and removing it makes the maths cleaner. What changes?",
  "options": [
    {
      "label": "Nothing meaningful, since every document's score shifts by the same amount",
      "feedback": "It would be a shift if it were added to the score. It is added to the denominator, so it changes each rank's contribution by a different proportion, which is the definition of changing the ranking."
    },
    {
      "label": "The top of each list dominates: rank 1 scores 1.0 against rank 2's 0.5",
      "correct": true,
      "feedback": "Right. With the constant gone, one retriever's first result outscores anything the other retriever can say short of also ranking it first, which is exactly the single-retriever tyranny fusion was adopted to avoid."
    },
    {
      "label": "It raises a division-by-zero error on the first document in each list",
      "feedback": "Worth checking, and it would at least be loud. Ranks count from one, so the denominator is 0 + 1, and the code runs fine while quietly meaning something else."
    },
    {
      "label": "Scores become negative for anything past the constant's old value",
      "feedback": "Nothing here can go negative: it is one divided by a positive integer, every term. The constant sets how fast the terms shrink, not their sign."
    }
  ],
  "reveal": "Rank fusion works because a rank is the one thing two retrievers can both report in the same units. The constant is what keeps a single retriever's top pick from deciding the answer alone, which is why 60 is a design choice rather than a magic number."
}
\`\`\`

### Pitfalls

- \`overlap\` must be strictly less than \`size\`. Equal gives a step of zero; greater gives a negative step and a \`ValueError\` from \`range\`.
- Rounding a score for display is fine. Rounding it before you sort creates ties that were not there, and then the tie-break decides the ranking.
- \`list.index(doc)\` gives a position, so a rank is \`index + 1\`. It also raises \`ValueError\` when the document is absent, and absent is a real case, so check membership first.
- Fusing three rankings is the same loop with a longer list. Fusing the same ranking twice is not: it doubles that retriever's vote, which is a weighting decision made by accident.

**Interview nuance:** the follow-up is usually "so when would you not use rank fusion?" Two answers hold up. When one retriever is known to be much better on your traffic, rank fusion throws that away, and a weighted variant or a proper reranking model is the better trade. And when you have a cross-encoder budget, fusion is only the candidate-generation step: it decides which twenty passages are worth the expensive rerank, and the rerank decides the order. Being able to name fusion as cheap, unsupervised and scale-free, and to say what you would give up by replacing it, is the answer being probed for.

**Sources:** [The reciprocal rank fusion paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) · [math.sqrt](https://docs.python.org/3/library/math.html) · [Sorting techniques](https://docs.python.org/3/howto/sorting.html)`,
    demoCode: `def reciprocal_rank_fusion(rankings, k=60):
    fused = {}
    for ranking in rankings:
        for position, doc in enumerate(ranking):
            fused[doc] = fused.get(doc, 0.0) + 1.0 / (k + position + 1)
    return fused


dense = ["p1", "p2", "p3"]
keyword = ["p2", "p4", "p1"]
fused = reciprocal_rank_fusion([dense, keyword])
for doc, score in sorted(fused.items(), key=lambda pair: (-pair[1], pair[0])):
    print(doc, round(score, 6))`,
  },
  apply: {
    id: "py-l4-chunk-score-fuse-apply",
    estimatedMinutes: 11,
    executionMode: "single-file",
    prompt: `Write the three functions a single-retriever search is made of.

\`chunk_tokens(tokens, size, overlap)\` returns a list of windows. Each window is \`size\` tokens, and
each starts \`size - overlap\` tokens after the one before it. \`overlap\` is always less than
\`size\`. Stop as soon as a window reaches the end of the token list, so the last window may be
short but no window is a stub of the one before it.
\`chunk_tokens(["a", "b", "c", "d", "e"], 3, 1)\` is \`[["a", "b", "c"], ["c", "d", "e"]]\`.

\`cosine(left, right)\` returns the cosine similarity of two equal-length vectors, and \`0.0\` when
either has zero length.

\`top_k(vectors, query, k)\` scores every vector in \`vectors\` against \`query\`, rounds each score
to 4 decimal places, and returns the best \`k\` as \`[index, score]\` pairs. Highest score first, and
equal scores in ascending index order.

\`search\` at the bottom joins the two halves together. Leave it alone.`,
    starterCode: FUSE_APPLY_STARTER,
    hints: [
      "In `chunk_tokens`, the loop advances by the step, not by the size. Slicing past the end of a list is not an error in Python, so the short final window comes for free; what needs deciding is when to stop asking for another one.",
      "`cosine` is three sums: the dot product with `zip`, and each vector's length with `math.sqrt`. Guard the zero-length case before dividing.",
      "In `top_k`, build `(score, index)` pairs and sort with `key=lambda pair: (-pair[0], pair[1])` so the score falls descending while the index rises. Round when you score, not after you sort, and remember the returned pairs are `[index, score]`, the other way round.",
    ],
    referenceSolution: FUSE_APPLY_REFERENCE,
    testCases: [
      {
        input: {
          text: "warm the cache on deploy so the first request is not the slow one",
          size: 4,
          overlap: 1,
          vectors: [
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 1],
            [2, 1, 0],
            [0, 0, 3],
          ],
          query: [1, 1, 0],
          k: 3,
        },
        expected: {
          chunks: [
            "warm the cache on",
            "on deploy so the",
            "the first request is",
            "is not the slow",
            "slow one",
          ],
          top: [
            [1, 1.0],
            [3, 0.9487],
            [0, 0.7071],
          ],
        },
        description: "overlapping windows and the three best vectors",
      },
      {
        input: {
          text: "a b c d e f",
          size: 2,
          overlap: 0,
          vectors: [
            [1, 0],
            [0, 1],
            [1, 1],
          ],
          query: [1, 0],
          k: 2,
        },
        expected: {
          chunks: ["a b", "c d", "e f"],
          top: [
            [0, 1.0],
            [2, 0.7071],
          ],
        },
        description: "no overlap, so the windows just tile",
      },
      {
        input: {
          text: "one two three four five",
          size: 3,
          overlap: 2,
          vectors: [
            [1, 1],
            [1, 1],
            [0, 1],
          ],
          query: [1, 1],
          k: 5,
        },
        expected: {
          chunks: ["one two three", "two three four", "three four five"],
          top: [
            [0, 1.0],
            [1, 1.0],
            [2, 0.7071],
          ],
        },
        description: "a tie is broken by index, and k past the end returns everything",
      },
      {
        input: { text: "alpha beta", size: 5, overlap: 2, vectors: [[3, 4]], query: [3, 4], k: 1 },
        expected: { chunks: ["alpha beta"], top: [[0, 1.0]] },
        description: "one window covers the whole text",
      },
      {
        input: {
          text: "",
          size: 3,
          overlap: 1,
          vectors: [
            [0, 0],
            [1, 1],
          ],
          query: [0, 0],
          k: 2,
        },
        expected: {
          chunks: [],
          top: [
            [0, 0.0],
            [1, 0.0],
          ],
        },
        description: "no text at all, and a zero vector scores zero instead of raising",
      },
    ],
  },
  practice: {
    id: "py-l4-chunk-score-fuse-practice",
    estimatedMinutes: 32,
    executionMode: "workspace",
    prompt: `Repair the hybrid search merge on ticket CS-035. It runs a dense retriever and a keyword
retriever over the same query and combines them by adding their scores, so BM25's unbounded numbers
decide every ranking and the dense retriever contributes nothing. The same merge drops any passage
that only one of the two retrievers returned.

In \`retrieval/ranking.py\`, implement \`rank_by_score\` (ordered ids, ties broken by id) and
\`reciprocal_rank_fusion\` (one score per document, summed over the rankings that contain it).

In \`retrieval/hybrid.py\`, implement \`hybrid_search\`, which ranks each retriever on its own scale
before fusing and returns the top \`n\` as \`[doc_id, score]\` pairs, and \`explain\`, which reports
where one document placed in each list and what it fused to.

\`README.md\` has the exact shapes, including what a rank is for a document a retriever never
returned. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Nothing in the fix compares a dense score with a keyword score. Each retriever is ranked entirely on its own numbers, and only the two rankings ever meet, which is what makes the scales stop mattering.",
      "`sorted(scores.items(), key=lambda pair: (-pair[1], pair[0]))` gives a descending score with an ascending id from one sort. `enumerate` over a ranking hands you the position, and rank is that position plus one.",
      "In the fusion loop, accumulate with `fused.get(doc, 0.0) + ...` so a document appearing in one ranking is scored rather than skipped. In `explain`, `list.index` gives a position but raises when the document is absent, and absent is a real answer here, so check membership first and report `None`.",
    ],
    workspace: {
      language: "python",
      primaryFilePath: "retrieval/ranking.py",
      editableFilePaths: ["retrieval/ranking.py", "retrieval/hybrid.py"],
      visibleTestPaths: ["tests/test_ranking.py", "tests/test_hybrid.py"],
      hiddenTestPaths: ["tests/test_hybrid_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: FUSE_README },
        {
          path: "retrieval/__init__.py",
          role: "readonly",
          language: "python",
          content: EMPTY_INIT,
        },
        {
          path: "retrieval/corpus.py",
          role: "readonly",
          language: "python",
          content: FUSE_CORPUS,
          description: "Read-only: both retrievers' output for one query",
        },
        {
          path: "retrieval/ranking.py",
          role: "editable",
          language: "python",
          content: FUSE_RANKING_STARTER,
          description: "Ranking and reciprocal rank fusion",
        },
        {
          path: "retrieval/hybrid.py",
          role: "editable",
          language: "python",
          content: FUSE_HYBRID_STARTER,
          description: "The merged search and its explanation",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_ranking.py",
          role: "test",
          language: "python",
          content: FUSE_TEST_RANKING,
          description: "Visible ranking and fusion tests",
        },
        {
          path: "tests/test_hybrid.py",
          role: "test",
          language: "python",
          content: FUSE_TEST_HYBRID,
          description: "Visible merge tests",
        },
        {
          path: "tests/test_hybrid_hidden.py",
          role: "test",
          language: "python",
          content: FUSE_TEST_HIDDEN,
          hidden: true,
          description: "Hidden scale and missing-document tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_ranking", label: "visible ranking" },
            { module: "test_hybrid", label: "visible hybrid" },
            { module: "test_hybrid_hidden", label: "hidden hybrid" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "retrieval/ranking.py",
          role: "editable",
          language: "python",
          content: FUSE_RANKING_REFERENCE,
        },
        {
          path: "retrieval/hybrid.py",
          role: "editable",
          language: "python",
          content: FUSE_HYBRID_REFERENCE,
        },
      ],
    },
  },
}
