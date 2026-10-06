# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T11 — Resolve the `auto_restart` capability of CMP-07

## Outcome

The CMP-07 contract and the code agree under a recorded human decision: either the TechSpec reports auto-restart state through doctor findings only, or the Claude adapter declares the `auto_restart` capability.

## Dependencies and boundaries

- Depends on: the exception HIL decision on CR-04 (pending); T08 (same adapter area)
- Unblocks: —
- In scope: branch A or branch B below, whichever the human chooses.
- Out of scope: the other branch; any capability consumer beyond reporting.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-04 | `codereview.md#Findings` | no `auto_restart` capability, T05.3 checked, no human decision for the deviation |
| TechSpec CMP-07 | `techspec.md#Components and flow` | capability `auto_restart` |
| T05 handoff | `done/task_05.md#Handoff` | deviation: nothing consumes the capability; state goes through doctor findings |

## Requirements

- **Branch A — amend CMP-07 (recommended).** `techspec.md` CMP-07 drops "capability `auto_restart`" and states that auto-restart state is reported through the `AUTO_RESTART_*` doctor findings (CMP-09); `capabilities.ts` drops from the CMP-07 file list. `done/task_05.md` T05.3 gets a note citing the decision. `workflow.md` records the decision; `checkpoint.json#approved_sources` refreshes the `techspec.md` hash with that decision ID. No code change.
- **Branch B — add the capability.** Add `auto_restart` to `CAPABILITY_IDS` (`src/core/contracts/harness.ts`), declare it in `claude-code/capabilities.ts` (state reflecting opt-in support), let other harnesses resolve it as their default state, regenerate `schemas/doctor-report.schema.json` and `schemas/install-report.schema.json`, and update the tests and fixtures that enumerate capability IDs. This exceeds the TechSpec affected-file list (`harness.ts`, `install-report.schema.json`) and changes every harness's doctor profile.

## Context to recover on demand

- TechSpec: CMP-07, CMP-09, `#Observability and rollout`.
- Rules and skills: `harness-adapters.md`, `cli-output.md`, `tests.md` (branch B).
- Code (branch B): `src/core/contracts/harness.ts:CAPABILITY_IDS`, `src/core/services/support-service.ts:18`, `src/infrastructure/harnesses/claude-code/capabilities.ts`.

## Work

- [x] T11.1 Apply the chosen branch.
- [x] T11.2 Record the decision link in `done/task_05.md` and in this handoff.

## Acceptance criteria

- Branch A: TechSpec CMP-07 no longer requires the capability; the decision is in `workflow.md`; the approved hash matches.
- Branch B: `doctor --json` for Claude Code lists `auto_restart`; both report schemas validate; `npm run schemas:check` passes.

## Verification

- Unit: branch B — `tests/unit/harness-adapters.test.ts` and capability enumerations updated and passing.
- Integration: branch B — doctor report schema tests pass.
- End-to-end: branch B — existing doctor e2e cases pass.
- Manual: branch A — reread CMP-07 and the decision record.
- Platforms: Windows here; Linux and macOS through CI.
- Environment dependency: human decision on CR-04 (exception HIL).
- Commands: branch B — `npm run schemas:check`, `npm run lint`, `npm run typecheck`, `npm run coverage` (background).
- Expected evidence: decision ID and, for branch B, test and schema results in the handoff.

## Affected files

- Branch A — Modify: `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`, `done/task_05.md`, `workflow.md`, `checkpoint.json`
- Branch B — Modify: `src/core/contracts/harness.ts`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `schemas/doctor-report.schema.json`, `schemas/install-report.schema.json`, tests enumerating capability IDs

## Observability and recovery

- Operational signal: branch B — `doctor` capability table.
- Recovery: revert the branch's files; `checkpoint.previous.json` keeps the prior index.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: branch B per DEC-CR-04. `auto_restart` is the seventh entry of `CAPABILITY_IDS`. Claude Code declares it `unknown` (it has no harness version floor, and the capability needs 2.1.287 with mods enabled and the opt-in, so `supported` would overclaim under `harness-adapters.md`; same pattern as `context_usage`). The other seven harnesses declare it `unsupported`. `supportLevel` is unchanged for every harness because `FULL_SUPPORT_CAPABILITIES` does not include it. CMP-07 is now met as written; the TechSpec is not amended.
- User-visible change: `init` and `doctor` (text and JSON) print one new limitation line per harness. Claude Code: "Opt-in through init --auto-restart; needs Claude Code 2.1.287 or later with mods enabled. Run doctor to check that the mod loads." Codex CLI, Cursor, GitHub Copilot CLI, OpenCode, Pi, Oh-My-Pi, Antigravity CLI: "Automatic restart in an interactive session exists only for Claude Code; after the restart signal, start the new session yourself."
- Changed files: `src/core/contracts/harness.ts`; `src/infrastructure/harnesses/{antigravity-cli,claude-code,codex-cli,cursor,github-copilot-cli,oh-my-pi,opencode,pi}/capabilities.ts`; `schemas/doctor-report.schema.json` and `schemas/install-report.schema.json` (regenerated by `npm run schemas:generate`, enum gains `auto_restart`); `tests/unit/harness-adapters.test.ts` (TC-02 table: new state column and limitation per harness); `done/task_05.md` (deviation linked to DEC-CR-04). `tests/fixtures/runtime-host/host-entry.ts` left as is: a missing definition resolves to `unknown` and the fixture asserts nothing about it.
- Checks: TC-02 failed for all 8 harnesses before the table update and passes after (8 passed); `support-service`, `report-service`, `copilot-failure-policy` pass unchanged; after `npm run build`, `e2e-support-limitations`, `e2e/auto-restart`, `auto-restart-doctor` pass (23 tests across 5 files); `npm run schemas:check` passes; ESLint clean on the touched files; typecheck clean. Integrated round check after T08 to T11: `npm run coverage` passed, 320 files, 2038 passed, 3 skipped, 0 failed; all files 96.06% statements, 91.77% branches, 96.98% functions.
- Validated state: worktree on `c7529c5` plus the feature diff and T08 to T11; Windows 11, Git Bash.
- Open items: none.
