/**
 * Real-World Bug Fix Scenarios
 *
 * Split by scenario so real-world interview cases are easy to review.
 */

import type { BugFixScenario } from "../../types"
import { withBugfixIncidentDefaults } from "../../bugfix-quality"
import { bugfixApiRateLimiterWorkspaceScenario } from "./bugfix-api-rate-limiter-workspace"
import { bugfixRateLimiterErrorHandlingScenario } from "./bugfix-rate-limiter-error-handling"
import { bugfixRateLimiterErrorHandlingPythonScenario } from "./bugfix-rate-limiter-error-handling-python"
import { bugfixBillingWebhookIdempotencyScenario } from "./bugfix-billing-webhook-idempotency"
import { bugfixBookclubReadingStreakWorkspaceScenario } from "./bugfix-bookclub-reading-streak-workspace"
import { bugfixCommentThreadMergeScenario } from "./bugfix-comment-thread-merge"
import { bugfixEventAggregationRetriesScenario } from "./bugfix-event-aggregation-retries"
import { bugfixFeaturePipelineNanWorkspaceScenario } from "./bugfix-feature-pipeline-nan-workspace"
import { bugfixFoundryUsageRollupScenario } from "./bugfix-foundry-usage-rollup"
import { bugfixSearchRaceScenario } from "./bugfix-search-race"
import { bugfixOnboardingScenario } from "./bugfix-onboarding"
import { bugfixTemperatureAlertRegressionScenario } from "./bugfix-temperature-alert-regression"
import { bugfixMazeNavigationScenario } from "./bugfix-maze-navigation"
import { bugfixHttpClientLibraryScenario } from "./bugfix-http-client-library"

export const realWorldBugFixScenarios: BugFixScenario[] = [
  bugfixSearchRaceScenario,
  bugfixBillingWebhookIdempotencyScenario,
  bugfixApiRateLimiterWorkspaceScenario,
  bugfixRateLimiterErrorHandlingScenario,
  bugfixRateLimiterErrorHandlingPythonScenario,
  bugfixCommentThreadMergeScenario,
  bugfixEventAggregationRetriesScenario,
  bugfixFeaturePipelineNanWorkspaceScenario,
  bugfixTemperatureAlertRegressionScenario,
  bugfixOnboardingScenario,
  bugfixBookclubReadingStreakWorkspaceScenario,
  bugfixFoundryUsageRollupScenario,
  bugfixMazeNavigationScenario,
  bugfixHttpClientLibraryScenario,
].map(withBugfixIncidentDefaults)

export default realWorldBugFixScenarios
