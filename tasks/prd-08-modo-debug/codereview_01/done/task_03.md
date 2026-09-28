# Stable execution context

Load in this exact order:

1. `tasks/prd-08-modo-debug/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T03 — Regression tests for the debug-mode disable preview, light-mode doctor, and extra-line drift

## Outcome

The suite fails if the `--no-debug` plan stops naming the debug removal, if `doctor` reports the debug mode while light mode is set, or if `init` stops removing a debug line left in the block while the mode is off.

## Dependencies and boundaries

- Depends on: T01, T02 (in `done/`)
- Unblocks: —
- In scope: new automated tests for the three behaviors in `codereview_01/CR-01`; no production code change.
- Out of scope: `codereview_01/CR-02` (accepted open item, `DEC-HIL-13`); any change under `src/`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | No direct assertion for the disable preview, light-mode doctor absence, and extra-line drift |
| FR-06 | `prd.md#functional-requirements` | Plan shows the disabling; a block with the debug line left over is rewritten by `init` |
| T02 acceptance | `done/task_02.md#acceptance-criteria` | With light mode on, `debugMode` and the text line are absent |

## Requirements

- `init --no-debug --dry-run --json` with debug on: the config change summary contains `remove the debug mode`, the instruction files are planned as updates, the report passes `installReportSchema`, and nothing is written.
- With the mode off, a block that still carries `DEBUG_MODE_LINE` (hand-added) returns to the block without it after `init --yes`, and the content outside the markers is unchanged.
- With `debug: true` and `lightMode` in the config (hand-edited), `doctor --json` has no `debugMode`, and `doctor` text has no `debug mode:` line.

## Context to recover on demand

- TechSpec: `techspec.md#errors-security-and-recovery` (edge: `debug: true` with `lightMode` is ignored), DEC-06, DEC-07.
- Rules: `.agents/rules/tests.md`, `code-standards.md` (100-line file limit also applies to tests).
- Code: `tests/integration/init-debug-mode.test.ts` (98 lines; do not grow past 100: put the init cases in a new file), `tests/integration/doctor-light-mode.test.ts` (pattern for hand-edited config and `doctor --json`), `tests/helpers/light-world.ts`, `tests/helpers/delegated-world.ts`.

## Work

- [x] T03.1 Create `tests/integration/init-debug-mode-disable.test.ts` with the disable-preview case and the extra-line drift case (in-process `runCli`, like `init-debug-mode.test.ts`).
- [x] T03.2 Add the light-mode `doctor` case to `tests/integration/doctor-light-mode.test.ts`.

## Acceptance criteria

- The three requirement cases exist, each cites `codereview_01/CR-01` and `FR-06` in its `describe`, and they pass.
- Each new assertion fails when the behavior it covers is broken (checked by temporarily breaking the behavior, then restoring it; no production change remains).
- No test file exceeds 100 lines; lint, typecheck, and the full suite with coverage pass.

## Verification

- Unit: not applicable.
- Integration: the three cases against temporary repositories, in-process.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: test names with `CR-01`, the full command outputs, and the result of the temporary break check.

## Affected files

- Create: `tests/integration/init-debug-mode-disable.test.ts`
- Modify: `tests/integration/doctor-light-mode.test.ts`

## Observability and recovery

- Operational signal: not applicable.
- Recovery: revert the test diff.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: three regression tests for `codereview_01/CR-01`, with no production change. New `tests/integration/init-debug-mode-disable.test.ts` (35 lines): "init --no-debug plan (codereview_01/CR-01, FR-06, DEC-06)" (with debug on, `init --dry-run --json --no-debug` parses with `installReportSchema`, the config summary contains `remove the debug mode`, `AGENTS.md` and `CLAUDE.md` are planned, and the tree is unchanged); "init debug drift with the mode off (codereview_01/CR-01, FR-06, DEC-08)" (a hand-added `DEBUG_MODE_LINE` before the end marker is removed by the next `init --yes`, and the file equals the plain install byte for byte). `tests/integration/doctor-light-mode.test.ts` gains its own `describe` "doctor with a debug key in light mode (codereview_01/CR-01, FR-06, DEC-07)": with `debug: true` added by hand next to `lightMode`, `doctor --json` has no `debugMode` and `doctor` text has no `debug mode:`.
- Changed files: `tests/integration/init-debug-mode-disable.test.ts` (new), `tests/integration/doctor-light-mode.test.ts` (+10 lines, 68 total).
- Checks (Windows 11, Node 24): targeted run 8/8 passed. Break check: with `DEBUG_SUMMARY.remove` renamed, `isDebugModeInEffect` ignoring `lightMode`, and `planExistingInstruction` skipping existing blocks, exactly the three new tests failed (3 failed, 5 passed); the three source files were restored from backup and verified by sha256. `npm run coverage`: 287 files, 1,824 passed, 3 skipped, 95.61% lines, exit 0. The first `npm run lint` failed with `max-lines-per-function` (37 lines) on the `doctor in light mode` describe callback; the new case moved to its own `describe`, and then `npm run lint` ("ESLint: No issues found"), `npm run typecheck`, and the file's run (6/6) passed. The full coverage run predates that move, which relocated the same test without changing its body. Quality profile (QA-01, QA-02 over the two files): no hits. No test file above 100 lines.
- Validated state: base `791defe` plus the feature diff and this test diff; Windows only; Linux and macOS through CI.
- Open items: none. `codereview_01/CR-02` stays an accepted open item (`DEC-HIL-13`).
