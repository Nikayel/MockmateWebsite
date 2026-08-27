---
title: "Northwind's 41 MB PDF 504s on upload"
points: 5
labels:
  - "aws"
  - "s3"
  - "uploads"
ai_policy: assisted
objectives:
  - presigned-s3-upload-scoped
acceptanceCriteria:
  - "A document upload no longer streams the file bytes through the API's own request handler."
  - "An upload is scoped to exactly one tenant, one claim, one content type, and a maximum size, and a request outside any of those is rejected before it is accepted."
  - "The server verifies an uploaded object actually matches its claimed content type and size before the claim is marked as having received it."
  - "A 41 MB PDF completes without the API process itself moving the bytes."
---

Northwind's claims team has been trying to upload a 41 MB inspection PDF for a
total-loss vehicle for three days straight. Every attempt ends in a 504 after
a bit over a minute. Whoever was on call last night pulled the pod logs and
found the api container OOMKilled twice during the same window, right as the
upload was streaming through.

The current flow reads the whole file into memory in the request handler,
waits on a virus scan, then writes it to storage before it responds. For a
41 MB file on a tenant with a slow upload link, that round trip is well past
any reasonable request timeout, and a burst of a few of these at once is
exactly what took the pod down.

Product wants large documents to work at all, not just this one PDF.
Whatever ships needs to survive a slow client without holding the request
open, and it needs to reject a file that claims to be a PDF and isn't,
scoped to the one tenant and the one claim it belongs to.
