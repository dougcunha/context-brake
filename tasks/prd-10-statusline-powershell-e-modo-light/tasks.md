# Implementation plan — Status line under PowerShell, debug in light mode, and light mode as the default

## Stable sources

- PRD: `tasks/prd-10-statusline-powershell-e-modo-light/prd.md`
- TechSpec: `tasks/prd-10-statusline-powershell-e-modo-light/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | The bridge command works in sh, Git Bash, and PowerShell; the bridge runs the previous status line itself, falls back to one line, and records the shell; `doctor` flags the old pipeline and the PowerShell fallback; `session_reset` gets 5 s and deadline errors name their phase | — | T02 |
| T02 | Debug mode through the telemetry block in both modes; plain `init` defaults to light mode unless `fullMode` is recorded; light mode installs the bridge; README and protocol updated | T01 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Shell-neutral bridge command | T01 | TC-01, TC-02 |
| FR-02 | `prd.md#functional-requirements` | Bridge runs the previous command in the launching shell, output unchanged | T01 | TC-02, TC-03 |
| FR-03 | `prd.md#functional-requirements` | One-line fallback, exit 0 | T01 | TC-04 |
| FR-04 | `prd.md#functional-requirements` | PRD-09 pipeline migrates on `init`; `remove` restores; outdated finding | T01 | TC-05, TC-06 |
| FR-05 | `prd.md#functional-requirements` | `doctor` warns after a PowerShell run on Windows | T01 | TC-06, TC-07 |
| FR-06 | `prd.md#functional-requirements` | Debug through the block, both modes; PRD-08 line removed | T02 | TC-09, TC-10, TC-14 |
| FR-07 | `prd.md#functional-requirements` | Plain `init` switches to light mode without a recorded choice; notices | T02 | TC-11, TC-14 |
| FR-08 | `prd.md#functional-requirements` | `--no-light` recorded as `fullMode`; `--light` replaces it | T02 | TC-12 |
| FR-09 | `prd.md#functional-requirements` | Bridge by default in light mode, opt-out kept, no blocking | T02 | TC-13, TC-14 |
| FR-10 | `prd.md#functional-requirements` | 5,000 ms deadline for session start only | T01 | TC-15 |
| FR-11 | `prd.md#functional-requirements` | `phase` and `elapsedMs` on deadline errors; old lines valid | T01 | TC-16, TC-17 |
| FR-12 | `prd.md#functional-requirements` | README, protocol, research doc | T01 (research doc: shell, timeouts), T02 (README, protocol) | TC-18 |
| NFR-01 | `prd.md#non-functional-requirements` | Linux, macOS, Windows (PowerShell 5.1, 7, Git Bash) | T01, T02 | TC-02 on Windows; CI |
| NFR-02 | `prd.md#non-functional-requirements` | Bridge adds ≤ 200 ms p95 | T01 | TC-08 |
| NFR-03 | `prd.md#non-functional-requirements` | `schemaVersion: 1`, optional fields only; hook budgets; debug ≤ 40 tokens | T01, T02 | TC-09, TC-12, TC-17; existing overhead tests |
| DEC-PD-01–DEC-PD-06 | `workflow.md#human-decisions-log` | Product decisions | T01 (PD-01, PD-04), T02 (PD-02, PD-03, PD-05, PD-06) | as mapped above |
| DEC-01–DEC-06, DEC-11–DEC-15 | `techspec.md#technical-decisions` | Bridge, shell, fallback, migration, shell record, deadline, phases, extractions, justified exceptions | T01 | TC-01–TC-08, TC-15–TC-17 |
| DEC-07–DEC-10, DEC-13 | `techspec.md#technical-decisions` | Debug channel, `fullMode`, light-default notices, bridge in light mode | T02 | TC-09–TC-14 |
| QA-01–QA-09 | `techspec.md#quality-profile` | Quality profile over each task diff | T01, T02 | profile commands |

## Tasks

- [T01 — Shell-neutral status line bridge and session-start deadline](done/task_01.md): the bridge works whichever shell Claude Code uses, falls back to one line, `doctor` explains shell and migration, and slow boots get 5 s with the failing phase recorded.
- [T02 — Debug in both modes and light mode as the default](done/task_02.md): debug moves into the telemetry block, plain `init` goes light unless `fullMode` is recorded, light mode installs the bridge, and the docs follow.

## Coverage gate

- Coverage: pass. FR-01 to FR-12 and NFR-01 to NFR-03 each map to a task and a TC.
- Traceability: pass. Every DEC and TC of the TechSpec maps to exactly one task.
- Dependencies: pass. T02 depends on T01 because FR-09 installs the T01 command and the README describes it. There is no cycle.
- Atomicity: pass, with a note. Both tasks are large (four outcomes in two tasks, `DEC-STOPS-01`), but each is one vertical slice with its tests. T01 has two independent parts (bridge and deadline), so its handoff records partial state if the session reaches the threshold.
- Executability: pass. `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, and `npm run schemas:check` exist in `AGENTS.md`.
- Validation profile: pass. The end-to-end scope is the built CLI and bridge against temporary fixture repositories (TC-02, TC-07, TC-14). PowerShell cases run on this Windows machine and skip elsewhere; sh cases run in CI.
- Idempotency: pass. TC-05 and TC-12 check a repeated `init`.

## Assumptions and open items

- Assumption: full-only options without `--no-light` stay rejected while light mode is in effect (`prd.md#assumptions-and-sources`).
- Assumption: the status line uses the documented PowerShell tool detection (`pwsh.exe`, then `powershell.exe`) (`techspec.md#risks-and-open-items`).
- Open item: closed by T01. The Cursor and Oh-My-Pi session-start timeouts are undocumented, so nothing was found below 5 s; `docs/research/harness-integrations.md` records both gaps, and the PRD assumption stands.
- Required environment: Windows with Git Bash, `pwsh`, and `powershell.exe` for TC-02 (available on this machine), plus CI for Linux and macOS. Manual acceptance after T01 by the user: status line with `CLAUDE_CODE_GIT_BASH_PATH` removed and then restored (`techspec.md#test-approach`); the automated matrix already covers the same behavior and the manual run is still with the user.

## State

- [x] T01 — completed (done/task_01.md)
- [x] T02 — completed (done/task_02.md)
- [x] Review cycle — codereview_1 REJECTED, one correction round, codereview_2 APPROVED WITH RESERVATIONS
- [x] QA — qa_1 APPROVED, no BUG-NN, no blocks
- [x] Acceptance — HIL 3 accepted 2026-09-29 (DEC-HIL-03); the diff stays uncommitted in the worktree

## Problems and solutions

- Timing tests on this machine are load-sensitive. The first `pwsh.exe` started from a fresh Node process costs about 2.4 s here (about 430 ms warm), and it jitters by hundreds of milliseconds under `npm run coverage`. Any test that compares a long-lived process against a fresh one must give both sides the same process topology (`done/task_01.md#Handoff`, TC-08), and a timeout injected into a test must sit above a cold shell start.
- `boot-git-delivery.test.ts` and `runtime-overhead.test.ts` are pre-existing flakes under load (`NodeGitInspector` returns `inspection_failed` past `GIT_TIMEOUT_MS = 3000`). Both pass in isolation and in a full run; do not treat a failure there as a regression without rerunning it alone.
