# Implementation plan — Verified minimum version for Claude Code

## Stable sources

- PRD: `tasks/prd-22-claude-code-version-floor/prd.md`
- TechSpec: `tasks/prd-22-claude-code-version-floor/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `doctor` reports the Claude Code floor 2.1.97, with evidence in the research section and tests | — | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Adapter probe carries 2.1.97 | T01 | TC-01, TC-02 |
| FR-02 | `prd.md#functional-requirements` | No floor warning for `claude-code` | T01 | TC-04, TC-05, TC-06 |
| FR-03 | `prd.md#functional-requirements` | Below the floor: old-version behavior | T01 | TC-03 |
| FR-04 | `prd.md#functional-requirements` | Research line with evidence and gaps | T01 | TC-07 |
| FR-05 | `prd.md#functional-requirements` | Other adapters unchanged | T01 | TC-01 |
| NFR-01 | `prd.md#non-functional-requirements` | Schema shape unchanged | T01 | TC-04, TC-08 |
| NFR-02 | `prd.md#non-functional-requirements` | No new process call | T01 | diff review |
| NFR-03 | `prd.md#non-functional-requirements` | One named constant | T01 | DEC-01, diff review |
| TC-01..TC-08 | `techspec.md#test-approach` | Scenarios | T01 | listed suites and commands |

## Tasks

- [T01 — Report the Claude Code minimum version](done/task_01.md): the adapter passes `CLAUDE_MINIMUM_VERSION` to the probe, the research line records the evidence, and the tests follow DEC-04 and DEC-05.

## Coverage gate

- Coverage: pass; every FR and NFR maps to T01.
- Traceability: pass.
- Dependencies: pass; one task, no cycle.
- Atomicity: pass; 2 production files, 1 doc, 4 test files.
- Executability: pass; commands from `AGENTS.md`.
- Validation profile: pass; e2e only for `tests/bench/e2e-09.test.ts` (built CLI); Windows locally, Linux and macOS in CI.
- Idempotency: pass; no persisted state.

## Assumptions and open items

- Assumption: the 3 changelog gaps in the PRD hold for 2.1.97.
- Decided: D-01 = 2.1.97 (H-02).
- Required environment: None.

## State

- [x] T01 — completed

## Problems and solutions

- T01: a Python heredoc edit turned `\n` into a real newline inside two test strings; fixed with direct edits. The describe block passed the 30-line lint limit; the Claude floor tests moved to their own `describe`.
