# AI Assistant Engineering Principles

1. Read the surrounding code before editing.
2. Follow existing architecture, naming, and formatting.
3. Keep changes scoped to the user request.
4. Separate file moves from behavior changes.
5. Prefer small commits that can be reviewed independently.
6. Preserve public imports unless intentionally migrating them.
7. Use compatibility exports when moving widely imported modules.
8. Keep scenario catalogs modular and easy to search.
9. Put each large scenario in its own file when practical.
10. Keep folder `index.ts` files as aggregators, not data dumps.
11. Use descriptive file names based on scenario IDs or feature domains.
12. Avoid vague names like `utils2`, `new`, `temp`, or `misc`.
13. Prefer semantic names like `rate-limiter` or `autocomplete-trie`.
14. Remove backup files instead of committing parallel stale copies.
15. Avoid duplicating logic across routes, hooks, and services.
16. Extract shared rules only after repetition is real.
17. Keep TypeScript types close to their domain.
18. Use narrow types before reaching for `any`.
19. Validate untrusted input before business logic.
20. Keep authentication and authorization checks explicit.
21. Keep billing, quota, and persistence changes extra small.
22. Favor pure functions for scoring, scheduling, and transformations.
23. Keep React components focused on rendering and interaction.
24. Move complex state machines into hooks or stores.
25. Keep API routes thin and testable.
26. Prefer project helpers over new one-off utilities.
27. Use the logger for application diagnostics.
28. Do not leave raw debug output in production paths.
29. Avoid hidden side effects in imports.
30. Make async failure states visible and recoverable.
31. Keep prompts centralized and named by purpose.
32. Do not change AI behavior accidentally during refactors.
33. Keep tests targeted to the risk of the change.
34. Run `pnpm exec tsc --noEmit` after TypeScript moves.
35. Run lint or focused tests when touching executable logic.
36. Check `git status` before staging.
37. Stage only files you intentionally changed.
38. Do not revert unrelated user work.
39. Push only after verification passes or failures are explained.
40. Prefer readable diffs over clever transformations.
41. Keep docs short enough that future agents will actually read them.
42. Update docs when conventions change.
43. Use ASCII unless the edited file already uses another character set.
44. Treat data refactors as preservation work.
45. Treat behavior changes as product work.
