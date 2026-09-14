# Installation, Detection, and Diagnostics Implementation Task Summary

## Tasks

- [x] 1.0 [Bootstrap the package, configuration, and schemas](./done/task_1.md)
- [x] 2.0 [Implement detection, explicit selection, versions, and support levels](./done/task_2.md)
- [x] 3.0 [Build the safe user-file change engine](./done/task_3.md)
- [x] 4.0 [Implement all eight harness adapters and runtime assets](./done/task_4.md)
- [x] 5.0 [Implement init, remove, and doctor](./done/task_5.md)
- [x] 6.0 [Harden packaging, documentation, and cross-platform delivery](./done/task_6.md)

## Problems and solutions

- Task 1 required three review rounds: the published bin path and Windows entry guard, canonical path validation, closed report schemas, full quality gates, structured configuration errors, runtime dependency checks, and deterministic esbuild assets were corrected before approval. Final evidence is recorded in `done/task_1.md`.
- Task 2 was delegated via herdr-orchestration / Antigravity subagent: resolved TS7016 by installing `@types/semver` (no install scripts verified), fixed Windows `where.exe` path:pattern syntax for absolute executable paths in `NodeProcessRunner`, extracted process tree termination to maintain strict function/file line limits (`<30` functions, `<100` files), and passed all 48 tests with 94.41% coverage. Final evidence is recorded in `done/task_2.md`.
- Task 3 was delegated via Antigravity subagent: implemented physical file identity, boundary checks, surgical JSONC token-span editing with duplicate-key detection preserving formatting/trivia, deterministic change plan merging with SHA-256 preconditions, instruction marker deduplication, protocol planning, manifest tracking, and atomic per-file writes with optimistic concurrency. Passed all 83 tests with 91.87% coverage. Final evidence is recorded in `done/task_3.md`.
- Task 4 was delegated via Antigravity subagent: reconciled GitHub Copilot CLI failure behavior in research docs, created immutable adapter registry, implemented all 8 harness adapters (Claude, Codex, Cursor, Copilot, Antigravity, OpenCode, Pi, Oh-My-Pi), built 5 self-contained runtime assets with esbuild, added per-adapter fixtures and mapped integration tests (IT-01, IT-02, IT-03, IT-04, IT-12, IT-16). Passed all 124 tests with 91.41% coverage. Final evidence is recorded in `done/task_4.md`.
- Task 5 was delegated via Antigravity subagent: wired core orchestration services (installation, removal, doctor, report building), implemented strict argument parser with TTY confirmation safety, built nearest-rank p95 benchmarking engine, formatted accessible text and single-document JSON, wired CLI entrypoint and composition root with exit codes, added unit, integration, and E2E suites (E2E-01 to E2E-08). Passed all 156 tests with 89.91% coverage. Final evidence is recorded in `done/task_5.md`.
- Task 6 was delegated via Antigravity subagent: reconciled README quick-start with implemented behavior, implemented npm pack validation in `check-package.ts` and integration tests, implemented timed quick-start E2E-09 (`<2 min` workflow, `<5s` core commands), configured multi-OS / multi-Node CI in `.github/workflows/ci.yml` with Windows symlink support, and implemented cross-platform E2E-10 for PowerShell, Git Bash, and native POSIX shells. Passed all 167 tests across 50 test files with 89.91% coverage. Final evidence is recorded in `done/task_6.md`.

## Correction lineage

Correction tasks are created per review round and archived under the review folder that raised them. They are additive to T01–T06 above, cover findings in the corresponding `codereview.md`, and are not new feature scope.

| Task | Location | Source finding | State |
| --- | --- | --- | --- |
| T07 | [Make the JSON editor safe for single-line harness configs and isolate editor failures](./codereview_01/done/task_07.md) | `codereview_01/CR-01` | complete |
| T08 | [Surface legacy CONTEXTOPS detection as a migration preview](./codereview_01/done/task_08.md) | `codereview_01/CR-02` | complete |
| T09 | [Correct the README configuration example and legacy migration wording](./codereview_01/done/task_09.md) | `codereview_01/CR-03` | complete |
| T10 | [Canonicalize harness change targets so symlinked or junctioned configs match snapshots](./codereview_02/done/task_10.md) | `codereview_02/CR-01` | complete |
| T11 | [Canonicalize the project root so linked repositories plan and apply canonically](./codereview_03/done/task_11.md) | `codereview_03/CR-01` | complete |

`codereview_04` corrections T12–T16 are complete and archived in `./codereview_04/done/`. `codereview_05` corrections T17–T22 are complete and archived in `./codereview_05/done/`. T16 was closed by HIL decision on 2026-09-14 with Windows and WSL 2 Linux evidence from revision `58082e5`; the macOS cells of CA-20 were not executed and remain a recorded observation.
