# Implementation plan — Automatic restart and markdown handoff across harnesses

## Stable sources

- PRD: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/prd.md`
- TechSpec: `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | FR-06 probe answered for Pi, OpenCode (and Oh-My-Pi per HIL 2); research and fixtures updated; per-harness destination fixed | — | T06, T07 |
| T02 | Telemetry asks for the markdown handoff in handoff mode; one reset-marker detector | — | T03, T04 |
| T03 | A pending handoff is claimed, archived (limit 10), and delivered once at session start | T02 | T05, T06, T07, T08 |
| T04 | Harness-neutral restart core: log v2, handoff gate, restart flow with ports | T02 | T05, T06, T07 |
| T05 | Claude Code mod runs on the neutral flow with the handoff gate, PRD-11 behavior unchanged | T03, T04 | T09 |
| T06 | Pi and Oh-My-Pi restart: automatic where T01 passed, semi-automatic otherwise | T01, T03, T04 | T08 |
| T07 | OpenCode restart: automatic where T01 passed, otherwise declared unavailable | T01, T03, T04 | T08 |
| T08 | Process-hook capabilities, `init --auto-restart` for any harness with a restart mode, `AUTO_RESTART_MODE`, ignore file | T03, T06, T07 | T09 |
| T09 | Doctor per harness and remove keeping handoffs; suite within budget | T05, T08 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Handoff action with restart on and no skill | T02 | TC-01 |
| FR-02 | `prd.md#functional-requirements` | Next session starts with the instruction | T03, T06, T07 | TC-02, TC-09, TC-10 |
| FR-03 | `prd.md#functional-requirements` | One delivery, archive of 10 | T03 | TC-02, TC-03 |
| FR-04 | `prd.md#functional-requirements` | Fresh-handoff gate | T04, T05, T06, T07 | TC-04, TC-07, TC-09 |
| FR-05 | `prd.md#functional-requirements` | Neutral core, Claude unchanged | T04, T05 | TC-05, TC-06, TC-07 |
| FR-06 | `prd.md#functional-requirements` | Probe on real installations | T01 | TC-08 |
| FR-07 | `prd.md#functional-requirements` | Automatic restart where verified | T06, T07, T08 | TC-09, TC-13 |
| FR-08 | `prd.md#functional-requirements` | Semi-automatic elsewhere | T06, T08 | TC-10, TC-13 |
| FR-09 | `prd.md#functional-requirements` | Guards and switches on every harness | T04, T05, T06, T07 | TC-07, TC-09 |
| FR-10 | `prd.md#functional-requirements` | `auto_restart` state and impact text | T06, T07, T08, T09 | TC-12 |
| FR-11 | `prd.md#functional-requirements` | Doctor per harness, codes reused | T09 | TC-12 |
| FR-12 | `prd.md#functional-requirements` | Consistent marker detection | T02, T05, T06, T07 | TC-11 |
| FR-13 | `prd.md#functional-requirements` | Remove keeps handoffs and names them | T09 | TC-14 |
| NFR-01 | `prd.md#non-functional-requirements` | No clear without a passing gate; errors keep the session | T04, T05, T06, T07 | TC-05, TC-09 |
| NFR-02 | `prd.md#non-functional-requirements` | Linux, macOS, Windows; no `sh`/`setsid`/server | T03, T06, T07 | TC-03; CI matrix |
| NFR-03 | `prd.md#non-functional-requirements` | 120 s budget; probes outside `npm test` | T01, T09 | TC-15 |
| NFR-04 | `prd.md#non-functional-requirements` | Handoffs under `.context-brake/`, untracked | T03, T08 | TC-03, TC-13 |
| NFR-05 | `prd.md#non-functional-requirements` | Restart off installs and injects nothing | T02, T03, T06, T07, T08 | TC-01, TC-02, TC-13 |
| DEC-01…DEC-17 | `techspec.md#technical-decisions` | Decisions as listed per task | T01-T09 | per task |
| TC-01…TC-15 | `techspec.md#test-approach` | Test cases | per row above | per task |

## Tasks

- [T01 — Probe automatic restart on real harness installations](done/task_01.md): answers P1-P6 for Pi and OpenCode (and Oh-My-Pi per HIL 2), records them in the research doc, and saves captures as fixtures.
- [T02 — Ask for a markdown handoff and detect the reset marker one way](done/task_02.md): telemetry in handoff mode names `.context-brake/handoff.md` and the marker; every component uses `endsWithResetSignal`.
- [T03 — Claim and deliver a pending handoff once at session start](done/task_03.md): `HandoffStore` with archive limit 10, and the session-start path injects the archived path once.
- [T04 — Harness-neutral restart core](done/task_04.md): restart log v2, neutral notices and seed, handoff gate codes, and `handleTurnEnd` with its ports.
- [T05 — Run the Claude Code mod on the neutral restart flow](done/task_05.md): the mod adapts `ModHost` to `RestartHost`, adds the handoff gate, and writes the v2 log.
- [T06 — Restart on Pi and Oh-My-Pi](done/task_06.md): automatic restart file where T01 passed; semi-automatic capability and notice otherwise.
- [T07 — Restart on OpenCode](done/task_07.md): automatic restart plugin with the resume text in the seed where T01 passed; otherwise declared unavailable.
- [T08 — Restart modes in init and capabilities](done/task_08.md): capability texts for process harnesses, the new target check, `AUTO_RESTART_MODE` findings, and `.context-brake/.gitignore`.
- [T09 — Doctor and remove for restart on every harness](done/task_09.md): per-harness restart findings, `AUTO_RESTART_HANDOFF`, removal that keeps and names handoffs, and the budget check.

## Coverage gate

- Coverage: pass. Every FR and NFR maps to at least one task and one TC.
- Traceability: pass. Each task cites its FR, DEC, CMP, and TC IDs.
- Dependencies: pass. Acyclic; T01 has no code dependency and runs first by order, so T06 and T07 know their destination.
- Atomicity: pass, with one watch item: T06 covers two harnesses that share one design; if T01 passes both, the executor may split it at the session pause without changing IDs of other tasks.
- Executability: pass. Commands from `AGENTS.md`; T01 needs the environment below.
- Validation profile: pass. No new e2e file; the existing smoke set stays green. Platforms through the CI matrix; the probe is Windows-only and says so.
- Idempotency: pass. `init` twice is asserted in T08; claim is rename-based in T03.

## Assumptions and open items

- Assumption: a harness that fails any of P1-P4 in T01 takes its fallback from TechSpec DEC-10 without a new HIL.
- Resolved OI-14-01 (DEC-HIL-02): install Oh-My-Pi and probe it in T01. Was: Oh-My-Pi is not installed. Install it for the probe, or accept semi-automatic on the PRD assumption. Affects T01, T06. Owner: the person, at HIL 2.
- Resolved OI-14-02 (DEC-HIL-02): authorized. Was: T01 runs real Pi and OpenCode sessions with the person's accounts, with interactive steps driven by the person. Affects T01. Owner: the person, at HIL 2.
- Resolved OI-14-03 (DEC-HIL-02): no restart mode for Antigravity. Was: Antigravity CLI resume (TechSpec OI-14-03): accept no restart mode, or add a task delivering the handoff at the first `pre_invocation` of a new conversation. Affects T08. Owner: the person, at HIL 2.
- Required environment: T01 (FR-06) needs Pi 1.0.4 and OpenCode 2.0.18 as installed on this machine, authenticated, and an interactive terminal. Authorization: OI-14-02.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [x] T07 — done
- [x] T08 — done
- [x] T09 — done

## Problems and solutions

- T01: Oh-My-Pi `sendUserMessage` skips command dispatch; solved by editor prefill (DEC-19). OpenCode 2.x rejects the v1 plugin shape, a pre-existing defect of `assets/runtime/opencode-plugin.ts`; OpenCode leaves prd-14 scope (DEC-HIL-04), T07 reduced to the declared-unavailable path, follow-up PRD proposed.
- T02: the handoff action with the content list exceeded the 60-token block budget (62-63 tokens); shortened to `save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]` and DEC-01 amended.
- T03: concurrent claims on Windows could both succeed when they targeted the same archive name; fixed with an exclusive name reservation before the rename (TC-03 concurrency case).
- T06: Oh-My-Pi 18.8.1 sends `last_assistant_message` as a message object; the existing schema expected a string, so the reset notice never fired there. Fixed with the stop-text helper; OMP `session_switch` mapped for session-start delivery (DEC-20).
