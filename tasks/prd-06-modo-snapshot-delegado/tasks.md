# Implementation plan — Modo de snapshot delegado

## Stable sources

- PRD: `tasks/prd-06-modo-snapshot-delegado/prd.md`
- TechSpec: `tasks/prd-06-modo-snapshot-delegado/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `delegatedSnapshot` config contract, pattern matcher, and regenerated config schema | — | T02, T04 |
| T02 | Core zone guidance: mode resolution, delegated action, allowlist, deny, resume, and failure policy | T01 | T03, T04 |
| T03 | Runtime wiring (plan presence, composition, `wrap`) and Claude Code `Skill` mapping | T02 | T05 |
| T04 | CLI: `init` flags and config merge, protocol section, `doctor` mode and findings, `run` hint | T02 | T05 |
| T05 | End-to-end coverage with the built CLI and README documentation | T03, T04 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Optional section; mode resolved automatically | T01, T02, T03 | TC-01, TC-03, TC-10 |
| FR-02 | `prd.md#functional-requirements` | Command validation | T01 | TC-01 |
| FR-03 | `prd.md#functional-requirements` | Trigger zone | T01, T02 | TC-03 |
| FR-04 | `prd.md#functional-requirements` | Delegated action text | T02 | TC-03 |
| FR-05 | `prd.md#functional-requirements` | Block format v1 | T02 | TC-03 |
| FR-06 | `prd.md#functional-requirements` | Delegated CRITICAL allowlist | T01, T02, T03 | TC-02, TC-04, TC-08, TC-09 |
| FR-07 | `prd.md#functional-requirements` | Delegated deny message | T02 | TC-04 |
| FR-08 | `prd.md#functional-requirements` | Resume command | T02, T03 | TC-05 |
| FR-09 | `prd.md#functional-requirements` | `init` flags and protocol | T04, T05 | TC-11, TC-15 |
| FR-10 | `prd.md#functional-requirements` | Add or remove section safely | T04 | TC-11 |
| FR-11 | `prd.md#functional-requirements` | `doctor` validation | T04 | TC-12 |
| FR-12 | `prd.md#functional-requirements` | `wrap` in both modes; `run` hint | T03, T04 | TC-10, TC-13 |
| FR-13 | `prd.md#functional-requirements` | `checkpointMode` in JSON | T04 | TC-12 |
| NFR-01 | `prd.md#non-functional-requirements` | Byte-identical without section | T01, T02, T04 | TC-01, TC-06, TC-11 |
| NFR-02 | `prd.md#non-functional-requirements` | Safe patterns; command never executed | T01, T02 | TC-01, TC-02 |
| NFR-03 | `prd.md#non-functional-requirements` | One stat at most, only on emitting paths | T02, T03 | TC-07 |
| NFR-04 | `prd.md#non-functional-requirements` | Cross-platform paths | T01, T03 | TC-02, CI matrix |
| NFR-05 | `prd.md#non-functional-requirements` | Block under 400 chars | T02 | TC-03 |
| OBJ-01–OBJ-04 | `prd.md#outcomes-and-metrics` | End-to-end outcomes | T05 | TC-14, TC-06 |
| DEC-07 | `techspec.md#technical-decisions` | Claude Code `Skill` payload verified and documented | T03 | TC-09, research section |

## Tasks

- [T01 — Contrato de configuração do snapshot delegado](done/task_01.md): the config accepts and validates `delegatedSnapshot`, and a pure matcher decides allowed paths.
- [T02 — Orientação por zona no núcleo](done/task_02.md): the engine and failure policy emit delegated text, allowlist, deny, and resume from the effective mode.
- [T03 — Fiação de runtime e Skill do Claude Code](done/task_03.md): hooks and `wrap` resolve the mode from the plan file on disk, and Claude Code `Skill` calls are recognized.
- [T04 — CLI: init, protocolo, doctor e run](done/task_04.md): users configure the mode through `init`, see it in `doctor`, and get a clear `run` error.
- [T05 — E2E e documentação](done/task_05.md): the built CLI proves OBJ-01 to OBJ-03 against fixture repositories, and the README documents the mode.

## Coverage gate

- Coverage: pass. Every FR and NFR maps to at least one task and one TC.
- Traceability: pass. Every task cites PRD and TechSpec IDs.
- Dependencies: pass. The graph is acyclic; T03 and T04 are independent after T02 and share no files.
- Atomicity: pass. Each task is one vertical slice with its tests; the largest are T02 and T04.
- Executability: pass. The commands come from `AGENTS.md`.
- Validation profile: pass. End-to-end runs only in T05 through the built CLI; the platform matrix is CI's Linux, macOS, and Windows.
- Idempotency: pass. `init` reruns converge; the tests are hermetic in temp directories.

## Assumptions and open items

- Assumption: the Claude Code `Skill` tool payload is `tool_input.skill` (DEC-07). T03 verifies it against vendor docs before coding.
- Open item: skill recognition for other harnesses. This is out of this feature and reported by `doctor`.
- Required environment: none beyond `npm install --ignore-scripts`. Manual acceptance in real Claude Code is optional (user).

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done

## Problems and solutions

- T01: the delegated config tests went to `tests/unit/delegated-snapshot-config.test.ts` because appending them to `configuration.test.ts` broke the 100-line `max-lines` lint rule. The Git Bash heredoc also collapsed `\` in a test literal; it was fixed with a direct edit.
- T02: the runtime option is the `planPresence` port (DEC-02) instead of a `readGuidance` callback (DEC-11 wording). T03 wires `planPresence`.
- T03: the Claude Code `Skill` `tool_input.skill` field is observed in the tool schema, not documented in the hooks reference. It is recorded in `docs/research/harness-integrations.md`, and a missing field fails safe. On Windows, a stat through a file-as-directory returns `ENOENT`, so the non-`ENOENT` branch of `NodePlanPresence` is tested with an injected stat.
- T04: the doctor JSON always includes `checkpointMode` (FR-13), so NFR-01 byte-identity does not cover that one document. The Git Bash heredoc also broke escaped `\n` inside template literals; those edits were redone with the Edit tool.
