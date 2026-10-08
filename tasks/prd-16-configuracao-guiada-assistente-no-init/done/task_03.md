# Stable execution context

Load in this exact order:

1. `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
2. `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Assistant questions

## Outcome

A function runs the assistant questions through a `PromptPort` and returns the `init` flag list that expresses the answers, plus the facts needed for the summary. It asks exactly the applicable questions in the FR-02 order, shows defaults and facts, re-asks on an invalid answer with the failed rule, and returns `null` when the person cancels.

## Dependencies and boundaries

- Depends on: T01, T02
- Unblocks: T05
- In scope: the four question modules and a small runner that sequences them; defaults from the current configuration and detections; flag emission only when an answer differs from the starting state (DEC-05); validation through `mergeSnapshot` and the limit constants.
- Out of scope: the summary text and equivalent-command quoting (T04); starting the assistant from `init` (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02 | `prd.md#functional-requirements` | Order and applicability |
| FR-03 | `prd.md#functional-requirements` | Defaults and facts (support level, restart modes, handoff note) |
| FR-04 | `prd.md#functional-requirements` | Rule line then the same question |
| FR-05 | `prd.md#functional-requirements` | Deselected detected harness becomes `--exclude-harness` |
| NFR-01 | `prd.md#non-functional-requirements` | Line-based, numbers or text, no color-only meaning |
| DEC-03, DEC-04, DEC-05 | `techspec.md#technical-decisions` | Validation reuse, order, answers to flags |
| CMP-05 | `techspec.md#components-and-flow` | Question modules |
| TC-06, TC-07 | `techspec.md#test-approach` | Combination and invalid-answer tests |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (100/30/3 limits, guard clauses), `javascript-typescript.md`, `cli-output.md` (messages in English), `tests.md`.
- Existing code: `src/core/services/snapshot-merge.ts` (`mergeSnapshot`, error text), `src/core/contracts/configuration.ts` (`SNAPSHOT_TRIGGER_ZONES`, `MAX_AGENT_COMMAND_LENGTH`), `src/core/contracts/auto-restart.ts`, `src/core/services/restart-install-extras.ts` (`harnessRestartMode`), `src/core/services/restart-mode.ts`, `src/infrastructure/harnesses/claude-code/statusline-default.ts` (`STATUSLINE_OPT_OUT_FILE`), `src/core/contracts/harness.ts` (`HARNESS_IDS`, `CapabilityProfile`), `src/core/services/init-detection` outputs via `HarnessDetection`.
- Contract or integration: `techspec.md` DEC-03..DEC-05 and the question list in DEC-04.
- Helpers from T02: `PromptPort`, `tests/helpers/scripted-prompts.ts`.

## Work

- [x] T03.1 `questions-harness.ts`: numbered list of all harness ids with detected marks and support levels; preselect current `activeHarnesses`, else detected project harnesses; emit `--harness` for selected and `--exclude-harness` for deselected detected ones; re-ask on unknown or out-of-range numbers.
- [x] T03.2 `questions-snapshot.ts`: command (blank for none), trigger (`YELLOW|RED`), resume command (only with a command); validate each through `mergeSnapshot`; emit the snapshot flags only when different from the current section.
- [x] T03.3 `questions-restart.ts`: asked only when a selected harness has a restart mode; show each selected harness with its mode and the handoff note when restart is on without a snapshot command; limit 1..10 only when restart is on; emit `--auto-restart`/`--no-auto-restart` and `--max-restarts`.
- [x] T03.4 `questions-misc.ts`: status line bridge (only with `claude-code` selected; "yes" emits `--statusline-bridge` only when the opt-out marker exists) and debug.
- [x] T03.5 A runner function that sequences the steps and returns `{ flags, facts } | null` on cancel; tests `tests/unit/assistant-questions.test.ts` (TC-06, TC-07).

## Acceptance criteria

- A scripted session sees exactly the questions that apply to its earlier answers, in the FR-02 order, with defaults in brackets and the facts listed in FR-03.
- Each invalid answer in TC-07 prints the failed rule on one line and asks the same question again; a later valid answer is accepted; no flag is produced from an invalid answer.
- Deselecting a detected harness yields `--exclude-harness <id>`; the restart questions are skipped when no selected harness has a restart mode.
- `null` from the port at any question makes the runner return `null` without partial output.
- No new validation rule is introduced; every check calls an existing merge function or constant.
- Every touched `src/` file is at or below 100 lines; no function above 30 lines.

## Verification

- Unit: scripted sessions over combinations; invalid answers; cancel at each question; flag emission rules.
- Integration: none in this task (T05 covers the full flow).
- End-to-end: not applicable here.
- Manual: none.
- Platforms: Linux, macOS, Windows (text only).
- Commands: `npm test -- tests/unit/assistant-questions.test.ts`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-02`..`FR-05`, `TC-06`, `TC-07`; lint, typecheck, coverage green.

## Affected files

- Modify: —
- Create: `src/cli/assistant/questions-harness.ts`, `questions-snapshot.ts`, `questions-restart.ts`, `questions-misc.ts`, a runner module (`assistant-questions.ts`), `tests/unit/assistant-questions.test.ts`

## Observability and recovery

- Operational signal: prompts and rule lines on stdout/stderr.
- Recovery: revert the commit; nothing else uses the modules until T05.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `runQuestions(context, prompts)` runs the assistant questions in the FR-02 order and returns `{ flags, facts }`, or `null` when the person cancels at any prompt. Harness list: numbered, with detected marks and support level, current active (else detected) preselected; deselected detected harnesses become `--exclude-harness`. Snapshot: command (Enter keeps, `none` clears), then trigger and resume only when a command is set. Restart: asked only when a selected harness has a restart mode, listing each selected harness with its mode and stating the carrier (snapshot command or markdown handoff); limit 1..10 only when restart is on. Bridge only with `claude-code` selected (default follows the opt-out marker); debug last. Every check calls an existing rule (`mergeSnapshot`, the restart-limit constants); an invalid answer re-asks with the rule as a prefix of the same question. A flag is emitted only when the answer differs from the starting state.
- Changed files: created `src/cli/assistant/types.ts`, `ask.ts`, `questions-harness.ts`, `questions-snapshot.ts`, `questions-restart.ts`, `questions-misc.ts`, `assistant-questions.ts` (all 24 to 68 lines), `tests/helpers/assistant-context.ts`, `tests/unit/assistant-questions.test.ts`, `assistant-questions-state.test.ts`, `assistant-questions-invalid.test.ts`. No existing file changed.
- Checks: `npm run lint`, `npm run typecheck` clean; 22 new tests pass; `npm run coverage`: 242 files, 1343 tests passed, 94.51%, wall time 183.2 s; quality sweep over the seven new `src/` files returned no hit and no file above 100 lines.
- Validated state: HEAD `b216aba` plus the uncommitted working tree; Windows 11, Node 24.19.
- Open items: (1) Input is trimmed before validation, so an answer with surrounding spaces is accepted (the command rules about whitespace cannot trigger from the prompt); this matches the flags only for values typed without surrounding spaces. (2) An existing resume command cannot be cleared on its own because `init` has no flag for that, so the resume prompt only keeps or replaces it (clearing needs `none` at the command question, which uses `--no-snapshot-command`). (3) Wall time 183.2 s is again about 3 s over the 180 s budget while only milliseconds came from new tests; same load-variance reading as T02; T06 re-measures with `npm run test:budget`.

### ADR candidates

None - direct TechSpec implementation or local decision.
