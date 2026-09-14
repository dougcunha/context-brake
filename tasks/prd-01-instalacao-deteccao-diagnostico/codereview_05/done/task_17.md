# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_05/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T17 — Make the link-capability policy test independent of the ambient `CI` variable

## Outcome

`tests/unit/link-capability.test.ts` produces the same result with `CI` unset, `CI=false`, or `CI=true`. The local-skip routing case still proves a skip with the captured reason, the CI routing case still proves a failure with no skip, and the declared CI matrix no longer fails on the test that validates the link policy.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T16
- In scope: explicit, restored `CI` values for every case in `tests/unit/link-capability.test.ts` that reaches `ciRequiresLinks()`; runs of that file under all three `CI` values; repository gates.
- Out of scope: `tests/helpers/link-capability.ts` behavior (CI must still fail on an unavailable link) and its comments (T22); the four suites already routed by T14; E2E-10 and IT-05 routing (T20); production code; `.github/workflows/ci.yml`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_05/CR-02 | `codereview.md#findings` | The routing test at `tests/unit/link-capability.test.ts:36-43` calls `requireLink` while `ciRequiresLinks()` reads the ambient `CI`. With `CI=true` it fails: "expected [Function] to throw error including 'skipped: no link privilege' but got 'no link privilege'". Reproduced on Windows and on Linux (WSL). GitHub Actions sets `CI=true`, so all nine matrix jobs would fail. |
| `codereview_04/done/task_14.md` | Requirements, Acceptance criteria | History: T14 required a deterministic policy test that needs no real link privileges; that acceptance defect persists as codereview_05/CR-02. The T14 handoff stays unchanged. |

## Requirements

- Before each `requireLink` call that expects the local path, the test sets a non-CI value for `CI`. Before each call that expects the CI path, it sets `CI=true`. Environment stubs are restored after every test.
- The local case keeps asserting that `ctx.skip` is called exactly once with the captured reason. The CI case keeps asserting a thrown error containing the reason, with `ctx.skip` not called.
- The file passes with `CI` unset, `CI=false`, and `CI=true`, with the same number of executed tests and no skips.
- No assertion is weakened or removed, and `tests/helpers/link-capability.ts` is not modified.

## Context to recover on demand

- TechSpec: `Testing Approach` — tests use no machine or environment dependence.
- Rules and skills: `.agents/rules/tests.md` (FIRST: Repeatable; Platforms), `.agents/rules/code-standards.md`, `.agents/rules/javascript-typescript.md`, `sdd-execute-corrections`.
- Code: `tests/unit/link-capability.test.ts:33-43` — failing routing case; `tests/helpers/link-capability.ts:8-10,33-38` — `ciRequiresLinks` and `requireLink`; `.github/workflows/ci.yml` — CI environment where `CI=true`.

## Work

- [x] T17.1 Reproduce with `CI=true npx vitest run tests/unit/link-capability.test.ts` and record the failing assertion.
- [x] T17.2 Set an explicit `CI` value before each environment-dependent `requireLink` call, keeping restoration in `afterEach`.
- [x] T17.3 Run the file with `CI` unset, `CI=false`, and `CI=true`; confirm identical passing results and unchanged assertions.
- [x] T17.4 Run lint, typecheck, tests, and coverage.

## Acceptance criteria

- `CI=true npx vitest run tests/unit/link-capability.test.ts` passes every test in the file, with none skipped.
- The same file passes with `CI` unset and with `CI=false`.
- The local routing case still proves one skip carrying the reason; the CI routing case still proves a thrown reason and no skip.
- `git diff` shows changes only in `tests/unit/link-capability.test.ts`.

## Verification

- Unit: `tests/unit/link-capability.test.ts` under `CI` unset, `CI=false`, and `CI=true`; all pass.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: not applicable.
- Platforms: Windows (local) and Linux (WSL 2 Ubuntu); the full matrix is T16.
- Environment dependency: none.
- Commands: `CI=true npx vitest run tests/unit/link-capability.test.ts`, `npx vitest run tests/unit/link-capability.test.ts`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: the failing run recorded before the change, three green runs after it, and all gates green.

## Affected files

- Modify: `tests/unit/link-capability.test.ts`
- Create: —

## Observability and recovery

- Operational signal: Vitest output under `CI=true` lists the routing case as passed.
- Recovery: revert `tests/unit/link-capability.test.ts`; no production code or user file is involved.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. Before the `requireLink` call that expects the local skip path, the routing case now sets `CI=false` with `vi.stubEnv`. The CI branch already set `CI=true`, and `afterEach(vi.unstubAllEnvs)` restores the environment. The test no longer depends on the ambient `CI` value, and every assertion is unchanged.
- Changed files: `tests/unit/link-capability.test.ts` (1 line added).
- Checks:
  - Before the change (reused evidence, same code and configuration): `CI=true npx vitest run tests/unit/link-capability.test.ts` gave 1 failed / 6 passed, "expected [Function] to throw error including 'skipped: no link privilege' but got 'no link privilege'". Seen twice on Windows (Node v24.19.0) and once on WSL Linux (Node v24.21.0) at commit `8401e7f`.
  - After the change: 7/7 with `CI` unset, `CI=false`, and `CI=true` on Windows, and 7/7 for the same three values on WSL; 0 skipped.
  - Windows gates: `npm run lint` and `npm run typecheck` passed. Three full `npx vitest run --reporter=verbose` runs: run 1 had 217/218 with one unrelated timeout (see T19 open items), runs 2 and 3 had 218/218. `npm run coverage` passed 218/218 (91.34% statements, 82.82% branches, 96.15% functions, 91.34% lines).
  - WSL gates: `npm ci --ignore-scripts`, build, lint, and typecheck passed; full suite 218/218.
  - `git diff --numstat` shows only this file for the task.
- Validated state:
  - Uncommitted worktree on top of commit `8401e7f` with T17–T22 applied.
  - Windows 11, Node v24.19.0, npm 11.17.0.
  - WSL 2 Ubuntu 26.04 (kernel `6.18.33.2-microsoft-standard-WSL2`), Node v24.21.0, PATH without `/mnt` entries, worktree copied into `~/cb-work`.
- Open items: none.
