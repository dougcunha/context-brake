# Stable execution context

Load in this exact order:

1. `tasks/prd-10-statusline-powershell-e-modo-light/prd.md`
2. `tasks/prd-10-statusline-powershell-e-modo-light/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Shell-neutral status line bridge and session-start deadline

## Outcome

`init` writes the bridge as `node "<root>/.claude/hooks/context-brake-statusline.mjs"`. Run through sh, Git Bash, `pwsh`, or `powershell.exe`, it prints the user's previous status line unchanged, because it runs that command itself in the launching shell, or one fallback line when that command fails. The bridge records which shell ran it. `doctor` flags a PRD-09 pipeline as outdated and warns after a PowerShell run on Windows. `session_reset` hooks get 5,000 ms, and every `DEADLINE_EXCEEDED` record names its phase and elapsed milliseconds.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope: FR-01 to FR-05, FR-10, FR-11; the FR-12 part in `docs/research/harness-integrations.md` (status line shell, PowerShell executable gap, session-start timeouts per harness); DEC-01 to DEC-06 and DEC-11 to DEC-15.
- Out of scope: debug mode, the light default, and the bridge in light mode (T02); README and protocol text (T02); any change to the 1,500 ms deadline of other events.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-03, FR-04, FR-05 | `prd.md#functional-requirements` | Bridge command, previous command, fallback, migration, PowerShell warning |
| FR-10, FR-11 | `prd.md#functional-requirements` | Session-start deadline, phase record |
| NFR-01, NFR-02, NFR-03 | `prd.md#non-functional-requirements` | Platforms, latency, optional fields |
| DEC-01–DEC-06, DEC-11–DEC-15 | `techspec.md#technical-decisions` | Design of each piece |
| CMP-01–CMP-07, CMP-12 | `techspec.md#components-and-flow` | Components |
| TC-01–TC-08, TC-15–TC-17 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/` `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`; `sdd-jev` J3 (checkpoint `jev: active`).
- Existing code: `src/infrastructure/harnesses/claude-code/statusline-bridge.ts` (current pass-through and recording); `statusline-planner.ts:planStatuslineEntry`/`buildEntryPlan` (rebuilds the command from the state); `statusline-diagnostics.ts` (finding pattern); `src/infrastructure/process/process-tree.ts:killProcessTree`; `src/infrastructure/runtime/process-hook-host.ts:runProcessHook`/`dispatchHook`/`failureDecision`; `in-process-host.ts` line 29 (`runWithinDeadline`); `src/core/services/brake-engine.ts:handleSessionReset`; `src/infrastructure/runtime/boot-reader.ts:readBoot`/`inspectGit`.
- Tests to extend: `tests/e2e/e2e-statusline-shell.test.ts` and `tests/helpers/posix-shell.ts` (shell runner pattern and skip rules); `tests/integration/statusline-bridge.test.ts`, `statusline-install.test.ts`, `statusline-overhead.test.ts`, `boot-git-delivery.test.ts`; `tests/unit/process-hook-host.test.ts`, `statusline-diagnostics.test.ts`.
- Contract or integration: `techspec.md#contracts-and-data`, `techspec.md#integrations-and-interfaces`.
- Harness reference: `docs/research/harness-integrations.md`, Claude Code section (status line, execution); session-start timeouts in the Cursor and Oh-My-Pi sections.

## Work

- [x] T01.1 `statusline-shell.ts` (DEC-02), with unit tests (TC-03).
- [x] T01.2 `statusline-previous.ts` (DEC-03) and `statusline-output.ts` (DEC-04); the bridge runs the previous command and recording concurrently, keeps `--pipe` pass-through (DEC-05), and writes `shell` on the ledger line (DEC-06, CMP-07); integration tests (TC-04).
- [x] T01.3 `bridgeCommand(commandRoot)` single form (DEC-01), with the planner call site; migration and remove tests (TC-01, TC-05).
- [x] T01.4 `STATUSLINE_BRIDGE_OUTDATED` and `STATUSLINE_POWERSHELL_FALLBACK` in `statusline-diagnostics.ts` (TC-06, TC-07).
- [x] T01.5 End-to-end shell matrix and PowerShell runner helper (TC-02); latency (TC-08).
- [x] T01.6 `hook-deadline.ts`, `hook-failure.ts` extraction, and `session-reset-handler.ts` extraction (DEC-11, DEC-13); session-reset deadline in both hosts (TC-15).
- [x] T01.7 Phase tracking (`onPhase` in `RuntimeInput`, `readBoot(onPhase)`), optional `phase`/`elapsedMs` on `errorLineSchema`/`ErrorRecordInput`, recorded by `resolveFailure` (DEC-12; TC-16, TC-17).
- [x] T01.8 Re-check the Cursor and Oh-My-Pi session-start timeouts in the vendor docs and update `docs/research/harness-integrations.md`: status line shell selection, the PowerShell executable gap, and timeouts.
- [x] T01.9 Rebuild (`npm run build`) so `dist/assets/runtime/claude-code-statusline.mjs` and the hook bundle carry the change, then run the full validation.

## Acceptance criteria

- The installed command contains no `|`, `(`, `;`, `&`, or line break, and runs with the same output in every available shell (TC-01, TC-02).
- A failing, silent, slow, or missing previous command yields exactly one fallback line and exit 0 (TC-04).
- A PRD-09 install migrates on `init`, a second `init` is a no-op, and `remove` restores the previous status line (TC-05).
- `doctor` shows `STATUSLINE_BRIDGE_OUTDATED` before the migration, and `STATUSLINE_POWERSHELL_FALLBACK` only after a recorded PowerShell run on Windows (TC-06, TC-07).
- A 2 s boot succeeds, a 6 s boot records `DEADLINE_EXCEEDED` with `phase` and `elapsedMs`, and a 2 s `pre_tool` still exceeds (TC-15, TC-16).
- Error lines without the new fields stay valid (TC-17). The bridge's p95 overhead is ≤ 200 ms (TC-08).
- Every touched file stays at or under 100 lines, or the handoff records the exception. QA-01 to QA-09 are clean over the diff, except for the justified DEC-14 and DEC-15 spots and the baseline.

## Verification

- Unit: TC-01, TC-03, TC-06, TC-15, TC-17.
- Integration: TC-04, TC-05, TC-08, TC-16, with temporary directories, the Claude Code status line fixture, and a fake `GitInspector`.
- End-to-end: TC-02, TC-07, with the built CLI and bridge against temporary fixture repositories.
- Manual: after the task, the user removes `CLAUDE_CODE_GIT_BASH_PATH`, restarts Claude Code, and checks that the status line shows `ccstatusline` and that `doctor` warns; then restores the variable (`techspec.md#test-approach`).
- Platforms: Windows locally (Git Bash, `pwsh`, `powershell.exe`); Linux and macOS through CI (`sh`).
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none beyond this machine's shells.
- Expected evidence: green runs with test counts; the TC-08 p95 line printed by the overhead test.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/statusline-settings.ts`, `statusline-bridge.ts`, `statusline-planner.ts`, `statusline-diagnostics.ts`, `src/core/contracts/statusline-line.ts`, `src/core/contracts/session-ledger.ts`, `src/core/contracts/runtime.ts` (`onPhase` in the runtime input, if it lives there), `src/core/services/brake-engine.ts`, `failure-policy.ts`, `src/infrastructure/runtime/process-hook-host.ts`, `in-process-host.ts`, `boot-reader.ts`, `runtime-composition.ts`, `node-runtime-logs.ts`, `docs/research/harness-integrations.md`, and the tests listed above
- Create: `src/infrastructure/harnesses/claude-code/statusline-shell.ts`, `statusline-previous.ts`, `statusline-output.ts`, `src/infrastructure/runtime/hook-deadline.ts`, `hook-failure.ts`, `src/core/services/session-reset-handler.ts`, `tests/unit/statusline-shell.test.ts`, `tests/unit/in-process-host-deadline.test.ts`, `tests/unit/runtime-error-line.test.ts`

## Observability and recovery

- Operational signal: `shell` on ledger `statusline` lines; `phase`/`elapsedMs` in `errors.jsonl`; the two new `doctor` findings.
- Recovery: `--pipe` keeps PRD-09 commands working; `remove` restores the previous status line.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: T01 implemented (T01.1–T01.8) and validated; T01.9 (rebuild plus the full validation) closed on 2026-09-29.
- Changed files: `src/infrastructure/harnesses/claude-code/statusline-{settings,planner,bridge,diagnostics,context-window}.ts` plus the new `statusline-{shell,previous,output}.ts`; `src/infrastructure/process/node-process-runner.ts` (`spawnPipedProcess`); `src/infrastructure/runtime/{process-hook-host,in-process-host,boot-reader,runtime-composition}.ts` plus the new `hook-{deadline,failure}.ts`; `src/core/contracts/{hook-phase,statusline-line,session-ledger}.ts`; `src/core/services/{brake-engine,failure-policy}.ts` plus the new `session-reset-handler.ts`; `docs/research/harness-integrations.md`; tests `unit/{statusline-shell,statusline-diagnostics-shell,hook-deadline,process-hook-host-deadline,in-process-host-deadline,runtime-error-line,statusline-planner,statusline-diagnostics,boot-reader}.test.ts`, `integration/{statusline-bridge-previous,statusline-previous-overhead,statusline-install}.test.ts`, `e2e/{e2e-statusline-shell,e2e-statusline-bridge}.test.ts`, `helpers/posix-shell.ts`, `test-lanes.ts`.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck` clean. `npm run coverage` on 2026-09-29 at the final state: **306 of 306 test files green, 1915 tests, 590.46 s**; the failures of three earlier runs were diagnosed and closed in this session (see Open items). The end-to-end shell matrix passed through `git-bash`, `pwsh.exe`, and `powershell.exe`. QA-01 to QA-09 clean over the diff, except the recorded baseline response writer (`process-hook-host.ts:30`, DEC-15) and the documented DEC-14 spawn. No touched file above 100 lines. TC-08 p95: `direct p95=3271.8ms bridged p95=3172.2ms, delta p95=-99.6ms, median=1.7ms` (PowerShell; the bridge adds under 2 ms of systematic cost at the median).
- Validated state: Windows 11, Node 24, PowerShell 7 (`pwsh`) and Windows PowerShell resolved on this machine; Git Bash resolved in the e2e matrix. Base `1906d41`. jev point J3 not run: no `jev_verify`/`jev_noul` in the coordinator session (`DEC-JEV-01`).
- Open items:
  - Manual acceptance still with the user: remove `CLAUDE_CODE_GIT_BASH_PATH`, restart the harness, and check that the status line shows `ccstatusline` and that `doctor` shows `STATUSLINE_POWERSHELL_FALLBACK`; then restore the variable (`techspec.md#test-approach`). The automated matrix already covers the same behavior (TC-02, TC-07).
  - Pre-existing, load-dependent flake, not caused by T01: `tests/integration/boot-git-delivery.test.ts` fails under machine load because `NodeGitInspector` (`GIT_TIMEOUT_MS = 3000`) returns `inspection_failed`; it passes 5/5 in isolation and the same failure is recorded in `workflow.md#Diagnosis` item 4 from PRD-09. `tests/integration/runtime-overhead.test.ts` (untouched) has the same shape: p95 of 147.7 ms against a 330 ms ceiling in isolation, 795.8 ms under the coverage run.
- Deviations from the TechSpec, all inside the contract:
  1. `statusline-shell.ts` passes the command to PowerShell as `-EncodedCommand` (base64 UTF-16LE) instead of DEC-02's `-Command`, because `-Command` re-parses the text and the recorded command may carry quotes; the decoded script is the same string. Recorded in `docs/research/harness-integrations.md`.
  2. TC-15's in-process half was missing and was added in this session as `tests/unit/in-process-host-deadline.test.ts`: with one injected limit pair (`event: 1`, `sessionStart: 60_000`) the same work passes as a `session_reset` and fails as a `pre_tool` with `phase: engine` and an `elapsedMs`, which is what DEC-11 asks of `in-process-host.ts`.
  3. TC-16 is proven in `tests/unit/hook-deadline.test.ts` (phase `boot_git`) and `tests/unit/process-hook-host-deadline.test.ts` (phase `input`), not in `boot-git-delivery.test.ts`, which is a serial, load-sensitive file.
  4. TC-01 lives in `tests/unit/statusline-planner.test.ts` next to the other `bridgeCommand` cases instead of a new `statusline-settings-command.test.ts`.
  5. TC-08: the direct baseline now runs through a `node` + shell runner with the same process topology as the bridge, because the previous baseline (20 samples inside one long-lived test process) amortized the first `pwsh.exe` start, which every bridge run pays in full (measured: ~2.4 s cold, ~430 ms warm on this machine). The paired median is the systematic overhead; CI keeps the 200 ms limit for both the median and the p95, while this machine allows 400 ms and 1000 ms because the cold start jitters by hundreds of milliseconds under the coverage run.
  6. TC-04: the ledger-reading case derives the expected `exit <n>` from the resolved shell instead of hardcoding `2`, because PowerShell does not propagate the exit code of a native command.
  7. `statusline-bridge.ts:readInput` buffers the whole stdin and only parses up to 1 MiB, so the previous command always receives the raw payload; before, the buffer stopped at 1 MiB and the parse was skipped.
  8. Fixed `process-hook-host.ts:63`, where the stderr template literal had a raw newline instead of `\n` (escape damage from the earlier session).
  9. The `statusline-bridge-previous` timeout limit moved from 2000 ms to 8000 ms, above a cold PowerShell start and below the 20 s of the timing-out fixture.

### ADR candidates

- `None - direct TechSpec implementation or local decision`. DEC-02's PowerShell invocation detail (`-EncodedCommand`) and the TC-08 baseline shape are recorded above and in the research doc; neither changes an architecture boundary.
