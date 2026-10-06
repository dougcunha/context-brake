# Implementation plan — Automatic restart in interactive Claude Code

## Stable sources

- PRD: `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
- TechSpec: `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Spike in a real Claude Code session: mods API facts captured as fixtures and the research file updated; loader and seed decisions confirmed or amended | — | T03, T04 |
| T02 | Absorbed extraction in `planner.ts`, `detection-collector.ts` and `init.ts` with no behavior change (`DEC-12`) | — | T05 |
| T03 | Core restart policy, notices, contracts and `autoRestart` config block with regenerated schema | T01 | T04, T05 |
| T04 | Bundled Claude Code mod: hook wiring, store, log, fake host, bundler entry | T01, T03 | T05 |
| T05 | `init --auto-restart` / `--no-auto-restart`, planner for mod files and loader entry, `remove`, idempotency | T02, T03, T04 | T06 |
| T06 | `doctor` findings for automatic restart and end-to-end CLI flow | T05 | T07 |
| T07 | Documentation (FR-11) and the manual acceptance script MA-01 | T06 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| OBJ-01 | `prd.md#outcomes-and-metrics` | Restart with no keystroke | T04, T07 | TC-09, TC-10, TC-27 |
| OBJ-02 | `prd.md#outcomes-and-metrics` | No discard, no loop | T03, T04 | TC-01 to TC-06, TC-12 |
| OBJ-03 | `prd.md#outcomes-and-metrics` | Safe install, doctor, remove | T05, T06 | TC-17 to TC-25 |
| OBJ-04 | `prd.md#outcomes-and-metrics` | Zero cost when off | T05 | TC-18 |
| FR-01 | `prd.md#functional-requirements` | `/clear` on the signal | T03, T04 | TC-01, TC-02, TC-09 |
| FR-02 | `prd.md#functional-requirements` | One seed, only for the mod's clear, per mode | T03, T04 | TC-10, TC-11, TC-28 |
| FR-03 | `prd.md#functional-requirements` | Checkpoint gate in full mode; signal-only in light | T03, T04 | TC-03, TC-12, TC-28 |
| FR-04 | `prd.md#functional-requirements` | Loop guard | T03, T04 | TC-04 |
| FR-05 | `prd.md#functional-requirements` | No-progress guard | T03, T04 | TC-05 |
| FR-06 | `prd.md#functional-requirements` | Stand-down conditions | T03, T04 | TC-06 |
| FR-07 | `prd.md#functional-requirements` | Opt-in install through `init` | T05 | TC-08, TC-17, TC-18, TC-20, TC-21, TC-25 |
| FR-08 | `prd.md#functional-requirements` | `doctor` states | T06 | TC-22, TC-23 |
| FR-09 | `prd.md#functional-requirements` | `remove` restores | T05 | TC-19, TC-25 |
| FR-10 | `prd.md#functional-requirements` | Log and notice without content | T03, T04 | TC-07, TC-14 |
| FR-11 | `prd.md#functional-requirements` | Docs and research | T01, T07 | TC-26 |
| NFR-01 | `prd.md#non-functional-requirements` | Platform | T04, T05, T06 | TC-15, TC-17, TC-20 |
| NFR-02 | `prd.md#non-functional-requirements` | Privacy | T03, T04 | TC-07, TC-14 |
| NFR-03 | `prd.md#non-functional-requirements` | Compatibility | T03, T05 | TC-08, TC-24 |
| NFR-04 | `prd.md#non-functional-requirements` | Failure never blocks | T04 | TC-13 |
| NFR-05 | `prd.md#non-functional-requirements` | Footprint when off | T05 | TC-18 |
| DEC-01 to DEC-04 | `techspec.md#technical-decisions` | Trigger, queued clear, seed | T01, T03, T04 | TC-09, TC-10 |
| DEC-05, DEC-14 | `techspec.md#technical-decisions` | Gate per mode | T03, T04 | TC-03, TC-12, TC-28 |
| DEC-06, DEC-07 | `techspec.md#technical-decisions` | Guards and stand-down | T03, T04 | TC-04 to TC-06 |
| DEC-08 | `techspec.md#technical-decisions` | Loader and layout | T01, T05 | TC-17, TC-20 |
| DEC-09 | `techspec.md#technical-decisions` | Config block | T03 | TC-08, TC-24 |
| DEC-10 | `techspec.md#technical-decisions` | Log and heartbeat | T04, T06 | TC-14, TC-22 |
| DEC-11 | `techspec.md#technical-decisions` | Failure containment | T04 | TC-13, TC-15 |
| DEC-12 | `techspec.md#technical-decisions` | Absorbed extraction | T02 | existing suites unchanged |
| DEC-13 | `techspec.md#technical-decisions` | Fixtures from a real session | T01, T04 | TC-16 |
| QA-01 to QA-11 | `techspec.md#quality-profile` | Quality profile | T02 to T07 | profile commands per task |
| TC-27 | `techspec.md#test-approach` | MA-01 manual acceptance | T07 | manual |

## Tasks

- [T01 — Capture the mods API behavior in a real session](done/task_01.md): fixtures, research update, and confirmed or amended loader and seed decisions.
- [T02 — Make room in planner, context builder and init](done/task_02.md): behavior-preserving extraction so later edits stay under the size limits.
- [T03 — Restart policy, notices and config contract](done/task_03.md): pure core decisions, reason codes, seed text and the `autoRestart` config block.
- [T04 — Bundled Claude Code mod](done/task_04.md): the hooks module that clears and seeds, with guards, store, log and a fake host.
- [T05 — Install, switch off and remove through init](done/task_05.md): flags, config update, mod files, loader entry, idempotent plan, `remove`.
- [T06 — Doctor and end-to-end flow](done/task_06.md): findings, JSON schema and the built-CLI scenario.
- [T07 — Documentation and manual acceptance](done/task_07.md): README, protocol doc, research section and MA-01.

## Coverage gate

- Coverage: pass. Every PRD FR, NFR and OBJ, every TechSpec DEC and TC (TC-01 to TC-28) maps to a task; QA rules are checked per task.
- Traceability: pass. IDs preserved from the sources.
- Dependencies: pass. Acyclic (T01, T02 roots); no two tasks edit the same file at the same time because execution is sequential, and shared files (`planner.ts`, `init.ts`) are touched by T02 then T05 only.
- Atomicity: pass with one watch item. T04 is the largest task (about 7 small files plus a fake host and tests); it can split into T04a glue and T04b bundling and fake host if its session would pass the pause threshold.
- Executability: pass. Commands exist in `AGENTS.md`. T01 and the `claude plugin validate` gate need the `claude` binary and an interactive session (see the open items).
- Validation profile: pass. Unit and integration with the fake host; end-to-end only for the CLI flow (T06); no browser or UI automation. Platforms: Linux, macOS, Windows in CI for planner and path handling; real-session checks in T01 and T07 (Windows PowerShell and one POSIX system).
- Idempotency: pass. T05 asserts a second `init` plans nothing; T04 asserts one clear and one seed per signal.

## Assumptions and open items

- Assumption (resolved by T01, see DEC-AMEND-01): the T01 outcome may amend `DEC-03` or `DEC-08` (loader) and the user-experience wording of FR-07; if so the TechSpec and PRD change through their own authorized update before T03 to T05 start.
- Open item: T01 requires a human-run interactive Claude Code session (>= 2.1.287) because the harness cannot be driven from the tests. Owner: maintainer. Affects T01, then T03 to T05.
- Open item: whether `claude plugin validate` (QA-06) becomes an automated gate in CI or stays a manual gate (MA-01). Default: manual. Owner: maintainer, decided in T04 handoff.
- Required environment: T01 and T07 — interactive Claude Code >= 2.1.287 on Windows and one POSIX system, a scratch repository with ContextBrake installed in full mode and one in light mode; authorization to create files in that scratch repository. Others — none.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [x] T07 — done (MA-01 light mode on Windows; full mode, loop guard and POSIX waived by DEC-MA-02 and DEC-MA-03)

## Problems and solutions

- T03: `tests/e2e/e2e-support-limitations.test.ts` (doctor, Copilot and Cursor) timed out at 30 s during the full coverage run and passes alone in 14 s. Pre-existing, load-sensitive; not touched by this feature.
- T06: `tests/integration/boot-git-delivery.test.ts` alternates pass and fail even alone, and full coverage runs show 30 s timeouts and EBUSY in `e2e-support-limitations` and `statusline-install`. None of these tests touch PRD-11 code; vitest prints no global coverage table while any of them fails.
