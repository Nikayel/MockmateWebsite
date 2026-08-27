---
title: "SEC-2211: the API role can write every bucket in the account"
points: 5
labels:
  - "aws"
  - "iam"
  - "security"
ai_policy: assisted
objectives:
  - least-privilege-iam-secrets-rotation
acceptanceCriteria:
  - "The API's role and the extraction worker's role are two separate IAM roles, each granted only the actions and resource ARNs its own code path actually calls."
  - "No policy in the account grants a wildcard action or a wildcard resource ARN to either role."
  - "A policy-simulation check runs in CI and fails the build if either role's policy grants an action neither service calls."
  - "No long-lived AWS access key exists in any task definition, image, or repository; credentials are issued through a provider that can rotate them without a deploy."
---

Security flagged this during an unrelated audit: the IAM role our API runs
under has `s3:*` on `Resource: "*"`. It can write, delete, or read any
bucket in the AWS account, not just the ones Meridian owns. Whoever set this
up was probably just trying to get uploads working and reached for the
broadest policy available.

The same audit turned up a second problem while it was in there: the
extraction worker's task definition still carries a long-lived AWS access
key as a plain environment variable, and nobody can remember the last time
it rotated. This was clicked together in the console at some point; there is
no infrastructure-as-code to check for history on it.

We need two separate roles, one for the API and one for extraction, each
scoped to exactly what its own code touches, and we need that access key
gone in favor of something that can actually rotate without a deploy.
