# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/prd.md`
2. `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Runner storage, validation executor, and lock

## Outcome

On disk:

- Validation commands run through a shell, with a timeout, tree kill, and a 16 KiB output tail.
- Each run directory holds `run.json` (written atomically) and `sessions.jsonl`, plus plan and checkpoint snapshots; the 20 most recent runs are kept.
- Approvals persist in the git-ignored runtime directory, and a corrupt approvals file is quarantined.
- A PID lock prevents concurrent runs and replaces stale locks.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T06, T08
- In scope: `shell-validation-executor.ts`, `node-run-store.ts`, `run-paths.ts`, `node-approval-store.ts`, and `node-run-lock.ts`, with integration tests in temporary directories.
- Out of scope: harness processes (T07) and ledger watching (T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF10, RF14, RF17 | `prd.md#limites-e-condições-de-parada`, `#segurança-da-execução`, `#telemetria-por-comando-e-relatório` | Timeout, approval persistence, session records |
| DEC-10, DEC-11, DEC-13, DEC-14 | `techspec.md#technical-decisions` | Approvals, executor, lock, records |
| CMP-15, CMP-16, CMP-17 | `techspec.md#components-and-flow` | Infrastructure components |
| TC-11, TC-12, TC-13 | `techspec.md#test-approach` | Integration scenarios |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `file-changes.md` (atomic writes, LF)
- Existing code:
  - `src/infrastructure/process/process-tree.ts`.
  - `src/infrastructure/storage/atomic-writer.ts`.
  - `src/infrastructure/runtime/runtime-paths.ts`: `ensureRuntimeDirectory` and the `*` `.gitignore`.
- Contract: `techspec.md#contracts-and-data` (approvals file, session line)

## Work

- [x] T05.1 Implement `ShellValidationExecutor`, the only place that uses `shell: true` (DEC-11). It applies the timeout and tree kill, and returns the exit code, duration, and a bounded tail.
- [x] T05.2 Implement the run paths under `.context-brake/runtime/runner/` and the run store. The store creates a run, updates it atomically, appends validated lines, takes and restores snapshots, keeps invalid copies, and applies retention.
- [x] T05.3 Implement the approval store: Zod parsing, and renaming a corrupt file.
- [x] T05.4 Implement the run lock: `wx` creation, stale-PID detection, and release.

## Acceptance criteria

- A command that exceeds a 1 s timeout reports `timed_out` and leaves no child process.
- `sessions.jsonl` lines parse with the T01 schema and carry no output or prompt text.
- The approvals file sits under a directory whose `.gitignore` ignores it.
- A live lock refuses a new run; a lock with a dead PID is replaced.

## Verification

- Unit: tail truncation helpers only; the adapters are thin.
- Integration: TC-11, TC-12, and TC-13 in temporary directories; register the process-spawning test files in the process lane.
- End-to-end: T09.
- Platforms: Linux, macOS, and Windows, since the shell and tree kill differ; local evidence is Windows.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: the integration suites green, and the QA-04 hit only in `shell-validation-executor.ts`.

## Affected files

- Create:
  - `src/infrastructure/runner/`: `shell-validation-executor.ts`, `node-run-store.ts`, `run-paths.ts`, `node-approval-store.ts`, `node-run-lock.ts`
  - `tests/integration/`: `shell-validation-executor.test.ts`, `node-run-store.test.ts`, `node-run-lock.test.ts`, `node-approval-store.test.ts`
- Modify: `tests/test-lanes.ts`, when a new test file lacks a process marker

## Observability and recovery

- Operational signal: the run records.
- Recovery: `remove --remove-state` deletes the runtime directory.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the on-disk runner adapters (CMP-15, CMP-16, CMP-17) under `src/infrastructure/runner/`.
  - **`shell-validation-executor.ts` (DEC-11, RF10).**
    - `ShellValidationExecutor(projectRoot)` is the only `shell: true` spawn, with `cwd` at the project root, `detached` on POSIX, and stdin ignored.
    - A timeout calls `killProcessTree` and reports `timed_out` with a `null` exit code. Exit 0 is `passed`; any other exit or a spawn error is `failed`.
    - The last 16 KiB of combined stdout and stderr are kept in memory (`appendTail`, `decodeTail`). A partial UTF-8 character at the cut is dropped.
    - `stop()` kills the tree and settles as `failed` with a `null` exit code. A `stop()` after the command has already settled does nothing.
  - **`node-run-store.ts`, `state-snapshots.ts`, `run-paths.ts` (DEC-12, DEC-14, RF17).**
    - Paths live under `.context-brake/runtime/runner/runs/<runId>/`. Run ids must match `^[A-Za-z0-9][A-Za-z0-9._-]*$`: writes throw `RangeError` otherwise, and `readRecord` returns `null`.
    - `writeRecord` validates with Zod and writes `run.json` atomically with LF endings.
    - `appendSession` validates the line with the strict T01 schema before appending, so a content field is rejected and nothing is written.
    - `latestRunId` orders runs by the `run.json` `startedAt`, falling back to the directory mtime for runs without a valid record.
    - `snapshotState` copies the plan and checkpoint bytes into `plan.snapshot.json` and `checkpoint.snapshot.json`, and deletes the snapshot of a file that is missing.
    - `restoreState` skips a file the snapshot lacked. Otherwise it saves the current content as `<file>.invalid-<ts>.json` in the run directory, then writes the snapshot atomically to the resolved symlink target.
    - `pruneRuns` keeps the newest `retention - 1` (19) runs, so the run written next makes 20.
  - **`node-approval-store.ts` (DEC-10, RF14).** It reads `approvals.json` with Zod. A missing file reads as empty. An unparseable or schema-invalid file is renamed to `approvals.invalid-<ts>.json` and treated as empty, never overwritten. Writes are validated and atomic.
  - **`node-run-lock.ts` (DEC-13).**
    - `acquire` creates `run.lock` with `wx`, holding `{pid, runId}`. It returns `null` when acquired, or the live holder that refused it.
    - A lock with a dead pid (`process.kill(pid, 0)` fails with anything but `EPERM`) or unreadable content is stale and replaced, with up to 3 attempts before `RunLockContentionError`.
    - `release` deletes the lock only while it still holds this run's pid and run id.
  - **`runner-files.ts`.** It holds `readOptionalFile` and `parseJsonOrNull`, shared by the store, snapshots, approvals, and lock.
- Changed files:
  - Created `src/infrastructure/runner/`: `shell-validation-executor.ts` (69 non-blank lines), `node-run-store.ts` (76), `state-snapshots.ts` (28), `run-paths.ts` (40), `node-approval-store.ts` (28), `node-run-lock.ts` (68), and `runner-files.ts` (17).
  - Created integration tests `tests/integration/`: `shell-validation-executor.test.ts`, `node-run-store.test.ts`, `node-run-store-snapshots.test.ts`, `node-approval-store.test.ts`, and `node-run-lock.test.ts`.
  - Created the unit test `tests/unit/validation-output-tail.test.ts`, the helper `tests/helpers/run-records.ts`, and the fixture `tests/fixtures/runner/validation-command.mjs`.
  - Modified `tests/test-lanes.ts`: `shell-validation-executor.test.ts` joins `PROCESS_LANE_FILES`, since it spawns processes without a marker.
- Checks:
  - `npm run typecheck`: clean.
  - `npm run build`: exit 0.
  - `npm run lint`: the 14 pre-existing prd-03 QA evidence errors only.
  - `npm run coverage`: exit 0. 191 files and 1,175 tests passed, with overall statement coverage at 94.22%.
  - Per file, `node-run-lock.ts` is at 91% (the contention error and a non-`EEXIST` rethrow are uncovered) and `runner-files.ts` at 88% (a non-`ENOENT` rethrow). The other runner files are at 100%.
- Acceptance evidence:
  - A command past a 1 s timeout reports `timed_out`, and its descendant never writes its marker. Tree kill is proven deterministically by the `stop()` case, which waits for the descendant to start.
  - `sessions.jsonl` lines parse with `runSessionLineSchema` and carry no `prompt`, `response`, `outputTail`, or `finalText`. A line with a content field is rejected before writing.
  - `approvals.json` sits under `.context-brake/runtime/`, whose `.gitignore` is `*`.
  - A live lock refuses and returns its holder. A lock with a dead pid or empty content is replaced.
  - TC-11: exit 3 with the tail captured, a shell pipe, a tail of at most 16 KiB, and timeout. TC-12: records, lines, retention, and the lock. TC-13: the approvals round trip and corrupt files.
- Validated state: Git base `eb2f386` with the T01–T05 changes uncommitted, on Windows 11 with Git Bash, Node v24.19.0, and npm 11.17.0. The shell executor ran under `cmd.exe`; `/bin/sh` and POSIX process-group kill are not exercised locally (PI-03).
- Quality profile:
  - QA-04 hits only `shell-validation-executor.ts:29` (`shell: true`), which DEC-11 covers.
  - QA-01–QA-03, QA-06, and QA-08: empty over the 7 source files, 6 test files, the helper, and the fixture. No declaration has 4 or more parameters, and no file is above 100 lines.
  - No reservation hits.
- Open items:
  1. **Deviation disclosed (files).** `state-snapshots.ts` and `runner-files.ts` are extra files in the same folder. They keep `node-run-store.ts` under 100 lines and share the lenient read and parse across four adapters. `node-run-store-snapshots.test.ts` splits the store tests for the same reason.
  2. **Interpretation (retention).** `pruneRuns` runs before the new record (T04), so it keeps 19 existing runs and the new run makes 20, which matches DEC-14's "20 most recent".
  3. **Interpretation (unreadable lock).** An empty or unparseable `run.lock` counts as stale. `wx` creation writes in a second step, so a racing reader could see an empty file. The PID check stays the primary guard, and the PRD excludes parallel runs.
  4. **Flake fixed during the task.** Under full-suite load, the 1 s timeout could fire before the tree fixture wrote its ready file. The timeout case now asserts `timed_out`, a duration of at least 990 ms, and no surviving marker. Descendant readiness is asserted only in the `stop()` case.
  5. **For T08.**
     - Construct `NodeRunStore({ projectRoot, stateFiles: { plan, checkpoint } })` with the resolved plan and checkpoint paths from the configuration, plus `NodeApprovalStore(projectRoot)`, `NodeRunLock(projectRoot)`, and `ShellValidationExecutor(projectRoot)`.
     - `acquire` returning a holder maps to `RUN_IN_PROGRESS`. Call `release` in every exit path.
     - Run ids must be safe directory names.

### ADR candidates

None - direct TechSpec implementation or local decision.
