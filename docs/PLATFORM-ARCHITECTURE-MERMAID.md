# CodeSparring — Platform architecture (Mermaid)

Use this file in [Mermaid Live Editor](https://mermaid.live), VS Code (Mermaid extension), GitHub/GitLab markdown preview, or any Mermaid-compatible renderer.

Each section is **self-contained**: copy the fenced block only (including ` ```mermaid ` … ` ``` `).

---

## 1. System context (C4-style)

High-level actors, the Next.js app on Vercel, data stores, and external APIs.

```mermaid
flowchart TB
  subgraph users["Users"]
    U[Developer / candidate]
    A[Admin / support]
  end

  subgraph client["Client"]
    WEB[Browser - Next.js UI]
  end

  subgraph vercel["Vercel"]
    APP[Next.js App Router]
    API["Route Handlers /api/*"]
  end

  subgraph google["Google Cloud"]
    FA[Firebase Auth]
    FS[(Firestore)]
  end

  subgraph external["External services"]
    GEMINI[Google Gemini - LLM + embeddings]
    PINECONE[Pinecone - vectors]
    PISTON[Piston - code execution]
    DG[Deepgram - voice STT]
    STRIPE[Stripe - billing]
    BREVO[Brevo - email]
  end

  U --> WEB
  A --> WEB
  WEB --> APP
  WEB --> API
  APP --> API
  API --> FA
  API --> FS
  API --> GEMINI
  API --> PINECONE
  API --> PISTON
  API --> DG
  API --> STRIPE
  API --> BREVO
```

---

## 2. Interview session — behavior (sequence)

Typical flow: load scenario, run code, chat with AI, get feedback.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant API as Next API
  participant P as Piston
  participant G as Gemini
  participant R as "RAG (lib)"
  participant DB as Firestore

  B->>API: POST /api/execute (code, scenarioId, language)
  API->>P: Run wrapped user code + tests
  P-->>API: stdout (__LOGS__, __RESULT__)
  API-->>B: test results + consoleLogs

  B->>API: POST /api/chat (message, code, history, scenario)
  API->>R: Build context (patterns, company, retrieval)
  R->>DB: Optional profile / session metadata
  R->>G: Embed query (if retrieval)
  R-->>API: Retrieved chunks + knowledge-base text
  API->>G: Generate reply (system + user + context)
  G-->>API: Interviewer message + usage
  API-->>B: AI message

  B->>API: POST /api/generate-feedback (or stream)
  API->>G: Feedback prompt (may use RAG)
  G-->>API: Structured feedback
  API->>DB: Persist session / metrics (where applicable)
  API-->>B: Feedback payload
```

---

## 3. Code execution and console capture

Matches `lib/piston.ts`: wrapper patches console, emits markers, parses output, validates tests.

```mermaid
flowchart TD
  A[POST /api/execute] --> B[Rate limit + quota]
  B --> C[Load scenario + test cases]
  C --> D[Wrap user code - helpers TreeNode etc]
  D --> E[Patch console.log warn error info]
  E --> F[Invoke solution / class ops]
  F --> G[Piston sandbox run]
  G --> H[stdout lines]
  H --> I{parseExecutionOutput}
  I --> J[__LOGS__ JSON to consoleLogs array]
  I --> K[__RESULT__ JSON to return value]
  K --> L[validateResult / validators]
  L --> M[Response: pass fail per test + consoleLogs]
```

---

## 4. AI orchestration (`lib/ai-providers.ts`)

```mermaid
flowchart LR
  subgraph entry["Entry"]
    REQ[generateAIResponse]
  end

  REQ --> RL{userId?}
  RL -->|yes| RLIM[checkRateLimit]
  RL -->|no| SEL
  RLIM --> SEL[Select provider by TaskComplexity]
  SEL --> CACHE{ai-cache hit?}
  CACHE -->|yes| OUT[Return cached text]
  CACHE -->|no| CALL[Call Gemini / DeepSeek / Claude]
  CALL --> TRACK[usage-tracking → Firestore usage_events]
  TRACK --> OUT2[AIResponse text + provider + tokens]
```

---

## 5. RAG pipeline (retrieval-augmented generation)

```mermaid
flowchart TB
  subgraph consumers["Consumers"]
    CHAT["POST /api/chat"]
    RAGHTTP["POST /api/rag"]
    ROAD["roadmap + hint agents"]
  end

  subgraph build["Context & knowledge"]
    KB[knowledge-base DSA company complexity]
    CTX[context-builder RAGContextBuilder]
    DYN[dynamic-chat-context]
    PROF[enhanced-user-profile]
  end

  subgraph retrieve["Retrieval"]
    ADV[advanced-retrieval - expand rerank filter]
  end

  subgraph embed["Embeddings"]
    HYB[HybridEmbeddingProvider]
    GEM[Gemini text-embedding-004 768d]
    TFIDF[TF-IDF fallback]
    HYB --> GEM
    HYB --> TFIDF
  end

  subgraph store["Vector store"]
    FSDB[(Firestore vectors)]
    PC[(Pinecone - if PINECONE_API_KEY)]
  end

  CHAT --> CTX
  RAGHTTP --> ADV
  ROAD --> CTX
  CTX --> KB
  CTX --> DYN
  CTX --> PROF
  CTX --> ADV
  ADV --> HYB
  ADV --> FSDB
  ADV --> PC
  HYB --> FSDB
  HYB --> PC
  CTX --> CHAT
```

---

## 6. RAG vectorization and data processing

```mermaid
flowchart LR
  subgraph sources["Content sources"]
    DSA["DSA scenarios"]
    SYS["System design scenarios"]
    BUG["Bugfix scenarios"]
    CO["Company questions"]
    PK["Pattern knowledge"]
    USER["User solutions / performance"]
  end

  subgraph processing["Processing"]
    BUILD["Text builders\nrich embedding documents"]
    CLEAN["Sanitize + prepare text"]
    EMB["Embedding provider\nGemini primary"]
    DOC["VectorDocument\nid + vector + text + metadata"]
  end

  subgraph vectorstore["Vector store"]
    VDB["vectorDB factory"]
    PC[("Pinecone namespaces\nmockmate_problem, mockmate_hint, etc.")]
    FS[("Firestore vectors fallback")]
  end

  DSA --> BUILD
  SYS --> BUILD
  BUG --> BUILD
  CO --> BUILD
  PK --> BUILD
  USER --> BUILD
  BUILD --> CLEAN
  CLEAN --> EMB
  EMB --> DOC
  DOC --> VDB
  VDB --> PC
  VDB --> FS
```

---

## 7. Hint agent LangGraph flow

```mermaid
flowchart TD
  START([START]) --> PREP["prepareState\ncalculate struggle level\ncalculate reveal level"]
  PREP --> DIAG["diagnoseHintNeed\nLLM structured diagnosis"]
  DIAG --> GEN["generateLlmHints\nwrite targeted hints"]
  GEN --> PAT["addPatternHints\nif diagnosis allows"]
  PAT --> ENSURE["ensureAtLeastOneHint\nfallback safety"]
  ENSURE --> RAG["addRagHint\nif diagnosis allows"]
  RAG --> HIST["addUserHistoryHints\nif diagnosis allows"]
  HIST --> TEST["addTestFailureHints\nif diagnosis allows"]
  TEST --> FINAL["finalizeHints\nsort dedupe cap"]
  FINAL --> END([END])

  DIAG -.-> NEED["primaryNeed\nconceptual / approach / implementation / optimization / debugging"]
  DIAG -.-> SOURCE["source flags\nRAG / user history / pattern knowledge / test failures"]
  DIAG -.-> LEVEL["recommendedLevel\n1-4"]
```

---

## 8. Authentication (API requests)

```mermaid
sequenceDiagram
  participant C as Client
  participant FA as Firebase Auth
  participant API as Next API / Admin SDK

  C->>FA: OAuth sign-in
  FA-->>C: ID token JWT
  C->>API: Authorization Bearer token
  API->>API: adminAuth.verifyIdToken
  API-->>C: 200 + data or 401
```

---

## 9. Stripe subscription lifecycle

```mermaid
sequenceDiagram
  participant U as User
  participant API as Next API
  participant S as Stripe
  participant DB as Firestore

  U->>API: POST /api/create-checkout
  API->>S: Create Checkout Session
  S-->>U: Hosted checkout
  U->>S: Pay
  S->>API: POST /api/webhook/stripe - signed
  API->>API: Verify signature
  API->>DB: Update profiles subscription fields
  U->>API: GET /api/user/subscription-status
  API->>DB: Read profile
  API-->>U: tier + status
```

---

## 10. Cron jobs (scheduled maintenance)

```mermaid
flowchart LR
  VC["Vercel Cron"] --> CRON["/api/cron routes"]
  CRON --> AUTH{"Authorization Bearer CRON_SECRET"}
  AUTH -->|valid| JOB["subscription-expiry or email-notifications"]
  AUTH -->|invalid| E401[401]
  JOB --> FS[(Firestore)]
  JOB --> BR[Brevo email optional]
```

---

## 11. Admin request path (RBAC)

```mermaid
flowchart TD
  A[Request /api/admin/*] --> B[Verify Firebase ID token]
  B --> C{User has admin role?}
  C -->|no| D[403 Forbidden]
  C -->|yes| E[Rate limit + audit log]
  E --> F[Business logic - analytics RAG health etc]
  F --> G[JSON response]
```

---

## 12. Data stores — conceptual (not ERD)

```mermaid
flowchart LR
  subgraph firestore["Firestore"]
    P[profiles]
    IS[interview_sessions]
    UE[usage_events]
    US[users/uid/usage_summaries]
    PH[payment_history]
    AA[admin_audit_log]
  end

  subgraph vectors["Vectors"]
    PIN[(Pinecone index)]
    FSV[Firestore vector docs]
  end

  API[Next API] --> firestore
  API --> vectors
```

---

## Copy-paste: single combined overview (one canvas)

For a single diagram file in Mermaid Live, use this **multi-diagram** approach: Mermaid Live supports one `flowchart` or `sequenceDiagram` per render. The **System context (#1)** plus **RAG (#5)** are the two most useful “full architecture” views.

**Recommended:** paste **Section 1** and **Section 5** separately, or merge manually into one `flowchart TB` if you need one giant chart (may require simplifying subgraphs for readability).

---

**Last updated:** April 2026
