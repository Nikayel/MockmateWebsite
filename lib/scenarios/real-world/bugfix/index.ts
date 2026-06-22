/**
 * Real-World Bug Fix Scenarios
 *
 * Split by scenario so real-world interview cases are easy to review.
 */

import type { BugFixScenario } from "../../types"
import { withBugfixIncidentDefaults } from "../../bugfix-quality"
import { bugfixApiRateLimiterWorkspaceScenario } from "./bugfix-api-rate-limiter-workspace"
import { bugfixBillingWebhookIdempotencyScenario } from "./bugfix-billing-webhook-idempotency"
import { bugfixCommentThreadMergeScenario } from "./bugfix-comment-thread-merge"
import { bugfixEventAggregationRetriesScenario } from "./bugfix-event-aggregation-retries"
import { bugfixFeaturePipelineNanWorkspaceScenario } from "./bugfix-feature-pipeline-nan-workspace"
import { bugfixSearchRaceScenario } from "./bugfix-search-race"
import { bugfixOnboardingScenario } from "./bugfix-onboarding"
import { bugfixTemperatureAlertRegressionScenario } from "./bugfix-temperature-alert-regression"

export const realWorldBugFixScenarios: BugFixScenario[] = [
  bugfixSearchRaceScenario,
  bugfixBillingWebhookIdempotencyScenario,
  bugfixApiRateLimiterWorkspaceScenario,
  bugfixCommentThreadMergeScenario,
  bugfixEventAggregationRetriesScenario,
  bugfixFeaturePipelineNanWorkspaceScenario,
  bugfixTemperatureAlertRegressionScenario,
  bugfixOnboardingScenario,
].map(withBugfixIncidentDefaults)

export default realWorldBugFixScenarios
