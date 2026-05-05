# Claude Engineering Guide

1. Prefer clear domain names over clever abbreviations.
2. Use one canonical name for each concept across files.
3. Match existing folder and file naming before inventing new patterns.
4. Keep modules focused on one reason to change.
5. Split large data catalogs by domain, scenario, or feature boundary.
6. Keep `index.ts` files as small public export surfaces.
7. Avoid god components, god routes, and mixed orchestration/rendering files.
8. Extract hooks for stateful UI workflows.
9. Extract services for persistence, network, and business logic.
10. Extract pure helpers for reusable calculations and transformations.
11. Prefer typed contracts over `any` and unchecked casts.
12. Keep validation at API, user input, and persistence boundaries.
13. Use existing Zod schemas or local validation patterns when available.
14. Keep side effects explicit and close to their owning layer.
15. Do not duplicate prompt, scoring, billing, or auth logic.
16. DRY repeated behavior, not superficially similar code.
17. Favor small functions with meaningful names over dense inline blocks.
18. Keep comments rare, useful, and tied to non-obvious intent.
19. Preserve user-facing behavior during refactors.
20. Make mechanical moves separately from behavior changes.
21. Commit small, reviewable chunks with focused messages.
22. Stage only files related to the current task.
23. Never overwrite unrelated dirty work.
24. Run typecheck after TypeScript refactors.
25. Run targeted tests when behavior changes.
26. Keep generated files, build output, and local dependencies out of git.
27. Use structured parsers or APIs instead of brittle string hacks.
28. Prefer explicit error handling over silent fallbacks.
29. Log through the project logger instead of raw console calls in app code.
30. Keep secrets, tokens, and environment-specific values out of source.
31. Keep UI components accessible, responsive, and consistent with local design.
32. Avoid nested cards and decorative complexity in product workflows.
33. Keep async flows cancelable or guarded against stale updates.
34. Normalize external data before passing it deep into the app.
35. Keep route handlers thin: validate, authorize, orchestrate, respond.
36. Put provider-specific details behind adapters.
37. Prefer lazy loading for large catalogs and heavy UI modules.
38. Keep public exports stable when moving files.
39. Add compatibility shims only as temporary migration aids.
40. Delete obsolete shims once imports are migrated.
41. Name tests after behavior, not implementation details.
42. Avoid broad refactors in hot paths without verification.
43. Optimize readability before micro-performance.
44. Document architectural rules where future agents will find them.
45. Leave the codebase easier to navigate than you found it.
