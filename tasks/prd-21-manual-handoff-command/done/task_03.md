# Stable execution context

Load in this exact order:

1. `tasks/prd-21-manual-handoff-command/prd.md`
2. `tasks/prd-21-manual-handoff-command/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — The /handoff command in the mod

## Outcome

The Claude Code mod registers `/handoff [focus]` at the end of its `session.start` hook and serves it with a `command.run` hook filtered by `{ command: 'handoff' }`. The command refuses or submits the core prompt as the TechSpec states, and the in-process scene proves FR-01..FR-12 and NFR-02, NFR-05.

## Dependencies and boundaries

- Depends on: T01, T02
- Unblocks: T04
- In scope: `mod-config.ts` (`ModConfig.snapshot`); `mod-info.ts` (command name); new `mod/handoff-command.ts` (`registerHandoffCommand`, `runHandoffCommand`); `register.ts` (registration last in the existing `session.start` hook; filtered `command.run` hook); scene driver keyed by event and command; new helper file `tests/fixtures/claude-mod-command.ts`; `observed-events.json` `documented` section and TC-16 assertion (DEC-11); `tests/integration/claude-mod-handoff-command.test.ts`.
- Out of scope: README and research text (T04); `package.json` version (DEC-09); any new reason code, notice, seed, or schema.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01..FR-03, FR-05, FR-06, FR-08..FR-12 | `prd.md#functional-requirements` | Command registration and behavior |
| FR-13 | `prd.md#functional-requirements` | Version invariant kept (DEC-09) |
| NFR-01, NFR-02, NFR-05, NFR-06 | `prd.md#non-functional-requirements` | API, privacy, failure policy, lines |
| DEC-03..DEC-06, DEC-08, DEC-09, DEC-11..DEC-13 | `techspec.md#technical-decisions` | Command decisions |
| CMP-07..CMP-10 | `techspec.md#components-and-flow` | Mod config, command, register, scene |
| TC-07..TC-16 | `techspec.md#test-approach` | Integration tests |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`.
- Existing code: `mod/register.ts`, `mod/hooks.ts` (`onSessionStart`, failure pattern), `mod/mod-config.ts`, `mod/mod-log.ts` (`recordDecision`), `mod/mod-guards.ts`, `mod/restart-facts.ts`, `mod/restart-flow.ts` (`reportSafely`), `core/services/restart-guards.ts` (`resetConsecutive`), `core/services/manual-handoff.ts` (T01), `tests/fixtures/claude-mod-scene.ts`, `tests/integration/claude-mod-handoff.test.ts` (handoff-mode scene pattern), `tests/integration/claude-mod-guards.test.ts`.
- Contract or integration: TechSpec "Contracts and data", "Integrations and interfaces" (validator rules: `$` only to top-level functions; one hook per event without a matcher).
- Harness reference: TechSpec sources (vendor "Add a command" page).

## Work

- [x] T03.1 Add `snapshot` to `ModConfig`.
- [x] T03.2 Create `handoff-command.ts`: registration with its own `try`/`catch` and `ui.log` line; the run handler in the DEC-05 order with `recordDecision` for stand-down codes, `resetConsecutive`, a submit that is not awaited with a rejection handler, and a guarded failure path.
- [x] T03.3 Wire `register.ts`: call the registration last inside the existing `session.start` hook; add the filtered `command.run` hook that answers without `next`.
- [x] T03.4 Key the scene driver by event and command; add `tests/fixtures/claude-mod-command.ts` (for example `runHandoff(scene, args)`).
- [x] T03.5 Add the `documented` section to `observed-events.json` and update TC-16.
- [x] T03.6 Write TC-07..TC-15 in `tests/integration/claude-mod-handoff-command.test.ts`.
- [x] T03.7 Build the bundle and run `claude plugin validate` on a temporary install when `claude` is present; record the result in the handoff.

## Acceptance criteria

- TC-07..TC-16 pass, with the exact spec, lines, and log codes of the TechSpec.
- A refused command leaves the guard store unchanged and submits nothing.
- The log file after a run with a focus holds no focus or prompt text.
- No change to `RESTART_REASON_CODES`, the restart-log schema, `schemas/`, `src/cli/assistant/`, or `package.json`.
- Every file stays at 100 lines or less; every function at 30 lines or less.

## Verification

- Unit: not applicable (T01 covers the core).
- Integration: TC-07..TC-16; all `claude-mod-*.test.ts` suites green.
- End-to-end: not applicable; QA-E2E-01 runs in QA.
- Manual: MA-01, MA-02, MA-03, MA-05 at HIL 3 (owner: the user).
- Platforms: Windows development machine.
- Commands: `npx vitest run tests/integration/claude-mod-handoff-command.test.ts tests/integration/claude-mod-bundle.test.ts tests/integration/claude-mod-restart.test.ts tests/integration/claude-mod-handoff.test.ts tests/integration/claude-mod-guards.test.ts tests/integration/claude-mod-gates.test.ts tests/integration/claude-mod-seed-switch.test.ts`; `npm run lint`; `npm run typecheck`; `npm run schemas:check`; `npm run build`.
- Environment dependency: `claude` CLI for `claude plugin validate` (present, 2.1.306); without it, record the gap.
- Expected evidence: passing suites with counts; `claude plugin validate` output.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/mod-config.ts`, `mod-info.ts`, `register.ts`; `tests/fixtures/claude-mod-scene.ts`, `tests/integration/claude-mod-bundle.test.ts`, `tests/fixtures/harnesses/claude-code/mod/observed-events.json`
- Create: `src/infrastructure/harnesses/claude-code/mod/handoff-command.ts`, `tests/fixtures/claude-mod-command.ts`, `tests/integration/claude-mod-handoff-command.test.ts`

## Observability and recovery

- Operational signal: stand-down codes and `ERROR_INTERNAL` in the per-session restart log; `RESTARTED` for a manual restart.
- Recovery: revert the files; `init` reinstalls the previous mod.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the mod registers `/handoff` (`name: handoff`, description `Save the session state and restart in a new session`, `argumentHint: [focus]`, no `immediate`) as the last step of the existing `session.start` hook; a refused registration prints `HANDOFF_UNAVAILABLE_LINE` with `ui.log` and does not throw. A `command.run` hook filtered by `{ command: HANDOFF_COMMAND_NAME }` answers `{ text }` without `next`: no `autoRestart` or a bad config → off line; a stand-down fact → `recordDecision(code)` and the existing notice as the answer (no `ui.log`); else `resetConsecutive`, a `$.prompt.submit` that is not awaited (rejection → `reportSafely(ERROR_INTERNAL)`), and the accepted line; any thrown error → `ERROR_INTERNAL` and the failure line. `args` is parsed with a `zod/mini` schema before `normalizeFocus`.
- Changed files: `src/infrastructure/harnesses/claude-code/mod/mod-config.ts` (`snapshot`), `mod-info.ts` (`HANDOFF_COMMAND_NAME`), `register.ts`; new `mod/handoff-command.ts`; `tests/fixtures/harnesses/claude-code/mod/observed-events.json` (`documented` section), `tests/integration/claude-mod-bundle.test.ts` (observed plus documented events); new `tests/fixtures/claude-mod-command.ts`, `tests/integration/claude-mod-handoff-command.test.ts` (9 tests: TC-07..TC-11), `tests/integration/claude-mod-handoff-restart.test.ts` (7 tests: TC-12..TC-15 and the rejected submit). The scene driver keying by event and command came with T02.
- Checks: `npx vitest run tests/integration/claude-mod tests/integration/mod-reading-git-status.test.ts tests/unit/manual-handoff.test.ts tests/unit/zone-guidance.test.ts`: 12 files, 86 tests passed. `npm run typecheck`: pass. `npx eslint` on the touched files: no issues. `npm run schemas:check`: exit 0. `npm run build`: exit 0. Built `init --harness claude-code --auto-restart --yes` in a temporary git repository, then `claude plugin validate .context-brake/claude-mod/context-brake-restart` (Claude Code 2.1.306): "Validation passed"; hooks listed `session.start, turn.start, tool.call, turn.complete, prompt.submit, command.run{command=?}`; calls include `$.command.register` and `$.clock.after`. Quality profile: no blocking hit, no reservation hit; largest touched file `claude-mod-handoff-restart.test.ts` 79 lines. No diff in `package.json`, `schemas/`, `src/cli/assistant/`, `auto-restart.ts`, or `restart-log.ts`.
- Validated state: working tree on base `c17fd0a` plus T01 and T02, Windows 11, Node 24.20.0, `dist/` rebuilt from this state.
- Open items: the validator prints `command=?` because the matcher uses the constant `HANDOFF_COMMAND_NAME`; at run time the object is `{ command: 'handoff' }` (MA-01 confirms live). The validator also reports "gating hook without .catch" for `command.run`, as it already does for `tool.call` and `prompt.submit`; the handler catches every error itself (NFR-05). The directory-profile notes (README, LICENSE, icon) are pre-existing and do not apply to a local mod. TC-12..TC-15 live in `claude-mod-handoff-restart.test.ts` so that each file stays below 100 lines; the TechSpec table names it. MA-01, MA-02, MA-03, MA-05 stay for the user.

### ADR candidates

None - direct TechSpec implementation or local decision.
