# Implementation plan — Interactive configuration assistant in init

## Stable sources

- PRD: `tasks/prd-16-configuracao-guiada-assistente-no-init/prd.md`
- TechSpec: `tasks/prd-16-configuracao-guiada-assistente-no-init/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `init --max-restarts N` writes the consecutive-restart limit; `--interactive` and `--max-restarts` parse with their argument errors | — | T02, T04 |
| T02 | Terminal detection, the trigger rule, the prompt port with a scripted fake, and the `--interactive` no-TTY gate | T01 | T03, T05 |
| T03 | The assistant questions, in order, with defaults, facts, validation, and re-ask, producing a flag list | T01, T02 | T05 |
| T04 | The equivalent command (shell-neutral quoting) and the summary text | T01 | T05 |
| T05 | `init` runs the assistant, re-parses its flags, confirms once through the port, and cancels cleanly | T02, T03, T04 | T06 |
| T06 | README and the terminal probe document; gates; manual acceptance recorded | T05 | — |

Execution order: T01, T02, T03, T04, T05, T06 (one task per run).

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Assistant trigger, `--interactive`, argument errors | T01, T02, T05 | TC-03, TC-04, TC-05 |
| FR-02 | `prd.md#functional-requirements` | Questions in order, only the applicable ones | T03 | TC-06 |
| FR-03 | `prd.md#functional-requirements` | Defaults and facts on each question | T03 | TC-06 |
| FR-04 | `prd.md#functional-requirements` | Invalid answers re-asked with the rule | T03 | TC-07 |
| FR-05 | `prd.md#functional-requirements` | Deselecting a harness excludes it (prd-15) | T03, T05 | TC-09 |
| FR-06 | `prd.md#functional-requirements` | Summary and equivalent command | T04, T05 | TC-08, TC-10 |
| FR-07 | `prd.md#functional-requirements` | One confirmation; cancel writes nothing; dry run | T05 | TC-11 |
| FR-08 | `prd.md#functional-requirements` | No change without the assistant | T02, T05 | TC-05, TC-12 |
| FR-09 | `prd.md#functional-requirements` | `--max-restarts` | T01 | TC-01, TC-02 |
| FR-10 | `prd.md#functional-requirements` | TTY probe documented; fallback | T02, T06 | TC-05, TC-15 |
| NFR-01 | `prd.md#non-functional-requirements` | Line-based prompts, no color-only meaning | T03, T04 | TC-13 |
| NFR-02 | `prd.md#non-functional-requirements` | `--json` never prompts; schemas unchanged | T04, T05 | TC-13 |
| NFR-03 | `prd.md#non-functional-requirements` | In-process, within the budget (180 s per `AGENTS.md`) | every task, T06 | TC-12 |
| NFR-04 | `prd.md#non-functional-requirements` | Platforms per the probe | T06 | TC-15 |
| OBJ-01..05 | `prd.md#outcomes-and-metrics` | Outcomes | T01, T05, T06, QA run | TC-02, TC-10, TC-12, TC-14, TC-15 |
| DEC-01..10 | `techspec.md#technical-decisions` | Design decisions | T01 (01, 08), T02 (01, 02, 09), T03 (03, 04), T04 (06), T05 (02, 05, 07, 10), T06 (09) | per task |
| TC-14 | `techspec.md#test-approach` | Built CLI checks | QA run (`sdd-execute-qa`) | `qa_01/qa.md` |
| TC-15 | `techspec.md#test-approach` | Real-terminal probe | person (manual acceptance) | `docs/research/terminal-tty.md` |

## Tasks

- [T01 — Add --max-restarts and the new flag parsing](done/task_01.md): the limit flag and the `--interactive` parse-time rules.
- [T02 — Terminal, trigger rule, and prompt port](done/task_02.md): detection, `shouldRunAssistant`, `PromptPort`, scripted fake, and the no-TTY gate.
- [T03 — Assistant questions](done/task_03.md): ordered, validated questions that return a flag list.
- [T04 — Equivalent command and summary](done/task_04.md): shell-neutral quoting and the summary text.
- [T05 — Run the assistant from init](done/task_05.md): wiring, re-parse, single confirmation, cancel, dry run, equivalence.
- [T06 — Document and close the gates](done/task_06.md): README, terminal probe document, gates, manual acceptance.

## Coverage gate

- Coverage: pass. Every FR, NFR, and OBJ maps to a task and a TC; TC-14 is the QA run and TC-15 is manual acceptance by the person.
- Traceability: pass. DEC-01..10 and CMP-01..10 appear in the tasks that implement them.
- Dependencies: pass. Acyclic; T03 and T04 are independent of each other but run in the listed order because both read the flag vocabulary introduced by T01.
- Atomicity: pass. T03 is the largest (four small question modules plus tests) and is sized for one session; if it overruns, split harness+snapshot from restart+misc without changing IDs.
- Executability: pass. Commands are the `AGENTS.md` commands; no harness binary or pseudo-terminal is needed because prompts run through the scripted port.
- Validation profile: pass. TC-01..TC-13 run in process; TC-14 runs the built CLI against a fixture directory; TC-15 needs real terminals (owner: the person) and is recorded as manual acceptance.
- Idempotency: pass. T01 and T05 assert that replaying the printed command plans no further change.

## Assumptions and open items

- Assumption: the 180 s test budget in `AGENTS.md` governs (PRD NFR-03 text says 120 s; unchanged, OI-03).
- Decision (HIL 2, DEC-HIL-02): OI-01 skip the restart question when no selected harness has a restart mode (T03); OI-02 the FR-10 measurement is not run now, the table stays "not measured" and OBJ-05 is recorded as an open limitation at acceptance (T06); OI-03 follow the 180 s rule.
- Open item: none.
- Required environment: None for T01..T05 (all in process). T06 manual acceptance (TC-15): deferred by the person at HIL 2; it needs real Git Bash (mintty), PowerShell 7, and Windows PowerShell 5.1 terminals and is not run in this cycle.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done

## Problems and solutions

- None.
