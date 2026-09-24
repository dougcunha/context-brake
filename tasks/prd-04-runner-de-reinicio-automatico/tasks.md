# Implementation plan — Runner de reinício automático (prd-04)

## Stable sources

- PRD: `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
- TechSpec: `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | Runner contracts, `runner` configuration section, exit codes, and published run-summary schema | — | T02, T03, T05, T06, T07 |
| T02 | Session evaluation and run limits decide advancement, corrections, and stops | T01 | T04 |
| T03 | Preflight, command approval model, and runner prompt | T01 | T04 |
| T04 | Core run loop drives sessions to completion or a named stop and builds the summary | T02, T03 | T08 |
| T05 | Validation executor, run store, approval store, and run lock on disk | T01 | T06, T08 |
| T06 | Session zone extraction, ledger watcher, and `wrap` | T01, T05 | T08 |
| T07 | Harness session process and Claude Code / Codex CLI launchers with a fake harness | T01 | T08 |
| T08 | `context-brake run` command with confirmations, shutdown, and text/JSON output | T04, T05, T06, T07 | T09 |
| T09 | End-to-end acceptance with the fake harness, including autonomy and interrupt | T08 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| RF1 | `prd.md#execução-de-sessões` | `run` opens sessions through a documented non-interactive mode | T07, T08 | TC-14, TC-19, TC-20 |
| RF2 | `prd.md#execução-de-sessões` | Each session starts with the boot | T03, T07, T09 | TC-02, TC-20 |
| RF3 | `prd.md#execução-de-sessões` | End session on signal, critical ceiling, or harness exit | T04, T06, T07 | TC-10, TC-15, TC-23 |
| RF4 | `prd.md#avanço-de-passos` | Advance only after runner-run validation passes | T02, T09 | TC-02, TC-20 |
| RF5 | `prd.md#avanço-de-passos` | Correct unvalidated completions and record the divergence | T02, T09 | TC-03, TC-20 |
| RF6 | `prd.md#avanço-de-passos` | Succeed when all steps are complete and validated | T04, T09 | TC-01, TC-20 |
| RF7 | `prd.md#limites-e-condições-de-parada` | Session, duration, and token ceilings | T01, T02, T04 | TC-05, TC-21 |
| RF8 | `prd.md#limites-e-condições-de-parada` | Anti-loop stop for human decision | T02, T09 | TC-04, TC-21 |
| RF9 | `prd.md#limites-e-condições-de-parada` | Stop on missing checkpoint and signal, preserving state | T02, T09 | TC-06, TC-21 |
| RF10 | `prd.md#limites-e-condições-de-parada` | Validation timeout | T05, T09 | TC-11, TC-21 |
| RF11 | `prd.md#aprovação-e-retomada` | Step approval mode | T04, T08, T09 | TC-09, TC-24 |
| RF12 | `prd.md#aprovação-e-retomada` | Clean interrupt with valid state and no harness processes | T04, T08, T09 | TC-22 |
| RF13 | `prd.md#aprovação-e-retomada` | Resume from the pending step | T04, T09 | TC-22 |
| RF14 | `prd.md#segurança-da-execução` | Confirm commands on first run and on change | T03, T05, T08 | TC-07, TC-13, TC-19 |
| RF15 | `prd.md#segurança-da-execução` | Harness permission modes untouched by default | T07, T08 | TC-17 |
| RF16 | `prd.md#telemetria-por-comando-e-relatório` | `wrap` attaches session telemetry | T06, T09 | TC-16, TC-24 |
| RF17 | `prd.md#telemetria-por-comando-e-relatório` | Per-session local record | T01, T05, T09 | TC-12, TC-18 |
| RF18 | `prd.md#telemetria-por-comando-e-relatório` | Summary in text and JSON | T01, T04, T08 | TC-18 |
| CA-01–CA-14 | `prd.md#critérios-de-aceitação` | Acceptance criteria | T09 (end to end); T02–T08 (lower layers) | TC-17–TC-24 |
| DEC-01, DEC-04, DEC-05 | `techspec.md#technical-decisions` | Launcher port, stdin prompt, Windows shims, session end | T07 | TC-14, TC-15 |
| DEC-02, DEC-21 | `techspec.md#technical-decisions` | Supported harnesses and runnable-plan preflight | T03, T08 | TC-08, TC-19 |
| DEC-03 | `techspec.md#technical-decisions` | Boot via hook, runner prompt, boot tokens estimated | T03, T04 | TC-02 |
| DEC-06 | `techspec.md#technical-decisions` | Ledger watcher and critical grace | T04, T06 | TC-10 |
| DEC-07 | `techspec.md#technical-decisions` | Evaluation order and plan reconciliation | T02 | TC-02, TC-03, TC-06 |
| DEC-08, DEC-09 | `techspec.md#technical-decisions` | Runner configuration and limit enforcement | T01, T02 | TC-05 |
| DEC-10 | `techspec.md#technical-decisions` | Hash-bound approvals outside versioned files | T03, T05, T08 | TC-07, TC-13 |
| DEC-11 | `techspec.md#technical-decisions` | Shell validation executor | T05 | TC-11 |
| DEC-12, DEC-13 | `techspec.md#technical-decisions` | Shutdown controller, snapshot restore, lock | T04, T05, T08 | TC-12, TC-22 |
| DEC-14, DEC-15, DEC-16 | `techspec.md#technical-decisions` | Run records, summary schema, exit codes | T01, T05, T08 | TC-12, TC-18 |
| DEC-17 | `techspec.md#technical-decisions` | Step approval behavior with and without a TTY | T04, T08 | TC-09, TC-24 |
| DEC-18 | `techspec.md#technical-decisions` | `--harness-arg` pass-through and permission notice | T07, T08 | TC-17 |
| DEC-19, DEC-20 | `techspec.md#technical-decisions` | `wrap` behavior and zone extraction | T06 | TC-16 |
| DEC-22 | `techspec.md#technical-decisions` | Fake harness on `PATH` | T07, T09 | TC-15, TC-23 |

## Tasks

- [T01 — Runner contracts, configuration, exit codes, and summary schema](done/task_01.md): runner records, ports, the optional `runner` configuration section, new exit codes, and `run-summary.schema.json` exist and validate.
- [T02 — Session evaluation and run limits](done/task_02.md): pure services decide checkpoint freshness, validation-driven advancement, status corrections, anti-loop, and every limit stop.
- [T03 — Preflight, approval model, and runner prompt](done/task_03.md): runnable-plan checks, command hashes and listings, and the versioned runner prompt.
- [T04 — Core run loop and summary](done/task_04.md): the loop runs sessions over ports to completion or a named stop, with step approval, critical grace, interrupt restore, and the summary.
- [T05 — Runner storage, validation executor, and lock](done/task_05.md): validation commands run with timeout and tree kill; run records, approvals, and the lock persist safely.
- [T06 — Session zone, ledger watcher, and `wrap`](done/task_06.md): zone math is shared, the runner can watch a session ledger, and `wrap` appends session telemetry.
- [T07 — Harness session process and launchers](done/task_07.md): Claude Code and Codex CLI sessions launch from constant argv with a stdin prompt, stream into neutral events, and stop cleanly, against a fake harness.
- [T08 — `run` command](done/task_08.md): the CLI command wires everything with confirmations, shutdown, progress, and JSON summary.
- [T09 — End-to-end acceptance](done/task_09.md): CA-01–CA-14 pass against the built CLI and the fake harness, including 20×10 autonomy and Ctrl+C.

## Coverage gate

- **Coverage:** pass. RF1–RF18, CA-01–CA-14, DEC-01–DEC-22, and TC-01–TC-24 each map to at least one task. Deferred launchers for Copilot CLI, Cursor, and OpenCode are an explicit TechSpec open item, not a dropped obligation.
- **Traceability:** pass. Each task cites PRD and TechSpec IDs.
- **Dependencies:** pass. The graph is acyclic: T01 → {T02, T03, T05, T07}; {T02, T03} → T04; {T01, T05} → T06; {T04, T05, T06, T07} → T08 → T09.
- **Atomicity:** pass. Each task is one vertical result with its own tests. The foundation (T01) unlocks five tasks, which justifies separating it.
- **Executability:** pass. Commands come from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run package:smoke`.
- **Validation profile:** pass.
  - End-to-end scope: only the `run`/`wrap` flows the TechSpec marks (TC-17–TC-24), running the built CLI against fixture repositories with the fake harness on `PATH`.
  - Platforms: Linux, macOS, and Windows specified. Local evidence is Windows only (PI-03).
- **Idempotency:** pass. Re-running `run` resumes from the plan, schema generation is deterministic, and approvals are keyed by hash.

## Assumptions and open items

- **Assumption:** the Codex CLI reads the `exec` prompt from stdin. T07 rechecks the vendor docs and applies the TechSpec fallback, raising an exception HIL if support is reduced.
- **Assumption:** the harness passes `CONTEXT_BRAKE_RUN_ID` through the inherited environment to its shell tool. This is standard process inheritance, not vendor-documented. T09 proves it only for the fake harness; manual acceptance covers real harnesses.
- **Open item:** launchers for GitHub Copilot CLI, Cursor, and OpenCode are deferred (TechSpec DEC-02). Decision owner: the user, in a future PRD revision.
- **Required environment:**
  - Git and Node ≥ 20 for fixture repositories. There are no real harnesses or credentials.
  - The Linux and macOS matrix is not available locally (PI-03), an accepted evidence limit.

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

- **T01, configuration schema published `runner` as required.** `z.toJSONSchema` in its default output mode lists defaulted sections as required, and `brake` was already affected. The configuration schema is now generated with `io: 'input'` in both `generate-schemas.ts` and `check-schemas.ts`, so `brake` and `runner` are optional, matching the parser. See `done/task_01.md#Handoff`, open item 2.
- **T01, lint baseline.** `npm run lint` reports 14 errors in `tasks/prd-03-plano-checkpoint-e-boot/qa_01/evidence/*.mjs`. They predate this feature and are unrelated to it. Later tasks should compare lint results against this baseline.
- **T02, limit semantics for T04.** `session_timeout` ends only the session, while `run_timeout` and `token_limit` stop the run with `limit_reached`. `step_removed` is a gate outcome. Reconciliation needs the plan as snapshotted at session start. See `done/task_02.md#Handoff`, open items 1–4.
- **T04, contracts for T05 and T08.** New ports live in `src/core/contracts/run-control.ts`. `buildRunSummary` takes the exit code, and T08 owns the mapping. The initial command approval runs inside `runPlan`. `RunStore.restoreState` must keep the invalid copy. See `done/task_04.md#Handoff`, open items 2 and 5–7.
- **T05, adapter contracts for T08.** `RunLock.acquire` returns `null` when acquired, or the live holder, which maps to `RUN_IN_PROGRESS`. `pruneRuns` keeps 19 runs, so the next run makes 20. Run ids must be safe directory names. `NodeRunStore` takes the resolved plan and checkpoint paths. See `done/task_05.md#Handoff`, open items 2, 3, and 5.
- **T05, timeout test flake.** Under full-suite load, cmd.exe plus Node startup can outlast a 1 s timeout before a fixture's first write. Assert descendant readiness only where the test waits for it (the `stop()` case), not inside a 1 s timeout. See `done/task_05.md#Handoff`, open item 4.
- **T06, shared spawn rule and `wrap` behavior.** `src/infrastructure/process/executable-command.ts` holds the DEC-04 Windows shim rule once, and T07 reuses it. `wrap` finds its run by walking up from the working directory, and it never lets a telemetry failure change the child's exit code. See `done/task_06.md#Handoff`, open items 1–5.
- **T07, launcher contracts for T08 and the fake harness for T09.** Codex documents the stdin prompt through `-`, so the TechSpec fallback did not apply. `parseLine` throws on an unparseable line, and the session process counts it. T08 must call `assertHarnessArguments` in preflight so a forbidden Windows shim character becomes `INVALID_ARGUMENTS` rather than a `harness_error` session. The fake harness does not yet run the built hooks or follow multi-session scripts; T09 extends it. See `done/task_07.md#Handoff`, open items 2–4.
- **T08, a real harness launched during a smoke test.** In Git Bash, prepending a `C:/…` directory to `PATH` splits the entry at the drive colon. The real `claude.exe` therefore ran two headless sessions in a scratch project (about 545k tokens) instead of the fake harness. Solution: harness-launching tests use only `tests/helpers/run-project.ts` `runEnvironment`. It builds a sealed `PATH` (fake bin, the node directory, and the system directory) and throws `RealHarnessReachableError` before launch if a real `claude` or `codex` is reachable. Never smoke-test `run` against a hand-edited developer `PATH`. See `done/task_08.md#Handoff`, open item 1.
- **T08, CLI contracts for T09 and the review.** A forbidden shim argument is `INVALID_ARGUMENTS`, exit 64 (existing contract), not 2. `--approve-commands` covers only the hashes listed at the start of the invocation. Preflight errors are `INVALID_STATE_FILE`, `RUN_PLAN_NOT_RUNNABLE`, `RUN_HARNESS_UNSUPPORTED`, `RUN_HARNESS_MISSING`, and `RUN_IN_PROGRESS`, all exit 2. Ctrl+C at a TTY prompt ends as the approval stop, not 130. See `done/task_08.md#Handoff`, open items 3–6.
- **T09, fake-harness contract and one observation for the review.** The fake harness runs the installed hook script directly for `SessionStart` and one `PostToolUse` per session. It follows `sessions[]` through a counter file that `useScenario` resets, and it uses the id `fake-session-<n>` per session. Acceptance suites go through `tests/helpers/run-acceptance.ts` on the sealed `PATH`. Observation: `finalZone` can be `null` for a session that ends within 1 s of its last hook, because the ledger watcher takes no final reading (DEC-06). No change was made. See `done/task_09.md#Handoff`, open items 2–3.
