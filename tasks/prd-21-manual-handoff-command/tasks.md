# Implementation plan — Manual handoff command in Claude Code

## Stable sources

- PRD: `tasks/prd-21-manual-handoff-command/prd.md`
- TechSpec: `tasks/prd-21-manual-handoff-command/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `core` builds the `/handoff` prompt, normalizes the focus, and decides a manual request, with the zone text unchanged | — | T03 |
| T02 | Every mod restart sends the seed only after the session id changes (3 s cap); the host types have the documented command and timer members | — | T03 |
| T03 | The mod registers and serves `/handoff [focus]` end to end in the in-process scene | T01, T02 | T04 |
| T04 | README and research section describe `/handoff` and record the evidence and gaps | T03 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Register `/handoff` with description and `[focus]` in every session | T03 | TC-07, TC-08, TC-16; MA-01 |
| FR-02 | `prd.md#functional-requirements` | Command available after a restart | T03 | DEC-03; MA-02 |
| FR-03 | `prd.md#functional-requirements` | One line, counter reset, one prompt; no file, fork, or `/clear` | T03 | TC-09 |
| FR-04 | `prd.md#functional-requirements` | Prompt per mode with the trigger-zone text | T01 | TC-01, TC-04 |
| FR-05 | `prd.md#functional-requirements` | Refusal without `autoRestart` or with a bad config | T01, T03 | TC-03, TC-10; MA-05 |
| FR-06 | `prd.md#functional-requirements` | Refusal by kill switch or non-interactive surface | T01, T03 | TC-03, TC-11 |
| FR-07 | `prd.md#functional-requirements` | Focus normalization and 500-character cut | T01 | TC-02 |
| FR-08 | `prd.md#functional-requirements` | Restart only on the signal | T03 | TC-12 |
| FR-09 | `prd.md#functional-requirements` | Handoff stale and missing checks unchanged | T03 | TC-13 |
| FR-10 | `prd.md#functional-requirements` | Guards unchanged; reset only on submit | T03 | TC-09, TC-11, TC-14 |
| FR-11 | `prd.md#functional-requirements` | Not `immediate` | T03 | TC-07; MA-03 |
| FR-12 | `prd.md#functional-requirements` | Existing reason codes only | T03, T04 | TC-17 |
| FR-13 | `prd.md#functional-requirements` | Mod version changes for `doctor` drift | T03 | DEC-09, AUTO-03; TC-16 (version invariant) |
| FR-14 | `prd.md#functional-requirements` | README bullet; wizard unchanged | T04 | TC-17 |
| NFR-01 | `prd.md#non-functional-requirements` | Documented API members only | T02, T03 | DEC-10; review |
| NFR-02 | `prd.md#non-functional-requirements` | Focus and prompt never stored | T03 | TC-15 |
| NFR-03 | `prd.md#non-functional-requirements` | Pure `core` prompt builder | T01 | TC-01; QA-04 |
| NFR-04 | `prd.md#non-functional-requirements` | Seed reaches the new session | T02, T04 | TC-05, TC-06; MA-04; research section |
| NFR-05 | `prd.md#non-functional-requirements` | No uncaught exception in the command hook | T03 | TC-15 |
| NFR-06 | `prd.md#non-functional-requirements` | `ContextBrake: ` lines in English | T01, T03 | TC-09..TC-11 |
| NFR-07 | `prd.md#non-functional-requirements` | Claude Code 2.1.287+, all platforms | T03, T04 | DEC-04; research section |
| TC-01..TC-04 | `techspec.md#test-approach` | Core prompt, focus, decision, zone text | T01 | `tests/unit/manual-handoff.test.ts`, `tests/unit/zone-guidance.test.ts` |
| TC-05, TC-06 | `techspec.md#test-approach` | Seed after id switch, 3 s cap | T02 | `tests/integration/claude-mod-seed-switch.test.ts` |
| TC-07..TC-16 | `techspec.md#test-approach` | Command scene and bundle contract | T03 | `tests/integration/claude-mod-handoff-command.test.ts`, `tests/integration/claude-mod-bundle.test.ts` |
| TC-17 | `techspec.md#test-approach` | Schemas and README | T04 | `npm run schemas:check`; diff |
| QA-E2E-01, MA-01..MA-05 | `techspec.md#test-approach` | Built bundle check; live checks | QA, human | `qa_[num]/qa.md`; HIL 3 |

## Tasks

- [T01 — Core prompt and manual decision](done/task_01.md): `core` builds the `/handoff` prompt from the zone reset text, normalizes the focus, and decides submit or refuse.
- [T02 — Seed after the session id switch](done/task_02.md): the mod waits for the new session id before it sends the seed, and the host types and fakes have the documented command and timer members.
- [T03 — The /handoff command in the mod](done/task_03.md): the mod registers `/handoff [focus]` and serves it, covered end to end in the in-process scene.
- [T04 — README and research record](done/task_04.md): the README and the Claude Code research section describe the command, the seed wait, and the open gaps.

## Coverage gate

- Coverage: pass. Every FR and NFR maps to a task or a recorded decision; FR-13 is met at the next release bump (DEC-09, AUTO-03); FR-02, FR-11, and NFR-04 need live checks MA-02, MA-03, MA-04.
- Traceability: pass. Every TC maps to one task; QA-E2E-01 and MA-01..MA-05 go to QA and HIL 3.
- Dependencies: pass. Acyclic: T01 and T02 are independent; T03 needs both; T04 needs T03.
- Atomicity: pass. Each task has one reviewable result with its own tests.
- Executability: pass. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm test` (touched suites by path between tasks), `npm run coverage`, `npm run schemas:check`, `npm run build`.
- Validation profile: pass. In-process unit and integration tests; no new e2e file (CLI policy); Windows development machine; the live checks need a person in an interactive Claude Code session.
- Idempotency: pass. No persisted format changes; tests use temporary directories.

## Assumptions and open items

- Assumption: the in-process scene and host fake are the PRD's "kit test" (TechSpec, Test approach).
- Open item: P-02, P-04, P-05 stay open in the research section; MA-01..MA-05 are owned by the user at HIL 3.
- Required environment: MA-01..MA-05 need an interactive Claude Code session (2.1.287 or later) with the rebuilt mod installed by `init`; owner the user. QA-E2E-01 needs `claude` on the machine (2.1.306 present).

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done

## Problems and solutions

- None.
