# T14 — Make link-capability test outcomes explicit and enforce execution in CI

## Outcome

Every linked-root, linked-config, and linked-harness regression either executes its semantic assertions or is reported as skipped locally with a concrete capability reason. Declared CI platforms fail when required link setup is unavailable, so a green run is evidence that RF13, CA-07, CA-20, T10, and T11 scenarios actually ran.

## Dependencies and boundaries

- Depends on: —
- Unblocks: `codereview_04/CR-04`, T16.
- In scope: the nine bare-return link setup branches identified by CR-04; a small shared test-only capability helper if needed; explicit local skip reasons; CI-required failure behavior; execution assertions and focused tests of the policy.
- Out of scope: production filesystem/link behavior, relaxing Windows CI symlink configuration, changing canonical path semantics, or treating an unavailable required CI capability as a passing result.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_04/CR-04` | `codereview.md#findings` | Nine link setup failures use bare `return`, allowing required regressions to appear passed without assertions. |
| `.agents/rules/tests.md` | `Platforms` | Unsupported local link creation is skipped with a reason, never passed silently; CI Windows must allow symbolic links. |
| TechSpec | IT-05, E2E-10 | Link preservation and cross-platform critical scenarios must execute on their required runners. |

## Requirements

- Replace every CR-04 bare return with Vitest runtime skip behavior that includes link kind, platform, and the captured setup error/capability reason.
- Centralize link-attempt/result formatting in a test-only helper when necessary to stay within file/function limits and keep all four suites consistent.
- Distinguish local capability gaps from CI contract failures: a local unsupported environment may skip explicitly; a declared CI job must throw/fail with the same diagnostic reason.
- Preserve temporary-directory cleanup even when setup skips or fails.
- Add a deterministic policy test that does not require real link privileges: unavailable-local invokes the skip path with a non-empty reason, unavailable-CI throws, and available proceeds to assertions.
- Each successful scenario must assert that its requested link/junction exists before testing canonical paths, byte-idempotency, or concurrency behavior.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — IT-05 and E2E-10.
- Rules and skills: `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md`, `.agents/rules/node.md`, `.agents/rules/tests.md`, `AGENTS.md`, `sdd-execute-task`.
- Code: `tests/integration/linked-project-root.test.ts`, `tests/e2e/e2e-linked-project-root.test.ts`, `tests/integration/symlinked-harness-config.test.ts`, and `tests/e2e/e2e-symlinked-harness-config.test.ts` — all nine affected branches; `.github/workflows/ci.yml` — platforms where inability to execute is a failure.

## Work

- [x] T14.1 Add failing policy coverage for available, locally unavailable, and CI-unavailable link attempts, including a stable, non-empty reason.
- [x] T14.2 Introduce the smallest shared test-only link capability/result helper and ensure it retains the original error detail without leaking temporary paths unnecessarily.
- [x] T14.3 Convert every affected integration and E2E test to accept Vitest context, skip locally with the explicit reason, and fail under CI when a required link cannot be created.
- [x] T14.4 Add link-created assertions before the existing canonical-target, idempotency, lifecycle, and concurrency assertions; keep cleanup in `finally`/`afterEach` paths.
- [x] T14.5 Run focused suites with normal capability, simulate both policy branches, scan out the nine bare-return patterns, then run all repository gates.

## Acceptance criteria

- None of the nine CR-04 branches can complete a passing test without either link creation plus semantic assertions or a Vitest skip carrying a reason.
- With CI mode enabled, a failed required link setup fails the test and reports the platform, link kind, and cause; it never skips or passes.
- On a local host without permission/capability, the test runner reports a skip reason and cleanup succeeds.
- On capable runners, linked-root, symlinked config, linked manifest, Claude/Cursor harness, built-CLI lifecycle, byte-idempotency, and concurrency assertions all execute and pass.

## Verification

- Unit: deterministic test-only policy cases for proceed, explicit local skip, and CI failure.
- Integration: run `linked-project-root.test.ts` and `symlinked-harness-config.test.ts`; each successful case proves the link exists and completes all semantic assertions.
- End-to-end: run `e2e-linked-project-root.test.ts` and `e2e-symlinked-harness-config.test.ts`; capable environments execute rather than silently return.
- Manual: inspect Vitest output from a simulated unavailable local capability for the explicit reason and from CI mode for a failure.
- Platforms: Linux, macOS, and Windows; Windows CI keeps symbolic-link capability enabled. Cross-platform run artifacts are T16.
- Environment dependency: local link privilege is optional only because it yields an explicit skip; it is mandatory in declared CI.
- Commands: focused `vitest` runs followed by `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run schemas:check`, `npm run dependencies:check`, `npm run package:smoke`.
- Expected evidence: no CR-04 bare returns, explicit skip/failure policy tests, link-execution assertions, and all gates green.

## Affected files

- Modify: `tests/integration/linked-project-root.test.ts`, `tests/e2e/e2e-linked-project-root.test.ts`, `tests/integration/symlinked-harness-config.test.ts`, `tests/e2e/e2e-symlinked-harness-config.test.ts`.
- Create: `tests/helpers/link-capability.ts`, `tests/unit/link-capability.test.ts`.

## Observability and recovery

- Operational signal: Vitest reports a named skip with capability reason locally or a failed setup in CI; a green CI case reaches explicit link-created and behavior assertions.
- Recovery: revert only test/helper changes; production link handling and user repositories are unaffected.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. The nine CR-04 bare returns are gone: `tests/helpers/link-capability.ts` now owns the attempt/policy decision and every affected branch routes through it. `attemptLink(target, link, kind)` performs one symlink/junction attempt and returns `{created, reason}`; on failure the reason carries the link kind, `process.platform`, and the original OS error detail. `linkPolicy(attempt, ciRequired)` is the pure decision: `proceed` when created, `skip` locally, `fail` under CI. `requireLink(ctx, attempt, link)` applies the policy — it calls `ctx.skip(reason)` locally and `throw new Error(reason)` under CI — and additionally throws if a link reported as created is not present, so a passing test can no longer complete without link creation plus semantic assertions. `ciRequiresLinks()` reads `CI`, which GitHub Actions sets to `true`, so a required link failure now fails the job instead of skipping. Local skips are explicit Vitest skips carrying the capability reason; no branch returns silently. Cleanup is untouched: the integration suites keep their `try/finally` temp-root removal and the E2E suites keep `afterEach` removal.
- Changed files:
  - `tests/helpers/link-capability.ts` (new, test-only)
  - `tests/unit/link-capability.test.ts` (new)
  - `tests/integration/linked-project-root.test.ts` (4 bare returns replaced; removed the local `createDirLink` and the now-unused `symlink` import; explicit `linkExists` assertion kept before the canonical-path and idempotency checks)
  - `tests/integration/symlinked-harness-config.test.ts` (2 bare returns replaced; `setupClaudeRepo`/`setupCursorRepo` now return `LinkAttempt`)
  - `tests/e2e/e2e-linked-project-root.test.ts` (1 bare return replaced; explicit `linkExists` assertion added)
  - `tests/e2e/e2e-symlinked-harness-config.test.ts` (2 bare returns replaced; `setupJunctionRepo` now returns `LinkAttempt`; explicit `linkExists` assertion added before the lifecycle and concurrency checks)
- Checks:
  - Bare-return scan over the four suites: zero `return;`, zero remaining `createDirLink`/`createJunction`/`symlink(` occurrences.
  - `npx vitest run` over the four link suites plus the new policy unit test — 5 files, 15 tests passed, 0 skipped, so on this host every link/junction scenario executed its assertions instead of returning early.
  - Policy branches simulated deterministically in `tests/unit/link-capability.test.ts`: available → `proceed` in both modes; unavailable locally → `skip` with the exact captured reason and `ctx.skip` called once; unavailable under `CI=true` → the test rejects with a reason containing the link kind, platform, and cause while `ctx.skip` is never called; `CI=false` → no CI requirement.
  - `npm run lint` — passed (an initial `max-lines-per-function` violation in the new `describe` callback was fixed by splitting it).
  - `npm run typecheck` — passed.
  - `npm test` — passed: 62 files, 215 tests (was 208; +7 cases).
  - `npm run coverage` — passed all four thresholds: 91.34% statements, 91.34% lines, 82.82% branches, 96.15% functions.
  - `npm run build` — passed. `npm run schemas:check` — passed, no drift. `npm run dependencies:check` — passed. `npm run package:smoke` — passed: 187 packaged files with schemas, assets, and bin present.
- Validated state: worktree state (the repository still has zero commits and no `HEAD`, so no revision can be named); Node v24.19.0, npm 11.17.0, Windows 11, PowerShell 7.6.6. The Windows host has working junction capability, which is why the 15 link scenarios executed rather than skipped. Linux/macOS execution evidence remains T16's; `.github/workflows/ci.yml` is unchanged and already configures `core.symlinks` on Windows, and `CI=true` is what makes a missing capability fail there.
- Open items: none for T14. The linked-root E2E doctor expectation (`warnings`/exit 1 plus the stable finding code) was updated under T12 because T12 changed that contract; it is recorded there as a consequential change. Real Linux/macOS and CI-matrix confirmation stays with T16.
