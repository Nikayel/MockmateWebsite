/**
 * System Design Knowledge Base
 *
 * Comprehensive knowledge about system design concepts for RAG retrieval.
 * Based on industry standards from:
 * - "Designing Data-Intensive Applications" by Martin Kleppmann
 * - Google SRE Book
 * - AWS Well-Architected Framework
 * - System Design Interview resources (Alex Xu, etc.)
 */

import type { SystemDesignKnowledge } from "./types"

/**
 * Complete system design knowledge database
 */
export const SYSTEM_DESIGN_KNOWLEDGE: SystemDesignKnowledge[] = [
  // ============================================================================
  // SCALABILITY CONCEPTS
  // ============================================================================
  {
    concept: "horizontal-scaling",
    displayName: "Horizontal Scaling (Scale Out)",
    category: "scalability",
    description:
      "Adding more machines to a system to handle increased load. Preferred over vertical scaling for its flexibility and fault tolerance.",
    whenToUse: [
      "Application is stateless or state can be externalized",
      "Need to handle unpredictable traffic spikes",
      "Want to avoid single points of failure",
      "Cost-effective scaling is needed (commodity hardware)",
    ],
    keyPrinciples: [
      "Stateless services: No server should store session data locally",
      "Shared nothing architecture: Each node is independent",
      "Load balancer distributes requests across nodes",
      "Data layer must also scale (database sharding, replication)",
    ],
    tradeoffs: {
      pros: [
        "No upper limit on scaling",
        "Better fault tolerance (one node fails, others continue)",
        "Can use commodity hardware",
        "Supports geographic distribution",
      ],
      cons: [
        "Increased complexity (distributed systems)",
        "Data consistency challenges",
        "Network latency between nodes",
        "More complex deployment and monitoring",
      ],
    },
    realWorldExamples: [
      "Netflix: Thousands of microservices scaled horizontally",
      "Google Search: Distributed across many data centers",
      "Instagram: Scaled from 2 to 2000+ servers horizontally",
    ],
    interviewTips: [
      "Always mention load balancing when discussing horizontal scaling",
      "Discuss how to handle stateful data (sessions, caches)",
      "Mention auto-scaling based on metrics (CPU, request count)",
      "Consider the CAP theorem implications",
    ],
    commonMistakes: [
      "Forgetting to scale the database layer",
      "Not handling session state properly",
      "Ignoring data consistency requirements",
      "Not considering network partition scenarios",
    ],
    relatedConcepts: ["load-balancing", "database-sharding", "stateless-services"],
    estimations: [
      {
        metric: "Servers needed",
        typical: "1 server per 10K-50K concurrent users",
        formula: "servers = ceil(peak_concurrent_users / capacity_per_server)",
      },
    ],
  },
  {
    concept: "vertical-scaling",
    displayName: "Vertical Scaling (Scale Up)",
    category: "scalability",
    description:
      "Adding more resources (CPU, RAM, storage) to an existing machine. Simpler but has physical limits.",
    whenToUse: [
      "Application is difficult to distribute",
      "Database with complex joins (traditional RDBMS)",
      "Quick fix for immediate capacity needs",
      "Cost of re-architecting exceeds hardware costs",
    ],
    keyPrinciples: [
      "Upgrade hardware: More CPU cores, RAM, faster storage",
      "Optimize software: Better algorithms, caching",
      "Single point of management",
      "No distributed systems complexity",
    ],
    tradeoffs: {
      pros: [
        "Simpler architecture",
        "No distributed systems complexity",
        "Easier to maintain and debug",
        "Data consistency is simpler",
      ],
      cons: [
        "Hardware limits (max RAM, CPU)",
        "Single point of failure",
        "Expensive at high end",
        "Downtime during upgrades",
      ],
    },
    realWorldExamples: [
      "Traditional databases often scale vertically first",
      "Mainframes in banking systems",
      "Single-server applications during early growth",
    ],
    interviewTips: [
      "Mention this as a starting point before horizontal scaling",
      "Discuss the limits and when to transition",
      "Good for databases that are hard to shard",
    ],
    commonMistakes: [
      "Relying solely on vertical scaling for growth",
      "Not planning for the eventual transition to horizontal",
      "Ignoring the single point of failure",
    ],
    relatedConcepts: ["horizontal-scaling", "database-optimization"],
  },
  {
    concept: "load-balancing",
    displayName: "Load Balancing",
    category: "scalability",
    description:
      "Distributing incoming traffic across multiple servers to ensure no single server is overwhelmed.",
    whenToUse: [
      "Multiple servers handling the same service",
      "Need to achieve high availability",
      "Want to maximize resource utilization",
      "Implementing horizontal scaling",
    ],
    keyPrinciples: [
      "Algorithms: Round-robin, least connections, IP hash, weighted",
      "Health checks: Remove unhealthy servers from rotation",
      "Session persistence: Sticky sessions when needed",
      "SSL termination: Offload encryption to load balancer",
    ],
    tradeoffs: {
      pros: [
        "Improved availability and reliability",
        "Better resource utilization",
        "Enables horizontal scaling",
        "Can provide SSL termination",
      ],
      cons: [
        "Additional point of failure (if not redundant)",
        "Added latency (minimal)",
        "Complexity with session state",
        "Cost of load balancer infrastructure",
      ],
    },
    realWorldExamples: [
      "AWS ELB/ALB: Managed load balancing",
      "Nginx: Popular software load balancer",
      "HAProxy: High-performance load balancer",
      "Cloudflare: Global load balancing with CDN",
    ],
    interviewTips: [
      "Mention L4 (TCP) vs L7 (HTTP) load balancing",
      "Discuss health check mechanisms",
      "Consider global load balancing for multi-region",
      "Always have redundant load balancers",
    ],
    commonMistakes: [
      "Single load balancer (no redundancy)",
      "Not configuring health checks",
      "Ignoring session affinity requirements",
      "Wrong algorithm for the use case",
    ],
    relatedConcepts: ["horizontal-scaling", "high-availability", "reverse-proxy"],
    estimations: [
      {
        metric: "Load balancer capacity",
        typical: "Modern LBs handle 100K+ concurrent connections",
      },
    ],
  },
  // ============================================================================
  // DATA STORAGE CONCEPTS
  // ============================================================================
  {
    concept: "database-sharding",
    displayName: "Database Sharding",
    category: "data",
    description:
      "Splitting a database into smaller pieces (shards) distributed across multiple servers, each containing a subset of the data.",
    whenToUse: [
      "Single database server cannot handle the load",
      "Data volume exceeds single server storage",
      "Need to scale writes (replication only scales reads)",
      "Geographic data distribution requirements",
    ],
    keyPrinciples: [
      "Shard key selection: Choose carefully (user_id, tenant_id, etc.)",
      "Hash-based: Consistent hashing for even distribution",
      "Range-based: Sequential data split by ranges",
      "Directory-based: Lookup service maps data to shards",
    ],
    tradeoffs: {
      pros: [
        "Horizontal scaling for databases",
        "Improved query performance (less data per shard)",
        "Geographic data locality",
        "Fault isolation (one shard failure doesnt affect others)",
      ],
      cons: [
        "Cross-shard queries are expensive",
        "Joins across shards are complex",
        "Rebalancing shards is difficult",
        "Increased operational complexity",
      ],
    },
    realWorldExamples: [
      "Instagram: Sharded PostgreSQL by user ID",
      "Pinterest: Sharded MySQL with custom shard logic",
      "Slack: Sharded by workspace/team",
    ],
    interviewTips: [
      "Always discuss shard key selection first",
      "Mention consistent hashing for dynamic shard count",
      "Discuss how to handle hot shards",
      "Consider resharding strategies",
    ],
    commonMistakes: [
      "Poor shard key causing hot spots",
      "Not planning for cross-shard operations",
      "Ignoring transaction requirements",
      "Over-sharding too early",
    ],
    relatedConcepts: ["consistent-hashing", "database-replication", "partitioning"],
    estimations: [
      {
        metric: "When to shard",
        typical: "Consider at 1-10TB or 10K+ writes/second",
      },
    ],
  },
  {
    concept: "caching",
    displayName: "Caching Strategies",
    category: "data",
    description:
      "Storing frequently accessed data in fast storage (memory) to reduce database load and improve response times.",
    whenToUse: [
      "Read-heavy workloads",
      "Data that doesnt change frequently",
      "Expensive computations that can be reused",
      "Reducing database load",
    ],
    keyPrinciples: [
      "Cache-aside: Application checks cache, then DB",
      "Write-through: Write to cache and DB simultaneously",
      "Write-back: Write to cache, async write to DB",
      "TTL: Time-to-live for automatic expiration",
      "Cache invalidation: Update/delete cache when data changes",
    ],
    tradeoffs: {
      pros: [
        "Dramatically reduced latency (ms vs 100ms)",
        "Reduced database load",
        "Improved throughput",
        "Cost savings on database",
      ],
      cons: [
        "Cache invalidation complexity",
        "Stale data risk",
        "Additional infrastructure",
        "Memory costs",
      ],
    },
    realWorldExamples: [
      "Redis: In-memory data structure store",
      "Memcached: Simple key-value cache",
      "CDN: Edge caching for static content",
      "Browser cache: Client-side caching",
    ],
    interviewTips: [
      "Always discuss cache invalidation strategy",
      "Mention cache stampede prevention",
      "Consider cache warming for cold starts",
      "Discuss TTL selection based on data freshness needs",
    ],
    commonMistakes: [
      "Caching everything (cache bloat)",
      "No cache invalidation strategy",
      "Ignoring cache stampede scenarios",
      "Not handling cache failures gracefully",
    ],
    relatedConcepts: ["cdn", "database-replication", "ttl"],
    estimations: [
      {
        metric: "Cache hit ratio target",
        typical: "80-99% hit ratio is healthy",
      },
      {
        metric: "Redis capacity",
        typical: "1M+ ops/sec per instance",
      },
    ],
  },
  {
    concept: "sql-vs-nosql",
    displayName: "SQL vs NoSQL Databases",
    category: "data",
    description:
      "Choosing between relational (SQL) and non-relational (NoSQL) databases based on data model, scale, and consistency requirements.",
    whenToUse: [
      "SQL: Complex queries, ACID transactions, structured data",
      "NoSQL: Flexible schema, horizontal scaling, high write throughput",
      "Document DB: Semi-structured data, hierarchical",
      "Key-Value: Simple lookups, caching, sessions",
      "Wide-column: Time series, analytics, high write volume",
      "Graph: Relationships, social networks, recommendations",
    ],
    keyPrinciples: [
      "SQL: ACID guarantees, normalized schema, SQL query language",
      "NoSQL: BASE (eventual consistency), denormalized, various query models",
      "Choose based on: data model, query patterns, scale requirements",
      "Polyglot persistence: Use different DBs for different use cases",
    ],
    tradeoffs: {
      pros: [
        "SQL: Strong consistency, complex queries, mature tooling",
        "NoSQL: Flexible schema, horizontal scaling, high performance",
      ],
      cons: [
        "SQL: Harder to scale horizontally, rigid schema",
        "NoSQL: Limited query capabilities, eventual consistency",
      ],
    },
    realWorldExamples: [
      "PostgreSQL: Complex relational data (Uber, Instagram)",
      "MongoDB: Flexible documents (Forbes, Lyft)",
      "Cassandra: High write throughput (Netflix, Discord)",
      "DynamoDB: Serverless key-value (Amazon)",
      "Neo4j: Graph relationships (LinkedIn)",
    ],
    interviewTips: [
      "Dont default to NoSQL just for scale - SQL scales well too",
      "Consider your query patterns first",
      "Discuss consistency requirements explicitly",
      "Its okay to use multiple database types",
    ],
    commonMistakes: [
      "Choosing NoSQL because its trendy",
      "Not considering query patterns",
      "Ignoring consistency requirements",
      "Over-normalizing in NoSQL",
    ],
    relatedConcepts: ["database-sharding", "cap-theorem", "acid-transactions"],
  },
  {
    concept: "cap-theorem",
    displayName: "CAP Theorem",
    category: "data",
    description:
      "In a distributed system, you can only guarantee two of three: Consistency, Availability, and Partition tolerance. Since partition tolerance is required, choose between CP or AP.",
    whenToUse: [
      "Designing distributed databases",
      "Choosing between consistency and availability",
      "Understanding trade-offs in distributed systems",
    ],
    keyPrinciples: [
      "Consistency: All nodes see the same data at the same time",
      "Availability: Every request receives a response",
      "Partition tolerance: System works despite network failures",
      "In practice: Choose CP (consistency) or AP (availability) during partitions",
    ],
    tradeoffs: {
      pros: [
        "CP: Strong consistency, correct data",
        "AP: High availability, better user experience during failures",
      ],
      cons: ["CP: May be unavailable during network issues", "AP: May return stale data"],
    },
    realWorldExamples: [
      "CP: Banking systems, inventory management",
      "AP: Social media feeds, DNS",
      "Tunable: Cassandra allows configuring consistency level per query",
    ],
    interviewTips: [
      "Explain that P is always required in distributed systems",
      "Discuss specific trade-offs for the system being designed",
      "Mention that most systems are not purely CP or AP",
      "Consider PACELC for more nuanced discussion",
    ],
    commonMistakes: [
      "Thinking you can have all three",
      "Not considering partition scenarios",
      "Applying CAP to non-distributed systems",
    ],
    relatedConcepts: ["consistency-models", "database-replication", "distributed-systems"],
  },
  // ============================================================================
  // RELIABILITY CONCEPTS
  // ============================================================================
  {
    concept: "high-availability",
    displayName: "High Availability (HA)",
    category: "reliability",
    description:
      'Designing systems to minimize downtime and ensure continuous operation, typically measured in "nines" (99.9%, 99.99%, etc.).',
    whenToUse: [
      "Business-critical applications",
      "Services with SLAs",
      "Systems where downtime has significant cost",
      "Customer-facing applications",
    ],
    keyPrinciples: [
      "Redundancy: No single points of failure",
      "Failover: Automatic switching to backup systems",
      "Health monitoring: Detect failures quickly",
      "Geographic distribution: Survive regional outages",
    ],
    tradeoffs: {
      pros: [
        "Minimal downtime",
        "Better user experience",
        "Meeting SLA requirements",
        "Business continuity",
      ],
      cons: [
        "Increased cost (redundant infrastructure)",
        "Complexity in design and operations",
        "Need for sophisticated monitoring",
        "Potential consistency trade-offs",
      ],
    },
    realWorldExamples: [
      "AWS multi-AZ deployments",
      "Database primary-replica setups",
      "Active-active data centers",
      "Kubernetes with multiple replicas",
    ],
    interviewTips: [
      "Discuss specific availability targets (99.9% vs 99.99%)",
      "Calculate allowed downtime per year",
      "Identify and eliminate single points of failure",
      "Consider both planned and unplanned downtime",
    ],
    commonMistakes: [
      "Forgetting about the database layer",
      "Single load balancer without redundancy",
      "Not testing failover procedures",
      "Ignoring regional failures",
    ],
    relatedConcepts: ["load-balancing", "database-replication", "disaster-recovery"],
    estimations: [
      {
        metric: "Availability targets",
        typical: "99.9% = 8.76h/year downtime, 99.99% = 52.6min/year, 99.999% = 5.26min/year",
      },
    ],
  },
  {
    concept: "rate-limiting",
    displayName: "Rate Limiting",
    category: "reliability",
    description:
      "Controlling the rate of requests to protect services from overload, abuse, and ensure fair resource usage.",
    whenToUse: [
      "Protecting APIs from abuse",
      "Preventing DDoS attacks",
      "Ensuring fair usage among users",
      "Managing costs for expensive operations",
    ],
    keyPrinciples: [
      "Token bucket: Allows bursts up to bucket size",
      "Leaky bucket: Smooths out request rate",
      "Fixed window: Count requests in time windows",
      "Sliding window: More accurate than fixed window",
      "Distributed rate limiting: Consistent across servers",
    ],
    tradeoffs: {
      pros: [
        "Protection from overload",
        "Fair resource allocation",
        "Cost control",
        "Better predictability",
      ],
      cons: [
        "May affect legitimate users during spikes",
        "Complexity in distributed systems",
        "Need to choose appropriate limits",
        "Clock synchronization issues",
      ],
    },
    realWorldExamples: [
      "GitHub API: 5000 requests/hour",
      "Twitter API: Various limits per endpoint",
      "Stripe: Rate limiting on API calls",
    ],
    interviewTips: [
      "Discuss the algorithm choice and why",
      "Consider distributed rate limiting with Redis",
      "Mention graceful degradation when limits hit",
      "Discuss per-user vs per-IP vs global limits",
    ],
    commonMistakes: [
      "Not considering distributed environments",
      "Too aggressive limits hurting users",
      "No visibility into rate limit status",
      "Ignoring burst traffic patterns",
    ],
    relatedConcepts: ["api-gateway", "ddos-protection", "throttling"],
    estimations: [
      {
        metric: "Typical API limits",
        typical: "100-10000 requests/minute for APIs",
      },
    ],
  },
  {
    concept: "circuit-breaker",
    displayName: "Circuit Breaker Pattern",
    category: "reliability",
    description:
      "Preventing cascading failures by stopping requests to a failing service, allowing it time to recover.",
    whenToUse: [
      "Calling external services that may fail",
      "Preventing cascade failures in microservices",
      "Improving system resilience",
      "Managing dependencies on unreliable services",
    ],
    keyPrinciples: [
      "Closed: Normal operation, requests pass through",
      "Open: Failures exceeded threshold, requests fail fast",
      "Half-Open: Test if service recovered, transition accordingly",
      "Fail fast: Return error immediately when circuit open",
    ],
    tradeoffs: {
      pros: [
        "Prevents cascade failures",
        "Allows failing services to recover",
        "Provides graceful degradation",
        "Fast failure response",
      ],
      cons: [
        "Additional complexity",
        "Need to tune thresholds",
        "May mask real issues",
        "Need fallback behavior",
      ],
    },
    realWorldExamples: [
      "Netflix Hystrix (deprecated but influential)",
      "Resilience4j for Java",
      "Polly for .NET",
      "AWS App Mesh circuit breaking",
    ],
    interviewTips: [
      "Explain the three states clearly",
      "Discuss threshold configuration",
      "Mention fallback strategies",
      "Consider monitoring and alerting",
    ],
    commonMistakes: [
      "Wrong thresholds (too sensitive or too lenient)",
      "No fallback behavior defined",
      "Not monitoring circuit state",
      "Applying to all calls indiscriminately",
    ],
    relatedConcepts: ["retry-pattern", "bulkhead-pattern", "graceful-degradation"],
  },
  // ============================================================================
  // COMPONENT CONCEPTS
  // ============================================================================
  {
    concept: "message-queue",
    displayName: "Message Queues",
    category: "components",
    description:
      "Asynchronous communication between services using messages stored in a queue, enabling decoupling and load leveling.",
    whenToUse: [
      "Decoupling services",
      "Handling traffic spikes (load leveling)",
      "Reliable message delivery",
      "Event-driven architectures",
      "Long-running tasks",
    ],
    keyPrinciples: [
      "Producer/Consumer pattern: Senders and receivers are independent",
      "At-least-once delivery: Messages may be delivered multiple times",
      "At-most-once delivery: Messages may be lost",
      "Exactly-once: Hard to achieve, often approximated",
      "Dead letter queue: Handle failed messages",
    ],
    tradeoffs: {
      pros: [
        "Decouples services",
        "Handles traffic spikes",
        "Enables async processing",
        "Improves reliability",
      ],
      cons: [
        "Added complexity",
        "Message ordering challenges",
        "Potential duplicate processing",
        "Debugging distributed flows",
      ],
    },
    realWorldExamples: [
      "RabbitMQ: Traditional message broker",
      "Apache Kafka: High-throughput event streaming",
      "AWS SQS: Managed queue service",
      "Redis Pub/Sub: Simple pub/sub",
    ],
    interviewTips: [
      "Discuss delivery guarantees needed",
      "Mention idempotency for at-least-once",
      "Consider ordering requirements",
      "Discuss dead letter queue handling",
    ],
    commonMistakes: [
      "Not handling duplicate messages",
      "Ignoring message ordering requirements",
      "No dead letter queue strategy",
      "Not monitoring queue depth",
    ],
    relatedConcepts: ["event-driven-architecture", "pub-sub", "async-processing"],
    estimations: [
      {
        metric: "Kafka throughput",
        typical: "1M+ messages/second per cluster",
      },
      {
        metric: "SQS limits",
        typical: "3000 messages/second with batching",
      },
    ],
  },
  {
    concept: "cdn",
    displayName: "Content Delivery Network (CDN)",
    category: "components",
    description:
      "Geographically distributed network of servers that cache content closer to users, reducing latency and origin server load.",
    whenToUse: [
      "Static content delivery (images, CSS, JS)",
      "Global user base",
      "High traffic websites",
      "Video streaming",
      "Reducing origin server load",
    ],
    keyPrinciples: [
      "Edge locations: Servers close to users",
      "Cache headers: Control what/how long to cache",
      "Origin server: Source of truth for content",
      "Cache invalidation: Update cached content",
      "Pull vs Push: On-demand vs pre-loaded content",
    ],
    tradeoffs: {
      pros: [
        "Reduced latency for global users",
        "Lower origin server load",
        "DDoS protection",
        "High availability for static content",
      ],
      cons: [
        "Additional cost",
        "Cache invalidation complexity",
        "Not suitable for personalized content",
        "Debugging cache issues",
      ],
    },
    realWorldExamples: [
      "CloudFlare: CDN + security",
      "AWS CloudFront: Integrated with AWS",
      "Akamai: Enterprise CDN",
      "Fastly: Edge computing capabilities",
    ],
    interviewTips: [
      "Discuss what content to cache (static vs dynamic)",
      "Mention cache invalidation strategies",
      "Consider TTL settings for different content types",
      "Discuss CDN as first line of defense",
    ],
    commonMistakes: [
      "Caching personalized content",
      "Too long TTLs causing stale content",
      "Not using cache headers properly",
      "Ignoring cache invalidation needs",
    ],
    relatedConcepts: ["caching", "edge-computing", "static-content"],
    estimations: [
      {
        metric: "Latency improvement",
        typical: "200ms+ reduction for distant users",
      },
    ],
  },
  {
    concept: "api-gateway",
    displayName: "API Gateway",
    category: "components",
    description:
      "Single entry point for API requests that handles cross-cutting concerns like authentication, rate limiting, and routing.",
    whenToUse: [
      "Microservices architectures",
      "Need for centralized authentication",
      "API versioning and routing",
      "Rate limiting and throttling",
      "Request/response transformation",
    ],
    keyPrinciples: [
      "Single entry point: All requests go through gateway",
      "Cross-cutting concerns: Auth, logging, rate limiting",
      "Request routing: Direct to appropriate service",
      "Protocol translation: REST to gRPC, etc.",
      "Response aggregation: Combine multiple services",
    ],
    tradeoffs: {
      pros: [
        "Centralized security and monitoring",
        "Simplified client interactions",
        "Consistent API behavior",
        "Easier API evolution",
      ],
      cons: [
        "Single point of failure (needs HA)",
        "Added latency",
        "Complexity in configuration",
        "Potential bottleneck",
      ],
    },
    realWorldExamples: [
      "Kong: Open-source API gateway",
      "AWS API Gateway: Managed service",
      "Nginx: Can serve as API gateway",
      "Apigee: Enterprise API management",
    ],
    interviewTips: [
      "Discuss what responsibilities belong in gateway vs services",
      "Mention high availability requirements",
      "Consider caching at gateway level",
      "Discuss authentication/authorization flow",
    ],
    commonMistakes: [
      "Too much logic in the gateway",
      "Single gateway without redundancy",
      "Not monitoring gateway performance",
      "Tight coupling with gateway features",
    ],
    relatedConcepts: ["microservices", "load-balancing", "rate-limiting"],
  },
  // ============================================================================
  // NETWORKING CONCEPTS
  // ============================================================================
  {
    concept: "dns",
    displayName: "Domain Name System (DNS)",
    category: "networking",
    description:
      "Hierarchical distributed naming system that translates domain names to IP addresses, enabling global load balancing and failover.",
    whenToUse: [
      "Every internet-facing application",
      "Global load balancing (GeoDNS)",
      "Failover between data centers",
      "Service discovery in some architectures",
    ],
    keyPrinciples: [
      "Hierarchical resolution: Root -> TLD -> Authoritative",
      "Caching: TTL controls cache duration",
      "Record types: A, AAAA, CNAME, MX, TXT, etc.",
      "Geographic routing: Route to nearest server",
      "Health checks: Remove unhealthy endpoints",
    ],
    tradeoffs: {
      pros: [
        "Global scale name resolution",
        "Built-in caching",
        "Geographic load balancing",
        "Simple failover mechanism",
      ],
      cons: [
        "Propagation delays (TTL)",
        "Limited health check granularity",
        "Cache can serve stale records",
        "DNS attacks (amplification, spoofing)",
      ],
    },
    realWorldExamples: [
      "Route 53: AWS managed DNS with health checks",
      "CloudFlare DNS: Fast, security-focused",
      "Google Cloud DNS: Low-latency global DNS",
    ],
    interviewTips: [
      "Mention DNS as the first step in request flow",
      "Discuss TTL trade-offs (speed vs freshness)",
      "Consider DNS for global load balancing",
      "Mention DNS caching at multiple levels",
    ],
    commonMistakes: [
      "Too high TTL preventing failover",
      "Not using DNS for geographic routing",
      "Forgetting about DNS propagation delays",
      "Not monitoring DNS resolution",
    ],
    relatedConcepts: ["load-balancing", "cdn", "high-availability"],
    estimations: [
      {
        metric: "DNS resolution time",
        typical: "20-120ms uncached, <1ms cached",
      },
    ],
  },
  // ============================================================================
  // ESTIMATION HELPERS
  // ============================================================================
  {
    concept: "back-of-envelope",
    displayName: "Back of Envelope Calculations",
    category: "scalability",
    description:
      "Quick estimations to determine system requirements: storage, bandwidth, servers needed.",
    whenToUse: [
      "Initial system capacity planning",
      "Interview estimation questions",
      "Validating architecture decisions",
      "Cost estimation",
    ],
    keyPrinciples: [
      "Powers of 2: 2^10 = 1K, 2^20 = 1M, 2^30 = 1G",
      "Latency numbers: Memory ~100ns, SSD ~100us, Network ~1ms, Disk ~10ms",
      "Traffic patterns: Daily active users, peak vs average",
      "Storage: Data size * retention period * replication factor",
    ],
    tradeoffs: {
      pros: ["Quick validation", "Interview requirement", "Sanity checking"],
      cons: ["Approximations may be off", "Need to know base numbers"],
    },
    realWorldExamples: [
      "Twitter: 500M tweets/day, 5KB average = 2.5TB/day",
      "URL shortener: 100M new URLs/month, 500 bytes = 50GB/month",
    ],
    interviewTips: [
      "State assumptions clearly",
      "Round to powers of 10 for simplicity",
      "Show your work step by step",
      "Validate final numbers make sense",
    ],
    commonMistakes: [
      "Not stating assumptions",
      "Over-precise calculations",
      "Forgetting replication/backup",
      "Not considering peak vs average",
    ],
    relatedConcepts: ["capacity-planning", "scalability"],
    estimations: [
      {
        metric: "QPS from DAU",
        typical: "QPS = DAU * queries_per_user / 86400",
        formula: "For peaks, multiply average by 2-10x",
      },
      {
        metric: "Storage from users",
        typical: "Storage = users * data_per_user * retention_days",
      },
      {
        metric: "Servers needed",
        typical: "Servers = peak_QPS / QPS_per_server (usually 1K-10K)",
      },
    ],
  },
]

/**
 * Get system design knowledge by concept
 */
export function getSystemDesignKnowledge(concept: string): SystemDesignKnowledge | undefined {
  return SYSTEM_DESIGN_KNOWLEDGE.find((k) => k.concept === concept)
}

/**
 * Get all system design knowledge by category
 */
export function getSystemDesignKnowledgeByCategory(
  category: SystemDesignKnowledge["category"]
): SystemDesignKnowledge[] {
  return SYSTEM_DESIGN_KNOWLEDGE.filter((k) => k.category === category)
}

/**
 * Get all system design concepts
 */
export function getAllSystemDesignKnowledge(): SystemDesignKnowledge[] {
  return SYSTEM_DESIGN_KNOWLEDGE
}

/**
 * Get related concepts for a given concept
 */
export function getRelatedConcepts(concept: string): SystemDesignKnowledge[] {
  const knowledge = getSystemDesignKnowledge(concept)
  if (!knowledge) return []
  return knowledge.relatedConcepts
    .map((c) => getSystemDesignKnowledge(c))
    .filter((k): k is SystemDesignKnowledge => k !== undefined)
}

/**
 * Format system design knowledge for RAG context
 */
export function formatSystemDesignKnowledgeForContext(knowledge: SystemDesignKnowledge): string {
  return `
## ${knowledge.displayName}

${knowledge.description}

### When to Use
${knowledge.whenToUse.map((w) => `- ${w}`).join("\n")}

### Key Principles
${knowledge.keyPrinciples.map((p) => `- ${p}`).join("\n")}

### Trade-offs
**Pros:**
${knowledge.tradeoffs.pros.map((p) => `- ${p}`).join("\n")}

**Cons:**
${knowledge.tradeoffs.cons.map((c) => `- ${c}`).join("\n")}

### Interview Tips
${knowledge.interviewTips.map((t) => `- ${t}`).join("\n")}

### Common Mistakes
${knowledge.commonMistakes.map((m) => `- ${m}`).join("\n")}
${
  knowledge.estimations
    ? `
### Estimations
${knowledge.estimations.map((e) => `- ${e.metric}: ${e.typical}`).join("\n")}`
    : ""
}
`.trim()
}
