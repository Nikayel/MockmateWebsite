# Active sessions across deployments

An open interview keeps running its loaded JavaScript. A deployment must not
create another attempt, reset its strict deadline, or add a message to its transcript.

## Device recovery and cloud backup

`useInterviewAutosave` owns the attempt's checkpoint lifecycle. The modules in
`app/interview/_hooks/autosave/` separate snapshot construction, device storage,
and cloud persistence. The existing local and Firestore field contracts are unchanged.

- Device checkpoints follow a 500 ms pause in substantive changes, with a 2 second
  maximum wait during continuous typing while foreground timers run. Timer-only renders do not serialize the
  workspace. Completed conversations, drafts, files, test state and guided-lab
  progress are included; partial streaming responses are excluded.
- Cloud writes remain on the 30 second cadence, with serialized writes and a dirty
  check that excludes the advancing clock. Explicit save/exit, visibility changes,
  pagehide and recovery can flush earlier. Local writes never trigger cloud writes.
- Browser storage failure produces a persistent warning. A subsequent successful
  device write clears it. A browser/OS crash can still lose changes since the last
  checkpoint; this is bounded recovery, not a transactional editor.

Chunk recovery invokes the mounted attempt's synchronous local checkpoint before
requesting a reload. Cloud backup gets at most 1.5 seconds. If neither copy can be
saved, recovery leaves the page open and asks the user to copy their code. The
existing two-minute reload latch prevents loops. A pending recovery cannot reload
a replacement attempt. React-boundary unmounts also flush the latest checkpoint,
and retain that save result briefly so a failed final write still blocks recovery.

Recovery reuses the original attempt ID and strict deadline. Terminal cloud state
wins over local recovery; existing ownership and completed-attempt checks remain.
No new Firestore index, migration, storage service or automatic AI retry is required.

Guest and authenticated writes share `serializeCheckpoint`. Optional guest fields
are omitted recursively before reaching the Admin SDK: writing `undefined` for an
absent hypothesis or deadline rejects the entire backup. The guest route retains
its request validation, ownership checks, completion guards and ten-result limit.

## Version routing and the Vercel plan requirement

`lib/interview/session-fetch.ts` preserves fetch semantics and adds
`x-deployment-id` only to same-origin browser requests when the build has a pin.
Chat, lifecycle, guest persistence, feedback, hints, voice and TypeScript
transpilation use it. Public JS/TS/Python worker entry URLs use the corresponding
`dpl` query pin, and the JavaScript worker carries that pin into its local shims
and vendored compiler imports. Versioned third-party CDN imports retain their
existing URLs. It does not replay failed requests or write a cookie shared
between tabs. A new tab/page load gets that build's identifier.

`next.config.mjs` exposes only the public deployment ID, and only when Vercel sets
`VERCEL_SKEW_PROTECTION_ENABLED=1`. Vercel's normal Git build supplies the matching
framework asset/navigation configuration. Do not invent a different ID or add a
runtime request to discover the latest deployment: that would pin the old client
to the new server. Local, CI and unsupported builds retain ordinary fetch behavior.

At implementation time the configured Vercel team was on **Hobby**. Vercel's
[Skew Protection documentation](https://vercel.com/docs/skew-protection) requires
Pro or Enterprise. This code does not upgrade the plan. Recovery protections work
on Hobby; version routing remains inactive until the platform feature is enabled
and the application is rebuilt. Headers alone do not create platform support.

## Enabling and operating version protection

1. On a supported plan, enable Skew Protection and system environment variables
   for the existing project. Inspect deployment retention before choosing Maximum
   Age. Its age is measured from **deployment creation**, not session start: an
   already-old current build can expire during a newly started interview.
2. Rebuild on Vercel. Confirm assets contain `?dpl=`, session API requests contain
   the matching `x-deployment-id`, and the platform reports protected routing.
3. Test two deployed preview builds through one branch alias: load A, publish B,
   then chat, edit, run tests and submit from the A tab. Confirm server routing to
   A, and that a new tab loads B. Also verify refresh, offline recovery, expiry,
   chunk errors, storage quota failures and two concurrent tabs.
4. Keep API and shared Firestore changes backward compatible. Add optional fields
   first, retain old readers/writers through the protection window, and remove
   contracts separately. Old and new deployments still share the database.
5. For a security incident, set Vercel's Skew Protection Threshold to the fixed
   deployment (or delete the affected deployment). Retention and expiry can also
   end a pin; recovery and compatible contracts are still required. Never silently
   retry a chat generation, session creation or submission to a different release.

The browser regression suite tests real reload/restore and offline recovery using
the actual hooks, and tests header preservation across a simulated backend release.
It does not claim to exercise Vercel's paid routing on the Hobby project. Existing
tabs loaded before this release acquire these protections on their next page load.
