/**
 * L4: consuming a token stream without corrupting it.
 *
 * The sandbox is Pyodide 0.26.4, which is the CPython 3.12 standard library and nothing else, so
 * there is no socket here. The stream is a provided fake that hands out scripted byte chunks and
 * records whether it was closed. That costs the lesson nothing: every bug it teaches lives in the
 * client's assembly code, not in the transport, and the fake can split a character or a JSON object
 * at a boundary far more reliably than a real connection would.
 *
 * Time budget (counted, not guessed). Teach 7: ~950 prose words, three checks, five code fences.
 * Apply 10: 4 provided lines to read, 16 to write in one function. Practice 33: 55 lines of README,
 * 45 of read-only stream and protocol, 51 to write across two files. 7 + 10 + 33 = 50, the lesson
 * total.
 *
 * Ramp: practice reference is 51 real lines against an apply reference of 16, a ratio of 3.2x.
 * Apply decodes bytes into whole lines; Practice frames those lines into events, holds partial
 * parse state, and closes the connection on the way out. Same skill, one step up.
 */
import type { PythonLesson } from "../../types"
import { buildBrief } from "../brief"
import { buildRunner, EMPTY_INIT } from "../workspace-runner"

const STREAM_README = buildBrief({
  lesson: "py-l4-streaming-decode",
  kind: "bug-report",
  headline: "the streamed answer drops its last word and shows a black diamond",
  body: `Support has three screenshots of the same defect. A streamed answer renders with a replacement
character in the middle of a word, and about one reply in fifty ends a sentence early. Both come
from the same place: the code that turns the response body into text assumes a chunk is a whole
number of characters and a whole number of lines. Neither is true. A chunk is however many bytes
arrived.

There is a third finding in the same review. When the sentinel arrives, the reader stops looping,
and nothing ever closes the connection.

Two files are yours. \`stream/protocol.py\` and \`stream/source.py\` are read-only.

## The wire format

Lines separated by a newline. A line that starts with \`DATA_PREFIX\` carries either a JSON object
or the sentinel \`DONE\`; every other line, blank ones included, is noise and is skipped.

\`\`\`
data: {"delta": "Caf"}
data: [DONE]
\`\`\`

Both constants are in \`protocol.py\`. Nothing after the sentinel is yours to read.

## \`stream/assembler.py\`

\`\`\`python
assembler.feed(chunk)   # -> the events THIS chunk completed, as a list
assembler.close()       # -> {"truncated": bool, "pending": str, "done": bool}
assembler.done          # True once the sentinel has been seen
\`\`\`

\`feed\` takes a \`bytes\` chunk of any length, including one byte, and returns a list of parsed
event dicts. A chunk that completes nothing returns \`[]\`. Two things have to survive between
calls: bytes that do not yet form a whole character, and text that does not yet form a whole line.
They are separate problems and they need separate storage.

Once the sentinel has been seen, \`done\` is \`True\` and no further line produces an event.

\`close\` finishes the stream. \`truncated\` is \`True\` when the stream stopped in the middle of a
character, which is the only evidence you get that the response was cut off. \`pending\` is the
unfinished line still in hand, and \`done\` is whether the sentinel arrived.

## \`stream/collect.py\`

\`\`\`python
collect(source)  # -> {"text": str, "events": int, "done": bool, "truncated": bool, "pending": str}
\`\`\`

\`source.open()\` returns an iterator of byte chunks. \`text\` is every event's \`"delta"\` joined in
arrival order, and \`events\` is how many events were parsed.

Two rules about leaving:

- Stop reading as soon as the assembler reports \`done\`. The read-only stream counts what it
  handed out, and a test compares that against its length.
- \`source.close()\` runs on every path out, including the one where a payload fails to parse and
  the exception is on its way up. A connection nobody closed is the bug that does not show up until
  production runs out of sockets.
`,
})

const STREAM_PROTOCOL = String.raw`"""Read-only. The wire format this endpoint speaks."""

# Every payload line starts with this. Any other line is noise and is skipped.
DATA_PREFIX = "data: "

# The sentinel that ends the answer. Nothing after it is yours to read.
DONE = "[DONE]"
`

const STREAM_SOURCE = String.raw`"""Read-only. A scripted byte stream that notices whether you closed it."""


def chunked(text, size):
    """Cut one payload into fixed-size byte chunks, with no regard for character boundaries."""
    data = text.encode("utf-8")
    return [data[index:index + size] for index in range(0, len(data), size)]


def cut_mid_character(text):
    """The same bytes minus the last one, so the stream stops halfway through a character."""
    return text.encode("utf-8")[:-1]


class ByteStream:
    """A connection. It hands out bytes, counts what it delivered, and stays open until closed."""

    def __init__(self, chunks):
        self._chunks = [bytes(chunk) for chunk in chunks]
        self.total = len(self._chunks)
        self.delivered = 0
        self.closed = False
        self._pump = None

    def open(self):
        """Start reading. Whoever opens a stream owes it a close()."""
        if self._pump is None:
            self._pump = self._deliver()
        return self._pump

    def _deliver(self):
        for chunk in self._chunks:
            self.delivered += 1
            yield chunk

    def close(self):
        """Release the connection. Safe to call twice."""
        self.closed = True
        if self._pump is not None:
            self._pump.close()
            self._pump = None
`

const STREAM_ASSEMBLER_STARTER = String.raw`import codecs
import json

from stream.protocol import DATA_PREFIX, DONE


class StreamAssembler:
    """Turns a byte stream into whole events, see README.md."""

    def __init__(self):
        self._buffer = ""
        self.done = False

    def feed(self, chunk):
        """Return the events this chunk completed, see README.md."""
        # TODO: two buffers, not zero. One holds partial bytes, one holds a partial line.
        events = []
        for line in chunk.decode("utf-8").split("\n"):
            if line.startswith(DATA_PREFIX):
                events.append(json.loads(line[len(DATA_PREFIX):]))
        return events

    def close(self):
        """Finish the stream and report what was left over, see README.md."""
        # TODO: a stream that stopped halfway through a character is truncated, and the
        # only thing that knows is the decoder.
        return {"truncated": False, "pending": self._buffer, "done": self.done}
`

const STREAM_ASSEMBLER_REFERENCE = String.raw`import codecs
import json

from stream.protocol import DATA_PREFIX, DONE


class StreamAssembler:
    def __init__(self):
        self._decoder = codecs.getincrementaldecoder("utf-8")()
        self._buffer = ""
        self.done = False

    def feed(self, chunk):
        events = []
        self._buffer += self._decoder.decode(chunk)
        parts = self._buffer.split("\n")
        self._buffer = parts.pop()
        for line in parts:
            if self.done or not line.startswith(DATA_PREFIX):
                continue
            payload = line[len(DATA_PREFIX):]
            if payload == DONE:
                self.done = True
                continue
            events.append(json.loads(payload))
        return events

    def close(self):
        truncated = False
        try:
            self._decoder.decode(b"", final=True)
        except UnicodeDecodeError:
            truncated = True
        return {"truncated": truncated, "pending": self._buffer, "done": self.done}
`

const STREAM_COLLECT_STARTER = String.raw`from stream.assembler import StreamAssembler


def collect(source):
    """Return the assembled answer and what the stream did, see README.md."""
    # TODO: stop at the sentinel, and close the connection whatever happens on the way out.
    assembler = StreamAssembler()
    pieces = []
    for chunk in source.open():
        for event in assembler.feed(chunk):
            pieces.append(event["delta"])
    return {
        "text": "".join(pieces),
        "events": len(pieces),
        "done": False,
        "truncated": False,
        "pending": "",
    }
`

const STREAM_COLLECT_REFERENCE = String.raw`from stream.assembler import StreamAssembler


def collect(source):
    assembler = StreamAssembler()
    pieces = []
    events = 0
    try:
        for chunk in source.open():
            for event in assembler.feed(chunk):
                pieces.append(event["delta"])
                events += 1
            if assembler.done:
                break
    finally:
        source.close()
    tail = assembler.close()
    return {
        "text": "".join(pieces),
        "events": events,
        "done": tail["done"],
        "truncated": tail["truncated"],
        "pending": tail["pending"],
    }
`

const STREAM_TEST_ASSEMBLER = String.raw`from stream.assembler import StreamAssembler
from stream.source import chunked, cut_mid_character


def run_tests(record):
    def a_split_character_arrives_whole():
        assembler = StreamAssembler()
        events = []
        for chunk in chunked('data: {"delta": "café"}\n', 4):
            events.extend(assembler.feed(chunk))
        assert events == [{"delta": "café"}], f"expected one café event, got {events!r}"

    def a_split_event_is_parsed_once():
        assembler = StreamAssembler()
        events = []
        for chunk in chunked('data: {"delta": "one"}\ndata: {"delta": "two"}\n', 9):
            events.extend(assembler.feed(chunk))
        expected = [{"delta": "one"}, {"delta": "two"}]
        assert events == expected, f"expected {expected}, got {events!r}"

    def an_incomplete_line_is_held_not_parsed():
        assembler = StreamAssembler()
        events = assembler.feed(b'data: {"delta": "half')
        assert events == [], f"a half-written line was parsed anyway: {events!r}"
        assert assembler.feed(b' a line"}\n') == [{"delta": "half a line"}], "the held line never arrived"

    def close_reports_a_truncated_tail():
        assembler = StreamAssembler()
        assembler.feed(cut_mid_character('data: {"delta": "café'))
        tail = assembler.close()
        assert tail["truncated"] is True, f"expected truncated True, got {tail!r}"
        assert tail["pending"] == 'data: {"delta": "caf', f"unexpected pending text: {tail['pending']!r}"

    record("a split character arrives whole", a_split_character_arrives_whole)
    record("a split event is parsed once", a_split_event_is_parsed_once)
    record("an incomplete line is held, not parsed", an_incomplete_line_is_held_not_parsed)
    record("close reports a truncated tail", close_reports_a_truncated_tail)
`

const STREAM_TEST_COLLECT = String.raw`from stream.collect import collect
from stream.source import ByteStream, chunked

ANSWER = (
    'data: {"delta": "Café "}\n'
    'data: {"delta": "naïve, "}\n'
    'data: {"delta": "€9 refunded"}\n'
    "data: [DONE]\n"
    'data: {"delta": "never read"}\n'
)


def run_tests(record):
    def the_answer_is_assembled_in_order():
        result = collect(ByteStream(chunked(ANSWER, 7)))
        assert result["text"] == "Café naïve, €9 refunded", f"got {result['text']!r}"
        assert result["events"] == 3, f"expected 3 events, got {result['events']}"

    def the_sentinel_stops_the_read():
        source = ByteStream(chunked(ANSWER, 7))
        result = collect(source)
        assert result["done"] is True, f"expected done True, got {result!r}"
        assert source.delivered < source.total, (
            f"the whole stream was read past the sentinel: {source.delivered} of {source.total} chunks"
        )

    def the_stream_is_closed_either_way():
        early = ByteStream(chunked(ANSWER, 7))
        collect(early)
        assert early.closed is True, "the connection was left open after an early stop"
        whole = ByteStream(chunked('data: {"delta": "only"}\n', 5))
        collect(whole)
        assert whole.closed is True, "the connection was left open after a clean finish"

    record("the answer is assembled in order", the_answer_is_assembled_in_order)
    record("the sentinel stops the read", the_sentinel_stops_the_read)
    record("the stream is closed either way", the_stream_is_closed_either_way)
`

const STREAM_TEST_HIDDEN = String.raw`from stream.collect import collect
from stream.source import ByteStream, chunked, cut_mid_character

ANSWER = (
    'data: {"delta": "Café "}\n'
    'data: {"delta": "naïve, "}\n'
    'data: {"delta": "€9 refunded"}\n'
    "data: [DONE]\n"
)


def run_tests(record):
    def one_byte_at_a_time_reads_the_same():
        source = ByteStream([bytes([byte]) for byte in ANSWER.encode("utf-8")])
        result = collect(source)
        assert result["text"] == "Café naïve, €9 refunded", f"got {result['text']!r}"
        assert result["events"] == 3, f"expected 3 events, got {result['events']}"

    def one_giant_chunk_reads_the_same():
        result = collect(ByteStream([ANSWER.encode("utf-8")]))
        assert result["text"] == "Café naïve, €9 refunded", f"got {result['text']!r}"

    def lines_that_are_not_data_are_ignored():
        noisy = 'event: start\n\n: a comment\ndata: {"delta": "kept"}\n\ndata: [DONE]\n'
        result = collect(ByteStream(chunked(noisy, 6)))
        assert result["text"] == "kept", f"expected 'kept', got {result['text']!r}"
        assert result["events"] == 1, f"expected 1 event, got {result['events']}"

    def a_truncated_stream_keeps_what_arrived():
        source = ByteStream(
            [b'data: {"delta": "first"}\n', cut_mid_character('data: {"delta": "café')]
        )
        result = collect(source)
        assert result["text"] == "first", f"expected 'first', got {result['text']!r}"
        assert result["truncated"] is True, f"expected truncated True, got {result!r}"
        assert result["done"] is False, f"a cut-off stream is not done: {result!r}"

    def the_sentinel_seals_the_rest_of_its_own_chunk():
        whole = (
            'data: {"delta": "kept"}\n'
            "data: [DONE]\n"
            'data: {"delta": "never read"}\n'
        )
        result = collect(ByteStream([whole.encode("utf-8")]))
        assert result["text"] == "kept", f"expected 'kept', got {result['text']!r}"
        assert result["events"] == 1, (
            f"a line after the sentinel was still parsed: {result['events']} events"
        )
        assert result["done"] is True, f"expected done True, got {result!r}"

    def a_broken_payload_still_closes_the_stream():
        source = ByteStream(chunked('data: {"delta": "ok"}\ndata: {oops}\n', 9))
        try:
            collect(source)
        except Exception:
            pass
        assert source.closed is True, "the connection was left open when a payload failed to parse"

    record("one byte at a time reads the same", one_byte_at_a_time_reads_the_same)
    record("one giant chunk reads the same", one_giant_chunk_reads_the_same)
    record("lines that are not data are ignored", lines_that_are_not_data_are_ignored)
    record("a truncated stream keeps what arrived", a_truncated_stream_keeps_what_arrived)
    record("the sentinel seals the rest of its own chunk", the_sentinel_seals_the_rest_of_its_own_chunk)
    record("a broken payload still closes the stream", a_broken_payload_still_closes_the_stream)
`

export const streamingDecodeLesson: PythonLesson = {
  id: "py-l4-streaming-decode",
  title: "Streaming without corrupting the stream",
  summary:
    "Decode a chunked byte stream incrementally, buffer the partial line, and stop cleanly when the sentinel arrives.",
  estimatedMinutes: 50,
  difficulty: "hard",
  skills: ["streaming", "incremental-decoding", "buffering", "generators"],
  teach: {
    estimatedMinutes: 7,
    markdown: `## Bytes arrive when they arrive, not where you want them

A streaming response is a socket handing you whatever has turned up. A chunk is not a character, not a line, and not a message. It is a count of bytes that depends on network timing, and the same request can chunk differently on two consecutive runs. Every bug in this lesson comes from one assumption: that the boundary the transport chose means something. It does not.

The reason this shows up in AI code more than anywhere else is that the payload is text a human reads, so corruption is visible, and the test data is English, so it is invisible until the first user types an accent.

### One decoder, not one call per chunk

UTF-8 encodes most characters in more than one byte. \`é\` is two, \`€\` is three, and a chunk boundary lands between them exactly as often as anywhere else.

\`\`\`python
raw = "café".encode("utf-8")
print(list(raw))            # [99, 97, 102, 195, 169]
print(raw[:4])              # b'caf\\xc3'
raw[:4].decode("utf-8")     # UnicodeDecodeError: unexpected end of data
\`\`\`

\`bytes.decode\` has to see a whole character, so calling it once per chunk raises on any chunk that ends mid-character. An **incremental decoder** is the same codec with memory: hand it bytes, it returns the characters it can complete and keeps the rest.

\`\`\`python
import codecs

decoder = codecs.getincrementaldecoder("utf-8")()
print(repr(decoder.decode(raw[:4])))   # 'caf'   the 0xc3 is held back
print(repr(decoder.decode(raw[4:])))   # 'é'     completed by the next byte
\`\`\`

Note the double call in \`getincrementaldecoder("utf-8")()\`: the first returns the decoder **class** for that encoding, the second builds an instance. One instance per stream, and it is stateful, so it is never shared between two streams.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "decode-per-chunk-in-testing",
  "prompt": "A reviewer sees chunk.decode('utf-8') inside the read loop and asks whether it is safe. The suite passes: two hundred cases, every one of them English prose. What is the honest answer?",
  "options": [
    {
      "label": "Safe. Two hundred green cases across realistic payloads is real evidence",
      "feedback": "It is evidence, and that is what makes this so hard to catch in review. It is evidence about a corpus where every character is one byte, so no boundary the transport picks can ever fall inside one."
    },
    {
      "label": "Unsafe, and the suite cannot see it: ASCII has no boundary to land inside",
      "correct": true,
      "feedback": "Right. The defect needs a multibyte character AND a boundary in the middle of it, and an all-English corpus removes the first ingredient entirely. One accented name in production supplies it."
    },
    {
      "label": "Unsafe, but only for encodings other than UTF-8, so declaring utf-8 is the fix",
      "feedback": "Naming the encoding does matter, and getting it wrong is its own bug. UTF-8 is itself variable width, so it is the encoding with the problem rather than the one without it."
    },
    {
      "label": "Safe, because a server always flushes on a character boundary",
      "feedback": "A server has no idea where your characters are: it writes bytes, and the network splits them again at whatever size the path allows. Even a well-behaved sender cannot promise this once a proxy is in the way."
    }
  ]
}
\`\`\`

### The second buffer is yours

The decoder solves partial characters. It has nothing to say about partial **lines**, and a protocol that separates messages with a newline needs that solved too. So you keep a text buffer and split it on the separator, and now you have to decide which of the resulting pieces are finished lines and which one is not.

\`\`\`python
buffer = ""
buffer += 'data: {"delta": "hi"}\\ndata: {"del'
parts = buffer.split("\\n")
buffer = parts.pop()
print(parts)                # ['data: {"delta": "hi"}']
print(repr(buffer))         # 'data: {"del'
\`\`\`

\`split\` always returns at least one element, so \`parts.pop()\` is safe on any input, and when the buffer ends exactly on a separator the piece it puts back is the empty string. Everything left in \`parts\` is a complete line.

That is two pieces of state carried between chunks, holding different things: bytes that are not yet a character, and text that is not yet a line. Conflating them is how the second version of this bug gets written.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "which-piece-goes-back-in-the-buffer",
  "prompt": "You split the buffer on the separator and get ['a', 'b', 'c']. Which of those three is not safe to hand on as a complete line?",
  "options": [
    {
      "label": "'a', since it is the piece that may have started in an earlier chunk",
      "feedback": "It may well have started earlier, and that is exactly why the buffer exists. By the time a separator follows it, it is finished, and finished is all that matters."
    },
    {
      "label": "'c', because nothing has yet said where it ends",
      "correct": true,
      "feedback": "Right. The pieces before the last one are each bounded by a separator on both sides. The last one is bounded only at the start, so it goes back in the buffer to wait."
    },
    {
      "label": "None of them: split only produces pieces that were fully delimited",
      "feedback": "That is true of a split over a complete document, which is the situation almost every use of split you have written was in. A stream buffer is by definition not complete yet."
    },
    {
      "label": "Both 'a' and 'c', since only a piece with a separator on each side is complete",
      "feedback": "The right instinct applied one element too far. 'a' has the start of the buffer on its left, and the buffer starts either at the stream's start or just after the previous separator, so it is delimited either way."
    }
  ]
}
\`\`\`

### Never parse a line you have not finished receiving

Once a line is complete, and only then, it can be parsed. \`json.loads\` on a partial object raises, and there is no partial-JSON mode worth having: the fix is to not call it early.

\`\`\`python
import json

print(json.loads('{"delta": "hi"}'))    # {'delta': 'hi'}
json.loads('{"delta": "h')              # JSONDecodeError: Unterminated string
\`\`\`

A protocol usually carries non-payload lines too: blank ones, comments, event names. Skip anything that does not start with the payload prefix rather than trying to parse it and catching the failure, because a caught parse error cannot tell "this was not a payload line" from "this payload is corrupt".

### Stopping is part of the protocol

Most streams end with a sentinel rather than by closing, so the loop that reads one ends on a message rather than on the end of the body.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "who-closes-the-stream",
  "prompt": "Your reader breaks out of the loop the moment the sentinel arrives, and the source object is still referenced by the caller that created it. What happened to the connection?",
  "options": [
    {
      "label": "It closed itself, since the loop finished with the iterator",
      "feedback": "A for loop does drop its own reference to the iterator when it exits, which is why this is right often enough to be dangerous. Here the source still holds it, so nothing is collected and nothing is released."
    },
    {
      "label": "It is still open, and it stays open until something closes it explicitly",
      "correct": true,
      "feedback": "Right. Ending your interest in a stream is not the same event as releasing it, and only one of those two happens by itself. Under load the symptom is a socket pool that never refills."
    },
    {
      "label": "It closed, because the sentinel tells the server the exchange is over",
      "feedback": "The sentinel is a message inside the body: it says the answer is complete. The connection is a layer below it and has no idea what the bytes meant."
    },
    {
      "label": "It closes at the end of the request, so nothing leaks in practice",
      "feedback": "Often true in a short-lived script, and it is why this survives local testing. In a long-lived worker holding a pool, the wait is unbounded, which is the same thing as a leak."
    }
  ],
  "reveal": "Three separate obligations hide behind one read loop: finish the character, finish the line, and release the connection. The first two are state you carry, the third is a promise you keep on every path out."
}
\`\`\`

Stopping on the sentinel leaves the connection where it was, so releasing it is a job you still owe. A generator is where this bites: leaving a \`for\` loop early does not finish the generator, and whatever it was holding stays held until somebody closes it.

\`\`\`python
def rows():
    try:
        for index in range(5):
            yield index
    finally:
        print("connection released")


stream = rows()
print(next(stream))         # 0
stream.close()              # connection released
\`\`\`

\`close()\` raises \`GeneratorExit\` at the paused \`yield\`, so a \`finally\` inside the generator runs. On your side of the loop, the same job belongs in a \`try\` / \`finally\`, so the close happens on the sentinel path, the exception path, and the ran-out-of-chunks path alike.

### Pitfalls

- \`decoder.decode(b"", final=True)\` is what tells you the stream ended mid-character: it raises \`UnicodeDecodeError\` if anything is still held. Skip that call and a truncated response looks like a complete short one.
- One decoder per stream. Reusing an instance carries the previous stream's dangling bytes into the next one.
- A chunk of size one is legal, and so is one chunk carrying the whole response. Both are worth a test, because they exercise opposite halves of the buffering.
- \`splitlines()\` is not \`split("\\n")\` here. It also breaks on form feed, next line, and the Unicode line separators, so a model that emits one of those silently gains a message boundary.

**Interview nuance:** the question behind this one is usually "how do you know the stream finished rather than died?" Say the two signals out loud: a protocol-level sentinel means the sender said it was done, and a clean end of body with an empty decoder means the transport agreed. Anything else, a body that stops mid-character or an end with no sentinel, is a truncated response, and the client is the only thing in the system positioned to notice. Serving that as a complete answer is how a truncated generation gets stored, cached, and shown to the next user as fact.

**Sources:** [codecs.getincrementaldecoder](https://docs.python.org/3/library/codecs.html) · [Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) · [PEP 342, generator close](https://peps.python.org/pep-0342/)`,
    demoCode: `import codecs

raw = "café".encode("utf-8")
print(list(raw))

try:
    raw[:4].decode("utf-8")
except UnicodeDecodeError as exc:
    print("one call per chunk:", exc)

decoder = codecs.getincrementaldecoder("utf-8")()
print("incremental:", repr(decoder.decode(raw[:4])), repr(decoder.decode(raw[4:])))`,
  },
  apply: {
    id: "py-l4-streaming-decode-apply",
    estimatedMinutes: 10,
    executionMode: "single-file",
    prompt: `Write \`decode_lines(chunks)\`, the front half of any streaming client.

\`chunks\` is a list of byte chunks, each given as a list of integers, so \`bytes(chunk)\` turns one
into real bytes. Cut at any byte, they may split a character or a line or both. Return:

\`\`\`python
{"lines": [<every complete line, in order>], "tail": <the unfinished last line>, "truncated": <bool>}
\`\`\`

A line ends at a newline, and the newline itself is not part of it. Whatever follows the final
newline is the tail, which is the empty string when the stream ended on one.

\`truncated\` is \`True\` when the stream stopped in the middle of a character. Flushing the decoder
with \`final=True\` is what asks that question, and it raises \`UnicodeDecodeError\` when the answer
is yes.

\`decode_lines([[104, 105, 10], [98, 121, 101]])\` is
\`{"lines": ["hi"], "tail": "bye", "truncated": False}\`.`,
    starterCode: `import codecs


def decode_lines(chunks):
    # One decoder for the whole stream, one text buffer you carry between chunks.
    return {"lines": [], "tail": "", "truncated": False}`,
    hints: [
      "Two pieces of state outlive a single chunk and they hold different things. The decoder holds bytes that are not a character yet; a string of your own holds text that is not a line yet.",
      "Per chunk: add `decoder.decode(bytes(chunk))` to the buffer, `split` the buffer on the newline, `pop` the last piece back into the buffer, and extend the lines with what is left.",
      'After the loop, `decoder.decode(b"", final=True)` inside a `try` decides `truncated`: it returns nothing at all on a clean stream and raises `UnicodeDecodeError` on a cut-off one. The tail is whatever the buffer still holds.',
    ],
    referenceSolution: `import codecs


def decode_lines(chunks):
    decoder = codecs.getincrementaldecoder("utf-8")()
    buffer = ""
    lines = []
    for chunk in chunks:
        buffer += decoder.decode(bytes(chunk))
        parts = buffer.split("\\n")
        buffer = parts.pop()
        lines.extend(parts)
    truncated = False
    try:
        decoder.decode(b"", final=True)
    except UnicodeDecodeError:
        truncated = True
    return {"lines": lines, "tail": buffer, "truncated": truncated}`,
    testCases: [
      {
        input: {
          chunks: [
            [102, 105, 114, 115, 116, 32, 108],
            [105, 110, 101, 10, 115, 101, 99],
            [111, 110, 100, 32, 108, 105, 110],
            [101, 10],
          ],
        },
        expected: { lines: ["first line", "second line"], tail: "", truncated: false },
        description: "two lines, cut mid word by the transport",
      },
      {
        input: {
          chunks: [
            [99, 97, 102, 195],
            [169, 32, 97, 117],
            [32, 108, 97, 105],
            [116, 10, 110, 97],
            [195, 175, 118, 101],
            [10],
          ],
        },
        expected: { lines: ["café au lait", "naïve"], tail: "", truncated: false },
        description: "a two-byte character split across the boundary",
      },
      {
        input: {
          chunks: [
            [112, 114, 105, 99, 101, 58, 32, 226],
            [130, 172, 57, 10, 110, 101, 120, 116],
            [10],
          ],
        },
        expected: { lines: ["price: €9", "next"], tail: "", truncated: false },
        description: "a three-byte character split across the boundary",
      },
      {
        input: {
          chunks: [
            [104, 97, 108, 102],
            [32, 97, 32, 108],
            [105, 110, 101],
          ],
        },
        expected: { lines: [], tail: "half a line", truncated: false },
        description: "no trailing newline, so the whole thing is still a tail",
      },
      {
        input: {
          chunks: [
            [108, 105, 110, 101, 32, 111, 110, 101, 10],
            [108, 105, 110, 101, 32, 116, 119, 111, 58, 32, 99, 97, 102, 195],
          ],
        },
        expected: { lines: ["line one"], tail: "line two: caf", truncated: true },
        description: "the stream stops halfway through a character",
      },
      {
        input: { chunks: [] },
        expected: { lines: [], tail: "", truncated: false },
        description: "no chunks at all",
      },
    ],
  },
  practice: {
    id: "py-l4-streaming-decode-practice",
    estimatedMinutes: 33,
    executionMode: "workspace",
    prompt: `Repair the streaming reader on ticket CS-034. Answers are rendering a replacement character
mid-word and losing their last few words, and the same review found that nothing closes the
connection once the sentinel arrives.

In \`stream/assembler.py\`, implement \`feed(chunk)\` so it returns only the events that chunk
actually completed, and \`close()\` so it reports whether the stream stopped mid-character, what
unfinished line is left, and whether the sentinel arrived.

In \`stream/collect.py\`, implement \`collect(source)\`: drive \`source.open()\`, join the deltas in
order, stop as soon as the assembler is done, and close the source on every path out, including the
one where a payload fails to parse.

\`README.md\` has the wire format and the exact return shapes. Some tests are hidden.`,
    starterCode: "",
    hints: [
      "Two buffers, and they are not interchangeable. The incremental decoder carries bytes that are not a character yet; a string attribute carries text that is not a line yet. A chunk that completes neither returns an empty list, which is a normal outcome and not an error.",
      "In `feed`, split the buffer and put the last piece back before you look at any line. Then a line is only interesting if it starts with the prefix, the sentinel sets `done` instead of being parsed, and once `done` is set no later line produces an event.",
      '`close()` is where `decoder.decode(b"", final=True)` goes, wrapped in a `try` that turns `UnicodeDecodeError` into `truncated: True`. In `collect`, `source.close()` belongs in a `finally` so it also runs when `json.loads` raises on the way through, and the assembler\'s own `close()` is called after the loop, not inside it.',
    ],
    workspace: {
      language: "python",
      primaryFilePath: "stream/assembler.py",
      editableFilePaths: ["stream/assembler.py", "stream/collect.py"],
      visibleTestPaths: ["tests/test_assembler.py", "tests/test_collect.py"],
      hiddenTestPaths: ["tests/test_stream_hidden.py"],
      testRunnerPath: "tests/run_workspace_tests.py",
      files: [
        { path: "README.md", role: "docs", language: "markdown", content: STREAM_README },
        { path: "stream/__init__.py", role: "readonly", language: "python", content: EMPTY_INIT },
        {
          path: "stream/protocol.py",
          role: "readonly",
          language: "python",
          content: STREAM_PROTOCOL,
          description: "Read-only: the wire format constants",
        },
        {
          path: "stream/source.py",
          role: "readonly",
          language: "python",
          content: STREAM_SOURCE,
          description: "Read-only: the scripted byte stream",
        },
        {
          path: "stream/assembler.py",
          role: "editable",
          language: "python",
          content: STREAM_ASSEMBLER_STARTER,
          description: "Incremental decoding and event framing",
        },
        {
          path: "stream/collect.py",
          role: "editable",
          language: "python",
          content: STREAM_COLLECT_STARTER,
          description: "Driving the stream and closing it",
        },
        {
          path: "tests/__init__.py",
          role: "test",
          language: "python",
          content: EMPTY_INIT,
          hidden: true,
        },
        {
          path: "tests/test_assembler.py",
          role: "test",
          language: "python",
          content: STREAM_TEST_ASSEMBLER,
          description: "Visible framing tests",
        },
        {
          path: "tests/test_collect.py",
          role: "test",
          language: "python",
          content: STREAM_TEST_COLLECT,
          description: "Visible assembly and shutdown tests",
        },
        {
          path: "tests/test_stream_hidden.py",
          role: "test",
          language: "python",
          content: STREAM_TEST_HIDDEN,
          hidden: true,
          description: "Hidden boundary and truncation tests",
        },
        {
          path: "tests/run_workspace_tests.py",
          role: "test",
          language: "python",
          content: buildRunner([
            { module: "test_assembler", label: "visible assembler" },
            { module: "test_collect", label: "visible collect" },
            { module: "test_stream_hidden", label: "hidden stream" },
          ]),
          hidden: true,
          description: "Workspace test runner",
        },
      ],
      referenceFiles: [
        {
          path: "stream/assembler.py",
          role: "editable",
          language: "python",
          content: STREAM_ASSEMBLER_REFERENCE,
        },
        {
          path: "stream/collect.py",
          role: "editable",
          language: "python",
          content: STREAM_COLLECT_REFERENCE,
        },
      ],
    },
  },
}
