# Stable execution context

Load in this exact order:

1. `tasks/prd-09-freio-com-janela-confiavel/prd.md`
2. `tasks/prd-09-freio-com-janela-confiavel/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Default Claude Code bridge and doctor brake report

## Outcome

In full mode with Claude Code detected, a plain `init` installs the status line bridge. `--no-statusline-bridge` removes it and remembers the opt-out, so later plain `init` runs leave it off, and `--statusline-bridge` turns it back on. `doctor` (text and `--json`) reports, for each active harness, whether the brake can deny and why, and warns when Claude Code has no bridge. The runner ends a session at `CRITICAL` only when the last reading has a trusted window. The README and the research doc describe the rule and each harness's window source.

## Dependencies and boundaries

- Depends on: T01 (origin enum, `window-trust.ts`)
- Unblocks: —
- In scope: CMP-06–CMP-09 (DEC-08–DEC-12).
- Out of scope: other runner limits; `.gitignore` handling for `.claude/settings.local.json`; light mode (the bridge stays opt-in there).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04, FR-07, FR-08 (README, research), FR-09 | `prd.md#functional-requirements` | Default bridge and opt-out; doctor report and warning; docs; runner gate |
| NFR-02 | `prd.md#non-functional-requirements` | Optional doctor schema field |
| DEC-08–DEC-12 | `techspec.md#technical-decisions` | Design of this slice |
| TC-09–TC-11, TC-13, TC-14, TC-16 | `techspec.md#test-approach` | Tests of this slice |

## Context to recover on demand

- Rules: `.agents/rules/code-standards.md`, `tests.md`, `harness-adapters.md`, `file-changes.md` (`.claude/settings.local.json`), `cli-output.md` (finding text and remediation).
- Code: `src/infrastructure/harnesses/claude-code/statusline-planner.ts:21-22,38-74,65,80`, `statusline-state.ts`, `statusline-diagnostics.ts:16-30`, `statusline-context-window.ts:14-37`, `src/cli/init-arguments.ts:49-57`, `src/cli/commands/init.ts:76`, `src/core/services/doctor-service.ts:99` (100 lines: DEC-11 extraction first if a new import is needed), `src/cli/output/doctor-mode-text.ts`, `src/core/contracts/diagnostics.ts`.
- Tests that assert the opt-in behavior: `tests/integration/statusline-install.test.ts:26,34-38,60-72`, `tests/unit/init-arguments.test.ts:9-19`, `tests/integration/symlinked-harness-config.test.ts:36`, `tests/unit/statusline-context-window.test.ts:28`, `tests/unit/doctor-context-window.test.ts:52-53`, `tests/unit/readme-config-example.test.ts:37-47`. Light-mode path lists (`tests/integration/init-light-mode.test.ts`, `tests/e2e/e2e-light-mode.test.ts`) must stay unchanged, since light mode keeps the opt-in.
- Harness reference: `docs/research/harness-integrations.md` Claude Code section (`:41-44`).
- Heads-up: with the default install, every full-mode `init` test on a `.claude/` fixture (`createClaudeProject`) will write `.claude/settings.local.json`, and the planner reads `~/.claude/settings.json` for the previous status line (on this machine, `ccstatusline`). New default-path tests must set `userHome` as `tests/helpers/statusline-world.ts` does; run the full suite right after T02.1 to find full-mode tests that assert exact file sets.

## Work

- [x] T02.1 Bridge default in the planner (full mode, claude-code detected target, no opt-out); explicit-flag errors unchanged; `STATUSLINE_UNSUPPORTED_PATH` becomes a warning in the default case.
- [x] T02.2 Opt-out record in the bridge state (`{ v: 1, optedOut: true }`), written by `--no-statusline-bridge` and replaced by `--statusline-bridge`; `remove` deletes it.
- [x] T02.3 Doctor `brakeWindow` (builder in `window-trust.ts`), `STATUSLINE_BRIDGE_ABSENT` warning, text line per harness; regenerate `schemas/doctor-report.schema.json`.
- [x] T02.4 README (default bridge, `window=`, `declaredContextWindow`, warning-only rule) and `docs/research/harness-integrations.md` (window source per harness, date of the check).
- [x] T02.5 Runner gate: `windowOrigin` on `LedgerReading` (`run-ports.ts`, `node-ledger-watcher.ts:9-13`); `isCriticalGraceOver` in `session-watch.ts` requires `isTrustedWindow`.
- [x] T02.6 Tests TC-09–TC-11, TC-13, TC-14, TC-16; update the opt-in tests listed above.

## Acceptance criteria

- TC-09: plain `init --yes` with Claude Code detected writes the bridge `statusLine` to `.claude/settings.local.json` and preserves the previous status line; a repeated `init` plans no change; `--no-statusline-bridge` restores the previous state and stores the opt-out; a later plain `init` does not reinstall; `--statusline-bridge` reinstalls; light mode and a project without Claude Code get no bridge and no error; an unsupported project path yields a warning and exit 0.
- TC-10 and TC-11: `brakeWindow` reasons and `canDeny` per harness; `STATUSLINE_BRIDGE_ABSENT` with remediation when Claude Code has no bridge; `doctor --json` passes `doctorReportSchema`.
- TC-16: past the grace, a `CRITICAL` reading with origin `config` or no origin does not end the run session with `critical_ceiling`; with `harness` it does.
- TC-13 and TC-14: `schemas:check` passes; the README test asserts the new statements.
- No touched file above 100 lines; lint, typecheck, `schemas:check`, `package:smoke`, and the full suite with coverage pass.

## Verification

- Unit: TC-10 (`tests/unit/window-trust.test.ts`), TC-16 (`tests/unit/session-watch-window-trust.test.ts`), TC-14 (`tests/unit/readme-config-example.test.ts`).
- Integration: TC-09 (`tests/integration/statusline-install.test.ts`, `statusline-default.test.ts`), TC-11 (`tests/integration/doctor-brake-window.test.ts`).
- End-to-end: the existing `tests/e2e/e2e-statusline-bridge.test.ts` and `e2e-statusline-shell.test.ts` keep passing with the explicit flag.
- Manual: optional TokenHound check from `techspec.md#test-approach` (owner: user).
- Platforms: Windows locally; Linux and macOS through CI.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run schemas:check`, `npm run coverage`, `npm run package:smoke`.
- Environment dependency: none.
- Expected evidence: test names citing `TC-NN`, full command outputs, and the quality profile output over the diff.

## Affected files

- Create: `tests/integration/statusline-default.test.ts`, `tests/integration/doctor-brake-window.test.ts`; possibly a module extracted from `doctor-service.ts` (DEC-11).
- Modify: `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, `statusline-state.ts`, `statusline-diagnostics.ts`, `src/cli/init-arguments.ts`, `src/cli/commands/init.ts`, `src/core/services/window-trust.ts`, `src/core/contracts/diagnostics.ts`, `src/core/services/doctor-service.ts`, `src/cli/output/doctor-mode-text.ts`, `schemas/doctor-report.schema.json`, `src/core/contracts/run-ports.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/core/services/session-watch.ts`, `README.md`, `docs/research/harness-integrations.md`, and the existing tests listed above.

## Observability and recovery

- Operational signal: `doctor` `brakeWindow` lines and `STATUSLINE_BRIDGE_ABSENT`; the `init` plan names the bridge change.
- Recovery: `init --no-statusline-bridge`, `remove`, or revert the task diff.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: in full mode, a plain `init` passes `StatuslineBridgeRequest` `'default'` (new value in `src/core/contracts/adapter.ts`; `init.ts` sends it when no flag is given and light mode is off), and `statusline-planner.ts#requestedEntry` installs the bridge unless the opt-out marker exists; an unsupported project path becomes the warning `STATUSLINE_UNSUPPORTED_PATH` instead of a conflict (`statusline-default.ts#softenDefaultConflict`). `--no-statusline-bridge` restores the previous status line and writes `.context-brake/runtime/claude-statusline-opt-out.json` (`planStatuslineOptOut`); `--statusline-bridge` and `remove` delete it (`clearStatuslineOptOut`); the marker path joined `src/cli/snapshot-helper.ts`. The explicit-flag errors (`STATUSLINE_TARGET_ERROR`, `assertStatuslineBridgeTarget`) are unchanged. Doctor: `brakeWindow` per active harness (`brake-window-report.ts`: `bridge`/`bridge_absent` for Claude Code, `harness` for `context_usage` `supported`, `declared` or `no_source` for `unsupported`), omitted in light mode; warning `STATUSLINE_BRIDGE_ABSENT` when Claude Code has no bridge; one text line `  - brake: <harness> can block|only warns (<reason>)`; `doctor-report-extras.ts` builds the optional report fields (absorbed extraction, DEC-11). Runner: `LedgerReading.windowOrigin` filled by `readingFromLedger`; `session-watch.ts#isCriticalGraceOver` starts the grace only with a trusted window. README (window origin rule, default bridge, opt-out, declared window, runner and subagent limits, debug line) and `docs/research/harness-integrations.md` (new section "Fonte da janela e freio (PRD-09)").
- Changed files: production `src/core/contracts/{adapter,diagnostics,run-ports}.ts`, `src/core/services/{doctor-service,report-service,session-watch}.ts`, new `src/core/services/{brake-window-report,doctor-report-extras}.ts`, `src/infrastructure/harnesses/claude-code/statusline-planner.ts`, new `statusline-default.ts`, `src/infrastructure/runner/node-ledger-watcher.ts`, `src/cli/commands/init.ts`, `src/cli/snapshot-helper.ts`, `src/cli/output/doctor-mode-text.ts`; `schemas/doctor-report.schema.json`; `README.md`, `docs/research/harness-integrations.md`. Tests: new `tests/unit/statusline-default.test.ts` (TC-09 unsupported path), `brake-window-report.test.ts` (TC-10 and the text line), `session-watch-window-trust.test.ts` (TC-16), `tests/integration/statusline-default.test.ts` (TC-09), `doctor-brake-window.test.ts` (TC-11); updated `statusline-install.test.ts` (the opt-in case now asserts the default), `readme-config-example.test.ts` (TC-14), `tests/helpers/run-world.ts` and `run-fakes.ts` (`windowOrigin` in the fake reading, default `harness`), and `tests/e2e/e2e-run-autonomy.test.ts`: Claude Code runs (headless `claude -p`, no bridge record) now run without the ceiling session and expect no `critical_ceiling` cut, while Codex runs declare the window and keep the restart across the ceiling (FR-09).
- Checks (Windows 11, Node 24, base `e0a9604` plus the T01 and T02 diff): `npm run build` exit 0; `npm run typecheck` exit 0; `npx eslint .` no errors; `npm run schemas:check` exit 0; `npm run package:smoke` exit 0; final `npm run coverage` exit 0: 298 files, 1,871 passed, 3 skipped, 95.65% lines, 91.54% branches. The previous full run had one failure (`e2e-run-autonomy`, the expected FR-09 change), fixed as above and rerun alone before the final run.
- Quality profile over the 24 TypeScript files T02 touched: no blocking hit; QA-06 `throw new Error(` at `tests/unit/readme-config-example.test.ts:9,22` is pre-existing; QA-07 `session-watch.ts:36` is the baseline hit; no file above 100 lines (`doctor-service.ts` and `report-service.ts` stay at 100).
- Validated state: working tree at `e0a9604` plus the feature diff; Windows only; Linux and macOS through CI.
- J3 (jev shadow): `operational-failure`; the literal T02 diff is about 56,000 characters, above the 50,000 per-call limit, and would have to be reproduced literally inside the calls. Not sent; excluded from gate counts.
- Open items: none. Product consequence recorded in the README: with Claude Code, `context-brake run` no longer ends a session at `CRITICAL` (no status line in `claude -p`); it still restarts when the agent ends a reply with `[REQUEST_SESSION_RESET]`.

### ADR candidates

T02-ADR-01 — Brake requires a trusted context window. Context: the TokenHound incident (deny at a fallback 128000 window over a 1,000,000 window). Decision: deny only with a harness-reported or declared window; the Claude Code status line bridge is installed by default. Alternatives: model-name window table; raising the default ceiling. Consequences: Codex, Cursor, Copilot, Antigravity, and OpenCode only warn unless a window is declared; headless Claude Code and subagents only warn. Evidence: `techspec.md` DEC-01–DEC-12. Relationship: promotes DEC-03 and DEC-08 if accepted.
