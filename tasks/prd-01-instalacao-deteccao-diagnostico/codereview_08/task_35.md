# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T35: Prove Codex hook commands and the correction set on every supported platform

## Outcome

The registered Codex command is exercised under `sh -lc`, `bash -lc`, and `cmd.exe /C` on their applicable platforms, missing prerequisites follow the local-skip/CI-fail policy, and one current nine-job CI run proves the complete T29-T34 correction state on Node 20, 22, and 24.

## Dependencies and boundaries

- Depends on: T29, T30, T31, T32, T33, and T34.
- Unblocks: successor code review and PRD-01 acceptance.
- In scope: robust shell/git capability detection, shell execution regression tests, process-lane integrity, five-run local repeatability, current CI matrix evidence, and this task's Handoff.
- Out of scope: changing the Codex command strings unless an applicable shell test proves them wrong, adding a new CI platform, pushing without HIL authorization, and editing `codereview_08/codereview.md`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-06` | `codereview.md#findings` | T28 lacks bash coverage, prerequisite policy, and a current cross-platform CI run. |
| `codereview_08` | Limitations and open items | Historical CI predates the uncommitted correction state. |
| `codereview_07/done/task_28.md` | Execution tests and acceptance | Requires platform-shell execution, local skip with reason, CI failure for missing prerequisites, empty stdout, and recorded run ID. |
| PRD-01 | CA-20 | Requires Linux, macOS, and Windows critical-scenario evidence. |
| PRD 1.1 | NFR-01, NFR-03 | Requires repeated tests and the Ubuntu/macOS/Windows by Node 20/22/24 matrix. |

## Requirements

- Execute the registered POSIX `command` from a nested directory of a temporary git repository under both `sh -lc` and `bash -lc` on Ubuntu and macOS. Each exits 0 with empty stdout.
- Execute the exact registered `commandWindows` through Codex-equivalent `cmd.exe /C` verbatim arguments on Windows. It exits 0 with empty stdout.
- Detect `git`, sh, and bash without a shell wrapper. Handle child `error`, nonzero exit, and a bounded timeout so a missing executable cannot hang the suite.
- A missing applicable prerequisite skips locally with a concrete reason and fails when `CI=true`. Non-applicable platform cases should not be registered as skipped CI tests.
- Keep `codex-hook-command-shells.test.ts` in the process lane and preserve the lane membership regression.
- Use the built hook asset and the hook strings produced by `planCodexInstall`; do not duplicate command constants in the test.
- After T29-T34 are complete, run the default test suite five consecutive times on the executor's available platform with zero failures, timeouts, or unhandled errors.
- Obtain a current GitHub Actions run for `.github/workflows/ci.yml`: Ubuntu, macOS, and Windows, each on Node 20, 22, and 24. All nine jobs must pass the full configured gates, and no applicable Codex shell case may be skipped.
- Record commit SHA, run ID/URL, job matrix, shell exit/stdout evidence, Node/npm versions, and any local-only skips in this task's Handoff. If publishing the commit or starting Actions is not authorized/available, leave this task pending and do not move it to `done/`.

## Context to recover on demand

- TechSpec: PRD-01 DEC-04 and CA-20/E2E-10; PRD 1.1 DEC-13, TC-16, NFR-03.
- Rules and skills: `node.md`, `tests.md`, `code-standards.md`, `javascript-typescript.md`, and `antislop`.
- Code: `tests/integration/codex-hook-command-shells.test.ts:8-86` - current shell helper and missing bash case.
- Code: `tests/helpers/link-capability.ts` - policy pattern for local skip versus CI failure; create shell-specific names rather than overloading link semantics.
- Code: `tests/test-lanes.ts` and `tests/unit/test-lanes.test.ts` - process-lane contract.
- CI: `.github/workflows/ci.yml` - existing 3 by 3 matrix and full gate sequence.

## Work

- [ ] T35.1 Add failing bash and missing-prerequisite policy tests, including child error and timeout behavior.
- [ ] T35.2 Refactor the test helper or add a focused shell-capability helper, then execute exact registered commands under every applicable shell without CI skips.
- [ ] T35.3 Run focused tests, completion gates, and five consecutive `npm test` runs on the local executor; record results and versions.
- [ ] T35.4 With HIL authorization to publish the reviewable commit, run the existing nine-job GitHub Actions matrix and inspect every job for applicable shell execution and full-gate success.
- [ ] T35.5 Record immutable commit/run evidence in this Handoff and verify `codereview_08/codereview.md` remains unchanged.

## Acceptance criteria

- Ubuntu and macOS each execute both sh and bash cases from a nested repository directory with exit 0 and empty stdout.
- Windows executes the cmd case with exit 0 and empty stdout.
- Local missing prerequisites report a precise skip; `CI=true` turns the same condition into a test failure; applicable CI jobs have zero shell-test skips.
- Five consecutive local default test runs pass with no timeout or unhandled error.
- All nine current CI jobs pass build, schemas, dependencies, typecheck, lint, tests, coverage, and package smoke at one recorded correction commit.
- The task Handoff contains the commit SHA and CI run ID/URL. Historical runs are not accepted as substitutes.
- The predecessor report hash is unchanged and no code change beyond test robustness is introduced unless a test proves the command itself defective.

## Verification

- Unit: shell capability policy and process-lane membership.
- Integration: `codex-hook-command-shells.test.ts` under each applicable shell.
- End-to-end: existing built-CLI Codex root and cross-platform critical scenarios run in CI.
- Manual: inspect the GitHub Actions run and record each job result. Owner: HIL or an executor explicitly authorized to publish/start CI.
- Platforms: Ubuntu, macOS, and Windows; Node 20, 22, and 24.
- Environment dependency: git and applicable shells; GitHub remote/Actions access plus authority to publish a reviewable commit. Missing external authority keeps T35 pending.
- Commands: `npm run build`, focused Vitest files, `npm run schemas:check`, `npm run dependencies:check`, `npm run lint`, `npm run typecheck`, `npm test` five times, `npm run coverage`, `npm run package:smoke`; inspect the current Actions run.
- Expected evidence: shell-specific exit/stdout records, five local run summaries, nine green CI jobs, commit SHA, run ID/URL, and unchanged report hash.

## Affected files

- Modify: `tests/integration/codex-hook-command-shells.test.ts`.
- Create if shared policy improves readability: `tests/helpers/process-capability.ts` and `tests/unit/process-capability.test.ts`.
- Modify only if membership changes: `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`.
- Update during execution: this file's `Handoff` section only.

## Observability and recovery

- Operational signal: CI exposes each platform/Node result and the shell test output; no runtime CLI output changes.
- Recovery: revert test-helper changes if they destabilize the lane. CI runs and commit SHAs remain immutable evidence.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Local hardening complete for CR-06. `tests/integration/codex-hook-command-shells.test.ts` now runs the registered POSIX `command` under both `sh -lc` and `bash -lc` on POSIX and the registered `commandWindows` under `cmd.exe /C` on Windows, using the hook strings from `planCodexInstall` and the built asset `dist/assets/runtime/codex-cli-hook.mjs` (no duplicated constants). New `tests/helpers/process-capability.ts` detects `git`, `sh`, and `bash` by spawning them without a shell wrapper, handles child `error`, nonzero exit, and a bounded probe timeout, and applies the local-skip/CI-fail policy (`MissingPrerequisiteError` when `CI` is set). Non-applicable platform cases are not registered, so CI has no skipped shell cases. CI publication (commit + nine-job matrix) is pending in this Handoff.
- Changed files: `tests/integration/codex-hook-command-shells.test.ts`; new `tests/helpers/process-capability.ts` and `tests/unit/process-capability.test.ts`. `tests/test-lanes.ts` already keeps the shell test in the process lane, so no lane membership change was needed.
- Checks:
  - `npm run build`: passed; `npm run lint`: passed (0 errors); `npm run typecheck`: passed.
  - `npm run schemas:check`, `npm run dependencies:check` (3 runtime deps, no install scripts), `npm run package:smoke` (212 files, CLI smoke): passed.
  - Focused Vitest (`process-capability`, `codex-hook-command-shells`, `test-lanes`): 3 files, 12 passed; the Windows `cmd.exe /C` case executed, the POSIX `sh -lc`/`bash -lc` cases are not registered on Windows.
  - Five consecutive `npm test` runs on the local executor: each 85 files / 350 passed / 0 failed, 0 timed out, 0 unhandled errors; durations 202.71s, 174.70s, 287.74s, 153.62s, 158.11s.
  - `npm run coverage`: 85 files / 350 passed; 92.33% statements, 86.00% branches, 95.68% functions, 92.33% lines (threshold 80%).
  - QA-01..QA-06 over changed TS files: 0 hits; changed files <=100 lines and functions <=30 lines.
- Validated state: Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0; uncommitted worktree over `2a26a3e` with `dist/` rebuilt. Local missing prerequisites follow the skip policy; `CI=true` turns the same condition into a failure.
- Open items: HIL-authorized publication is in progress; the correction commit SHA, the nine-job GitHub Actions run ID/URL, and the per-job matrix result are recorded in the follow-up entry below once the run completes. Historical runs are not accepted as substitutes.
