# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
2. `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Run the assistant from init

## Outcome

In a terminal with no configuration flag, `--yes`, or `--json` (or with `--interactive`), `init` runs the assistant, prints the summary and equivalent command, re-parses the produced flags with the same `parseInit`, and ends in the usual preview with one confirmation. Cancelling writes nothing and exits like a declined confirmation. `--dry-run` shows the plan and writes nothing. Without the assistant `init` is unchanged.

## Dependencies and boundaries

- Depends on: T02, T03, T04
- Unblocks: T06
- In scope: `assistant-session.ts`; the `runInit` wiring (staying within its length limit); confirmation through the port when the assistant ran; cancel and dry-run behavior; equivalence and exclusion tests.
- Out of scope: new questions or flags; docs (T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | The assistant starts as specified |
| FR-05 | `prd.md#functional-requirements` | Deselected detected harness equals the prd-15 exclusion plan |
| FR-06 | `prd.md#functional-requirements` | Printed command reproduces the plan |
| FR-07 | `prd.md#functional-requirements` | One confirmation; cancel; dry run |
| FR-08 | `prd.md#functional-requirements` | No change without the assistant |
| NFR-02 | `prd.md#non-functional-requirements` | `--json` never prompts |
| DEC-02, DEC-05, DEC-07, DEC-10 | `techspec.md#technical-decisions` | Port, flag re-parse, cancel, size |
| CMP-07, CMP-08 | `techspec.md#components-and-flow` | Session and `init.ts` |
| TC-09, TC-10, TC-11, TC-12 | `techspec.md#test-approach` | Exclusion, equivalence, cancel, regression |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (`runInit` must not exceed 30 lines), `file-changes.md` (plan before write), `cli-output.md`, `tests.md`.
- Existing code: `src/cli/commands/init.ts` (`runInit`, `outputReport`), `src/cli/init-config-state.ts` (prd-15 state and exclusion), `src/cli/init-config-updates.ts`, `src/cli/confirmation.ts`, `src/cli/detection-collector.ts` (`collectHarnessSources`, detections for the harness question).
- Contract or integration: `techspec.md#components-and-flow` flow paragraph.
- Helpers from earlier tasks: `PromptPort`, scripted prompts, question runner, `formatEquivalentCommand`, `renderSummary`, `shouldRunAssistant`.

## Work

- [x] T05.1 `assistant-session.ts`: given the state (config, detections, snapshots for the opt-out marker) and the port, run the questions, print the summary and equivalent command (text mode only), and return the flag list or `null` on cancel.
- [x] T05.2 `init.ts`: when `shouldRunAssistant`, run the session; on `null` print `Nothing was written.` and return `0`; otherwise `parseInit([...flags, ...kept])` where `kept` is `--dry-run` if given; use the resulting args for the rest of the flow; ask the final confirmation with `confirmWithPort` when the assistant ran; keep `runInit` at or below 30 lines by extracting a helper.
- [x] T05.3 Tests: `tests/integration/init-assistant-equivalence.test.ts` (TC-10: scripted sessions for supported combinations; replay the printed command on a copy of the fixture; same plan JSON and byte-identical configuration), `init-assistant-exclusion.test.ts` (TC-09), `init-assistant-cancel.test.ts` (TC-11: cancel at first, middle, and confirmation; dry run), plus a run of the full existing `init` suite (TC-12).

## Acceptance criteria

- With a terminal and no flags, the first prompt appears; with any of `--yes`, `--json`, or a configuration flag, no prompt appears and the run is byte-identical to before.
- The plan of an assistant session equals the plan of `init <printed flags>` run non-interactively on a copy of the starting fixture (plan JSON and configuration bytes), for every combination exercised.
- Deselecting a detected installed harness yields the same plan as `init --exclude-harness <id>` (prd-15).
- Cancel (`null`) at any prompt writes nothing, prints `Nothing was written.`, and returns `0`; `--dry-run` with the assistant writes nothing and shows the plan.
- `--json` never prompts and its document is unchanged; the summary and equivalent command appear only in text mode.
- `runInit` is at most 30 lines; touched `src/` files at or below 100 lines.

## Verification

- Unit: none beyond T03/T04.
- Integration: `runInProcessCli` with injected `terminal` and scripted prompts on temporary directories; plan JSON comparison through `--dry-run --json` of the replayed command.
- End-to-end: not applicable here (TC-14 in QA).
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm test -- tests/integration/init-assistant-equivalence.test.ts tests/integration/init-assistant-exclusion.test.ts tests/integration/init-assistant-cancel.test.ts`, then `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-01`, `FR-05`..`FR-08`, `TC-09`..`TC-12`; full suite green.

## Affected files

- Modify: `src/cli/commands/init.ts`
- Create: `src/cli/assistant/assistant-session.ts`, `tests/integration/init-assistant-equivalence.test.ts`, `tests/integration/init-assistant-exclusion.test.ts`, `tests/integration/init-assistant-cancel.test.ts`

## Observability and recovery

- Operational signal: summary, equivalent command, and the usual plan preview.
- Recovery: cancel at any prompt; revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `init` runs the assistant when `shouldRunAssistant` holds (TTY on both streams with no configuration flag, `--yes`, or `--json`; or `--interactive`). `runAssisted` (init.ts) builds the context (stored config, detections without the typed `--harness`/`--exclude-harness`, adapters, opt-out marker) through `buildAssistantContext`, runs `runQuestions`, prints the summary and the equivalent command (stdout, text mode only), re-parses `[...flags, --dry-run if given]` with the same `parseInit`, and runs the unchanged flow (`executeInit`) with the assistant's port. Before the single confirmation (`confirmWithPort`, through the same port) it prints the usual plan preview (dry-run text report); declining or ending input at any prompt prints `Nothing was written.` and returns `0`. `--dry-run` shows the plan and asks nothing. Without the assistant the path is `executeInit(args, env, null)`, which still uses `authorizeWrite` and builds no preview. The production `ReadlinePromptPort` is created only for the assistant and closed in `finally`; an injected port is never closed. `runInit` is 5 lines, `executeInit` 27.
- Changed files: modified `src/cli/commands/init.ts` (88 lines), `tests/integration/init-interactive-gate.test.ts` (the T02 "passes the gate" test now injects a scripted port; added the "flags keep the assistant away on a terminal" cases), `tests/unit/equivalent-command.test.ts` (shared `splitWords` moved to a helper). Created `src/cli/assistant/assistant-context.ts` (22 lines), `src/cli/assistant/assistant-session.ts` (28 lines), `tests/helpers/assistant-world.ts`, `tests/helpers/shell-words.ts`, `tests/integration/init-assistant-equivalence.test.ts`, `init-assistant-exclusion.test.ts`, `init-assistant-cancel.test.ts`.
- Checks: `npm run lint` and `npm run typecheck` clean; the three new integration files plus the gate file pass (12 tests in equivalence and exclusion, including stored-state scenarios; cancel 6; gate 9); mutation check: the typed-flag regression test fails against the old `askForFlags` and passes against the fix; `npm run coverage` final run: exit 0, 247 files, 1377 tests passed, 94.58% lines, wall time 186 s (3m6s). An earlier run failed once, in `tests/integration/doctor-exclusion.test.ts`, with a 10 s `beforeEach` timeout under load (222 s wall); that file passes alone in 0.7 s and the next full run was green. Quality sweep over the T05 `src/` and test diff: no QA-01..QA-05 or QA-07 hit, one QA-06 reservation hit (open item 3), no file above 100 lines (`init.ts` 88). The 186 s wall time is again above the 180 s budget while the new tests add about 12 s of aggregate test time spread across workers (T04 measured 104.6 s on the same code base minus this task), so it reads as machine load; T06 measures with `npm run test:budget` and reports the slowest files.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.19.
- Open items: (1) `init --interactive` combined with configuration flags (for example `--harness x`) discards those typed flags: the assistant shows and starts from the stored configuration and the detections, and only `--dry-run` is carried over (TechSpec flow), so what it shows is what the printed command replays; no rule in the PRD or TechSpec covers the combination, so it is left as is and listed for HIL 3. (2) When the assistant keeps everything and the flag list is empty, the printed command is plain `context-brake init`, which starts the assistant again on a terminal; replay it with `--yes` (the tests do). (3) One reservation hit (QA-06): `throw new Error` in `tests/helpers/assistant-world.ts` (`printedFlags`), a test helper. (4) The plan preview before the confirmation is the dry-run text report (`[OK] ContextBrake init (dry_run)` header), reused so the confirmed plan is the one shown.

### ADR candidates

None - direct TechSpec implementation or local decision.
