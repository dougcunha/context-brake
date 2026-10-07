# Implementation plan — Light mode as the only mode

## Stable sources

- PRD: `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
- TechSpec: `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`

> Common sources come before the task and mutable state; read order does not guarantee a cache hit.

## Dependency graph

| ID | Delivery | Depends on | Unblocks |
| --- | --- | --- | --- |
| T01 | `run`, `wrap`, and the runner are gone, along with the `runner` config key, the run summary schema, `RUN_*` codes, their tests, and their lane entries | — | T02 |
| T02 | Plan mode is gone: `plan` command, plan and checkpoint contracts, boot, stores, readers, and schemas, and the Claude Code mod checkpoint gate | T01 | T03 |
| T03 | Single mode: the `snapshot` config section, `init` snapshot flags, one guidance module with resume text, and the doctor `snapshot` field. `lightMode`, `fullMode`, and `delegatedSnapshot` are gone | T02 | T04, T06 |
| T04 | No deny in core or adapters: the `deny` decision, block log, allowlists, brake mode, deny branch of the failure policy, `brake` config key, and brake window report are gone. Pre-tool hooks still exist and return neutral | T03 | T05 |
| T05 | No pre-tool hooks: the `pre_tool` event, hook registrations, payload schemas, and fixtures are gone on all eight harnesses. Capabilities are reduced and support levels are `full`/`partial` | T04 | T07 |
| T06 | `init`/`remove` without the protocol file, instruction blocks, `.gitignore` block, `instructionFiles`, or `--remove-state`. The doctor findings for these are gone | T03 | T07 |
| T07 | Documentation, rules, and SDD skill texts describe one mode. Acceptance mode is gone. This repository runs on the new install (MA-01) | T05, T06 | — |

## Traceability matrix

| Source ID | Source section | Obligation | Tasks | Evidence or test |
| --- | --- | --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Remove plan mode, checkpoint, boot, `plan` command | T02 | TC-02, `plan` rejected in TC-01 |
| FR-02 | `prd.md#functional-requirements` | No mode choice; removed keys and flags rejected | T01, T02, T03, T04, T06 (each removes its key) | TC-04, TC-06 |
| FR-03 | `prd.md#functional-requirements` | Remove `run`, `wrap`, `runner`, run summary schema, runner codes | T01 | TC-01 |
| FR-04 | `prd.md#functional-requirements` | Trigger zone setting and optional snapshot/resume commands with flags | T03 | TC-05 |
| FR-05 | `prd.md#functional-requirements` | Action names the command at the trigger zone; resume text after reset | T03 | TC-07, TC-08 |
| FR-06 | `prd.md#functional-requirements` | Without a command, header and generic action without the marker | T03 | TC-08 |
| FR-07 | `prd.md#functional-requirements` | Advisory brake, no deny, no allowlists or block log | T04, T05 | TC-09, TC-10, TC-11 |
| FR-08 | `prd.md#functional-requirements` | No protocol, blocks, gitignore, state files; no `--remove-state` | T06 | TC-12 |
| FR-09 | `prd.md#functional-requirements` | Doctor drops removed findings, reports snapshot settings | T03 (snapshot field), T04 (brake window), T06 (support-file findings) | TC-13, TC-14 |
| FR-10 | `prd.md#functional-requirements` | Mod restart gated on the signal only | T02 | TC-03 |
| FR-11 | `prd.md#functional-requirements` | This repository on the single mode | T07 | TC-17, MA-01 |
| FR-12 | `prd.md#functional-requirements` | Documentation describes only the single mode | T07 | TC-15, TC-16 |
| NFR-01 | `prd.md#non-functional-requirements` | Platforms unchanged | T01–T07 | Existing platform suites stay green; Windows run per task |
| NFR-02 | `prd.md#non-functional-requirements` | Lint, typecheck, coverage 80%, schemas check | T01–T07 | Commands in each task |
| NFR-03 | `prd.md#non-functional-requirements` | Tests of removed features deleted, not skipped | T01–T07 | `rg -n "\.skip\(" tests` adds no new hit |
| NFR-04 | `prd.md#non-functional-requirements` | Hook overhead does not grow | T05 | Benchmark suites (`runtime-overhead`) stay within their limits |
| DEC-01 to DEC-16 | `techspec.md#technical-decisions` | Decisions | Per the task tables | — |
| TC-01 | `techspec.md#test-approach` | Unknown `run`/`wrap`/`plan` | T01, T02 | `tests/unit/main.test.ts`, `npm run package:smoke` |
| TC-02, TC-03 | `techspec.md#test-approach` | No plan modules; mod without checkpoint | T02 | `schemas`, `claude-mod-*` |
| TC-04 to TC-08 | `techspec.md#test-approach` | Config, flags, guidance, no-command behavior | T03 (TC-04 first proven in T01) | suites named in T03 |
| TC-09, TC-11 | `techspec.md#test-approach` | No pre-tool hook; capabilities and levels | T05 | `runtime-*`, `support-service` |
| TC-10, TC-14 | `techspec.md#test-approach` | Failure neutral; bridge finding | T04 | `runtime-failure-policy`, `doctor-context-window` |
| TC-12, TC-13 | `techspec.md#test-approach` | Init/remove without support files; doctor report | T06 (T03 for the `snapshot` field) | `e2e-07-08`, `doctor-light-mode` |
| TC-15 to TC-17, MA-01 | `techspec.md#test-approach` | Docs, text scan, repo doctor, manual | T07 | `readme-*`, manual |

## Tasks

- [T01 — Remove run, wrap, and the runner](done/task_01.md): the runner code, commands, config, schema, codes, and tests are gone.
- [T02 — Remove plan mode and the checkpoint gate](done/task_02.md): plan, checkpoint, and boot are gone, and the Claude Code mod restarts on the signal alone.
- [T03 — Single mode with an optional snapshot command](done/task_03.md): one config section, flags, guidance, resume text, and doctor field replace the three modes.
- [T04 — Remove the tool-call deny](done/task_04.md): no component can deny a tool call, and the deny-only code and config are gone.
- [T05 — Remove pre-tool hooks and deny capabilities](done/task_05.md): no harness installs a pre-tool hook, and support levels are `full`/`partial`.
- [T06 — Install and remove without support files](done/task_06.md): `init` and `remove` touch only the config, the manifest, harness assets, and runtime files.
- [T07 — Documentation and dogfooding](done/task_07.md): docs, rules, and skill texts match the single mode, and this repository runs on it.

## Coverage gate

- Coverage: pass. Every FR, NFR, DEC, and TC maps to at least one task. FR-02 and FR-09 are split by key and by finding family, each owned once.
- Traceability: pass. Each task lists its FR, DEC, and TC IDs.
- Dependencies: pass. The DAG is acyclic: T01 → T02 → T03 → {T04 → T05, T06} → T07.
- Atomicity: pass with a size risk. T04 and T05 each touch eight adapters, but the changes are mechanical deletions. T05 can split per harness group if a session runs short.
- Executability: pass. Commands come from `AGENTS.md`. The full suite takes about 10 minutes until prd-13, so each task runs touched suites and ends with one `npm run coverage`.
- Validation profile: pass. End-to-end is limited to the rewritten `e2e-09`, `e2e-07-08`, `e2e-10-fixtures`, `e2e-brake`, and `e2e-light-mode`, with no new e2e file. Platform: Windows local, with Linux and macOS unverified as the TechSpec records.
- Idempotency: pass. `init` twice yields no change (existing idempotency suites, rewritten in T03 and T06).

## Assumptions and open items

- Open item: amend FR-07's acceptance to "no pre-tool hook is installed" (DEC-07). This affects T05. If refused, T05 keeps the pre-tool hooks returning neutral and only drops the deny capabilities and support levels. The decision owner is the user, at HIL 2.
- Assumption: `shutdown.ts`, `exit-codes.ts` runner codes, and `config-legacy-checks.ts` are deleted when the typecheck shows no remaining importer.
- Required environment: MA-01 in T07 needs interactive Claude Code in this repository on Windows. The owner is the maintainer.

## State

- [x] T01 — done
- [x] T02 — done
- [x] T03 — done
- [x] T04 — done
- [x] T05 — done
- [x] T06 — done
- [x] T07 — done

## Problems and solutions

- T01: zod/mini reports an unknown key only as "Invalid input" at `(root)`. `parseConfiguration` now expands `unrecognized_keys` into one issue per key (`<parent>.<key>`, "is not a recognized key"), which FR-02 relies on for every removed key in T02-T06.
- T02: the `stateStorage` key moves to T06. In T02 it is still read by `protocol-service`, `gitignore-*`, `instruction-markers`, `block-message`, `brake-allowlist`, and `delegated-protocol`, which T03, T04, and T06 delete. Removing it in T02 would pull their deletion forward. Plan-mode behavior itself (command, boot, validators, stores, readers, mod gate) is gone in T02.
- T01: `tests/e2e/e2e-support-limitations.test.ts` timed out once at 30 s under full-suite load and passed alone. It is a pre-existing slow process test, left to prd-13.
- T03: tests that only fail because of later tasks were left red on purpose and listed in `done/task_03.md#Handoff` (deny tests → T04, `--remove-state` → T06, README → T07). Each task runs only its touched suites; the full suite is not run between tasks (user feedback 2026-10-06: tests must be fast, run only related suites).
- T04: `.agents/rules/harness-adapters.md` "Failure Policy" and `tests.md` still describe the deny and the plan/checkpoint scenarios; T07 owns the rules text (DEC-15).
- T05: `doctor` runs the overhead benchmark on every run, and a post-tool sample would have written a `bench-*` session into the user ledger. DEC-T05-01: the measurer samples a copy of the asset in a temporary project instead. Three acceptance `rg` hits remain on purpose (Antigravity detector event list and legacy cleanup); see `done/task_05.md#Handoff`.
- T06: `support-files.ts`, `project-file-checks.ts`, and `zone-actions.ts` were deleted instead of reduced to no-op functions; `zone-actions` lost its last `src` importer with `protocol-service`, and the telemetry block tests now use `zone-guidance`. With runtime pruning always on, `.context-brake/` is kept silently when it holds other files (the `claude-mod` directory tree that `remove` leaves behind made every auto-restart `remove` warn). See `done/task_06.md#Handoff`.
