# Implementation plan — PRD 2.1 brake by measured context usage

## Stable sources

- PRD: `tasks/prd-02.1-freio-por-uso-medido/prd.md`
- TechSpec: `tasks/prd-02.1-freio-por-uso-medido/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Usage-only `CRITICAL`, optional turn limits, legacy configs valid, protocol conditions | — | T02, T05 |
| T02 | Block v2 and plan-aware `YELLOW`/`RED` actions | T01 | T05 |
| T03 | Measurement contract: stale-after-reset drop, nullable window | — | T04 |
| T04 | Claude Code measured usage from the transcript | T03 | T05 |
| T05 | Legacy migration in `doctor`/`init`, capability, documentation | T01, T02, T04 | — |

Execution order: T01 → T02 → T03 → T04 → T05. T01 and T03 touch different files; T01, T02 and T03 all touch `session-zone.ts`, so they stay sequential.

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| OBJ-01 | `prd.md#outcomes-and-metrics` | Tool calls alone never block | T01 | TC-04, TC-18 |
| OBJ-02 | `prd.md#outcomes-and-metrics` | Measured usage in Claude Code | T04 | TC-13, TC-17 |
| OBJ-03 | `prd.md#outcomes-and-metrics` | No stop instruction without a plan | T02 | TC-07, TC-08 |
| OBJ-04 | `prd.md#outcomes-and-metrics` | Overhead p95 ≤ 100 ms | T04 | TC-16 |
| FR-01 | `prd.md#functional-requirements` | `CRITICAL` only by usage | T01 | TC-01, TC-04, TC-18 |
| FR-02 | `prd.md#functional-requirements` | Optional turn limits up to `RED` | T01 | TC-02, TC-03 |
| FR-03 | `prd.md#functional-requirements` | Turn in block, ceiling only with limits | T02 | TC-05 |
| FR-04 | `prd.md#functional-requirements` | Transcript `usage` sum, main thread | T04 | TC-13, TC-14, TC-17 |
| FR-05 | `prd.md#functional-requirements` | Fallback to estimate | T04 | TC-15, TC-17 |
| FR-06 | `prd.md#functional-requirements` | Ignore pre-reset measurements | T03 | TC-11, TC-12 |
| FR-07 | `prd.md#functional-requirements` | Window fallback, documented as budget | T03, T05 | TC-10, TC-22 |
| FR-08 | `prd.md#functional-requirements` | Plan-aware actions in block and protocol | T02 | TC-07, TC-08, TC-09 |
| FR-09 | `prd.md#functional-requirements` | Legacy configs valid and migrated | T01, T05 | TC-03, TC-19, TC-20 |
| FR-10 | `prd.md#functional-requirements` | Docs, research, capability | T05 | TC-21, TC-22 |
| NFR-01 | `prd.md#non-functional-requirements` | Bounded read, 20 MB | T04 | TC-16 |
| NFR-02 | `prd.md#non-functional-requirements` | Resilient parsing, error log | T04 | TC-15 |
| NFR-03 | `prd.md#non-functional-requirements` | No transcript text persisted | T04 | TC-15, TC-17 (assert ledger and log content) |
| NFR-04 | `prd.md#non-functional-requirements` | Compatibility, block version, 60 tokens | T01, T02 | TC-03, TC-06 |
| NFR-05 | `prd.md#non-functional-requirements` | Quality gates | T05 | TC-23 |
| NFR-06 | `prd.md#non-functional-requirements` | Platforms and path characters | T04 | TC-16, CI matrix |
| DEC-01–DEC-02, DEC-13 | `techspec.md#technical-decisions` | Classifier and schema | T01 | TC-01–TC-04 |
| DEC-03 | `techspec.md#technical-decisions` | Doctor and init migration | T05 | TC-19, TC-20 |
| DEC-04–DEC-06 | `techspec.md#technical-decisions` | Block v2, actions, plan port | T02 | TC-05–TC-09 |
| DEC-07, DEC-08, DEC-11 | `techspec.md#technical-decisions` | Reader, subagent rule, async input | T04 | TC-13–TC-18 |
| DEC-09, DEC-10 | `techspec.md#technical-decisions` | Stale drop, nullable window | T03 | TC-10–TC-12 |
| DEC-12 | `techspec.md#technical-decisions` | Capability `unknown` | T05 | TC-21 |

## Tasks

- [T01 — Usage-only critical zone and optional turn limits](done/task_01.md): `CRITICAL` depends only on usage, turn limits become optional and advisory, legacy configs validate.
- [T02 — Telemetry block v2 with plan-aware actions](done/task_02.md): v2 block and message, plan and no-plan actions, plan-presence port.
- [T03 — Measurement contract: stale-after-reset and window fallback](done/task_03.md): core accepts timestamped, window-less measurements and drops stale ones.
- [T04 — Measured usage in Claude Code from the transcript](done/task_04.md): bounded transcript reader and async Claude input with estimate fallback.
- [T05 — Legacy migration, capability, and documentation](done/task_05.md): `LEGACY_TURN_LIMITS`, `init` normalization, capability, README and research.

## Coverage gate

- Coverage: pass — every OBJ, FR, and NFR maps to a task and a test.
- Traceability: pass — every DEC and TC maps to a task.
- Dependencies: pass — acyclic; shared `session-zone.ts` serialized by order.
- Atomicity: pass — each task is one reviewable slice with its tests.
- Executability: pass — commands from `AGENTS.md`.
- Validation profile: pass — e2e only for the built Claude hook (TC-18), per the CLI policy; platforms via the CI matrix; manual acceptance in a real Claude Code session at QA.
- Idempotency: pass — `init` normalization re-run covered by TC-20; schema and protocol regeneration are deterministic.

## Assumptions and open items

- Assumption: the transcript fields observed on 2026-09-25 stay stable for the release; drift falls back to the estimate.
- Decided (DEC-HIL-03): DEC-07 skips unparseable transcript lines without logging; NFR-02 updated.
- Required environment: manual acceptance needs a real Claude Code session with the built package (owner: user); none for automated tasks.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done

## Problems and solutions

- T02: a `sed` rewrite of `[ContextBrake v1]` inside regex literals corrupted the line-break pattern in `wrap-command.test.ts` and `e2e-run-approval-wrap.test.ts`; fixed by hand. Edit regex literals with the Edit tool, not `sed`.
- T02/T04 (EV-11, DEC-HIL-04): the user merged prd-06 (`5492604`) while T04 was being validated; the autostash pop conflicted in 7 T01–T03 files. Reconciled through option A: prd-06 `PlanPresence.exists()` is the only plan port; `planGuidance(sources, planPresent)` and `delegatedGuidance` use `compactZoneAction`; the block takes a required `action` with the v2 prefix and `renderTurn`; `readPlanPresence`, `hasPlan`, `readPlanPresenceFor`, and `tests/integration/plan-presence-reader.test.ts` were removed; TechSpec DEC-06/TC-09/CMP-08/CMP-12 were revised. T02 stays done with this change recorded: its FR-08 obligations are covered again by `brake-engine-plan-actions.test.ts`, `session-zone.test.ts`, and `zone-guidance.test.ts`.
- T05: `doctor-checks.ts` was at 98 lines, so `LEGACY_TURN_LIMITS` and `normalizeTurnLimits` live in the new `config-legacy-checks.ts`; `checkConfig` calls it without changing its line count.
