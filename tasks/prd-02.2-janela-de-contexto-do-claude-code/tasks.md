# Implementation plan — PRD 2.2 real context window in Claude Code

## Stable sources

- PRD: `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`
- TechSpec: `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Hooks compute zones over the window recorded in `statusline` ledger lines; research documents the status line | — | T02, T05 |
| T02 | The built bridge passes the status line through byte for byte and records the session's window and usage | T01 | T03, T05 |
| T03 | `init --statusline-bridge` installs the bridge in `.claude/settings.local.json` and `remove` restores the previous status line | T02 | T04 |
| T04 | `doctor` reports the bridge, the window source, and the four drift warnings | T03 | T05 |
| T05 | Documentation, capability text, and overhead budgets for bridge and hooks | T01, T02, T03, T04 | — |

Execution order: T01 → T02 → T03 → T04 → T05. T02 and T03 both touch `tests/helpers/built-hook.ts` and `tests/test-lanes.ts`, and T03 and T04 both touch `src/infrastructure/harnesses/claude-code/adapter.ts`, so the chain stays sequential.

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| OBJ-01 | `prd.md#outcomes-and-metrics` | Percentages over the real window | T01, T02 | TC-03, TC-06, manual step 3 |
| OBJ-02 | `prd.md#outcomes-and-metrics` | User status line intact | T02, T03 | TC-06, TC-08, TC-12 |
| OBJ-03 | `prd.md#outcomes-and-metrics` | No regression without the bridge | T01 | TC-05, PRD 2.1 suites |
| OBJ-04 | `prd.md#outcomes-and-metrics` | Overhead budgets | T05 | TC-20 |
| US-01 | `prd.md#stories-and-journeys` | 1M model sessions | T01, T02 | TC-03, manual step 3 |
| US-02 | `prd.md#stories-and-journeys` | Keep existing status line | T02, T03 | TC-06, TC-10 |
| US-03 | `prd.md#stories-and-journeys` | Window follows `/model` | T01 | TC-02, manual step 4 |
| US-04 | `prd.md#stories-and-journeys` | Diagnose the bridge | T04 | TC-16, TC-17 |
| US-05 | `prd.md#stories-and-journeys` | Clean removal | T03 | TC-12, TC-13 |
| FR-01 | `prd.md#functional-requirements` | Opt-in install in local settings | T03 | TC-10, TC-11, TC-12, TC-15 |
| FR-02 | `prd.md#functional-requirements` | Run the previous command, preserve output | T02, T03 | TC-06, TC-07, TC-10 |
| FR-03 | `prd.md#functional-requirements` | Record five values per session | T01, T02 | TC-01, TC-06, TC-09 |
| FR-04 | `prd.md#functional-requirements` | Window from the bridge, else ceiling | T01 | TC-02, TC-03, TC-05 |
| FR-05 | `prd.md#functional-requirements` | Bridge tokens as fallback measurement | T01 | TC-04 |
| FR-06 | `prd.md#functional-requirements` | Keep window, drop usage across resets | T01 | TC-02, TC-04 |
| FR-07 | `prd.md#functional-requirements` | Doctor state, source, and warnings | T04 | TC-16, TC-17, TC-18 |
| FR-08 | `prd.md#functional-requirements` | Removal restores the local status line | T03 | TC-12, TC-13 |
| FR-09 | `prd.md#functional-requirements` | Documentation | T01, T05 | T01 research section, TC-19 |
| NFR-01 | `prd.md#non-functional-requirements` | Performance | T05 | TC-20 |
| NFR-02 | `prd.md#non-functional-requirements` | Resilience | T02 | TC-08 |
| NFR-03 | `prd.md#non-functional-requirements` | Privacy | T02 | TC-09 |
| NFR-04 | `prd.md#non-functional-requirements` | Compatibility | T01, T04 | TC-01, TC-18 |
| NFR-05 | `prd.md#non-functional-requirements` | Quality gates | T01–T05 | `AGENTS.md` commands in each task |
| NFR-06 | `prd.md#non-functional-requirements` | Platforms | T03, T04 | TC-11, TC-21 |
| DEC-01 | `techspec.md#technical-decisions` | Bundled bridge asset installed with Claude Code | T02, T03 | TC-06, TC-12 |
| DEC-02 | `techspec.md#technical-decisions` | Pipeline command and quoting | T03 | TC-10, TC-11 |
| DEC-03 | `techspec.md#technical-decisions` | Pass-through first, record under deadline | T02 | TC-06, TC-08 |
| DEC-04 | `techspec.md#technical-decisions` | `statusline` ledger line | T01 | TC-01 |
| DEC-05 | `techspec.md#technical-decisions` | Status line summary | T01 | TC-02 |
| DEC-06 | `techspec.md#technical-decisions` | Zone merge in `readZone` | T01 | TC-03, TC-04, TC-05 |
| DEC-07 | `techspec.md#technical-decisions` | Local runtime state | T03 | TC-12, TC-13 |
| DEC-08 | `techspec.md#technical-decisions` | Flags and context | T03 | TC-12, TC-15 |
| DEC-09 | `techspec.md#technical-decisions` | Previous command resolution | T03 | TC-10, TC-14 |
| DEC-10 | `techspec.md#technical-decisions` | Doctor warnings and report section | T04 | TC-16, TC-17, TC-18 |
| DEC-11 | `techspec.md#technical-decisions` | Snapshots and in-place edits | T03 | TC-12, TC-13 |
| DEC-12 | `techspec.md#technical-decisions` | Documentation | T01, T05 | TC-19 |
| DEC-13 | `techspec.md#technical-decisions` | Bridge overhead measurement | T05 | TC-20 |
| CMP-01–CMP-03 | `techspec.md#components-and-flow` | Bridge asset, runtime, payload | T02 | TC-06–TC-09 |
| CMP-04–CMP-07 | `techspec.md#components-and-flow` | Ledger line, summary, zone | T01 | TC-01–TC-05 |
| CMP-08–CMP-10 | `techspec.md#components-and-flow` | Planner, state, flags | T03 | TC-10–TC-15 |
| CMP-11, CMP-12 | `techspec.md#components-and-flow` | Doctor | T04 | TC-16–TC-18 |
| CMP-13 | `techspec.md#components-and-flow` | Snapshots, bundling, package check, helper | T02, T03 | TC-06, TC-12, `package:smoke` |
| CMP-14 | `techspec.md#components-and-flow` | Docs and capability | T01, T05 | TC-19 |
| TC-01–TC-05 | `techspec.md#test-approach` | Ledger, summary, zone | T01 | listed suites |
| TC-06–TC-09 | `techspec.md#test-approach` | Bridge runtime | T02 | `tests/integration/statusline-bridge.test.ts` |
| TC-10–TC-15 | `techspec.md#test-approach` | Installer and flags | T03 | listed suites |
| TC-16–TC-18, TC-21 | `techspec.md#test-approach` | Doctor and end-to-end | T04 | listed suites |
| TC-19, TC-20 | `techspec.md#test-approach` | Docs and overhead | T05 | listed suites |
| TC-22 | `techspec.md#test-approach` | Estimated readings keep the recorded window (codereview_01/CR-01) | codereview_01/T07 | listed suites |
| QA-01–QA-10 | `techspec.md#quality-profile` | Quality profile over each task diff | T01–T05 | profile commands, discounting the Terrain baseline |
| Manual acceptance | `techspec.md#test-approach` | Five-step script with a 1M model | T05 | user-run, recorded in T05 handoff |

## Tasks

- [T01 — Zones over the status line window](done/task_01.md): hooks read `statusline` ledger lines and compute zones over the recorded window.
- [T02 — Status line bridge runtime](done/task_02.md): the built bridge passes output through and records window and usage per session.
- [T03 — Install and remove the bridge](done/task_03.md): opt-in flags write and restore the local `statusLine` with runtime state.
- [T04 — Doctor for the bridge and window source](done/task_04.md): report section, text line, four warnings, and the end-to-end flow.
- [T05 — Documentation and overhead budgets](done/task_05.md): README, telemetry docs, capability text, and p95 budgets.

## Coverage gate

- Coverage: pass. Every OBJ, US, FR, and NFR maps to a task and a test; FR-09 is split between the research section (T01) and user docs (T05).
- Traceability: pass. Every DEC, CMP, and TC from the TechSpec appears in the matrix.
- Dependencies: pass. Linear chain without cycles; shared files named above.
- Atomicity: pass. Each task delivers one reviewable behavior with its tests; T01 is a foundation slice justified by unblocking both the bridge (T02) and the overhead budget (T05).
- Executability: pass. Commands come from `AGENTS.md`; process-lane tests are registered in `tests/test-lanes.ts`.
- Validation profile: pass. End-to-end only for TC-21 (built CLI against a temporary repository); CI matrix Linux, macOS, Windows; PowerShell-only Windows unverified, as the TechSpec records.
- Idempotency: pass. TC-12 reruns `init` with and without the flag and asserts no change.

## Assumptions and open items

- Assumption: the status line `session_id` equals the hooks' `session_id` for the main session (TechSpec risk); T05's manual step 3 confirms it.
- Open item: none.
- Required environment: the manual acceptance needs Claude Code with a 1M model and an existing status line on the user's machine (TechSpec manual acceptance, owner: user); automated tests need none.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done

## Problems and solutions

- T01: the full suite fails in the asset-currency tests after a `src/core` change until `npm run build` regenerates the bundled runtime assets; run the build before `npm run coverage`.
- T01: adding a method to `SessionLedger` also requires `CachedSessionLedger` in `src/infrastructure/runtime/in-process-host.ts` and the ledger fakes in `tests/` (11 files).
- T02: full `npm run coverage` runs on the Windows dev machine take about 14 minutes and time out one timing-sensitive test per run (a different one each time); rerun the failing file alone and use `--coverage.reportOnFailure` to keep the coverage figure.
- T03 (user decision, 25/09/2026): the state file `claude-statusline.json` is planned with owner `harness_entry` instead of DEC-07's `runtime_state`, because a `runtime_state` change makes `NodeChangeApplier` infer `removeState` and report `.context-brake/runtime` as not empty (exit 1). `AdapterPlan` gains optional `findings`, collected by `installation-service.ts`, for the unparseable user-settings warning (DEC-09).
- T03: the Claude planner now always plans `.claude/hooks/context-brake-statusline.mjs`; tests that build their own snapshot list for `planInstall` must include it or get `SNAPSHOT_MISSING` (fixed in `symlinked-harness-config.test.ts`). The planner reads user settings through `getUserHome`, so integration tests must pass a temporary `userHome` (see `tests/helpers/statusline-world.ts`).
- T04: `init-legacy-turn-limits.test.ts` times out under full-suite load on the Windows dev machine (30 s for two `init` runs plus a `doctor` with overhead sampling), and the leaked `runCli` spy then breaks its second test. Pre-existing (seen before the doctor change); candidate for a longer timeout outside this feature.
