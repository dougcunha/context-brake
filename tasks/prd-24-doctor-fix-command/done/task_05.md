# Stable execution context

Load in this exact order:

1. `tasks/prd-24-doctor-fix-command/prd.md`
2. `tasks/prd-24-doctor-fix-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Fix command on a TTY

## Outcome

On a terminal without `--yes`, `--dry-run`, or `--json`, `context-brake fix` asks one question per `decision` finding, then shows the plan and the manual findings, then asks `Apply the plan? [y/N]`. No file changes before the answer; a `no` prints `Nothing was written.`.

## Dependencies and boundaries

- Depends on: T04
- Unblocks: T06
- In scope: CMP-14 (prompt resolution), the interactive branch of CMP-15, the question and confirmation text of CMP-16.
- Out of scope: flag behavior (T04).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04, FR-05 | `prd.md#functional-requirements` | Plan before confirmation; one question per decision |
| NFR-02, NFR-03 | `prd.md#non-functional-requirements` | Consent; no prompt without a TTY |
| DEC-09, DEC-10, DEC-13 | `techspec.md#technical-decisions` | Interactive condition, sequence, prompts |

## Context to recover on demand

- Applicable rules: `cli-output.md`, `tests.md`, `code-standards.md`
- Existing code: `src/cli/assistant/prompt-port.ts`, `src/cli/assistant/ui-prompt.ts`, `src/cli/assistant/prompt-factory.ts`, `src/cli/commands/init.ts:10-23` (port lifecycle), `src/cli/init-flow.ts:43-48` (`confirmApply`), `src/cli/terminal.ts`, `tests/helpers/scripted-prompts.ts`, `tests/helpers/assistant-world.ts:10` (TTY terminal)
- Contract: `techspec.md#technical-decisions` DEC-13

## Work

- [ ] T05.1 Prompt resolution in `src/cli/fix-decisions.ts` (confirm, select with text fallback, `null` as skip, unknown harness).
- [ ] T05.2 Interactive branch in `src/cli/commands/fix.ts`: port from `env.prompts` or `createPromptPort()`, closed at the end; decisions, plan, manual list, confirmation.

## Acceptance criteria

- With `ScriptedPrompts(['n'])` on the confirmation, file hashes are unchanged and the exit code is the first diagnosis code.
- `ASSET_MODIFIED` `y` replaces and `n` keeps; `STATUSLINE_BRIDGE_INACTIVE` `r` reinstalls, `f` forgets, `s` keeps the status line; `NO_PROJECT_HARNESS` `claude-code` installs and an empty answer skips.
- A run with the terminal but with `--yes` asks nothing (`prompts.asked` empty).

## Verification

- Unit: none beyond T04.
- Integration: TC-11, TC-12 (`tests/integration/fix-interactive.test.ts`) through `runInProcessCliWith` with a TTY `terminal` and `ScriptedPrompts`.
- End-to-end: not applicable.
- Manual: the TechSpec manual acceptance script runs in CLI QA.
- Platforms: Windows local.
- Commands: touched suites by path; `npm run typecheck`; `npm run lint`.
- Environment dependency: none.
- Expected evidence: passing suites; recorded questions in `prompts.asked`.

## Affected files

- Modify: `src/cli/fix-decisions.ts`, `src/cli/commands/fix.ts`, `src/cli/output/fix-text.ts`
- Create: `tests/integration/fix-interactive.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: an interactive run (stdin and stdout TTY, no `--yes`, `--dry-run`, `--json`) prints the summary line, asks each decision through `PromptPort` (`decideByPrompts` in `src/cli/fix-prompts.ts`: confirm for `ASSET_MODIFIED`, select or `r`/`f`/`s` text for `STATUSLINE_BRIDGE_INACTIVE`, select or typed id for `NO_PROJECT_HARNESS`, `--harness` pre-answers it, `null` = skip), prints the `Plan`, `Conflicts`, `Manual` cards, asks `Apply the plan? [y/N]` only when the plan has changes, prints `Nothing was written.` on no (exit = first diagnosis), else applies and prints the `Result` card and the final doctor line. The port is closed at the end like `init`.
- Changed files: created `src/cli/fix-prompts.ts`, `src/cli/fix-steps.ts` (shared run steps moved out of `commands/fix.ts` so both flows use them without an import cycle), `src/cli/commands/fix-interactive.ts`, `tests/integration/fix-interactive.test.ts`; modified `src/cli/commands/fix.ts`, `src/cli/output/fix-text.ts` (`formatFixSummary`, `formatFixPreview`, `formatFixResult`; `formatFixReport` reuses them). `src/cli/fix-decisions.ts` unchanged.
- Checks: TC-11 and TC-12 (9 tests) pass; all fix suites (`fix-interactive`, `fix-command`, `fix-stops`, `fix-text`, `fix-outcomes`, `fix-arguments`): 42 tests pass; `npm run typecheck`, `npm run lint` pass. Quality profile over the task files: no hit.
- Validated state: worktree on Windows 11, Node 24.20.0, 2026-10-21.
- Open items: (1) after the user answers `forget`, the next doctor run reports `STATUSLINE_BRIDGE_ABSENT` with group `automatic`, and `fix` cannot clear it because it keeps the opt-out (the PRD assumption on `STATUSLINE_BRIDGE_ABSENT`; verified in a probe on 2026-10-21). The doctor text then counts it as fixable. Changing the group needs a PRD decision. (2) The `askUi` select path (clack port) has no automated test; `ScriptedPrompts` has no `askUi`, so the tests drive the text path (DEC-13). The manual acceptance script in CLI QA covers a real terminal.

### ADR candidates

None - direct TechSpec implementation (DEC-09, DEC-10, DEC-13).
