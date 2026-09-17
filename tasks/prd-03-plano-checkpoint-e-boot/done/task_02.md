# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — `plan init` scaffold and stores

## Outcome

`context-brake plan init --task="<name>"` creates a valid plan and checkpoint with one example step, written atomically, and refuses to overwrite existing files without explicit confirmation.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T07
- In scope: the plan and checkpoint stores, the scaffold service, `plan` argument parsing, the `plan init` command, and its registration in the CLI dispatch and help text.
- Out of scope: `plan status` (T07), git inspection (T03), and boot behavior (T04, T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF1 | `prd.md#criação-do-plano` | `plan init --task="<name>"` creates both files at the configured location |
| RF2 | `prd.md#criação-do-plano` | No overwrite without explicit confirmation |
| RF3 | `prd.md#criação-do-plano` | Initial plan carries at least one example step with status and validation command |
| CMP-06, CMP-15, CMP-19, CMP-20, CMP-21 | `techspec.md#components-and-flow` | Scaffold, stores, command, argument parsing, and wiring |
| DEC-13, DEC-14 | `techspec.md#technical-decisions` | Refusal without `--yes`; extracted plan argument parser |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/file-changes.md` (plan before writing, temp-file-plus-rename, write only inside the repository root, LF endings), `cli-output.md` (stdout versus stderr, never prompt when stdin is not a TTY, every confirmation has a flag equivalent), `node.md`.
- Existing code: `src/infrastructure/storage/atomic-writer.ts` — `writeFileAtomically`, the required write path.
- Existing code: `src/infrastructure/storage/project-config-store.ts` — read-and-validate store shape to mirror.
- Existing code: `src/cli/argument-parser.ts:65-78` — `parseCliArgs` dispatch to extend; `src/cli/composition-root.ts:41-56` — `dispatchCommand`; `src/cli/main.ts:27` — command attribution for parse errors, which must learn `plan`.
- Existing code: `src/cli/output/text.ts:36` — already advertises `context-brake plan init`, so the message becomes true with this task.
- Contract or integration: `techspec.md#integrations-and-interfaces`.

## Work

- [x] T02.1 Add `src/infrastructure/storage/plan-store.ts` and `checkpoint-store.ts`: read plus validate, and atomic write.
- [x] T02.2 Add `src/core/services/plan-scaffold.ts` building the initial plan and checkpoint, including one example step with a validation command placeholder.
- [x] T02.3 Add `src/cli/plan-arguments.ts` parsing `plan init` and `plan status`, keeping `argument-parser.ts` under the file-size limit.
- [x] T02.4 Add `src/cli/commands/plan.ts` with the `plan init` path: refuse without `--yes` when either file exists, reporting which file blocked it.
- [x] T02.5 Register `plan` in `parseCliArgs`, `dispatchCommand`, the help text, and the parse-error command attribution.
- [x] T02.6 Tests: unit for the scaffold, integration for the stores against a temporary directory, end-to-end for creation and refusal.

## Acceptance criteria

- In a clean fixture repository, `plan init --task="refactor-auth"` creates both files and both pass the T01 validators.
- The created plan contains at least one step with a status and a validation command field.
- With either file already present and no `--yes`, both files stay byte-for-byte identical and the command explains the missing confirmation instead of prompting.
- Files are written through the atomic writer, so an interrupted run leaves no partial file and no stray temporary file.
- Paths come from `stateStorage.planFile` and `checkpointFile`, not hardcoded names.
- Exit codes follow `EXIT_CODES`; a refused overwrite is not reported as success.

## Verification

- Unit: scaffold content, example step shape, and configured path resolution.
- Integration: store read, validate, and atomic write against a temporary directory, including a pre-existing file and a symlinked target.
- End-to-end: built CLI in a fixture repository for creation, for refusal without `--yes`, and for `--json` output shape.
- Manual: none.
- Platforms: Linux, macOS, Windows; the symlink scenario skips with a stated reason when links cannot be created.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none.
- Expected evidence: passing suites plus a byte-comparison assertion proving the refused run changed nothing.

## Affected files

- Create: `src/infrastructure/storage/plan-store.ts`, `src/infrastructure/storage/checkpoint-store.ts`, `src/core/services/plan-scaffold.ts`, `src/cli/plan-arguments.ts`, `src/cli/commands/plan.ts`, `tests/unit/plan-scaffold.test.ts`, `tests/integration/plan-stores.test.ts`, `tests/e2e/e2e-plan-init.test.ts`
- Modify: `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/cli/main.ts`, `tests/test-lanes.ts`

## Observability and recovery

- Operational signal: creation and refusal messages on the correct stream, with a text status label.
- Recovery: both files are gitignored and local; deleting them returns the repository to its prior state.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `context-brake plan init --task="<name>"` creates a valid plan and checkpoint at the paths from `stateStorage`, written atomically through `writeFileAtomically` after resolving symlinks so a linked target survives. A second run refuses to overwrite unless `--yes` is given, reusing the existing `authorizeWrite` policy, so a non-TTY run fails with `CONFIRMATION_REQUIRED` and exit 2 instead of prompting. `plan` is registered in argument parsing, dispatch, help text, and parse-error attribution, and `--json` emits a single document naming the created files.
- Changed files: created `src/core/services/plan-scaffold.ts`, `src/infrastructure/storage/plan-store.ts`, `src/infrastructure/storage/checkpoint-store.ts`, `src/cli/plan-arguments.ts`, `src/cli/commands/plan.ts`, `tests/unit/plan-scaffold.test.ts`, `tests/integration/plan-stores.test.ts`, `tests/integration/plan-init-command.test.ts`, `tests/e2e/e2e-plan-init.test.ts`. Modified `src/core/contracts/diagnostics.ts`, `src/core/services/report-service.ts`, `src/cli/argument-parser.ts`, `src/cli/composition-root.ts`, `src/cli/main.ts`, `src/cli/output/text.ts`, `tests/test-lanes.ts`.
- Checks: `npm run lint` → `ESLint: No issues found`. `npm run typecheck` → clean. `npm run build` → succeeded. `npm run coverage` → exit code 0, 152 test files, 860 tests passed, 93.07% statements (threshold 80). Per file: `plan-store.ts` 100%, `checkpoint-store.ts` 100%, `plan.ts` 92%, `cli/commands` 93.57%, `cli/output` 100%. Count reconciles exactly: 834 after T01's full run, plus 1 (the `findNextStep` test added after that run) plus 19 (T02's first three suites) plus 6 (the in-process command suite) = 860.
- Validated state: Git base `86961bb` with T01 and T02 changes uncommitted; pre-existing prd-02 closure files untouched. Windows 11, Git Bash, Node v24.19.0, npm 11.17.0. Linux and macOS remain unverified (`PI-03`, prd-02 `O-04`).
- Quality profile: blocking rules `QA-01`–`QA-05` empty over the diff; reservations empty. One transient `max-params` failure in `plan.ts` (`existingFiles` took four parameters against the limit of 3) was introduced and fixed inside the task by replacing them with a `StateFilePresence[]` parameter object, per `code-standards.md`.
- Open items:
  1. **`plan-arguments.ts` is at 11.76% coverage** (lines 16-37, 40-48). `parsePlan` is currently exercised only through the e2e suite, which runs out of process, so instrumentation never sees it — the same pattern that left `plan.ts` at 22% until an in-process test was added. **T07 should add `tests/unit/plan-arguments.test.ts`** when it extends the parser for `status`; the cases are pure and fast (missing subcommand, unknown subcommand, missing or empty `--task`, `--yes`/`--json` flags).
  2. **Deviation:** `plan status` parsing was deferred to T07 although `T02.3` mentioned it. Accepting `status` in the parser while nothing serves it would ship a broken command surface; the parser rejects it with exit 64 today, and the e2e asserts that.
  3. **Deviation:** `src/core/contracts/diagnostics.ts` and `src/core/services/report-service.ts` were modified although this task listed neither. The CLI error `command` union was pinned to `'init'|'remove'|'doctor'` in both places, so registering `plan` in error attribution (`T02.5`) was impossible without extending them. `cliErrorSchema` is not in the published schemas map, so `schemas/` is unaffected.
  4. **Added beyond the listed test set:** `tests/integration/plan-init-command.test.ts` exercises `runPlanInit` in process, because e2e-only testing left `plan.ts` at 22% while sibling commands sit at 92–96%. It imports `/cli/commands/`, a `PROCESS_MARKERS` string, so it is registered in `PROCESS_LANE_FILES` — which is why `tests/test-lanes.ts` was modified as the task anticipated.
  5. `issues.ts`'s syntax-error helper, left uncovered by T01, is now exercised by the store tests, which assert the exact `{path:'(syntax)', received:'{', rule:'must be valid JSON'}` issue.

### ADR candidates

None - direct TechSpec implementation or local decision.
