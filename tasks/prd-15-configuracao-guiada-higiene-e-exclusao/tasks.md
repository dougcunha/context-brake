# Implementation plan — Upgrade hygiene and persistent harness exclusion

## Stable sources

- PRD: `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md`
- TechSpec: `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `doctor` reports every unrecognized configuration key with a remediation line, `remove` proceeds past them, and the sanitizer and tolerant read exist | — | T02 |
| T02 | `init` reads a configuration with unrecognized keys, previews the keys it drops, and rewrites a valid file idempotently | T01 | T05 |
| T03 | Shared surgical retired-event cleanup, wired into Claude Code `init` and `remove` | — | T04 |
| T04 | Codex CLI, Cursor, Antigravity, and Copilot lose their retired-event entries on `init` and `remove` | T03 | T08 |
| T05 | `excludedHarnesses` in the configuration; `--exclude-harness` persists and keeps the harness off; `--harness` clears it | T02 | T06, T07 |
| T06 | Excluding an installed harness deletes its artifacts as `remove` would; edge cases of the config-only plan and removal conflicts | T05 | T07 |
| T07 | `doctor` and the text reports show the exclusion; `remove` clears it | T05, T06 | T08 |
| T08 | README and research notes; schema, budget, coverage, and lint gates green | T04, T07 | — |

Execution order: T01, T02, T03, T04, T05, T06, T07, T08 (one task per run; no two tasks share a target file in parallel).

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Doctor reports unrecognized keys with a remediation; `init` shows them in the preview; `remove` proceeds (DEC-HIL-02) | T01, T02 | TC-01, TC-02, TC-05 |
| FR-02 | `prd.md#functional-requirements` | `init` drops the keys after a preview, idempotent | T01, T02 | TC-03, TC-04, TC-05 |
| FR-03 | `prd.md#functional-requirements` | `init` removes owned entries for retired events | T03, T04 | TC-06, TC-07, TC-08, TC-09 |
| FR-04 | `prd.md#functional-requirements` | `remove` deletes owned entries under any event | T03, T04 | TC-06, TC-07, TC-08 |
| FR-05 | `prd.md#functional-requirements` | Exclusion persists and deletes the harness artifacts | T05, T06 | TC-10, TC-11, TC-12, TC-15 |
| FR-06 | `prd.md#functional-requirements` | Excluded harness stays off; doctor reports excluded | T05, T07 | TC-13, TC-16 |
| FR-07 | `prd.md#functional-requirements` | `--harness` clears the exclusion; both flags is an argument error | T05 | TC-10, TC-14 |
| FR-08 | `prd.md#functional-requirements` | `remove` deletes the configuration, exclusion included | T07 | TC-16 |
| NFR-01 | `prd.md#non-functional-requirements` | Plan before write, idempotent, foreign bytes preserved | T02, T03, T04, T05 | TC-04, TC-06, TC-07, TC-08, TC-13 |
| NFR-02 | `prd.md#non-functional-requirements` | Linux, macOS, Windows, symlinked settings directory | T03, T04 | TC-09 |
| NFR-03 | `prd.md#non-functional-requirements` | Tests in process, within 120 s | T08 (every task) | TC-18 |
| NFR-04 | `prd.md#non-functional-requirements` | Text and JSON equal, schemas current | T01, T02, T05, T07, T08 | TC-02, TC-05, TC-12 |
| OBJ-01..03 | `prd.md#outcomes-and-metrics` | Outcomes proven on the built CLI | QA run (step 6) | TC-17 |
| DEC-01..14 | `techspec.md#technical-decisions` | Design decisions | T01 (01, 02, 12), T02 (03, 04, 13), T03 (05), T04 (05, 06), T05 (07, 08, 13), T06 (09, 10, 13), T07 (10, 11), T08 (14 check) | per task |
| TC-01..16, TC-18 | `techspec.md#test-approach` | Automated scenarios | per task | per task |
| TC-17 | `techspec.md#test-approach` | Built CLI on a TokenHound-like fixture | QA run (`sdd-execute-qa`), after review | `qa_01/qa.md` |

## Tasks

- [T01 — Report unrecognized keys in doctor and let remove proceed](done/task_01.md): `doctor` names every unrecognized key and the fix; `remove` proceeds; sanitizer and tolerant read.
- [T02 — Repair the configuration in init](done/task_02.md): `init` previews the keys it drops and rewrites a valid file idempotently.
- [T03 — Retired-event cleanup for Claude Code](done/task_03.md): shared surgical helper plus Claude Code `init` and `remove`.
- [T04 — Retired-event cleanup for the other harnesses](done/task_04.md): Codex CLI, Cursor, Antigravity, and Copilot.
- [T05 — Persist the harness exclusion](done/task_05.md): `excludedHarnesses`, resolver, and `init` keeping an excluded harness off.
- [T06 — Delete the artifacts of an excluded harness](done/task_06.md): reuse `remove`'s per-harness logic; edge cases.
- [T07 — Report and clear the exclusion](done/task_07.md): `doctor`, text lines, and `remove`.
- [T08 — Document and close the gates](done/task_08.md): README, research note, schema/budget/coverage gates.

## Coverage gate

- Coverage: pass. Every FR, NFR, and OBJ maps to a task and a TC; TC-17 is the QA run, not a task.
- Traceability: pass. DEC-01..14 and CMP-01..18 appear in the tasks that implement them.
- Dependencies: pass. Acyclic; T03/T04 are independent of T01/T02/T05..T07 but run in the order above because no two tasks may edit `installation-builder.ts` or `installation-service.ts` at once.
- Atomicity: pass. Each task is one reviewable result with its tests; the largest (T05, T06) touch five and six source files with one new file each and are sized for one session.
- Executability: pass. Commands are the `AGENTS.md` commands; fixtures follow the formats in `docs/research/harness-integrations.md`.
- Validation profile: pass. All TCs except TC-17 run in process; platforms Linux/macOS/Windows; the symbolic-link case skips with a reason where links are unavailable (`tests/helpers/link-capability.ts`); TC-17 runs the built CLI against a temporary fixture repository.
- Idempotency: pass. T02, T03, T04, T05, and T06 each assert a second run plans no change.

## Assumptions and open items

- Decision (HIL 2, DEC-HIL-02): FR-01's `init` clause is met by the preview (OI-01, `DEC-03`) and `remove` reads tolerantly (OI-02, `DEC-12`). The PRD text is unchanged; reviewers read FR-01 together with these decisions.
- Open item: none.
- Required environment: None beyond the repository (no installed harness binary; detection and version probes use fixtures and `fakeProcessRunner`). Built-CLI acceptance (TC-17) needs `npm run build` and a temporary directory, covered by HIL 2's authorization for QA.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [x] T07 — done
- [x] T08 — done

## Problems and solutions

- None.
