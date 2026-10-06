# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T06 — Doctor and end-to-end flow

## Outcome

`doctor` tells the person whether automatic restart is off, ready, or broken and why, and the built CLI proves the install, re-install, doctor and remove flow end to end.

## Dependencies and boundaries

- Depends on: T05
- Unblocks: T07
- In scope: `diagnoseAutoRestart` in the Claude adapter, finding codes and remediations, reading the mod's per-session files, doctor JSON schema validity, the e2e scenario.
- Out of scope: docs (T07), changes to the mod's behavior.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-08 | `prd.md#functional-requirements` | Doctor states and remediations |
| FR-07, FR-09 | `prd.md#functional-requirements` | E2E install and remove |
| DEC-10 | `techspec.md#technical-decisions` | Heartbeat and last skip |
| CMP-09 | `techspec.md#components-and-flow` | Doctor integration |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md` (labels, `--json`, exit codes), `tests.md` (e2e policy).
- Existing code: `src/infrastructure/harnesses/claude-code/statusline-diagnostics.ts`, `src/core/services/doctor-checks.ts`, `schemas/doctor-report.schema.json`, `tests/e2e/`.
- Contract or integration: `techspec.md#observability-and-rollout` (finding codes).
- Harness reference: `docs/research/harness-integrations.md#claude-code` (minimum version, causes when mods are off).

## Work

- [x] T06.1 Implement the findings `AUTO_RESTART_OFF`, `_READY`, `_NOT_LOADED`, `_OUTDATED_MOD`, `_CLAUDE_TOO_OLD`, `_LAST_SKIP` with impact and remediation (including the causes `disableAllHooks`, `--safe-mode`, managed policy, WSL).
- [x] T06.2 Read the mod's per-session files for the loaded header and last skip code, tolerating missing or old formats.
- [x] T06.3 Confirm the finding codes validate against `doctor-report.schema.json` (extend the enum only if the schema lists codes).
- [x] T06.4 Write TC-22, TC-23 and the e2e scenario TC-25.

## Acceptance criteria

- One fixture per problem yields its finding and remediation; off and ready yield no warning and keep the exit code healthy.
- `doctor --json` validates against the published schema.
- E2E: `init --auto-restart --yes`, `init` again (no changes), `doctor`, `remove --yes` leave the fixture repository as before, with the documented exit codes.

## Verification

- Unit: not applicable.
- Integration: TC-22, TC-23 with temp repositories and recorded mod files.
- End-to-end: TC-25 runs the built CLI as a child process against a fixture repository.
- Manual: not applicable.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run schemas:check`, `npm run package:smoke`
- Environment dependency: none
- Expected evidence: test counts, schema validation, QA-01 to QA-04, QA-07 to QA-11 clean.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/adapter.ts`, `src/core/services/doctor-checks.ts` (or the aggregating service), `schemas/doctor-report.schema.json` (only if it enumerates codes)
- Create: `src/infrastructure/harnesses/claude-code/auto-restart-diagnostics.ts`, `tests/integration/auto-restart-doctor.test.ts`, `tests/e2e/auto-restart.test.ts`

## Observability and recovery

- Operational signal: the doctor output itself.
- Recovery: findings are read-only; nothing to reverse.

## Handoff

- Produced result: `diagnoseAutoRestart` emits `AUTO_RESTART_OFF` (ok), `_READY` (ok), `_NOT_LOADED` (warning; remediation lists folder trust, `disableAllHooks`, `--safe-mode`, `--bare`, managed policy, Desktop WSL), `_OUTDATED_MOD` (warning; missing mod files or settings keys, or last session loaded another `modVersion`), `_CLAUDE_TOO_OLD` (warning; below 2.1.287, probed only when the feature is on) and `_LAST_SKIP` (ok, warning for `ERROR_*`). It reads the newest `.context-brake/runtime/claude-mod/*.json` by mtime that parses with `modLogSchema`; broken or older formats are skipped. `doctor` passes `autoRestart: config.autoRestart !== undefined` in the harness context, so asset currency also sees the mod files. `doctor-report.schema.json` uses a code pattern, not an enum: no schema change.
- Changed files: created `src/infrastructure/harnesses/claude-code/auto-restart-diagnostics.ts` (82 lines), `tests/integration/auto-restart-doctor.test.ts`, `tests/helpers/auto-restart-doctor-world.ts`, `tests/e2e/auto-restart.test.ts`; modified `src/infrastructure/harnesses/claude-code/adapter.ts` (89 lines), `src/cli/commands/doctor.ts` (1 line), `tests/unit/hook-registration-paths.test.ts:38` (now ignores `ok` findings, since the off finding is always present).
- Checks: `npm run lint` clean; `npm run typecheck` clean; `npm run build`, `npm run schemas:check`, `npm run package:smoke` pass; TC-22/TC-23 8/8, TC-25 1/1 (built CLI, `PATH` emptied so no real `claude` is probed); coverage of the new file 97.14% lines, 92.85% branches. Two full `npm run coverage` runs: first 2030 passed / 2 failed (the `hook-registration-paths` case, fixed, plus `boot-git-delivery`), second 6 failed, all load-sensitive: 30 s timeouts and EBUSY in `e2e-support-limitations`, `statusline-install`, and `boot-git-delivery`. All pass when run alone, except `boot-git-delivery.test.ts`, which alternates pass and fail even alone. It covers boot git delivery, which this feature does not touch; recorded as a flaky test outside this feature. Because of these failures, vitest printed no global coverage table.
- Validated state: worktree on `c7529c5` plus T02-T06 diff; Windows 11, Node 20+, Git Bash.
- Open items: the TC-25 comparison excludes `.claude/settings.json`, because the base hooks remove rewrites `"hooks": {}` as a multi-line empty object (behavior from before PRD-11, not a mod path); the global coverage figure is pending a green full run. Quality profile: QA-01 to QA-04, QA-07 to QA-11: no hits in the diff.

### ADR candidates

None - direct TechSpec implementation or local decision.
