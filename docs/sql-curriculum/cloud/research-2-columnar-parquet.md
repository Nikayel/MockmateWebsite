# Research 2: File Formats and Why Columnar (Apache Parquet) Wins for Analytics

Audience: beginner data-engineering interns and junior DE candidates.
Scope: row vs columnar layout, what columnar buys analytics, Parquet anatomy, CSV/JSON vs Parquet, Parquet vs ORC vs Avro, and columnar in the cloud warehouses.

Every documented number below is cited. Numbers that are illustrative teaching estimates (not from a single named benchmark) are explicitly labeled ILLUSTRATIVE.

---

## 1. Row-oriented vs column-oriented physical layout

The difference is only about the ORDER in which values are written to disk. The logical table is identical; the byte layout is not.

Take this tiny table:

| id | name  | age |
|----|-------|-----|
| 1  | Alice | 30  |
| 2  | Bob   | 25  |
| 3  | Carol | 35  |

**Row-oriented storage** (CSV, JSON lines, a classic OLTP row store) writes all of row 1, then all of row 2, then all of row 3. Values of different types sit next to each other:

```
[1, Alice, 30] [2, Bob, 25] [3, Carol, 35]
```

This is great when you want a whole record at once (fetch the user with id = 2, insert one new user, update one row). That is the transactional (OLTP) access pattern.

**Column-oriented storage** (Parquet, ORC, and the internal format of Redshift / Snowflake / BigQuery) writes all of column `id`, then all of column `name`, then all of column `age`. Values of the SAME type sit together:

```
[1, 2, 3] [Alice, Bob, Carol] [30, 25, 35]
```

This is great when you want a few columns across many rows (average age of all users, count of distinct names). That is the analytical (OLAP) access pattern.

Concrete contrast, query `SELECT age FROM users`:

- Row store: the three `age` values are scattered across the file, so the reader must walk over `id` and `name` bytes to reach each `age`. In practice it reads (nearly) the whole file.
- Column store: the `age` values are one contiguous block `[30, 25, 35]`. The reader seeks to that block and reads only it, roughly one third of the data here.

Key sentence for a learner: **row stores optimize "give me this whole record"; column stores optimize "give me this one field across all records."** Analytics is almost always the second shape, which is why analytical systems are columnar.

Sources: [MotherDuck, Columnar Storage Guide](https://motherduck.com/learn/columnar-storage-guide/); [Couchbase, Row vs Columnar](https://www.couchbase.com/blog/columnar-store-vs-row-store/); [Fivetran, Columnar vs Row Database](https://www.fivetran.com/learn/columnar-database-vs-row-database).

---

## 2. What columnar buys you, precisely, for analytics

Three compounding wins: read fewer columns, compress each column harder, and skip whole chunks that cannot match the filter.

### 2a. Column projection (column pruning)

Because each column is a separate contiguous region, `SELECT a, b` reads only the storage for `a` and `b`. The other columns are never touched on disk.

Intuition with numbers (ILLUSTRATIVE): a wide events table has 100 columns of roughly equal size. A dashboard query does `SELECT user_id, revenue`. Ignoring the small footer, the reader touches about **2 of 100 columns, roughly 2 percent of the column data**. A CSV of the same table has no column boundaries, so the same query must scan 100 percent of the bytes to reach those two fields.

The teaching line: **a wide table with a narrow query reads a small fraction of the bytes in a columnar format, and essentially all of them in a row format.** The wider the table and the narrower the query, the bigger the win.

Sources: [MotherDuck, Columnar Storage Guide](https://motherduck.com/learn/columnar-storage-guide/); [DASCA, Columnar vs Row-Based Storage](https://www.dasca.org/world-of-data-science/article/columnar-vs-row-based-storage-boosting-data-warehouse-speed).

### 2b. Compression (encodings + codecs)

Like values sit together, so a column has low "entropy" (little variety) compared with a mixed-type row. Compression works far better on `[30, 25, 35, 30, 30, ...]` than on `[1, Alice, 30, 2, Bob, 25, ...]`.

Parquet compresses in two layers. First an **encoding** removes structural redundancy inside the column; then a **compression codec** squeezes the remaining bytes. The encoding does most of the size reduction; the codec cleans up the rest.

Beginner-level encodings (all part of the Parquet spec):

- **Dictionary encoding**: build a lookup table of the distinct values in the column, then store each row as a small integer ID pointing into that dictionary. A `country` column of 1,000,000 rows but only 50 distinct countries stores 50 strings once plus a million tiny integers. This is Parquet's default first choice for most columns, with automatic fallback to plain encoding if the dictionary grows too large. The integer IDs are themselves stored with the RLE / bit-packing hybrid below.
- **Run-length encoding (RLE)**: replace a run of identical values with the value plus a count. `[A, A, A, A, A]` becomes `(A, 5)`. Excellent for sorted or low-cardinality columns.
- **Bit-packing**: if a column only needs values 0 to 7, store each in 3 bits instead of a full 32-bit or 64-bit integer. Parquet uses an **RLE / Bit-Packing Hybrid**: it switches between RLE runs (repeated single value) and bit-packed runs (several small differing values) depending on the data.
- **Delta encoding** (`DELTA_BINARY_PACKED` for integers): store the difference between consecutive values instead of the values. Great for sorted IDs and timestamps, where `[1000, 1002, 1005, 1009]` becomes `[1000, +2, +3, +4]`, which are tiny numbers that bit-pack well. Parquet also has delta variants for byte arrays (`DELTA_LENGTH_BYTE_ARRAY`, `DELTA_BYTE_ARRAY`) and `BYTE_STREAM_SPLIT` for floats.

Compression codecs applied on top of the encoded bytes (Parquet supports these 8: `UNCOMPRESSED`, `SNAPPY`, `GZIP`, `LZO`, `BROTLI`, `LZ4` (deprecated, use `LZ4_RAW`), `ZSTD`, `LZ4_RAW`):

| Codec | Speed | Ratio (size reduction) | Typical use |
|-------|-------|------------------------|-------------|
| **Snappy** | Very fast compress and decompress (decompression often > 500 MB/s per core) | Modest, roughly 1.5x to 2x | The de-facto default in most Parquet tooling; great when CPU/latency matters |
| **Gzip** | Slower | High | When you want smaller files and can spend CPU |
| **Zstd** | Fast (compression and decompression 2 to 5x faster than Gzip at a similar ratio) | High, comparable to Gzip | Increasingly the modern default; ~15 to 20 percent smaller than Snappy with a very small read-time cost |

**Which codec is the default? Get this exactly right, it is commonly stated wrong.** There are two different "defaults":

- The **parquet-java (formerly parquet-mr) reference library** writer defaults to **`UNCOMPRESSED`**. The constant is `ParquetWriter.DEFAULT_COMPRESSION_CODEC_NAME = CompressionCodecName.UNCOMPRESSED`.
- The **engines and libraries most people actually use default to Snappy**: Apache Spark's `spark.sql.parquet.compression.codec` defaults to `snappy` (since Spark 2.x; it was `gzip` in older versions), and pandas / PyArrow `to_parquet` defaults to `snappy`.

So the safe, precise statement for an interview: **"Snappy is the de-facto default across common Parquet tooling (Spark, pandas, PyArrow), even though the low-level parquet-java library itself defaults to uncompressed. Zstd is increasingly chosen for a better size/speed tradeoff."**

Sources: [Apache Parquet Encodings](https://parquet.apache.org/docs/file-format/data-pages/encodings/); [Apache Parquet Compression](https://parquet.apache.org/docs/file-format/data-pages/compression/); [parquet-java ParquetWriter.java](https://github.com/apache/parquet-java/blob/master/parquet-hadoop/src/main/java/org/apache/parquet/hadoop/ParquetWriter.java); [Spark/PyArrow default snappy discussion](https://github.com/pengfei99/ParquetDataFormat); [Zstd vs Snappy vs Gzip for Parquet](https://medium.com/dataengineeringxperts/zstd-vs-snappy-vs-gzip-the-compression-king-for-parquet-has-arrived-b4937a488b8e).

### 2c. Predicate pushdown (min-max statistics and row-group skipping)

Parquet stores per-column statistics in its metadata: **minimum value, maximum value, and null count**, both **per column chunk (per row group)** and **per page**. A query engine reads these tiny statistics first and uses them to skip data that cannot possibly match the filter, without reading that data at all.

Worked example. A file has several row groups. For a `height` column, one row group's statistics say `{min: 62, max: 78}`. The query is `WHERE height > 80`. Since the maximum in that row group is 78, no row in it can satisfy `height > 80`, so the engine **skips the entire row group** and never reads its `height` data. This is called row-group skipping (also called row-group pruning, or "predicate pushdown" because the filter is pushed down to the storage layer).

The same logic applies at the finer **page** level, and null counts let a `WHERE x IS NOT NULL` query skip pages that are all nulls. The more your data is sorted or clustered on the filter column, the more row groups get skipped, because their min-max ranges stop overlapping the predicate.

The teaching line: **projection cuts which columns you read; predicate pushdown cuts which rows (row groups/pages) you read. Together they can turn a full-table scan into reading a few percent of the file.**

Note: Parquet stores the statistics; the query engine (Spark, Trino, DuckDB, etc.) must implement the skipping. Statistics can be absent or unreliable if the writer did not populate them, which is a known real-world gotcha.

Sources: [Predicate Pushdown in Parquet (Medium/A. Singh)](https://medium.com/@diehardankush/predicate-pushdown-in-parquet-enhancing-efficiency-and-performance-5becb0b992de); [Predicate pushdown in Trino](https://posulliv.github.io/posts/parquet-predicate-pushdown/); [Cloudera, Predicate Pushdown in Parquet](https://docs.cloudera.com/documentation/enterprise/6/latest/topics/cdh_ig_predicate_pushdown_parquet.html).

---

## 3. Parquet file anatomy for beginners

A Parquet file is a nested structure. From outside in:

1. **File** = a magic marker `PAR1`, then one or more row groups, then a footer, then the footer length, then `PAR1` again.
2. **Row group** = a horizontal slice of the rows (for example, the first N rows). Each row group holds one **column chunk per column**.
3. **Column chunk** = all the values for one column within one row group, stored contiguously. This contiguity is what makes column projection cheap.
4. **Page** = a column chunk is split into **pages**, the smallest unit of encoding and compression. There are data pages and (for dictionary encoding) dictionary pages.
5. **Footer (file metadata)** = written at the very end. It holds the schema, the row-group and column-chunk offsets (where each chunk lives in the file), and the per-column statistics (min, max, null count).

```
PAR1
  Row Group 0
    Column chunk: id      -> [pages...]
    Column chunk: name    -> [pages...]
    Column chunk: age     -> [pages...]
  Row Group 1
    Column chunk: id      -> [pages...]
    ...
  Footer: schema + column stats (min/max/nulls) + offsets
  <4-byte footer length>
PAR1
```

**Why the reader opens the footer first.** The footer is the map. A reader seeks to the end of the file, reads the footer to learn the schema, which row groups and column chunks exist, where each chunk starts, and each chunk's min/max stats. Only then does it decide which chunks to actually read. The Apache spec states it plainly: "Readers are expected to first read the file metadata to find all the column chunks they are interested in. The column chunks should then be read sequentially." The metadata is written last precisely so the file can be produced in a single streaming pass while still giving readers a full index.

**Default row group size (get this exactly right).** There are two figures people cite, and they mean different things:

- **Code default: 128 MB.** The parquet-java (formerly parquet-mr) library default is `parquet.block.size = 134217728 bytes = 128 MB` (`DEFAULT_BLOCK_SIZE = 128 * 1024 * 1024`). The default **page** size is `parquet.page.size = 1048576 bytes = 1 MB`. This 128 MB figure is the one usually meant by "the default row group size."
- **Docs recommendation: 512 MB to 1 GB.** The official Apache Parquet configuration page does not print a default; it **recommends** large row groups of 512 MB to 1 GB (and an 8 KB page size), noting they should align with the underlying storage block size (historically the HDFS block).

Both are configurable, and **engines tune them**. For example Spark writes with its own block-size setting, and Parquet buffers each row group in memory before flushing, so the on-disk row group ends up near the configured target. So the correct interview answer is: **"The parquet-java default row group size is 128 MB and it is configurable; the Apache docs recommend 512 MB to 1 GB for better scan throughput, and engines like Spark tune it."**

Sources: [Apache Parquet File Format](https://parquet.apache.org/docs/file-format/); [Apache Parquet Configurations](https://parquet.apache.org/docs/file-format/configurations/); [parquet-java parquet-hadoop README](https://github.com/apache/parquet-java/blob/master/parquet-hadoop/README.md); [apache/parquet-format on GitHub](https://github.com/apache/parquet-format/).

---

## 4. CSV / JSON vs Parquet in practical terms

| Property | CSV / JSON (row, text) | Parquet (columnar, binary) |
|----------|------------------------|----------------------------|
| Schema and types | Not embedded; every reader guesses/infers types, and "1", 1, 1.0, null are ambiguous | Schema and types embedded in the footer; no guessing |
| Size on disk | Large; text, no columnar compression | Typically much smaller after per-column encoding + codec |
| Bytes scanned for a selective query | Whole file (no projection, no skipping) | Only needed column chunks, minus skipped row groups |
| Human-readable | Yes | No (binary) |
| Write pattern | Append-friendly (add a line) | Written whole; not append-friendly (footer is written last) |
| Best at | Interchange, tiny files, quick eyeballing, streaming appends | Analytical scans over large tables |

Realistic size and scan comparison (ILLUSTRATIVE, typical magnitudes rather than one named benchmark):

- A 10 GB CSV often becomes roughly a **1 to 2 GB Parquet file**, while the same data gzipped as CSV might be 3 to 4 GB. Parquet wins because it compresses each column with a type-aware encoding, not just a generic text zip.
- For a selective analytic query (`SELECT 2 columns ... WHERE date = last_week`) over that dataset, the CSV engine must scan the full 10 GB, while the Parquet engine reads only the two projected column chunks in the row groups whose date min/max overlaps last week, which can be a **few percent** of the file.

The tradeoffs to state honestly: Parquet is binary (not human-readable, you need a tool to peek inside), and it is written whole, so it is poor for row-by-row appends and single-row updates. CSV/JSON remain fine for small files, data interchange, and streaming ingestion.

Sources: [MotherDuck, Why choose Parquet](https://motherduck.com/learn/why-choose-parquet-table-file-format/); [MotherDuck, Columnar Storage Guide](https://motherduck.com/learn/columnar-storage-guide/) (source of the 10 GB CSV -> 1 to 2 GB Parquet illustration).

---

## 5. Parquet vs ORC vs Avro

The one idea to remember: **columnar formats (Parquet, ORC) are built for reading/scanning analytics; the row-oriented format (Avro) is built for writing/streaming and fetching whole records.**

| Dimension | **Parquet** | **ORC** | **Avro** |
|-----------|-------------|---------|----------|
| Physical orientation | Columnar | Columnar | **Row-oriented** |
| Optimized for | Scan-heavy analytics, column projection, wide tables | Analytics in the Hive/Trino/Hadoop world | Writes, streaming, whole-record reads |
| Schema | Embedded in footer | Embedded | Embedded as JSON in the header; the schema travels with the data |
| Schema evolution | Supported (for example adding columns), more limited than Avro | Supported | **Strongest**; forward/backward evolution is a core design goal |
| Compression and indexes | Encodings (dictionary/RLE/delta) + codecs; min/max + null-count stats per row group and page | Strong compression + built-in lightweight indexes (min/max, bloom filters); supports ACID in Hive | Row-level; less compression benefit than columnar |
| Ecosystem sweet spot | Widest: Spark, pandas/Arrow, DuckDB, every cloud warehouse, Iceberg/Delta/Hudi | Hive, Trino/Presto, Hadoop stacks | Kafka, Confluent Schema Registry, event/ingestion pipelines |
| Write / append pattern | Whole-file/batch | Whole-file/batch | Append and streaming friendly (one record at a time) |
| Human-readable | No (binary) | No (binary) | No (binary payload; schema is JSON) |

How to choose (the teaching heuristic):

- **Scan-heavy analytics, read a few columns from a huge table** -> Parquet (or ORC if you live in Hive/Trino).
- **Streaming ingestion, event-by-event writes, Kafka, frequent schema changes, or you usually need the whole record** -> Avro.

A common real pipeline uses **Avro at the ingestion edge** (Kafka topics, landing raw events) and then **compacts into Parquet** for the analytics layer. Both, not either/or.

Sources: [ClickHouse, Columnar storage formats: Parquet, ORC, Arrow](https://clickhouse.com/resources/engineering/columnar-storage-formats); [MotherDuck, Parquet vs CSV/Avro/ORC](https://motherduck.com/learn/why-choose-parquet-table-file-format/); [Srinimf, Parquet vs ORC vs Avro](https://srinimf.com/2024/09/10/parquet-vs-orc-vs-avro-top-differences-explained/).

---

## 6. Columnar in the cloud warehouses

The point for a learner: "columnar" is not just a file format, it is how the big cloud warehouses physically store data internally.

| Warehouse | Internal storage | What to know |
|-----------|------------------|--------------|
| **Amazon Redshift** | Columnar | Stores each column separately with per-column compression encodings (LZO, Zstandard, and Amazon's proprietary AZ64). Uses zone maps (in-memory min/max per block) to skip blocks, the same idea as Parquet row-group skipping. |
| **Snowflake** | Compressed columnar **micro-partitions** | Data is automatically split into micro-partitions, each holding **up to ~16 MB of compressed data** (Snowflake stores data compressed). Snowflake also describes them as **50 MB to 500 MB of uncompressed data** before compression. Rows are "organized in a columnar fashion," columns are "stored independently within micro-partitions," and "only the columns referenced by a query are scanned." Per-micro-partition metadata (min/max, etc.) drives pruning. |
| **Google BigQuery** | **Capacitor** columnar format | Capacitor is BigQuery's columnar storage format (successor to ColumnIO, built on the Dremel lineage). Each column is stored separately for high compression and scan throughput, it can operate directly on compressed data without fully decompressing, and it supports nested and repeated fields. |

Precise Snowflake wording to reuse: a micro-partition contains **up to about 16 MB of compressed data**, which corresponds to roughly **50 MB to 500 MB uncompressed**. Both figures describe the same unit; the 16 MB is the compressed on-disk size, the 50 to 500 MB is the uncompressed logical size. Do not say "16 MB uncompressed."

Sources: [Snowflake, Micro-partitions and Data Clustering](https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions); [Google Cloud, Inside Capacitor](https://cloud.google.com/blog/products/bigquery/inside-capacitor-bigquerys-next-generation-columnar-storage-format); [InfluxData, BigQuery vs Redshift](https://www.influxdata.com/comparison/bigquery-vs-redshift/) (Redshift AZ64/LZO/Zstandard).

---

## Common learner misconceptions

- **"Columnar is a different database, not a file layout."** It is fundamentally about byte order on disk (all of column A, then column B). The same rows, reordered.
- **"Parquet's default compression is Snappy."** Half-true and a classic interview trap. The **parquet-java reference library defaults to UNCOMPRESSED**; **Spark, pandas, and PyArrow default to Snappy**. Say it precisely.
- **"128 MB is what the Apache docs say the default row group is."** The **code default** is 128 MB (parquet-java); the **docs recommend** 512 MB to 1 GB. Two different statements, both correct in context.
- **"Micro-partitions are 16 MB uncompressed."** No. ~16 MB **compressed**, which is 50 to 500 MB **uncompressed**.
- **"Predicate pushdown reads the row group then filters it."** No. It reads only the tiny footer statistics first and **skips** the row group's data entirely if the min/max cannot match. No data read for skipped groups.
- **"Parquet is always smaller than any CSV."** Usually yes, but a poorly-chosen codec, tiny files, or high-cardinality random data can shrink the advantage. The win comes from type-aware per-column encoding, which needs real columns with structure.
- **"Parquet is faster so you should always use it, even for streaming ingestion."** For row-by-row writes and event streams, a row format (Avro) is the right tool; Parquet is written whole and is append-unfriendly.
- **"Avro is columnar too."** No. Avro is **row-oriented**. That is exactly why it suits streaming/Kafka and whole-record fetch.
- **"Statistics are guaranteed."** Parquet can store min/max/null-count, but a writer may omit them or an engine may not use them; then no skipping happens.

---

## Interview angles (what a junior actually gets asked)

- **"Why is Parquet faster than CSV for analytics?"** Three reasons: (1) column projection reads only the columns you select, not whole rows; (2) type-aware per-column encoding plus a codec make it much smaller, so there is less to read; (3) min/max statistics let the engine skip row groups that cannot match the `WHERE` clause. CSV has none of these: no schema, no columns, no stats, so a selective query scans the whole file.
- **"What does columnar buy you?"** Cheap column pruning, far better compression (like values together), and predicate pushdown via per-chunk min/max. Net effect: read a few percent of a big table instead of all of it.
- **"How does predicate pushdown work?"** The engine reads the footer's per-row-group (and per-page) min/max and null-count stats first, compares them to the filter, and skips any row group whose range cannot satisfy the filter (for example `max = 78` vs `WHERE height > 80`), without reading its data.
- **"Walk me through a Parquet file's structure."** File -> one or more row groups -> one column chunk per column per row group -> pages inside each chunk -> a footer at the end with schema, offsets, and stats; the reader opens the footer first because it is the map.
- **"What's the default row group size?"** 128 MB in parquet-java (configurable via `parquet.block.size`); the docs recommend 512 MB to 1 GB; engines like Spark tune it.
- **"Parquet vs Avro, when do you pick each?"** Parquet (columnar) for scan-heavy analytics; Avro (row-oriented) for streaming ingestion, Kafka, row-by-row writes, and strong schema evolution. Common pattern: ingest as Avro, compact to Parquet.
- **"Which compression codec would you use?"** Snappy for speed (the de-facto default in Spark/pandas), Gzip for smaller files at higher CPU cost, Zstd as the modern balance (near-Gzip size at near-Snappy speed).
- **"Are cloud warehouses columnar?"** Yes: Redshift is columnar (with zone maps), Snowflake stores compressed columnar micro-partitions (~16 MB compressed, 50 to 500 MB uncompressed), and BigQuery uses the columnar Capacitor format.

---

## Must-be-accurate figures (quick reference)

| Fact | Value | Status |
|------|-------|--------|
| Parquet default row group size (parquet-java) | 128 MB = 134,217,728 bytes (`parquet.block.size`) | Documented (parquet-java) |
| Parquet default page size (parquet-java) | 1 MB = 1,048,576 bytes (`parquet.page.size`) | Documented (parquet-java) |
| Parquet recommended row group size (Apache docs) | 512 MB to 1 GB | Documented recommendation |
| Parquet recommended page size (Apache docs) | 8 KB | Documented recommendation |
| parquet-java default compression codec | UNCOMPRESSED | Documented (source) |
| De-facto default codec in Spark / pandas / PyArrow | Snappy | Documented |
| Parquet supported codecs | UNCOMPRESSED, SNAPPY, GZIP, LZO, BROTLI, LZ4 (deprecated), ZSTD, LZ4_RAW | Documented |
| Snowflake micro-partition size | ~16 MB compressed; 50 to 500 MB uncompressed | Documented (Snowflake) |
| BigQuery storage format | Capacitor (columnar) | Documented (Google) |
| Redshift storage | Columnar (AZ64 / LZO / Zstandard) | Documented |
| 10 GB CSV -> Parquet size | ~1 to 2 GB | ILLUSTRATIVE |
| Wide table, 2 of 100 columns projected | ~2% of column data read | ILLUSTRATIVE |

---

## Sources (verified URLs)

Apache primary sources:
- Parquet file format: https://parquet.apache.org/docs/file-format/
- Parquet configurations (recommended row group 512 MB to 1 GB, page 8 KB): https://parquet.apache.org/docs/file-format/configurations/
- Parquet encodings (dictionary, RLE/bit-packing hybrid, delta, byte-stream-split): https://parquet.apache.org/docs/file-format/data-pages/encodings/
- Parquet compression (8 codecs, LZ4 deprecated): https://parquet.apache.org/docs/file-format/data-pages/compression/
- parquet-java parquet-hadoop README (parquet.block.size default 128 MB, parquet.page.size default 1 MB): https://github.com/apache/parquet-java/blob/master/parquet-hadoop/README.md
- parquet-java ParquetWriter.java (DEFAULT_COMPRESSION_CODEC_NAME = UNCOMPRESSED): https://github.com/apache/parquet-java/blob/master/parquet-hadoop/src/main/java/org/apache/parquet/hadoop/ParquetWriter.java
- apache/parquet-format spec repo: https://github.com/apache/parquet-format/

Warehouse primary sources:
- Snowflake micro-partitions (16 MB compressed, 50 to 500 MB uncompressed, columnar): https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions
- Google Cloud, Inside Capacitor (BigQuery columnar format): https://cloud.google.com/blog/products/bigquery/inside-capacitor-bigquerys-next-generation-columnar-storage-format

Supporting / explanatory sources:
- MotherDuck, Columnar Storage Guide: https://motherduck.com/learn/columnar-storage-guide/
- MotherDuck, Why choose Parquet (vs CSV/Avro/ORC): https://motherduck.com/learn/why-choose-parquet-table-file-format/
- ClickHouse, Columnar storage formats (Parquet/ORC/Arrow): https://clickhouse.com/resources/engineering/columnar-storage-formats
- Couchbase, Row vs Columnar store: https://www.couchbase.com/blog/columnar-store-vs-row-store/
- Fivetran, Columnar vs Row database: https://www.fivetran.com/learn/columnar-database-vs-row-database
- DASCA, Columnar vs Row-based storage: https://www.dasca.org/world-of-data-science/article/columnar-vs-row-based-storage-boosting-data-warehouse-speed
- Predicate pushdown in Parquet (min/max, row-group skipping): https://medium.com/@diehardankush/predicate-pushdown-in-parquet-enhancing-efficiency-and-performance-5becb0b992de
- Predicate pushdown in Trino: https://posulliv.github.io/posts/parquet-predicate-pushdown/
- Cloudera, Predicate Pushdown in Parquet: https://docs.cloudera.com/documentation/enterprise/6/latest/topics/cdh_ig_predicate_pushdown_parquet.html
- Zstd vs Snappy vs Gzip for Parquet: https://medium.com/dataengineeringxperts/zstd-vs-snappy-vs-gzip-the-compression-king-for-parquet-has-arrived-b4937a488b8e
- Spark/PyArrow default snappy reference: https://github.com/pengfei99/ParquetDataFormat
- Srinimf, Parquet vs ORC vs Avro: https://srinimf.com/2024/09/10/parquet-vs-orc-vs-avro-top-differences-explained/
- InfluxData, BigQuery vs Redshift (Redshift AZ64/LZO/Zstandard): https://www.influxdata.com/comparison/bigquery-vs-redshift/
