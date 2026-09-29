# Stable execution context

Load in this exact order:

1. `tasks/prd-09-freio-com-janela-confiavel/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T03 — A plain `init` never fails because of the default status line bridge

## Outcome

A plain `init` (no bridge flag, not opted out) with a `.claude/settings.local.json` or `.claude/settings.json` that does not parse still applies the rest of the plan and ends with `status: warnings` (exit 1), never `errors` (exit 2): the bridge conflict becomes a warning finding saying the bridge was not installed or updated, so the brake only warns in Claude Code. The explicit `--statusline-bridge` and `--no-statusline-bridge` flags keep their conflicts.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: the default-case softening in `statusline-default.ts#softenDefaultConflict`, generalized from `STATUSLINE_UNSUPPORTED_PATH` to every conflict the default bridge plan returns; the unit and integration TC-09 cases.
- Out of scope: the explicit-flag paths, the hooks planner (an unparseable `.claude/settings.json` still fails the hooks entry on its own, which is not "because of the bridge"), `techspec.md`, doctor diagnostics.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | A plain `init --yes --json` with a malformed `.claude/settings.local.json` exits 2 with `INVALID_HARNESS_CONFIG`, against DEC-08 ("a plain `init` never fails because of the bridge") and `file-changes.md` |
| DEC-08, TC-09 | `techspec.md#technical-decisions`, `techspec.md#test-approach` | Default bridge; warning and no bridge, exit 0 |

## Requirements

- In the default case, every conflict of the bridge plan becomes a `warning` finding with the conflicting path, the parse detail, the impact (bridge not installed or updated; the brake only warns in Claude Code), and a remediation that names the file to fix and `context-brake init`.
- `STATUSLINE_UNSUPPORTED_PATH` keeps its code and remediation; a settings parse conflict uses the warning code `STATUSLINE_SETTINGS_INVALID`, never `INVALID_HARNESS_CONFIG` (which marks `doctor` as broken).
- The softened plan carries no bridge settings change; the unparseable file is left untouched.
- With `--statusline-bridge`, the same malformed file still returns the `INVALID_HARNESS_CONFIG` conflict (explicit request, PRD-02.2 behavior).

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` DEC-08, `#test-approach` TC-09
- Rules and skills: `code-standards.md`, `javascript-typescript.md`, `tests.md`, `file-changes.md`, `harness-adapters.md`
- Code: `src/infrastructure/harnesses/claude-code/statusline-default.ts#softenDefaultConflict`; `statusline-planner.ts:25-30,44-58` (default branch and the two parse conflicts); `statusline-planner.ts#userSettingsFinding` (finding shape to mirror); `tests/helpers/statusline-world.ts`

## Work

- [x] T03.1 Generalize `softenDefaultConflict` to turn every conflict into a warning finding, keeping the unsupported-path code and remediation.
- [x] T03.2 Rewrite the unit test `keeps other conflicts` in `tests/unit/statusline-default.test.ts`, which asserted the behavior CR-01 condemns, into a case that softens a settings parse conflict.
- [x] T03.3 Add an integration case in `tests/integration/statusline-default.test.ts`: malformed `.claude/settings.local.json`, plain `init --yes --json` ends with `status: warnings` (exit 1) and a `STATUSLINE_SETTINGS_INVALID` warning, hooks installed, the local file unchanged; and `--statusline-bridge` on the same file still fails with the conflict.

## Acceptance criteria

- Plain `init --yes --json` with a malformed `.claude/settings.local.json` ends with `status: warnings` (exit 1, never 2), reports a `STATUSLINE_SETTINGS_INVALID` warning, installs the hooks, and leaves the file byte-identical.
- `init --yes --json --statusline-bridge` on the same file still exits 2 with the `INVALID_HARNESS_CONFIG` conflict.
- The unsupported-path case keeps `STATUSLINE_UNSUPPORTED_PATH` as a warning.
- Build, typecheck, lint, and the full suite with coverage pass; the blocking quality-profile commands report zero hits over the touched files.

## Verification

- Unit: `tests/unit/statusline-default.test.ts` — unsupported path and settings parse conflict both softened.
- Integration: `tests/integration/statusline-default.test.ts` — malformed local settings with plain and explicit `init`.
- End-to-end: not applicable (the integration case runs the CLI entrypoint in a temporary repository).
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI when committed.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run coverage`
- Expected evidence: the new test names citing CR-01, DEC-08, TC-09 pass; exit codes as above.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/statusline-default.ts`
- Modify: `tests/unit/statusline-default.test.ts`
- Modify: `tests/integration/statusline-default.test.ts`

## Observability and recovery

- Operational signal: the `STATUSLINE_SETTINGS_INVALID` warning in the `init` report; `doctor` keeps reporting `STATUSLINE_BRIDGE_ABSENT` until the file is fixed.
- Recovery: fix the settings file and run `context-brake init`.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `statusline-default.ts#softenDefaultConflict` now turns every conflict of the default bridge plan into a `warning` finding (`conflictFinding`): `STATUSLINE_UNSUPPORTED_PATH` keeps its code, message, and remediation; any other conflict (an unparseable `.claude/settings.local.json` or `.claude/settings.json`) becomes `STATUSLINE_SETTINGS_INVALID` with the path, the parse detail, the impact "The status line bridge was not installed, so the brake only warns in Claude Code.", and the remediation `Fix <path>, then run context-brake init.`. A plain `init` with a malformed local settings file now ends with `status: warnings` (exit 1) instead of `errors` (exit 2), still installs the hooks, and leaves the file byte-identical; `--statusline-bridge` on the same file still exits 2 with the conflict. The finding code is not `INVALID_HARNESS_CONFIG`, which `doctor-service.ts:39` treats as broken.
- Contract note: the task's first draft said "exits 0", copied from TC-09's "exit 0" for the unsupported path; `report-service.ts#deriveInstallStatus` makes any warning finding exit 1, so the acceptance was corrected before implementation to "`status: warnings` (exit 1), never `errors` (exit 2)". DEC-08's "never fails" is met as "never ends in errors"; the TC-09 "exit 0" wording in `techspec.md` was left unchanged for the re-review to judge.
- Test change: the old unit case `keeps other conflicts` asserted that `INVALID_HARNESS_CONFIG` stays a conflict in the default case, the behavior CR-01 condemns; it was replaced by an exact-assertion case that the conflict becomes the `STATUSLINE_SETTINGS_INVALID` warning. This corrects a wrong expectation; no assertion was weakened.
- Changed files: `src/infrastructure/harnesses/claude-code/statusline-default.ts`, `tests/unit/statusline-default.test.ts`, `tests/integration/statusline-default.test.ts`.
- Checks (Windows 11, Node 24, base `e0a9604` plus the feature diff and T03): targeted `npx vitest run tests/unit/statusline-default.test.ts tests/integration/statusline-default.test.ts tests/integration/statusline-install.test.ts` 3 files, 14 passed (new: `turns an unparseable settings conflict into a STATUSLINE_SETTINGS_INVALID warning naming the file`, `returns a plan without conflicts unchanged`, `warns instead of failing a plain init, installs the hooks, and leaves the file untouched`, `keeps the conflict when the bridge is requested explicitly`); `npm run build` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run coverage` exit 1: 298 files, 1,873 passed, 1 failed, 3 skipped. The failure is `tests/e2e/e2e-support-limitations.test.ts > prints equivalent limitations in doctor text and JSON with no limitation finding`, a 30 s timeout: its fixture has only Copilot and Cursor (no Claude Code, so T03's code does not run), and it runs `doctor` twice, whose overhead probe measured 311–355 ms per hook call against a 100 ms target, about 13 s per `doctor`, while an external process (`Pos.Integration.Service.Testes`) held the CPU at 90%. It failed the same way alone twice. It passed in the `codereview_01` coverage run on the pre-T03 code. Rerun with T04's full run.
- Quality profile over the three touched files: QA-01, QA-02, QA-03, QA-05 zero hits; QA-04 not applicable (infrastructure file); largest file 65 lines.
- Validated state: working tree at `e0a9604` plus the feature diff and T03; Windows only; Linux and macOS through CI.
- Integrated rerun: the combined T03 and T04 full run passed (`npm run coverage` exit 0: 298 files, 1,874 passed, 3 skipped, 95.65% lines; `e2e-support-limitations` 2 passed in 21.4 s), with build, typecheck, and lint exit 0; see `task_04.md#handoff`.
- J3 (jev shadow): logged in `jev-log.jsonl`; `escalate`, with criterion 4 contradicted on the first full run (the open item above), before the rerun.
- Open items: none.
