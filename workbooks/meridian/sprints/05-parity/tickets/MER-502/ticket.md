---
title: "1.41 GB image, 9-minute build, and docker stop always takes the full ten seconds"
points: 5
labels:
  - parity
  - containers
ai_policy: assisted
objectives:
  - multistage-docker-image-size-graceful-shutdown
acceptanceCriteria:
  - "The runtime image contains no build toolchain or dev-only dependency, and is under 300 MB."
  - "The container runs as a non-root user."
  - "A replica with no in-flight work stops promptly on the standard stop signal, well inside the current timeout."
  - "A replica with an in-flight webhook delivery finishes or safely abandons that delivery before exiting, so a stop never duplicates a delivery that was already in progress."
---

The runtime image is 1.41 GB, takes 9 minutes to build, and every deploy's rolling restart waits out the full stop timeout for every replica, whether or not anything was actually in flight.

From the platform team:

> The image ships the entire build toolchain and every dev dependency, none of which the running process needs. Separately, docker stop never seems to finish early even when a replica is completely idle, which is adding real minutes to every deploy.

Whatever ships needs to run the exact same application code and produce the exact same behavior; this is a packaging and shutdown-signal problem, not a rewrite.

Ambiguous ask from the PM: "can we just clean up the Dockerfile a bit?"
