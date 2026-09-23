# Implementation plan — Plano, checkpoint e boot (prd-03)

## Stable sources

- PRD: `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
- TechSpec: `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Plan and checkpoint entities, versioned schemas, and strict validators | — | T02, T03, T04, T08 |
| T02 | `plan init` creates valid plan and checkpoint without overwriting | T01 | T07 |
| T03 | Git inspector and checkpoint-versus-repository divergence | T01 | T04, T07 |
| T04 | Boot summary, delivery policy, and token budget | T01, T03 | T05 |
| T05 | Boot reaches every session-boot-capable harness | T04 | T09 |
| T06 | Protocol honors the checkpoint-commit switch | — | T09 |
| T07 | `plan status` with text and JSON output | T02, T03 | — |
| T08 | Both schemas generated, checked, and published | T01 | — |
| T09 | Simulated boot adherence and long-task acceptance | T05, T06 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| RF1, RF3 | `prd.md#criação-do-plano` | `plan init` creates plan and checkpoint with an example step | T02 | TC-01 |
| RF2 | `prd.md#criação-do-plano` | No overwrite without explicit confirmation | T02 | TC-02 |
| RF4 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Plan records task, current step, and step fields | T01 | TC-03 |
| RF5 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Checkpoint records git state and working memory | T01 | TC-16 |
| RF6 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Versioned schemas published with the package | T08 | TC-18 |
| RF7 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Validate both files, including consistency rules | T01, T07 | TC-03 |
| RF8 | `prd.md#conteúdo-e-validação-dos-arquivos-de-estado` | Accept prior schema versions or name the migration | T01 | TC-16 |
| RF9 | `prd.md#boot-no-início-da-sessão` | Deliver the boot on new sessions in all six supported harnesses and after compaction on the four documented channels | T04, T05, T09 | TC-05 |
| RF10 | `prd.md#boot-no-início-da-sessão` | No boot without an active plan or when all steps are done | T04 | TC-06 |
| RF11 | `prd.md#boot-no-início-da-sessão` | Invalid state yields only a short instruction | T04, T05 | TC-04 |
| RF12 | `prd.md#boot-no-início-da-sessão` | Respect the size limit, never reducing constraints | T04 | TC-07, TC-08 |
| RF13 | `prd.md#boot-no-início-da-sessão` | Protocol file keeps the full boot routine | T06 | TC-13 |
| RF14 | `prd.md#verificação-do-estado-herdado` | Compare checkpoint commit and tree with the repository | T03 | TC-09, TC-10 |
| RF15 | `prd.md#verificação-do-estado-herdado` | Instruct running the validation command before editing | T04, T09 | TC-11 |
| RF16 | `prd.md#verificação-do-estado-herdado` | Work without git, reporting the omission | T03 | TC-12 |
| RF17, RF18 | `prd.md#checkpoint-e-commit` | Red-zone commit instruction, switchable by configuration | T06 | TC-14 |
| RF19, RF20 | `prd.md#status-da-tarefa` | `plan status` with text and JSON output | T07 | TC-15 |
| CA-11 | `prd.md#critérios-de-aceitação` | Simulated agent runs validation within 3 tool calls | T09 | TC-11 |
| CA-17 | `prd.md#critérios-de-aceitação` | 20 simulated sessions leave valid checkpoint and commit | T09 | TC-17 |
| DEC-01, DEC-02, DEC-04, DEC-05, DEC-15 | `techspec.md#technical-decisions` | Boot delivery path, Cursor session identifier, compaction limit, and excluded harnesses | T05, T09 | TC-04, TC-05 |
| DEC-06, DEC-07 | `techspec.md#technical-decisions` | Tolerant runtime reader kept; dedicated validation errors | T01 | TC-03 |
| DEC-09 | `techspec.md#technical-decisions` | Git through the existing `ProcessRunner` port | T03 | TC-12 |
| DEC-10 | `techspec.md#technical-decisions` | Fixed boot reduction order | T04 | TC-07 |
| DEC-11 | `techspec.md#technical-decisions` | `instructCheckpointCommit` threaded into the protocol | T06 | TC-14 |
| DEC-13, DEC-14 | `techspec.md#technical-decisions` | Refusal without `--yes`; extracted plan argument parser | T02 | TC-02 |

## Tasks

- [T01 — Plan and checkpoint entities, schemas, and validators](done/task_01.md): both owned files have versioned schemas and strict validation with field-level errors.
- [T02 — `plan init` scaffold and stores](done/task_02.md): `plan init` creates valid files atomically and refuses to overwrite without confirmation.
- [T03 — Git inspector and divergence detection](done/task_03.md): the recorded commit and working tree are compared against the repository, and absence of git is reported.
- [T04 — Boot summary, policy, and budget](done/task_04.md): boot content, suppression, invalid-state instruction, and the token budget with constraints preserved.
- [T05 — Boot delivery across harnesses](done/task_05.md): the boot reaches every session-boot-capable harness through existing events.
- [T06 — Protocol checkpoint-commit switch](done/task_06.md): the red-zone routine reflects `instructCheckpointCommit`.
- [T07 — `plan status` command](done/task_07.md): progress and file validity in text and JSON.
- [T08 — Schema publishing and packaging](done/task_08.md): both schemas generated, checked, and shipped.
- [T09 — Simulated boot and long-task acceptance](done/task_09.md): simulated sessions prove boot adherence and the red-zone protocol.

## Coverage gate

- Coverage: pass — every `RF1`–`RF20` and `CA-01`–`CA-17` maps to at least one task; `CA-01`–`CA-17` map through `TC-01`–`TC-18`.
- Traceability: pass — each task carries PRD and TechSpec IDs; no obligation is delivered without a test.
- Dependencies: pass — the graph is acyclic; T02 precedes T07 so both do not edit `argument-parser.ts` and `composition-root.ts` concurrently.
- Atomicity: pass — each task is a vertical slice with implementation and tests; T01 is foundation because it unlocks four deliveries.
- Executability: pass — commands come from `AGENTS.md`; no invented command.
- Validation profile: pass — end-to-end limited to `plan init`, `plan status`, and the simulated suites the TechSpec marks end-to-end; unit and integration cover the rest. Platforms: Linux, macOS, Windows, with local evidence expected on Windows only.
- Idempotency: pass — `plan init` refuses a second run without `--yes`; protocol rendering is content-compared before writing.

## Assumptions and open items

- Assumption: `schemaVersion: 1` is the first published version of both files, so `RF8` and `CA-16` are satisfied by accepting version 1 and naming the migration for any other value (`DEC-08`).
- Open item: Pi and Oh-My-Pi boot delivery follows documented behavior with no local installation (prd-02 `O-02`, gaps `OI-03`/`OI-04`); fixtures follow `docs/research/harness-integrations.md` and the gap stays recorded. Affects T05. Owner: user.
- Approved exception `DEC-EX-T05`: Cursor and GitHub Copilot CLI have no documented post-compaction context channel. T05 and T09 verify their new-session boot and retain the protocol-file routine after compaction; Claude Code, Codex CLI, Pi, and Oh-My-Pi also verify post-compaction boot.
- Open item: the Linux/macOS × Node 20/22/24 CI matrix (prd-02 `O-04`) has not run and bounds this feature's platform evidence. Affects T09 and final acceptance. Owner: user.
- Required environment: git on `PATH` for T03, T07, and T09 repository scenarios; tests skip with a stated reason when git is unavailable, never pass silently. No other environment or external authorization is required.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done after CR-01/T10 reconciliation
- [x] T06 — done
- [x] T07 — done
- [x] T08 — done
- [x] T09 — done

## Problems and solutions

- T09 reopened after `codereview_01/CR-03`: its original handoff claimed a clean working tree for all 20 sessions per harness, but the `failure_above_ceiling` profile permitted a modified configuration file. T12 kept the failure probe, restored the exact installed configuration, and made the empty final Git status assertion unconditional. Its full two-worker coverage run passed all 20 sessions per full-level harness. The original handoff is preserved with a correction note in `done/task_09.md`; T09 is closed again on that current evidence through T11. T11 also repaired the stale manifest link reported as CR-02. Independent re-review remains pending.
- T05 reopened after `codereview_01/CR-01`: the original `done/task_05.md#Handoff` proved transport but `NodeBootReader` always passed an empty Git comparison, leaving RF9/RF14/RF16 and CA-09/10/12 incomplete at delivery. The original handoff is preserved. T10 supplies the missing runtime comparison and built-hook evidence, so T05 was closed again after current validation. T09 remains a dependent task whose CA-17 evidence is handled by T12/T11.
- T01: `src/core/validation/issues.ts` was added although the task listed no such file, to hold the shared `{path, received, rule}` issue helpers. Without it the same block would sit in three places and trip the escalation trigger. Same layer, no contract change; recorded in the T01 handoff. `configuration-validator.ts` keeps its own private copies, since T01 only reads that file.
- T01: a transient `max-lines-per-function` lint failure (a 36-line `describe` against the 30-line limit) was introduced and fixed inside the task by splitting it into `task plan contract` and `task plan consistency rules`. The rule counts a `describe` callback as a function, which is worth knowing for every later test task.
- T02: `src/core/contracts/diagnostics.ts` and `src/core/services/report-service.ts` were modified although T02 listed neither. The CLI error `command` union was pinned to `'init'|'remove'|'doctor'` in both, so registering `plan` in error attribution was impossible without extending them. `cliErrorSchema` is not published, so `schemas/` is unaffected.
- T02: `plan status` parsing was deferred to T07 even though `T02.3` mentioned it, to avoid shipping a command surface nothing serves. The parser rejects `plan status` with exit 64 today and the e2e asserts it.
- T02: coverage does not follow into the process the e2e suite spawns, so a command module tested only end-to-end reads as roughly 20% covered. `plan.ts` sat at 22% until an in-process test was added, lifting it to 92%. Any later task adding a CLI command needs an in-process test, not only e2e. Such a test imports `/cli/commands/`, a `PROCESS_MARKERS` string, so it must also be listed in `PROCESS_LANE_FILES`.
- T03: `ProcessRunner` has no `cwd` field, so the inspector passes the repository root with git's `-C` argument. This keeps every call as an argument array with a timeout under DEC-09, without changing the shared port. A branch with no head commit still reports an existing recorded commit as outside history; its current commit is `null`.
- T04: The boot renderer uses UTF-8 byte length as a conservative token upper bound without adding a runtime tokenizer dependency to session-start hooks. This can reduce optional file and decision text before the configured token ceiling, while preserving constraints. `tests/unit/boot-policy.test.ts` was added beyond the task's original file list to cover invalid-state branches without exceeding the 100-line source limit. A default-worker full test run had one 30-second timeout in an unrelated doctor e2e case; that case passed alone and in the full coverage run with four workers.
- T05: The runtime bundle import guard (DEC-02 / TC-24) rejects any runtime asset importing child_process. NodeBootReader in runtime-composition was kept free of NodeProcessRunner and child_process imports, avoiding process spawning in runtime hooks and extensions while passing the bundle guard.
- T05: ESLint max-params (<= 3) and max-lines-per-function (<= 30) required refactoring handleReset in Pi and Oh-My-Pi runtime handlers to recordBoot(event, context, state), and splitting the boot-invalid-state integration test into separate describe blocks.
- T06: DEFAULT_CONFIG enables instructCheckpointCommit by default, making renderProtocol(DEFAULT_CONFIG) byte-exact with docs/context-brake-protocol.md. To prevent duplicate string templates across services, zoneRedClause in zone-actions.ts handles the conditional commit sentence while preserving update instructions for both plan and checkpoint files.
- T07: `plan status` report construction requires inspecting git status, for which `NodeGitInspector` is injected with dynamic timestamp `now: new Date()` in CLI commands and deterministic `new Date(0)` in tests to comply with clock isolation (QA-08). `doctor` state file checking was upgraded from JSON syntax to full schema and cross-consistency validation; legacy test fixtures in `tests/support/harness-simulator/scenarios.ts` and `tests/e2e/e2e-brake.test.ts` were updated to emit schema-compliant v1 state objects so `doctor` runs without unexpected schema errors.
- T08: `tests/unit/schemas.test.ts` and `tests/integration/package-contents.test.ts` were extended with tests for draft-2020-12 adherence and schemaVersion: 1 consistency across the newly published `task-plan.schema.json` and `state-checkpoint.schema.json`. Splitting test blocks ensured ESLint max-lines-per-function and max-lines rules remained clean.
- T09: Simulated long-task acceptance required `.gitignore` to be initialized and committed with `task_plan.json` and `state_checkpoint.json` in test fixture repositories before state files were updated, preventing `git status --porcelain` from flagging untracked state files while ensuring state files are never included in git commits. In the `failure_above_ceiling` scenario where `context-brake.config.json` is intentionally corrupted to assert fail-closed behavior, git status correctly reports the modified config file. ESLint max-lines-per-function in `e2e-simulated-boot.test.ts` was resolved by extracting `runWithBootRoot` and `assertBoot` helpers and splitting startup and compaction test blocks.
