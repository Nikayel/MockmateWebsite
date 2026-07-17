# Research 1 — Cloud & Storage Fundamentals on AWS

Source-verified facts sheet for SQL Level 6, Module 6.1 (lessons 1-4). Audience: interns
and junior data-engineering candidates. Every number below is quoted from an authoritative
source (AWS official docs first, then vendor/Apache docs). Verified 2026-07-17. See the
**Sources** section for the exact URLs, and **Version-dependent / commonly-wrong** for the
facts that go stale or that learners routinely state incorrectly.

---

## 1. What "the cloud" is for a data engineer

**The one-sentence version:** the cloud is renting other people's computers and services
over the internet, by the second, instead of buying and racking your own hardware.

### Regions and Availability Zones (AZs)

- An **AWS Region** is a physical geographic location where AWS clusters data centers
  (e.g. `us-east-1` in N. Virginia, `eu-west-1` in Ireland). "Each AWS Region is
  completely independent and is designed to be isolated from the other AWS Regions."
- An **Availability Zone (AZ)** is "one or more discrete data centers with redundant power,
  networking, and connectivity in an AWS Region."
- **Each Region has a minimum of three AZs.** AZs are "physically separated by a meaningful
  distance, many kilometers, from any other Availability Zone, although all are within
  100 km (60 miles) of each other," and are connected by low-latency, high-bandwidth,
  highly redundant networking.
- **Why a DE cares:** one AZ can fail (fire, flood, power). Spreading data/compute across
  multiple AZs is how you stay up. S3 does this for you automatically (see §2); for your
  own databases and EC2 you choose the AZ layout. **Data in a Region never leaves that
  Region** unless you explicitly copy/replicate it (this is a compliance/residency answer).

| Term | What it is | Isolation | Beginner analogy |
|---|---|---|---|
| **Region** | A geographic area of clustered data centers | Fully independent from other Regions | A city |
| **Availability Zone** | One or more discrete data centers within a Region | Physically separate, but low-latency-linked to sibling AZs | A building in that city |

### Managed services — "you rent capability, not servers"

- With a **managed (or fully managed) service**, AWS runs the servers, patching, scaling,
  replication, and failover; you consume a capability through an API. You never see the
  underlying machine. S3 (storage), Athena (SQL queries), Glue (catalog/ETL), and Redshift
  Serverless (warehouse) are examples.
- The trade: less control and some lock-in, in exchange for no undifferentiated heavy
  lifting (no racking disks, no capacity planning, no replacing failed drives).
- Contrast: **EC2** (a virtual server you rent and administer yourself) is closer to
  "renting a server"; **S3/Athena** are "renting a capability."

### Pay-per-use

- AWS billing is consumption-based. AWS states it directly for S3: "Amazon S3 charges you
  only for what you actually use, with no hidden fees and no overage charges... you don't
  have to plan for the storage requirements of your application." No upfront capacity
  purchase; storage grows and shrinks with you.
- For a DE this reframes cost as a design variable: bytes stored, bytes scanned by a query,
  requests made, and data transferred all cost money, so **the cheapest query is the one
  that reads the fewest bytes** (this is the through-line into columnar formats and
  partitioning in later modules).

---

## 2. Amazon S3 — OBJECT storage

### The object model

- **S3 is an object storage service.** "An *object* is a file and any metadata that
  describes the file. A *bucket* is a container for objects."
- An object = **object data (the value/blob)** + **metadata** ("a set of name-value pairs
  that describe the object," including default metadata like last-modified and HTTP
  `Content-Type`, plus optional custom metadata) + a **key**.
- A **bucket** is the top-level container. You pick a **name** and a **Region** at creation
  and **cannot change either afterward**. General-purpose bucket names live in a global
  namespace (must be unique across all AWS accounts in a partition).
- An **object key** (or key name) "is the unique identifier for an object within a bucket.
  Every object in a bucket has exactly one key." AWS says to think of S3 as "a basic data
  map between `bucket + key + version` and the object itself."
- **Addressed over HTTP(S).** S3 is a REST service; every object has a URL. Example from
  the docs: `https://amzn-s3-demo-bucket.s3.us-west-2.amazonaws.com/photos/puppy.jpg`
  where the bucket is `amzn-s3-demo-bucket` and the key is `photos/puppy.jpg`. You
  GET/PUT/DELETE objects with standard HTTP verbs (via SDK, CLI, or raw REST).
- **No in-place edit — objects are replaced whole ("immutable-ish").** There is no API to
  patch a byte range of a stored object. A `PUT` writes a brand-new object or **overwrites
  the existing key in full**. "Updates to a single key are atomic... you will get either
  the old data or the new data, but never partial or corrupt data." Concurrent writers use
  **last-writer-wins** (the latest-timestamp PUT wins; S3 does not lock for concurrent
  writers). *Nuance:* multipart upload lets you upload one large object in parts, but that
  still produces a single new object — it is not editing an existing one. Enabling
  **Versioning** keeps each overwrite as a new version instead of discarding the old bytes.

### Durability, availability, scale

- **Durability: "designed to provide 99.999999999% durability" — this is the "11 nines"
  figure.** (Exact doc wording: "Designed to provide 99.999999999% durability and 99.99%
  availability of objects over a given year.") All S3 Glacier classes are also designed for
  11 nines. Durability = probability of *not losing* a stored object in a year.
- **Availability: 99.99%** designed for S3 Standard (this is a *different* number from
  durability — see misconceptions).
- **Redundancy:** S3 Standard, Intelligent-Tiering, Standard-IA, and all three Glacier
  classes "redundantly store objects on multiple devices across a minimum of three
  Availability Zones." **S3 One Zone-IA stores data in a single AZ** (so it is *not*
  resilient to the loss of that AZ, even though it is still designed for 11 nines against
  device failure).
- **Scale:** virtually unlimited. Any number of objects per bucket; a single object can be
  up to **5 TB**. It is the default home for a data lake precisely because storage is
  effectively bottomless and cheap.

### Flat namespace — prefixes that only *look* like folders

- "The Amazon S3 data model is a flat structure... There is no hierarchy of subbuckets or
  subfolders. **Prefixes are not directories.**"
- A **prefix** is just the leading portion of a key (e.g. `sales/2026/01/` in
  `sales/2026/01/file.parquet`). A **delimiter** (usually `/`) lets a LIST "roll up" keys
  that share a prefix so the console can *draw* folders.
- When the console shows a folder, it is faking it: creating a folder makes "a zero-byte
  object with the folder prefix and delimiter value as the key." Max key length is
  **1,024 bytes**. This matters later: partition layouts like `dt=2026-01-01/` are just key
  prefixes, and query engines prune on them.

### Consistency model

- **S3 has strong read-after-write consistency, automatically, for all requests, since
  December 1, 2020.** From the AWS announcement: "all S3 GET, PUT, and LIST operations, as
  well as operations that change object tags, ACLs, or metadata, are now strongly
  consistent," this "applies to all existing and new S3 objects, works in all regions, and
  is available to you at no extra charge," with "no impact on performance."
- Concretely: after a successful PUT (new object *or* overwrite) or DELETE, any subsequent
  GET or LIST reflects it. Reads of S3 Select, ACLs, Object Tags, and object metadata
  (HEAD) are strongly consistent too.
- **Caveat to keep precise:** *object* operations are strongly consistent; **bucket-level
  configuration** changes (e.g. deleting a bucket, first-time enabling versioning) are
  still eventually consistent. And S3 **Inventory** reports are an eventually-consistent
  snapshot (see below).

### Storage classes (the cost / retrieval-latency trade)

The core idea: hotter data pays more per GB but retrieves instantly; colder/archive data
is cheaper per GB but adds retrieval latency and per-GB retrieval fees and minimum storage
durations. All are 11-nines durable by design.

| Storage class | Designed availability | AZs | Min. storage duration | Retrieval latency | Use it for |
|---|---|---|---|---|---|
| **S3 Standard** | 99.99% | ≥3 | none | milliseconds | Hot, frequently accessed data; active lake/warehouse tables |
| **S3 Intelligent-Tiering** | 99.9% | ≥3 | none | ms (frequent/infrequent tiers); minutes–hours (archive tiers) | Unknown or changing access patterns; auto-moves objects between tiers for a small monitoring fee |
| **S3 Standard-IA** (Infrequent Access) | 99.9% | ≥3 | 30 days | milliseconds | Infrequent but needs instant access (backups, older-but-live data) |
| **S3 One Zone-IA** | 99.5% | **1** | 30 days | milliseconds | Infrequent, re-creatable data you can afford to lose if an AZ dies |
| **S3 Glacier Instant Retrieval** | 99.9% | ≥3 | 90 days | milliseconds | Archive that is rarely read but needs instant access when it is |
| **S3 Glacier Flexible Retrieval** | 99.99% | ≥3 | 90 days | minutes to hours (Expedited 1–5 min; Standard 3–5 hrs; Bulk 5–12 hrs) | Archives where a wait is fine |
| **S3 Glacier Deep Archive** | 99.99% | ≥3 | 180 days | hours (Standard ~12 hrs; Bulk up to 48 hrs) | Lowest-cost, "look at it once a year" compliance archive |

(There is also **S3 Express One Zone**, a single-AZ, single-digit-millisecond,
highest-performance class in a special "directory bucket" — mention only, it is beyond a
beginner lake discussion.)

### Lifecycle policies

- An **S3 Lifecycle configuration** is "a set of rules that define actions that Amazon S3
  applies to a group of objects," with two action types:
  - **Transition actions** — move objects to a cheaper class after N days (e.g. Standard →
    Standard-IA at 30 days → Glacier Deep Archive at 365 days).
  - **Expiration actions** — delete objects at the end of their life ("Amazon S3 deletes
    expired objects on your behalf").
- This is how a DE automates hot → cold → archive → delete without writing a cron job.
  (Watch the minimum-duration charges above: transitioning tiny/short-lived objects can
  cost *more*, not less.)

### S3 Inventory + querying object metadata with SQL (Athena)

This is central to the curriculum's "query the platform's own metadata" device.

- **S3 Inventory** produces "comma-separated values (CSV), Apache optimized row columnar
  (ORC) or ... Parquet output files that list your objects and their corresponding metadata
  **on a daily or weekly basis**." It is a scheduled, cheaper alternative to hammering the
  synchronous `LIST` API and "does not affect the request rate of your bucket."
- Default fields per object include **Bucket, Key, Size, Last modified date, Storage class,
  ETag**; optional fields include **encryption status, replication status, object owner,
  version ID, Object Lock status**, and more.
- **You can query the inventory with SQL:** "You can query Amazon S3 Inventory with standard
  SQL queries by using **Amazon Athena, Amazon Redshift Spectrum**, and other tools such as
  **Presto, Hive, and Spark**." Athena is serverless SQL directly over files in S3 (no
  server to run) — so "run SQL over a folder of files in S3" is a real, first-class DE
  workflow, and querying an object-store inventory is a concrete example of it.
- Gotchas to teach honestly: the first report can take **up to 48 hours** to arrive; the
  list is an **eventually-consistent snapshot** (a very recent PUT/DELETE may not appear
  yet), so it is for reporting/auditing, not real-time truth.

---

## 3. Amazon EBS — BLOCK storage

- **Amazon EBS (Elastic Block Store) is block-level storage for EC2** — a raw virtual disk.
  You attach it to an EC2 instance, then format it with a filesystem (ext4, XFS, NTFS) and
  read/write it like a physical drive.
- **Attached to ONE instance at a time** (the beginner rule), and the volume and the
  instance **must be in the same Availability Zone**. You *can* attach many volumes to one
  instance; you generally cannot share one volume across instances.
  - *Advanced exception:* **EBS Multi-Attach** lets a Provisioned IOPS SSD (`io1`/`io2`)
    volume attach to up to **16 Nitro-based instances in the same AZ** — niche, requires a
    cluster-aware filesystem. Do not lead with this for beginners.
- **Low-latency random read/write** (single-digit-millisecond), which is exactly what a
  **boot disk** and a **transactional database's data files** need. This is the canonical
  contrast with object storage: a database wants to update 8 KB in the middle of a file in
  place — S3 cannot do that; EBS can.
- **Volume types (brief):** `gp3`/`gp2` = general-purpose SSD (default choice); `io2`/`io1`
  = provisioned-IOPS SSD (high-performance databases); `st1` = throughput-optimized HDD;
  `sc1` = cold HDD. **gp3** is the modern default: baseline **3,000 IOPS and 125 MiB/s
  included** in the price, independently scalable. (See §Version-dependent for gp3's current
  maximums, which recently changed.)

---

## 4. Amazon EFS (shared FILE storage) and EC2 instance store (ephemeral)

These complete the object/block/file mental model.

- **Amazon EFS (Elastic File System) = fully managed shared file storage.** It speaks
  **NFS (v4)**, so "tens, hundreds, or even thousands of compute instances can access an
  Amazon EFS file system at the same time," including EC2 instances "running in multiple
  Availability Zones within the same AWS Region." It "automatically scales from gigabytes to
  petabytes" with no capacity provisioning. Use it when **many machines must read/write the
  same files** (shared home directories, content stores, some ML/analytics scratch space).
- **EC2 instance store = ephemeral local disk** physically attached to the host machine.
  "You can only attach instance store volumes when the instance is launched, and these
  volumes only exist during the lifetime of the instance." Data is **lost when the instance
  stops or terminates**, and it cannot be detached and moved. No extra fee. Use it only for
  **scratch/cache/temp** data you can afford to lose (e.g. a shuffle spill or local temp for
  a job), never for anything you need to keep.

---

## 5. BLOCK vs OBJECT vs FILE storage — the comparison table

This table is lesson-ready. Keep it exactly this crisp.

| Dimension | **Block storage** | **Object storage** | **File storage** |
|---|---|---|---|
| **Access unit** | Fixed-size blocks of a raw volume (you format a filesystem on top) | Whole object (blob + metadata + key) | Files and directories in a hierarchy |
| **How addressed** | Attached device + block offset (e.g. `/dev/xvdf`) | Key over HTTP(S) REST (`bucket + key`, a URL) | File path over a network file protocol (NFS/SMB) |
| **Mutability** | In-place random read/write of any block | Replace the whole object; no in-place edit | In-place read/write of files |
| **Typical latency** | Sub-millisecond to single-digit ms | Milliseconds (hot classes); minutes–hours (archive) | Low ms over the network |
| **Sharing** | One instance at a time (Multi-Attach is a niche exception) | Massively concurrent readers/writers over HTTP | Many instances mount it concurrently |
| **Scale ceiling** | One volume, up to tens of TB (gp3 up to 64 TiB) | Virtually unlimited; objects up to 5 TB each | Petabyte-scale, elastic |
| **Canonical use case** | Boot disk; a database's data files | Data lake, backups, logs, media, any "big pile of files" | Shared files across many machines |
| **Example AWS service** | **Amazon EBS** (also EC2 instance store) | **Amazon S3** | **Amazon EFS** (also FSx) |

Mental model to hand the learner: **block = a raw disk you own and format; file = a shared
folder you mount; object = a giant HTTP key-value store of whole files.** Data lakes live on
**object** storage because it is the cheapest, most scalable, format-agnostic "big pile of
files" — and SQL engines can read those files directly.

---

## 6. Data lake vs data warehouse vs lakehouse

| | **Data lake** | **Data warehouse** | **Lakehouse** |
|---|---|---|---|
| **What it holds** | Raw data in its **native format** (structured, semi-structured, unstructured) | **Structured, modeled, curated** tables | Lake files **plus** warehouse-grade table semantics |
| **Schema** | **Schema-on-read** (impose structure when you query) | **Schema-on-write** (conform before loading) | Schema enforced via an open table format |
| **Storage** | Cheap **object storage** (files on S3) | Proprietary columnar storage inside the engine | Open columnar files (Parquet/ORC) on object storage |
| **Optimized for** | Cheap capture at any scale; ML/data science flexibility | Fast SQL/BI aggregations, governance | Both BI/SQL and ML on one copy of the data |
| **Canonical examples** | **A lake on Amazon S3** | **Amazon Redshift, Snowflake, Google BigQuery** | Open table formats: **Apache Iceberg, Delta Lake, Apache Hudi** |

- **Data lake** = "a large-scale storage system that holds raw data in its native format...
  at a low cost." On AWS this is **files sitting in S3**. Cheap and flexible, but on its own
  it has no transactions, no schema enforcement, no easy row-level updates.
- **Data warehouse** = a curated, structured, columnar, SQL-first analytics store.
  **Amazon Redshift** is AWS's managed columnar MPP (massively parallel processing)
  warehouse; **Snowflake** and **Google BigQuery** are the other two names every junior
  should know. Warehouses give speed + governance but historically meant loading data into
  a proprietary system.
- **Lakehouse** = "combines the low-cost, flexible storage of a data lake with the
  performance, reliability, and governance features of a data warehouse." It layers
  **ACID transactions, schema enforcement, and time travel** onto open files on object
  storage using an **open table format** — **Apache Iceberg** (the emerging industry
  standard, engine-agnostic), **Delta Lake** (Spark/Databricks-native), or **Apache Hudi**
  (built for upserts/incremental) — beginner-level name recognition is enough here.

---

## 7. "A table = a pile of files in a bucket + a catalog entry that gives them a schema"

This is the single most important mental model in the module.

- On its own, `s3://bucket/sales/` is just a folder of **Parquet files** — bytes. Nothing
  knows it is a "sales table," what columns it has, or their types.
- A **catalog** (metastore) supplies that missing schema: it records, for each table, the
  **column names and types, the partition columns, the file format, and the S3 location**.
  Add a catalog entry and the same pile of files becomes a queryable **table**.
- The two names to know:
  - **Hive metastore** — the original open-source metadata catalog from the Hadoop/Hive
    world; the de-facto standard interface.
  - **AWS Glue Data Catalog** — AWS's managed, **Hive-metastore-compatible** catalog. AWS:
    "Athena uses the AWS Glue Data Catalog to store metadata such as table and column names
    for data stored in Amazon S3, and this metadata... becomes the databases, tables, and
    views in the Athena query editor." A **Glue crawler** can auto-infer the schema from the
    files and populate the catalog for you.
- **Query engines read the catalog, then read the files.** **Amazon Athena** (serverless
  SQL), **Apache Spark**, **Trino/Presto**, and **Redshift Spectrum** all look up the table
  in the Glue/Hive catalog to learn "this S3 prefix of Parquet files is a table with these
  columns," and then scan only the files (and, later, only the partitions/row groups) they
  need. Separating the **catalog** (schema/metadata) from the **storage** (files in S3) from
  the **compute** (the query engine) is the defining shape of the modern data platform —
  and it is why "query a folder of files with SQL" is not a contradiction.

---

## Common learner misconceptions

- **Durability vs availability (the #1 mix-up).** **11 nines (99.999999999%) is
  DURABILITY** — the chance S3 does not *lose* your object over a year. **Availability is
  99.99%** for S3 Standard — the chance you can *reach* it at a given moment. They are
  different numbers measuring different things. Also: 11 nines is a **design target
  ("designed to provide"), not a contractual guarantee**; the S3 **SLA** covers
  availability (with service credits), not durability.
- **"S3 is eventually consistent."** Outdated. **Since December 1, 2020, S3 is strongly
  read-after-write consistent for all object operations.** Old blog posts, courses, and
  tools (S3Guard, EMRFS consistent view) that talk about eventual consistency predate this
  change. (Bucket-level *config* changes and Inventory snapshots are still eventual — keep
  that precise.)
- **"S3 has folders."** No. S3 has a **flat namespace**; "folders" are just **key
  prefixes** with a `/` delimiter, and console folders are zero-byte placeholder objects.
- **"You can edit an object in place."** No. You **replace the whole object** (or add a new
  version). There is no partial/byte-range write.
- **"Glacier is a separate service / Glacier means slow."** Glacier is now a **set of S3
  storage classes**, and they differ wildly: **Glacier Instant Retrieval is milliseconds**,
  Flexible is minutes–hours, Deep Archive is hours. Saying just "Glacier" hides a
  0-seconds-to-48-hours range.
- **"One Zone-IA is fine for critical data."** It lives in a **single AZ**; if that AZ is
  destroyed, the data is gone. Use it only for reproducible data.
- **"Moving data to IA/Glacier always saves money."** IA/Glacier classes have **minimum
  storage durations** (30/90/180 days) and per-GB retrieval fees, so churny or short-lived
  objects can cost *more*.
- **"EBS is like S3 / two servers can share an EBS volume."** EBS is a **single-instance
  block disk in one AZ**; for shared access you want **EFS** (Multi-Attach is a narrow
  exception). Mixing up block vs object vs file is the classic junior stumble.
- **"A data lake is a database."** A lake is **files in object storage**; it becomes
  query-able as tables only via a **catalog + query engine**.

---

## Interview angles (what a junior actually gets asked)

- **"Explain object vs block vs file storage, and give an AWS example of each."** →
  S3 / EBS / EFS, with the access-unit and mutability differences from §5.
- **"Why does a data lake live on S3 instead of in a database?"** → Cost, effectively
  unlimited scale, any file format, and **decoupled storage/compute** (many engines can
  read the same files; you pay for storage and compute separately).
- **"What durability does S3 give you, and what does that number mean?"** → 11 nines is a
  *durability design target* (not losing data), distinct from 99.99% availability; not an
  SLA guarantee.
- **"Is S3 strongly or eventually consistent?"** → **Strong** read-after-write for object
  ops since Dec 2020. Bonus points for naming the bucket-config eventual-consistency caveat.
- **"You have 10 TB of logs you rarely read but must keep 7 years. How do you store it
  cheaply?"** → Lifecycle policy transitioning to Glacier Flexible/Deep Archive; understand
  the retrieval-latency and minimum-duration trade.
- **"How would you query a bunch of Parquet files in S3 with SQL? Where does the schema
  come from?"** → Athena (serverless) over S3, schema from the **Glue Data Catalog /
  Hive metastore**; "table = files + catalog entry."
- **"Data lake vs data warehouse — when would you use each?"** → Raw/flexible/cheap capture
  (lake on S3) vs curated/fast/governed SQL & BI (Redshift/Snowflake/BigQuery); lakehouse
  when you want both on one copy.
- **"Can two EC2 instances write to the same disk?"** → Not with a normal EBS volume (one
  instance, one AZ). Use **EFS** for shared file access; Multi-Attach is the niche EBS
  exception.
- **"Walk me through hot vs cold vs archive storage tiers."** → S3 Standard → Standard-IA →
  Glacier Instant/Flexible → Deep Archive, trading per-GB price for retrieval latency and
  minimum durations, automated with lifecycle rules.

---

## Version-dependent / commonly-wrong facts (flagged)

- **gp3 maximums recently increased (WILL be stated wrong by most sources).** gp3 baseline
  is **3,000 IOPS + 125 MiB/s** included. AWS raised gp3's ceilings by **4x capacity
  (16 TiB → 64 TiB), 5x IOPS (16,000 → 80,000), and 2x throughput (1 GiB/s → 2 GiB/s)**.
  Most tutorials, exam-prep sites, and older AWS pages still cite the old **16,000 IOPS /
  1,000 MiB/s / 16 TiB** maximums. If a lesson quotes a gp3 max, use the current numbers or
  omit the max and quote only the 3,000 IOPS / 125 MiB/s baseline (safe and stable).
- **S3 consistency changed on 2020-12-01.** Any pre-2021 material describing S3 as
  eventually consistent for overwrites/LISTs is obsolete. Do not teach the old model.
- **Number of AZs per Region grows over time.** State "**a minimum of three AZs per
  Region**" (stable, from the docs) rather than a specific global count, which changes.
- **Glacier storage-class retrieval times/tiers evolve** and Instant Retrieval (2021) is
  newer than the original Glacier. Always name the *specific* class, never bare "Glacier."
- **"Designed to provide/exceed 11 nines" wording.** Quote it as a **design objective**; do
  not assert S3 contractually guarantees zero data loss.
- **Availability figures are "designed for" targets per class** (Standard 99.99%, IA/GIR/IT
  99.9%, One Zone-IA 99.5%); these are design numbers, distinct from the SLA's
  service-credit thresholds.

---

## Sources

All URLs below were fetched/verified on 2026-07-17.

- AWS — Regions and Availability Zones: <https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html>
- AWS — Global Infrastructure (Regions & AZs): <https://aws.amazon.com/about-aws/global-infrastructure/regions_az/>
- AWS S3 User Guide — What is Amazon S3? (object model, buckets/keys, consistency, paying): <https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html>
- AWS S3 User Guide — Data protection / Data durability (11 nines, 99.99% availability, ≥3 AZs): <https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html>
- AWS Blog — Amazon S3 Update: Strong Read-After-Write Consistency (Dec 1, 2020): <https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/>
- AWS — Amazon S3 Storage Classes (availability, AZs, min duration, retrieval): <https://aws.amazon.com/s3/storage-classes/>
- AWS S3 User Guide — Understanding S3 storage classes: <https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html>
- AWS S3 User Guide — Organizing objects using prefixes (flat namespace): <https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-prefixes.html>
- AWS S3 User Guide — Managing the lifecycle of objects (transition/expiration): <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html>
- AWS S3 User Guide — Cataloging and analyzing data with S3 Inventory (CSV/ORC/Parquet, daily/weekly, Athena): <https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory.html>
- AWS EBS User Guide — Volume types (gp3/io2/st1/sc1): <https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html>
- AWS — EBS General Purpose (gp3) Volumes: <https://aws.amazon.com/ebs/general-purpose/>
- AWS Storage Blog — Larger and faster gp3 volumes (64 TiB / 80,000 IOPS / 2 GiB/s): <https://aws.amazon.com/blogs/storage/improve-your-application-resiliency-with-larger-and-faster-gp3-volumes/>
- AWS EBS User Guide — Multi-Attach (io1/io2, up to 16 Nitro instances, same AZ): <https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html>
- AWS EC2 User Guide — Storage options / instance store (ephemeral): <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Storage.html>
- AWS — Amazon EFS FAQ (NFS, many instances, multi-AZ, elastic): <https://aws.amazon.com/efs/faq/>
- AWS Athena User Guide — Use the AWS Glue Data Catalog (Athena + Glue + Hive-compatible): <https://docs.aws.amazon.com/athena/latest/ug/data-sources-glue.html>
- AWS Glue Developer Guide — Data discovery and cataloging (crawlers infer schema): <https://docs.aws.amazon.com/glue/latest/dg/catalog-and-crawler.html>
