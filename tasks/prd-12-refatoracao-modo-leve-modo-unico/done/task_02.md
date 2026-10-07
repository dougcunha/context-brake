# Stable execution context

Load in this exact order:

1. `tasks/prd-12-refatoracao-modo-leve-modo-unico/prd.md`
2. `tasks/prd-12-refatoracao-modo-leve-modo-unico/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Remove plan mode and the checkpoint gate

## Outcome

No code reads or writes `task_plan.json` or `state_checkpoint.json`:

- `context-brake plan` fails as an unknown command.
- Session start no longer renders a boot summary.
- The Claude Code mod restarts on `[REQUEST_SESSION_RESET]` with no checkpoint gate.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03
- In scope:
  - Delete the following:
    - `src/cli/commands/plan.ts` and `src/cli/plan-arguments.ts`;
    - `src/core/contracts/{task-plan,state-checkpoint,git}.ts`;
    - `src/core/validation/{plan-validator,checkpoint-validator,issues}.ts`;
    - `src/core/services/{boot-policy,boot-summary,plan-scaffold,plan-status,git-divergence,session-evaluation}.ts`;
    - `src/infrastructure/git/git-inspector.ts`;
    - `src/infrastructure/runtime/{boot-reader,plan-presence,plan-validation-reader}.ts`;
    - `src/infrastructure/storage/{plan-store,checkpoint-store}.ts`.
  - Remove the plan file part of `state-removal.ts` and the plan and checkpoint paths in `snapshot-helper.ts`.
  - Remove `INVALID_STATE_FILE`. The `stateStorage` key moved to T06 (see `tasks.md` Problems and solutions).
  - Remove the plan-aware branches of `zone-actions.ts`, `zone-guidance.ts`, and `failure-policy.ts`, where boot runs within the deadline.
  - Remove the plan status report schema and the `plan` command entry from `diagnostics.ts`.
  - Delete `schemas/{task-plan,state-checkpoint}.schema.json` and their script entries.
  - `session-reset-handler.ts` keeps the ledger line, pruning, and `resumeText` from guidance (DEC-14).
  - `runtime-composition.ts` stops wiring the boot reader, plan presence, validation reader, and git inspector.
  - Mod (DEC-12):
    - `mod-config.ts` drops `gate`, `planFile`, and `checkpointFile`;
    - `restart-facts.ts` no longer reads the checkpoint;
    - `auto-restart-policy.ts` drops the checkpoint gate;
    - `contracts/auto-restart.ts` drops `SKIP_CHECKPOINT_*` and `SKIP_NO_ACTIVE_STEP`;
    - `auto-restart-notices.ts` keeps only the generic seed.
  - Delete the plan, boot, checkpoint, and git tests, helpers, and fixtures, including `e2e-simulated-boot` and `e2e-simulated-long-task`.
  - Rewrite `claude-mod-*` tests and `tests/fixtures/claude-mod-scene.ts` without full mode.
  - Clean `tests/test-lanes.ts`.
- Intermediate behavior until T03: with neither `lightMode` nor `delegatedSnapshot`, `resolveGuidance` returns the existing "without plan" actions (`zone-actions.ts` `withoutPlan`), `allows` always true (pre-tool neutral), and `resumeText: null`; with `delegatedSnapshot`, the delegated guidance as today; with `lightMode`, light guidance as today.
- Out of scope:
  - The `lightMode`, `fullMode`, and `delegatedSnapshot` keys, and the new `snapshot` section (T03).
  - Deny (T04).
  - Support files (T06).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Plan mode, checkpoint, boot, `plan` command, schemas |
| FR-02 | `prd.md#functional-requirements` | `plan` command rejected (the `stateStorage` key moved to T06) |
| FR-10 | `prd.md#functional-requirements` | Signal-only restart |
| DEC-12, DEC-14 | `techspec.md#technical-decisions` | Mod and plan deletion |
| CMP-04, CMP-09, CMP-10 | `techspec.md#components-and-flow` | Session reset, mod, wiring |
| TC-02, TC-03 | `techspec.md#test-approach` | No plan modules; mod without checkpoint |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Existing code:
  - `src/core/services/session-reset-handler.ts:22-42`: what stays after boot leaves.
  - `src/core/services/zone-guidance.ts:19-64`: plan guidance branches.
  - `src/infrastructure/harnesses/claude-code/mod/mod-config.ts:36-44`.
  - `src/infrastructure/harnesses/claude-code/mod/restart-facts.ts:32-40`.
  - `src/core/services/auto-restart-policy.ts:16-32`.
- Contract: `techspec.md#contracts-and-data` (mod log codes).
- Harness reference: `docs/research/harness-integrations.md`, Claude Code "Mods (PRD-11)" (`SessionStart` with `clear`).

## Work

- [x] T02.1 Delete the plan, checkpoint, boot, and git production files. Fix importers, and keep delegated guidance on its no-plan path, until typecheck passes.
- [x] T02.2 Drop `INVALID_STATE_FILE`, the plan report schema, and the two schema files. Regenerate the schemas.
- [x] T02.3 Remove the mod checkpoint gate and its four reason codes. Make the seed always the generic sentence.
- [x] T02.4 Delete the plan and boot tests, helpers, and fixtures. Rewrite the mod tests and scene. Clean the lanes.
- [x] T02.5 Run lint, typecheck, `schemas:check`, the touched suites, then `npm run coverage`.

## Acceptance criteria

- `context-brake plan` exits 64 with `INVALID_ARGUMENTS`.
- No code reads or writes the plan or checkpoint files for plan mode: `rg -n "task-plan|state-checkpoint|planPresence|readBoot|readValidationCommand" src schemas scripts` returns nothing. `stateStorage` and its file names remain only in the protocol, gitignore, instruction, and allowlist modules that T04 and T06 delete.
- In the simulated mod host, a marker reply with no checkpoint file clears and submits the generic seed (TC-03).
- The `SKIP_CHECKPOINT_*` and `SKIP_NO_ACTIVE_STEP` codes do not exist.
- A `SessionStart` with origin `clear` still appends the ledger reset line.

## Verification

- Unit:
  - `tests/unit/schemas.test.ts` (TC-02);
  - `tests/unit/auto-restart-policy.test.ts` and `tests/unit/auto-restart-notices.test.ts`;
  - `tests/unit/hook-deadline.test.ts`, with no boot phase.
- Integration: `tests/integration/claude-mod-{gates,restart,guards}.test.ts` (TC-03).
- End-to-end: `tests/e2e/e2e-09.test.ts`, the `plan` unknown-command case.
- Manual: none.
- Platforms: Windows local.
- Commands: `npm run lint`, `npm run typecheck`, `npm run schemas:check`, `npm run build`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: pass counts, coverage thresholds met, and the empty `rg` output.

## Affected files

- Delete: the paths in scope, plus `schemas/{task-plan,state-checkpoint}.schema.json`.
- Modify:
  - CLI and contracts: `src/cli/{main,argument-parser,composition-root,snapshot-helper}.ts`, `src/cli/output/text.ts`, `src/core/contracts/{configuration,diagnostics,auto-restart}.ts`.
  - Core services: `src/core/services/{zone-guidance,zone-actions,failure-policy,session-reset-handler,state-removal,auto-restart-policy,auto-restart-notices,doctor-checks}.ts`.
  - Runtime and mod: `src/infrastructure/runtime/runtime-composition.ts`, `src/infrastructure/harnesses/claude-code/mod/{mod-config,restart-facts,restart-flow}.ts`.
  - Scripts and tests: the schema scripts, `tests/test-lanes.ts`, and the mod tests and fixtures.

## Observability and recovery

- Operational signal: the mod log no longer writes checkpoint skip codes.
- Recovery: `git revert` of the task commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `context-brake plan` is unknown (exit 64, "Allowed commands: init, doctor, remove."). The help lists `init`, `doctor`, `remove`.
  - Deleted: plan and checkpoint contracts, validators (with `issues.ts`), boot policy and summary, plan scaffold and status, git divergence and inspector, the boot, plan-presence, and validation-command readers, the plan and checkpoint stores, the plan-status report schema, `INVALID_STATE_FILE`, the `plan` CLI error command, and `schemas/{task-plan,state-checkpoint}.schema.json`.
  - `doctor` no longer validates state files. `remove --remove-state` no longer deletes the plan or checkpoint; it still deletes owned runtime files until T06.
  - Guidance no longer reads the plan:
    - `resolveGuidance` takes only `{ config, zone? }`.
    - Without `lightMode` or `delegatedSnapshot` it returns the "without plan" actions, as the intermediate behavior in this task requires.
    - The plan allowlist no longer admits a validation command.
    - The session-reset handler keeps the ledger line, pruning, and `resumeText`.
    - The deadline boot omission is gone.
    - `HOOK_PHASES` drops `boot_files` and `boot_git`.
  - Mod:
    - The checkpoint gate, `RestartGate`, `CheckpointState`, and the four checkpoint skip codes are gone.
    - The seed is always the generic sentence.
    - `ModConfig` is `{ root, maxConsecutive }`.
    - `turn-state.startedAt` is kept for prd-14 FR-04 (fresh handoff gate).
- Changed files (in addition to T01):
  - Source: `src/cli/{main,argument-parser,composition-root}.ts`, `src/cli/output/text.ts`, `src/cli/commands/{init,doctor,remove}.ts`.
  - Core: `src/core/contracts/{diagnostics,checkpoint-mode,hook-phase,auto-restart}.ts`, `src/core/services/{zone-guidance,failure-policy,session-reset-handler,brake-engine,doctor-checks,project-file-checks,doctor-service,removal-service,state-removal,auto-restart-policy,auto-restart-notices}.ts`.
  - Runtime and mod: `src/infrastructure/runtime/{runtime-composition,hook-failure,in-process-host}.ts`, `src/infrastructure/harnesses/common/in-process-support.ts`, `src/infrastructure/harnesses/claude-code/mod/{mod-config,restart-facts,restart-flow}.ts`.
  - Scripts: `scripts/{generate-schemas,check-schemas,check-package}.ts`.
  - Deleted tests: the plan, boot, checkpoint, and git suites (unit, integration, e2e), including `e2e-simulated-boot`, `e2e-simulated-long-task`, and the `acceptance-scale` and `boot-fixture` helpers.
  - Rewritten tests: `zone-guidance`, `light-guidance`, `brake-engine-{light,delegated,delegated-lifecycle}`, `failure-policy-{delegated,delegated-reset}`, `hook-deadline` (prune phase instead of boot git), `session-zone`, `runtime-composition`, `auto-restart-{policy,notices}`, `claude-mod-gates` and the scene fixture, `schemas` (TC-02: only three schemas), `doctor-checks`, `removal-service`, `safe-removal`, `gitignore-lifecycle`, `e2e-07-08`, `e2e-brake`, `e2e-delegated-snapshot`, `package-contents`, `runtime-error-line`, `auto-restart-doctor`, and the harness simulator profile (no validation step).
- Checks:
  - Typecheck and lint are clean. `schemas:check` passes.
  - First `npm run coverage` (456 s) had 14 failures. All were plan-dependent assertions, rewritten as listed above; the failing suites pass on rerun.
  - Final `npm run coverage` (489 s): 241 files and 1405 tests passed. Coverage: statements 95.25%, branches 90.81%, functions 96.55%, lines 95.25%.
  - The acceptance scan `rg "task-plan|state-checkpoint|planPresence|readBoot|readValidationCommand|SKIP_CHECKPOINT|SKIP_NO_ACTIVE_STEP" src schemas scripts` finds nothing.
  - Quality profile over the modified `src` files: no hit.
- Validated state: base `1474f54` plus T01 and T02; Windows 11, Git Bash, Node 24.19.
- Open items:
  - `stateStorage` moved to T06 (`tasks.md` Problems and solutions).
  - TC-01: `tests/unit/main.test.ts` asserts that `plan init` exits 64, re-run after the coverage run.

### ADR candidates

None - direct TechSpec implementation or local decision.
