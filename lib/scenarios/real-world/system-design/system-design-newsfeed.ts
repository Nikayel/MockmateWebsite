import type { SystemDesignScenario } from "../../types"

export const systemDesignNewsfeedScenario: SystemDesignScenario = {
  id: "system-design-newsfeed",
  title: "Design Facebook/Instagram News Feed",
  type: "system-design",
  difficulty: "hard",
  companies: ["Meta", "Google", "Amazon", "Netflix"],
  description: "Design a scalable news feed system like Facebook or Instagram",
  tags: ["system-design", "scalability", "distributed-systems", "feed-ranking"],
  estimatedTime: 45,
  problemStatement: `Design a news feed system similar to Facebook or Instagram that can handle billions of users.

**The 60-minute interview is split into:**
1. **Clarifying Requirements** (10 min) - Ask questions, define scope
2. **High-Level Design** (15 min) - Core components and data flow
3. **Deep Dive** (20 min) - Focus on 1-2 areas in detail
4. **Optimization & Trade-offs** (15 min) - Scale, performance, edge cases

**Your task:**
- Design the system architecture
- Discuss data models and storage
- Explain feed generation and ranking
- Address scalability and performance
- Consider trade-offs and alternatives`,
  functionalRequirements: [
    "Users can create posts (text, images, videos)",
    "Users can follow other users",
    "News feed shows posts from followed users",
    "Feed is personalized and ranked by relevance",
    "Support for likes, comments, and shares",
    "Real-time updates for new posts",
  ],
  nonFunctionalRequirements: [
    "Highly available (99.99% uptime)",
    "Low latency feed loading (<200ms p99)",
    "Eventually consistent (acceptable for social)",
    "Support billions of users",
    "Handle viral content gracefully",
  ],
  constraints: [
    "2 billion daily active users",
    "500 million new posts per day",
    "Average user follows 200 people",
    "Feed refresh every few minutes",
    "Global distribution required",
  ],
  keyComponents: [
    "Post Service - Handle post creation and storage",
    "User Graph Service - Manage follow relationships",
    "Feed Generation Service - Build personalized feeds",
    "Ranking Service - ML-based relevance scoring",
    "Notification Service - Push updates",
    "Media Service - Image/video storage and CDN",
  ],
  hints: [
    "Consider the difference between push vs pull models for feed generation",
    "Think about how to handle celebrities with millions of followers",
    "Consider using pre-computed feeds vs on-demand generation",
    "Caching is critical for hot content and popular users",
  ],
  evaluationCriteria: [
    {
      category: "Requirements Clarification",
      description: "Asks good questions, defines scope clearly",
      weight: 15,
    },
    {
      category: "High-Level Design",
      description: "Clean architecture, right components",
      weight: 25,
    },
    {
      category: "Data Model",
      description: "Appropriate storage choices, efficient schema",
      weight: 20,
    },
    { category: "Scalability", description: "Handles scale, identifies bottlenecks", weight: 25 },
    {
      category: "Trade-offs",
      description: "Discusses alternatives, explains decisions",
      weight: 15,
    },
  ],
  exampleSolution: {
    overview:
      "Hybrid push-pull feed generation with pre-computed feeds for most users and on-demand generation for celebrity followers",
    architecture: [
      "API Gateway - Load balancing, rate limiting, authentication",
      "Post Service - Sharded by user_id, writes to Kafka",
      "Fan-out Service - Consumes from Kafka, updates follower feeds",
      "Feed Service - Reads pre-computed feeds from cache/storage",
      "Ranking Service - ML model scores posts for relevance",
      "Notification Service - WebSocket connections for real-time",
    ],
    dataModel: [
      "Posts: { post_id, user_id, content, media_urls, created_at, engagement_count }",
      "UserFeeds: { user_id, feed_posts: [post_id], last_updated }",
      "Follows: { follower_id, followee_id, created_at }",
      "Engagements: { post_id, user_id, type, created_at }",
    ],
    apiDesign: [
      "GET /feed - Fetch paginated news feed",
      "POST /posts - Create new post",
      "POST /posts/:id/like - Like a post",
      "GET /posts/:id/comments - Get comments",
      "POST /users/:id/follow - Follow a user",
    ],
    scalability: [
      "Pre-compute feeds for 95% of users (fan-out on write)",
      "On-demand generation for celebrity followers (fan-out on read)",
      "Multi-layer caching: CDN → Redis → Local",
      "Shard posts by user_id, feeds by user_id",
      "Async processing via Kafka for non-critical paths",
    ],
    tradeoffs: [
      "Fan-out on write: Fast reads, slow writes, storage heavy",
      "Fan-out on read: Slow reads, fast writes, compute heavy",
      "Hybrid approach: Complexity vs optimal performance",
      "Eventual consistency: Simplicity vs strict ordering",
      "Pre-ranking vs real-time ranking: Freshness vs compute cost",
    ],
  },
  discussionPoints: [
    "How do you handle a user with 100 million followers posting?",
    "How do you ensure feed freshness while keeping latency low?",
    "How would you implement content moderation at scale?",
    "What happens if the ranking service goes down?",
    "How do you test feed quality?",
  ],
}
