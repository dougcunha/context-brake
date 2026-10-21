# Stable execution context

Load in this exact order:

1. `tasks/prd-21-manual-handoff-command/qa_02/qa.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T06 — /handoff submits its prompt after the command hook returns

## Outcome

`/handoff` schedules the prompt submit with `$.clock.after(HANDOFF_SUBMIT_DELAY_MS)`, so `$.prompt.submit` runs from a timer after the `command.run` hook returned, and the host accepts it. The in-process host fake models the host check: a `$.prompt.submit` called while a `command.run` hook runs rejects with the host's text.

## Dependencies and boundaries

- Depends on: T03, T05 (done)
- Unblocks: re-review, QA, live retest MA-01..MA-05
- In scope: `mod/handoff-command.ts` (deferred submit), `mod/mod-info.ts` (`HANDOFF_SUBMIT_DELAY_MS` = 100); TechSpec DEC-06 text; scene driver flag while a `command.run` hook runs; fake `prompt.submit` that rejects under that flag; fake `clock.after` as a macrotask (`setImmediate`); tests; research entry line about the host check.
- Out of scope: the seed path (it already submits after `/clear` resolves, outside any hook); new reason codes.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| qa_02/BUG-01 | `qa.md#findings` | `prompt.submit` from a `command.run` hook is refused by the host |
| FR-03, FR-08, OBJ-01, DEC-06 | `prd.md`, `techspec.md` | The command submits one prompt that starts the agent's turn |

## Requirements

- The prompt is submitted once, from a timer, after the command answered its line; the text and focus rules stay the same.
- A rejected or failed submit still records `ERROR_INTERNAL` with its notice; a throwing `$.clock.after` gives the failure line (outer catch).
- The fake rejects a submit made during a `command.run` hook with the host text, so a regression to a direct submit fails the tests.

## Context to recover on demand

- TechSpec: DEC-05, DEC-06, "Integrations and interfaces".
- Rules and skills: `ts-tests`; `.agents/rules/code-standards.md`, `harness-adapters.md`.
- Code: `mod/handoff-command.ts` (`submitPrompt`, `startHandoff`), `tests/fixtures/claude-mod-scene.ts` (`driver`), `tests/fixtures/claude-mod-host-ports.ts` (`actionPorts`, `clockPort`).

## Work

- [x] T06.1 Defer the submit through `$.clock.after(HANDOFF_SUBMIT_DELAY_MS, …)`.
- [x] T06.2 Model the host check in the fakes and make fake timers macrotasks.
- [x] T06.3 Add a test that the submit happens from the timer and not inside the hook; keep every `claude-mod-*` suite green.
- [x] T06.4 Update TechSpec DEC-06 and the research entry with the host check text.
- [x] T06.5 Rebuild and rerun the `claude plugin test` probe on the new installed bundle.

## Acceptance criteria

- With the fake host check on, `/handoff` gives one `prompt.submit` with the exact prompt and no `ERROR_INTERNAL`.
- The kit probe on the rebuilt bundle shows the prompt reaching `prompt.submit`.
- Lint, typecheck, and coverage pass.

## Verification

- Integration: `tests/integration/claude-mod-handoff-command.test.ts`, `claude-mod-handoff-restart.test.ts`, all `tests/integration/claude-mod-*` suites.
- End-to-end: `claude plugin test` probe on a scratch copy of the installed mod (Claude Code 2.1.306).
- Manual: MA-01..MA-05 retest by the user.
- Platforms: Windows development machine.
- Environment dependency: `claude` CLI for the probe.
- Commands: `npx vitest run tests/integration/claude-mod`; `npm run lint`; `npm run typecheck`; `npm run coverage`; `npm run build`.
- Expected evidence: passing suites; probe output.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/mod/handoff-command.ts`, `mod-info.ts`; `tests/fixtures/claude-mod-scene.ts`, `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/claude-mod-host-ports.ts`; tests; `tasks/prd-21-manual-handoff-command/techspec.md`; `docs/research/harness-integrations.md`

## Observability and recovery

- Operational signal: `ERROR_INTERNAL` only when the deferred submit fails.
- Recovery: revert the files.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `startHandoff` resets the counter and calls `submitAfterCommand`, which schedules `submitPrompt` with `$.clock.after(HANDOFF_SUBMIT_DELAY_MS = 100)`; the `command.run` hook returns its line first, and the timer submits the prompt outside the hook (rejection → `ERROR_INTERNAL` with its notice, as before). The host fake now models the host check: the scene sets `isCommandHookRunning` while a `command.run` hook runs, and the fake `prompt.submit` rejects with the host text then; fake timers run as macrotasks (`setImmediate`).
- Changed files: `src/infrastructure/harnesses/claude-code/mod/handoff-command.ts`, `mod-info.ts`; `tests/fixtures/claude-mod-scene.ts` (99 lines), `tests/fixtures/claude-mod-host.ts`, `tests/fixtures/claude-mod-host-ports.ts` (`HOST_CHECK_TEXT`); `tests/integration/claude-mod-handoff-command.test.ts` (new BUG-01 test); `tasks/prd-21-manual-handoff-command/techspec.md` (DEC-06); `docs/research/harness-integrations.md` (PRD-21 entry).
- Checks: mutation check: with the direct submit back, TC-09 and the BUG-01 test fail; with the fix, they pass. `npx vitest run tests/integration/claude-mod tests/integration/mod-reading-git-status.test.ts`: 10 files, 57 tests passed. `claude plugin test` probe (Claude Code 2.1.306) on a scratch copy of the rebuilt bundle: the accepted line, one `prompt.submit` with the exact prompt, no `ui.log` line, 1 pass. `claude plugin validate` on the same copy: "Validation passed". `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`: exit 0. `npm run coverage`: 292 files, 1578 passed, 1 skipped, 96.38%, exit 0.
- Validated state: working tree on base `c17fd0a` plus T01..T06, Windows 11, Node 24.20.0, `dist/` rebuilt. The installed mod in this repository (`.context-brake/claude-mod/`) is not updated by this task; the user's retest needs `init` again.
- Open items: MA-01..MA-05 retest by the user with the rebuilt package. The probe test lives only in the scratchpad (a `claude plugin test` file needs the `claude` binary, which the in-process suite does not use).
