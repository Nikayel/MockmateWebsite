import type { SystemDesignScenario } from "../types"

export const rateLimiterScenario: SystemDesignScenario = {
  id: "system-design-rate-limiter",
  title: "Design a Rate Limiter",
  type: "system-design",
  difficulty: "medium",
  companies: ["Google", "Amazon", "Stripe", "Shopify"],
  description: "Design a distributed rate limiting system to prevent API abuse",
  tags: ["system-design", "distributed-systems", "algorithms", "redis"],
  estimatedTime: 45,
  problemStatement: `Design a rate limiting system that can be used to limit the number of requests a user can make to an API within a given time window. The system should work in a distributed environment with multiple API servers.

Consider different rate limiting algorithms, how to handle distributed state, and how to make the system efficient and fault-tolerant.`,
  functionalRequirements: [
    "Limit requests per user/IP/API key within a time window",
    "Support multiple rate limit rules (e.g., 100 req/min, 1000 req/hour)",
    "Return meaningful error messages when rate limit is exceeded",
    "Support different rate limits for different user tiers (free, premium)",
    "Provide APIs to check remaining quota",
    "Allow temporary rate limit overrides for specific users",
  ],
  nonFunctionalRequirements: [
    "Low latency: Rate limit check should add < 5ms overhead",
    "High availability: Should work even if some nodes fail",
    "Accurate: Should not allow significantly more requests than the limit",
    "Scalable: Handle millions of requests per second",
    "Distributed: Work across multiple API servers",
  ],
  constraints: [
    "System serves 10,000 API servers",
    "Need to support 1 million unique users",
    "Rate limit decisions must be made in < 10ms",
    "System should handle server failures gracefully",
  ],
  keyComponents: [
    "Rate Limiter Service",
    "Distributed Cache (Redis Cluster)",
    "API Gateway",
    "Configuration Service",
    "Monitoring & Alerting",
  ],
  hints: [
    "Consider different algorithms: Token Bucket, Leaky Bucket, Fixed Window, Sliding Window",
    "Redis is commonly used for distributed rate limiting due to atomic operations",
    "Use Redis INCR and EXPIRE commands with Lua scripts for atomicity",
    "Sliding window log provides accuracy but uses more memory",
    "Consider hybrid approaches for better trade-offs",
    "Cache rate limit rules locally to reduce latency",
    "Handle Redis failures gracefully (fail-open vs fail-closed)",
  ],
  evaluationCriteria: [
    {
      category: "Algorithm Selection",
      description: "Chose appropriate rate limiting algorithm(s) and explained trade-offs",
      weight: 25,
    },
    {
      category: "Distributed Design",
      description: "Addressed challenges of distributed rate limiting",
      weight: 25,
    },
    {
      category: "Performance",
      description: "Optimized for low latency and high throughput",
      weight: 20,
    },
    {
      category: "Fault Tolerance",
      description: "Handled failures and edge cases",
      weight: 15,
    },
    {
      category: "Scalability",
      description: "System can scale to handle increasing load",
      weight: 15,
    },
  ],
  exampleSolution: {
    overview:
      "A distributed rate limiter using Redis cluster with Sliding Window Counter algorithm. The system uses Lua scripts for atomic operations, local caching for rules, and graceful degradation on Redis failures.",
    architecture: [
      "API Gateway: Intercepts all requests and invokes rate limiter",
      "Rate Limiter Service: Embedded in each API server for low latency",
      "Redis Cluster: Stores rate limit counters with sharding for scalability",
      "Config Service: Manages rate limit rules and user tiers",
      "Monitoring: Tracks rate limit violations and system health",
    ],
    dataModel: [
      'Redis Key Pattern: "rate_limit:{userId}:{window_timestamp}" -> counter',
      "Redis TTL: Set to window duration for automatic cleanup",
      "Config Store: { userId/tier -> { limit, windowSize, burstAllowed } }",
      'Example: "rate_limit:user123:1699999800" -> 45 (45 requests in current minute)',
    ],
    apiDesign: [
      "POST /api/check-rate-limit - Body: { userId, resource } - Returns: { allowed: boolean, remaining: number, resetAt: timestamp }",
      "GET /api/rate-limit-status/{userId} - Returns current quota status",
      "POST /api/admin/set-rate-limit - Body: { userId, limit, windowSize } - Admin API to configure limits",
    ],
    scalability: [
      "Redis Cluster: Shard data by userId hash across multiple Redis nodes",
      "Local cache: Cache rate limit rules in-memory to avoid config service calls",
      "Stateless rate limiter: Each API server can check rate limits independently",
      "Batch processing: Use pipelines for multiple rate limit checks",
      "Read replicas: Use Redis replicas for read-heavy workloads",
    ],
    tradeoffs: [
      "Fixed Window: Simple but has burst problem at window boundaries",
      "Sliding Window Log: Accurate but memory-intensive (stores all timestamps)",
      "Sliding Window Counter: Good balance of accuracy and memory efficiency",
      "Token Bucket: Allows controlled bursts, more complex to implement",
      "Fail-open vs Fail-closed: When Redis is down, allow all requests or block all?",
      "Consistency vs Availability: Strict rate limiting vs some over-limit allowance",
    ],
  },
  discussionPoints: [
    "What are the pros and cons of different rate limiting algorithms?",
    "How do you handle clock synchronization issues in a distributed system?",
    "What happens when Redis goes down? How do you ensure availability?",
    "How would you implement different rate limits for different API endpoints?",
    "How would you handle rate limiting for a single user with multiple devices?",
    "How would you implement gradual backoff vs hard limits?",
    "What metrics would you monitor to detect attacks or system issues?",
    "How would you implement IP-based rate limiting vs user-based?",
  ],
}
