/**
 * System Design Interview Scenarios
 * Type: system-design
 *
 * These scenarios test system design and architecture skills.
 */

import type { SystemDesignScenario } from "../types"
import { urlShortenerScenario } from "./system-design-url-shortener"
import { rateLimiterScenario } from "./system-design-rate-limiter"
import { instagramScenario } from "./system-design-instagram"
import { distributedCacheScenario } from "./system-design-distributed-cache"
import { chatSystemScenario } from "./system-design-chat-system"
import { twitterScenario } from "./system-design-twitter"
import { uberScenario } from "./system-design-uber"
import { notificationScenario } from "./system-design-notification"
import { videoStreamingScenario } from "./system-design-video-streaming"
import { ecommerceScenario } from "./system-design-ecommerce"
import { fileStorageScenario } from "./system-design-file-storage"

export const systemDesignScenarios: SystemDesignScenario[] = [
  urlShortenerScenario,
  rateLimiterScenario,
  instagramScenario,
  distributedCacheScenario,
  chatSystemScenario,
  twitterScenario,
  uberScenario,
  notificationScenario,
  videoStreamingScenario,
  ecommerceScenario,
  fileStorageScenario,
]

export default systemDesignScenarios
