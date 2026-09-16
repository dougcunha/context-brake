# Implementation plan — Telemetry, zones, and brake

## Stable sources

- PRD: `tasks/prd-02-telemetria-zonas-e-freio/prd.md`
- TechSpec: `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Configuration accepts `brake`, rejects the `turnCeiling` mismatch, and the shared schema moves to `zod/mini` | — | T02, T03 |
| T02 | Zones, usage, telemetry block, injection policy, and protocol stay coherent | T01 | T04 |
| T03 | Session ledger counts parallel turns, survives process restarts, and logs blocks and errors | T01 | T04 |
| T04 | The brake decides allow, deny, telemetry, and failure fallback, derives the mode, and runs inside both hosts | T02, T03 | T05, T06 |
| T05 | `doctor` reports cooperative sessions, recorded blocks, and runtime errors | T04 | T09 |
| T06 | The five process harnesses block, deliver telemetry, reset, and expose their guarantees | T04 | T07 |
| T07 | The three in-process harnesses count, block, measure usage, and reset inside the harness process | T06 | T08 |
| T08 | Assets carry no logic, the bundle guard holds, the overhead targets are measured, and the brake is documented and published | T07 | T09 |
| T09 | Simulated accuracy, the built-CLI brake flow, and long-task efficacy prove the acceptance criteria | T05, T08 | — |

## Traceability matrix

### PRD obligations (`prd.md`)

| Source ID | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- |
| RF1 | Count each completed tool call as a turn, including parallel calls | T03, T06 | `tests/integration/runtime-parallel-turns.test.ts` (TC-08) |
| RF2 | Keep counts isolated per session and persistent between invocations | T03 | `tests/integration/runtime-session-ledger.test.ts`, TC-08 |
| RF3 | Reset turns and usage on a new session or compaction | T03, T06, T07 | `tests/integration/runtime-session-reset.test.ts` (TC-09) |
| RF4 | Count subagents separately when the harness identifies them | T03, T06 | `tests/unit/claude-runtime-session-key.test.ts` (TC-10) |
| RF5 | Use harness-reported usage when available | T02, T07 | `tests/unit/pi-runtime-usage.test.ts`, `tests/unit/omp-runtime-usage.test.ts` (TC-11) |
| RF6 | Estimate usage from local session data otherwise | T02, T06, T07 | `tests/unit/runtime-estimation.test.ts` (TC-12), TC-13 |
| RF7 | Use the active model's window when reported, else the configured window | T02, T07 | TC-11, `tests/unit/usage-resolver.test.ts` (TC-28) |
| RF8 | Record the source of each reading as measured or estimated | T02, T03, T06, T07 | TC-06, TC-11, TC-12 |
| RF9 | Derive zones and ceilings from one configuration shared with the protocol | T01, T02 | `tests/unit/protocol-zone-coherence.test.ts` (TC-02) |
| RF10 | Classify with the default zones and critical ceiling | T02 | `tests/unit/zone-classifier.test.ts` (TC-01) |
| RF11 | Validate increasing limits, full coverage, and the turn-ceiling equality | T01 | `tests/unit/configuration.test.ts` (TC-03) |
| RF12 | Deliver a block with turn, ceiling, usage, window, source, zone, and action | T02, T06, T07 | TC-06, TC-14, per-harness runtime suites (TC-33) |
| RF13 | Support continuous and default injection modes with an activation threshold | T02 | `tests/unit/injection-policy.test.ts` (TC-05) |
| RF14 | Never alter the original tool output when adding context | T06, T07 | `tests/unit/runtime-rendering.test.ts` (TC-14) |
| RF15 | Keep the block format versioned and documented | T02, T08 | `tests/unit/telemetry-block.test.ts` (TC-06), `docs/telemetry-block.md` |
| RF16 | Instruct plan and checkpoint, commit, and the reset signal in the red zone | T02 | TC-06 protocol actions, TC-02 |
| RF17 | Block tool calls above the critical ceiling with a state-saving message | T04, T06, T07 | `tests/unit/brake-engine-pre-tool.test.ts` (TC-15), TC-32 |
| RF18 | Allow plan and checkpoint files, the validation command, git status/add/commit, and configured commands | T01, T04 | `tests/unit/brake-allowlist.test.ts` (TC-16), TC-30 |
| RF19 | Fail open below the ceiling and closed above it where the harness supports it | T04, T06 | `tests/unit/failure-policy.test.ts` (TC-17), `tests/integration/runtime-failure-policy.test.ts` (TC-18) |
| RF20 | Record each block locally with session, tool, zone, and reason only | T03, T04, T05 | `tests/integration/runtime-block-log.test.ts` (TC-20) |
| RF21 | Mark harnesses without a guaranteed block as cooperative and expose it | T04, T05, T06 | `tests/unit/brake-mode.test.ts` (TC-25), `tests/integration/doctor-brake-sessions.test.ts` (TC-19) |
| RF22 | Recognize `[REQUEST_SESSION_RESET]` and show the harness's new-session command | T04, T06, T07 | `tests/unit/reset-notice.test.ts` (TC-21) |
| CA-01 | Yellow session in default mode receives the block after a tool | T02, T09 | TC-05, TC-27 |
| CA-02 | Green session below the threshold receives nothing | T02 | TC-05 |
| CA-03 | Boundary zones at 49/50/66/75% and 7/8/11/12 turns | T02 | TC-01 |
| CA-04 | Custom zone configuration renders and classifies with equal limits | T02 | TC-02 |
| CA-05 | Incoherent zone configuration is rejected with field and rule | T01 | TC-03 |
| CA-06 | Three parallel calls plus one isolated report 4 turns | T03, T06 | TC-08 |
| CA-07 | A new session or compaction restarts the count at 1 | T03, T06, T07 | TC-09 |
| CA-08 | Subagent counts are not added to the main session | T03, T06 | TC-10 |
| CA-09 | Measured harness usage marks the block measured with the same value | T02, T07 | TC-11 |
| CA-10 | Harness without usage marks the block estimated | T02, T06, T07 | TC-12 |
| CA-11 | Estimate stays within 10 percentage points of measured in simulated sessions | T09 | `tests/e2e/e2e-simulated-usage.test.ts` (TC-13) |
| CA-12 | Separate-context harnesses keep the original tool result intact | T06, T07 | TC-14 |
| CA-13 | Any default block occupies at most 60 tokens | T02 | `tests/unit/telemetry-block-budget.test.ts` (TC-07) |
| CA-14 | Above the ceiling, a code read is not executed and gets the instruction | T04, T06, T09 | TC-15, TC-27 |
| CA-15 | Checkpoint write, validation, `git add`, and commit still execute | T04, T09 | TC-16, TC-27 |
| CA-16 | Integration failure below the ceiling does not block; above, the non-allowlisted call does | T04, T06 | TC-17, TC-18 |
| CA-17 | Codex CLI appears with a cooperative brake and the hosted-tools reason | T05, T06, T09 | TC-19, TC-27 |
| CA-18 | The local record shows session, tool, zone, and reason with no tool content | T03, T05, T09 | TC-20, TC-27 |
| CA-19 | A response ending with the signal shows the harness's new-session command | T04, T06, T07 | TC-21 |
| CA-20 | p95 ≤ 100 ms per process call and ≤ 15 ms per in-process call | T08 | `tests/integration/runtime-overhead.test.ts` (TC-22) |
| CA-21 | No out-of-allowlist call above the ceiling and every session saves and commits | T09 | `tests/e2e/e2e-simulated-long-task.test.ts` (TC-23) |
| CA-22 | A green-by-usage session with 8 turns receives the yellow block | T02 | TC-05 |
| CA-23 | `turnCeiling` different from `criticalTurn` is rejected with field and rule | T01 | TC-03 |

### Technical decisions and components (`techspec.md`)

| Source ID | Decision or component | Tasks |
| --- | --- | --- |
| DEC-01 | Runtime logic in `src/`, thin assets | T02-T04, T08 |
| DEC-02 | `zod/mini` in bundles, bundle guard | T01, T08 |
| DEC-03 | Integer percentage, highest-zone-first, `turnCeiling` equality | T01, T02 |
| DEC-04 | Per-session JSONL ledger, hashed keys, dedup | T03 |
| DEC-05 | Measured only for Pi and Oh-My-Pi; estimate elsewhere | T02, T07 |
| DEC-06 | Block v1, shared zone actions, documented and published | T02, T08 |
| DEC-07 | `threshold_only` and `always` injection policy | T02 |
| DEC-08 | Allowlist and fail-safe classification | T04 |
| DEC-09 | Failure boundary and fallback allowlist | T04 |
| DEC-10 | Brake mode from capabilities; doctor finding | T04, T05, T06 |
| DEC-11 | Block log and doctor findings, no report schema change | T03, T05 |
| DEC-12 | Reset notice per harness | T04, T06, T07 |
| DEC-13 | Reset events and new registrations | T06, T07 |
| DEC-14 | Antigravity `PreToolUse` and level change (pending OI-01) | T06 |
| DEC-15 | Project-root resolution per surface | T04 |
| DEC-16 | Runtime `.gitignore`, retention, in-process write-through | T03 |
| DEC-17 | Overhead measurement of the real paths | T07, T08 |
| DEC-18 | Provisional plan reader | T04 |
| DEC-19 | Deterministic harness simulator | T09 |
| CMP-01, CMP-02 | `zones.ts` and `runtime.ts` contracts | T02 |
| CMP-03 | `session-ledger.ts` contracts and ports | T03 |
| CMP-04, CMP-05, CMP-07 | Zone classifier, usage resolver, block and policy services | T02 |
| CMP-06 | Session counters | T03 |
| CMP-08, CMP-09, CMP-10 | Allowlist, message, engine, failure policy | T04 |
| CMP-11 | Brake mode and session checks | T04, T05 |
| CMP-12, CMP-13 | Configuration and Zod-free harness contracts | T01 |
| CMP-14 | Protocol renderer from zone actions | T02 |
| CMP-15, CMP-16 | Ledger, logs, paths, plan reader, normalizer, state reader | T03, T04, T05 |
| CMP-17 | Process and in-process hosts, composition | T04 |
| CMP-18 to CMP-21 | Harness runtime, capabilities, schemas, planners, adapters | T06, T07 |
| CMP-22 | In-process sampler with the real `ContextUsage` | T07 |
| CMP-23 | Doctor service and CLI wiring | T05 |
| CMP-24 | Thin assets, metafile, bundler | T08 |
| CMP-25 | Docs, protocol, research, schema, package | T08 and every harness task |
| CMP-26 | Simulator support | T09 |
| CMP-27 | Test suites and lanes | every task; T08 closes the lane registration |

### Test cases (`techspec.md`)

| TC | Tasks | TC | Tasks |
| --- | --- | --- | --- |
| TC-01 | T02 | TC-18 | T06 |
| TC-02 | T02 | TC-19 | T05 |
| TC-03 | T01 | TC-20 | T03, T09 |
| TC-04 | T06 | TC-21 | T04, T06, T07 |
| TC-05 | T02 | TC-22 | T08 |
| TC-06 | T02 | TC-23 | T09 |
| TC-07 | T02 | TC-24 | T08 |
| TC-08 | T03, T06 | TC-25 | T04 |
| TC-09 | T03, T06, T07 | TC-26 | T06 |
| TC-10 | T03, T06 | TC-27 | T09 |
| TC-11 | T02, T07 | TC-28 | T02 |
| TC-12 | T06, T07 | TC-29 | T03 |
| TC-13 | T09 | TC-30 | T04 |
| TC-14 | T06, T07 | TC-31 | T01 |
| TC-15 | T04, T06 | TC-32 | T04, T07 |
| TC-16 | T04 | TC-33 | T06, T07 |
| TC-17 | T04 | TC-34 | T06 |

## Tasks

- [T01 — Configuration and contracts on `zod/mini` with the brake section](done/task_01.md): the config accepts optional allowed commands and rejects a `turnCeiling` mismatch, and the shared schema is mini so runtime bundles stay small.
- [T02 — Zones, usage, telemetry block, injection policy, and protocol coherence](done/task_02.md): boundaries classify exactly, the block renders within budget, and the protocol uses the same configuration and actions.
- [T03 — Session ledger, counters, runtime logs, and retention](done/task_03.md): parallel completed calls count once, counters survive restarts and reset on compaction, and block and error logs stay content-free.
- [T04 — Brake decision core and runtime hosts](done/task_04.md): at the ceiling only the allowlist passes, failures never block below it, the mode comes from capabilities, and both hosts run the engine inside the failure boundary.
- [T05 — Doctor reads runtime state and reports cooperative brakes, blocks, and errors](done/task_05.md): `doctor` shows cooperative sessions with reasons, block counts, and recent runtime errors.
- [T06 — Process harness runtimes (Claude Code, Codex CLI, Cursor, Copilot, Antigravity)](done/task_06.md): the five process harnesses register their new events, block above the ceiling, deliver telemetry, reset, and expose their guarantees in the research file.
- [T07 — In-process harness runtimes (Pi, Oh-My-Pi, OpenCode)](task_07.md): measured usage where the API documents it, appended telemetry, in-process denies, reset, and the sampler on the real contract.
- [T08 — Assets, bundle guard, overhead, documentation, and package](task_08.md): assets carry no logic, no heavy dependency reaches a bundle, the p95 targets are measured, and the brake is documented and published.
- [T09 — Simulated accuracy, end-to-end brake flow, and long-task efficacy](task_09.md): the built CLI runs a real session, the estimate stays within 10 points, and 20 sessions per full-level harness save and commit with no out-of-allowlist call above the ceiling.

## Coverage gate

- Coverage: pass. Every `RF1`-`RF22` and `CA-01`-`CA-23` maps to at least one task; `DEC-01`-`DEC-19` and `CMP-01`-`CMP-27` resolve in the tables above; `TC-01`-`TC-34` each belong to at least one task. Out of scope by the PRD and TechSpec: automatic restarts and `wrap` (PRD-04), boot content (PRD-03), exact tokenizers, native compaction, financial cost, API-level blocking, non-MVP harnesses, and real-model adherence.
- Traceability: pass. Every task cites PRD obligations, TechSpec decisions or components, and test cases in its own Traceability table; the matrix above aggregates them, and no task lacks a source.
- Dependencies: pass, acyclic. T01 unlocks T02 and T03; T04 needs both; T05 and T06 need T04; T07 needs T06 (shared `docs/research/harness-integrations.md`, `tests/test-lanes.ts`, and `tests/unit/reset-notice.test.ts`); T08 needs T07; T09 needs T05 and T08. Parallel opportunities: T02 ∥ T03 and T05 ∥ T06.
- Atomicity: pass. Each task is one reviewable vertical with implementation and its own tests. Merged tasks keep their file sets disjoint from their siblings except where the dependency edge already serializes them; `package.json` is touched only by T02 (dependency) and T08 (published files); `README.md` is touched only by T06 (support row) and T08 (brake sections).
- Executability: pass. Every task uses the real commands from `AGENTS.md` (`npm run build`, `typecheck`, `lint`, `test`, `coverage`, `schemas:check`, `assets:check`, `dependencies:check`, `package:smoke`), names exact suites, and lists affected files. No placeholder command.
- Validation profile: pass. End-to-end suites are used only where the TechSpec marks them (T09); every other task is unit or integration per `.agents/rules/tests.md`. Harness behavior is covered by fixtures derived from `docs/research/harness-integrations.md`; payloads that the vendor docs do not confirm stay fixture-gated with the gap recorded. Platforms: append, path, and child-process scenarios (T03, T06, T08, T09) run on Linux, macOS, and Windows; the remaining tasks are platform-independent.
- Idempotency: pass. Re-running `init` after T06-T07 adds no duplicate hook groups or manifest entries; the ledger treats a duplicate `toolUseId` as one turn; retention and `.gitignore` writes are no-ops when present; T08's asset replacement overwrites only the package-owned files; T09's fixture repositories are created fresh per test.

## Assumptions and open items

- Assumption: `.context-brake/runtime/` remains the runtime-state directory (TechSpec `DEC-04`, `DEC-15`, `DEC-16`), matching PRD-01.1 FR-09. If it changes, T03, T04, T05, and T08 are re-scoped.
- Assumption: the Antigravity `PreToolUse` trade-off (registering auto-approves calls below the ceiling) is accepted (TechSpec `DEC-14`). Pending decision at the technical HIL.
- Open item: OI-01 — Antigravity `PreToolUse` registration, a sub-item of T06. If the HIL refuses the trade-off, only that sub-item is dropped: `capabilities.ts` keeps `pre_tool_block: unsupported`, Antigravity stays fully cooperative, and the README row and TC-34 keep the cooperative assertion. Owner: product owner at the HIL.
- Open item: OI-02 — the final plan schema from the PRD-03 TechSpec. T04 implements the provisional reader (`DEC-18`); only `plan-validation-reader.ts` and TC-30 change when the final schema lands. Owner: PRD-03 tech lead.
- Open item: OI-03 — Pi project-local discovery is documented for `.ts` only while the installer writes `.js`. T07 must verify a real load; if it fails, the task also switches the installed filename and records the research update. Owner: T07 implementer; affects T07 and TC-32.
- Open item: OI-04 — Cursor CLI coverage of `preToolUse`/`postToolUse`/`preCompact`, and Oh-My-Pi's loading path, must be confirmed by a captured fixture before the `enforced` claim stands. Owner: T06 and T07 implementers.
- Open item: OI-05 — OpenCode plugin input identifiers (`input.sessionID`, `tool.execute.after` arguments) and any token API are undocumented. T07 records the gap and keeps the harness cooperative; no later task depends on the missing identifiers. Owner: T07 implementer.
- Open item: OI-06 — an opt-in Claude Code status line bridge for measured usage stays post-MVP and is not a task here.
- Open item: OI-07 — Codex `PreToolUse` timeout behavior is undocumented; T06 records it in the research file and keeps the mode cooperative.
- Required environment: T06-T07 want one real payload per registered event captured as a fixture before the task closes; when no harness is installed this is recorded as a gap, and the corresponding capability stays fixture-gated (no credential or network needed). T09 needs no external service: the simulator drives built assets with documented payloads. The CI matrix (Linux, macOS, Windows; Node 20/22/24) is required for the feature's final acceptance, not for intermediate tasks.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [ ] T07 — pending
- [ ] T08 — pending
- [ ] T09 — pending

## Problems and solutions

- 2026-09-15, planning: the first draft had 18 tasks. At HIL request the plan was consolidated to 9 before any execution: T04 merged the decision core with the hosts, T06 merged the five process harnesses, T07 merged the three in-process harnesses, T08 merged assets, overhead, and documentation, and T09 merged the three acceptance suites. The DAG and the traceability matrix were rebuilt with the new IDs; no obligation disappeared in the merge. The pending Antigravity decision (OI-01) is now a flagged sub-item of T06 instead of a task of its own.
