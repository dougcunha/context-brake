# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T32: Wire the gitignore block through init, remove, and doctor

## Outcome

The built CLI previews and applies the owned `.gitignore` block during init, preserves it during default removal, removes it with state only after explicit consent, and diagnoses missing, stale, or malformed blocks without disturbing other work.

## Dependencies and boundaries

- Depends on: T31.
- Unblocks: T34 and T35.
- In scope: `.gitignore` snapshot collection, installation/removal/doctor orchestration, conflict isolation, symlink behavior, output truthfulness, IT-17, IT-18, E2E-11, and correction of README claims that currently contradict runtime behavior.
- Out of scope: runtime files under `.context-brake/runtime/`, capability/support output, and unrelated README path/marker corrections owned by T34.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-03` | `codereview.md#findings` | The CLI neither manages nor diagnoses the state-file ignore block while README claims it does. |
| PRD-01 | RF19, RF21, RF24, CA-12, CA-21 | Defines CLI-visible ownership, preservation, removal, and diagnosis. |
| PRD-01 TechSpec | build step 9, IT-17, IT-18, E2E-11 | Defines orchestration and built-CLI proof. |
| PRD 1.1 | FR-01, NFR-03, NFR-05 | Reaffirms dry-run, conflicts, platforms, and byte preservation. |

## Requirements

- Snapshot project-root `.gitignore` through the existing canonical/symlink-aware file-system path before planning `init`, `remove`, or `doctor`.
- `init --dry-run` reports the exact `ignore_block` change and writes nothing. `init --yes` creates, appends, updates, or skips it through T31's pure plan.
- A malformed `.gitignore` produces its structured conflict and remains byte-identical while independent safe harness changes continue.
- Default `remove` keeps plan, checkpoint, and the ignore block. `remove --remove-state --yes` removes the plan, checkpoint, and block in one preconditioned plan. If no unowned content remains, delete `.gitignore`.
- `doctor` runs T31's check only with valid normalized configuration. It reports warning `STATE_FILES_NOT_IGNORED` for missing/outdated paths and error `MALFORMED_GITIGNORE_MARKERS` for malformed markers.
- Text and JSON show the same change owner, conflicts, findings, paths, impact, and remediation; the normal severity-to-exit mapping remains unchanged.
- IT-17 covers three installs, user comments/patterns, absent `.gitignore`, CRLF/no-final-newline, and a symlink that remains a link.
- IT-18 uses a temporary git repository and `git status --porcelain` to prove state files are ignored after init and default removal, then absent with the block after explicit state removal. Missing git skips locally with a reason and fails under `CI=true`.
- E2E-11 executes the built CLI for dry-run and three confirmed installs and compares unowned bytes exactly.
- Keep changed TypeScript files within size rules. Apply the PRD 1.1 DEC-15 local extractions when needed: installation conflict/asset helpers move to `installation-findings.ts`; state-deletion planning moves to `state-removal.ts`. Do not implement runtime-directory removal as part of that extraction.

## Context to recover on demand

- TechSpec: PRD-01 `IgnoreBlock`, DEC-02, build step 9, IT-17, IT-18, E2E-11; PRD 1.1 DEC-01, DEC-15, CMP-09 to CMP-12, TC-08.
- Rules and skills: `file-changes.md`, `cli-output.md`, `node.md`, `tests.md`, `code-standards.md`, `javascript-typescript.md`, and `antislop`.
- Code: `src/core/services/installation-service.ts:65-92` and callers from `runInit`.
- Code: `src/core/services/removal-service.ts:76-97` and callers from `runRemove`.
- Code: `src/cli/commands/doctor.ts:26-52`, `src/cli/snapshot-helper.ts`, and `src/core/services/doctor-service.ts`.
- Tests: `tests/helpers/link-capability.ts` supplies the local-skip/CI-fail policy pattern; do not conflate link and git capability names.

## Work

- [ ] T32.1 Add `.gitignore` to canonical snapshot collection and failing init/remove/doctor orchestration tests.
- [ ] T32.2 Wire T31 planning into installation and removal with isolated conflicts, consent semantics, truthful output, and the required local size-rule extractions.
- [ ] T32.3 Wire T31 diagnostics into doctor and add exact text/JSON severity and exit-code assertions.
- [ ] T32.4 Implement IT-17 and IT-18, including symlink identity, git-status proof, idempotency, and local-skip/CI-fail prerequisites.
- [ ] T32.5 Implement E2E-11 against the built CLI and update the README `.gitignore` statements from planned/contradictory to the implemented behavior.
- [ ] T32.6 Run schemas/assets/package checks as applicable, all completion gates, and the quality profile.

## Acceptance criteria

- PRD-01 UT-21 to UT-25, IT-17, IT-18, and E2E-11 all pass.
- Dry-run and confirmed init expose the same `.gitignore` path/action/content, but dry-run leaves the repository snapshot unchanged.
- After three init runs there is exactly one current block and every user byte is unchanged.
- Default removal keeps both state files and their ignore block. Explicit state removal deletes only those owned artifacts and deletes `.gitignore` only when blank.
- Malformed markers never block valid changes for other files and never alter `.gitignore`.
- Doctor findings and exit codes match severity in text and JSON.
- README lines about state files being ignored describe behavior that now exists and no longer label it planned.

## Verification

- Unit: installation/removal/doctor service wiring and conflict projection.
- Integration: IT-17 and IT-18, including real temporary git repositories and symlink capability policy.
- End-to-end: E2E-11 runs the built CLI in temporary fixture repositories.
- Manual: none.
- Platforms: local platform during implementation; T35 supplies Ubuntu, macOS, and Windows completion evidence.
- Environment dependency: git for IT-18; skip with reason locally and fail in CI when absent. Link creation follows the existing capability policy.
- Commands: `npm run build`, focused Vitest files, `npm run schemas:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run package:smoke`.
- Expected evidence: exact before/after snapshots, `git status --porcelain`, structured findings/conflicts, idempotent third run, and green gates.

## Affected files

- Modify: `src/cli/snapshot-helper.ts`, `src/cli/commands/init.ts`, `src/cli/commands/remove.ts`, `src/cli/commands/doctor.ts`, and affected text output.
- Modify: `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `src/core/services/doctor-service.ts`, and related input contracts.
- Create as required by DEC-15: `src/core/services/installation-findings.ts`, `src/core/services/state-removal.ts`.
- Create: `tests/integration/gitignore-lifecycle.test.ts`, `tests/e2e/e2e-gitignore-lifecycle.test.ts`.
- Modify: `tests/test-lanes.ts`, `tests/unit/test-lanes.test.ts`, related service/output tests, fixtures, and `README.md`.

## Observability and recovery

- Operational signal: plan entries use `ignore_block`; doctor emits `STATE_FILES_NOT_IGNORED` or `MALFORMED_GITIGNORE_MARKERS`; remove output states whether local state and its block were preserved.
- Recovery: revert T32 before T31. Existing user `.gitignore` content remains outside the owned markers and can also be restored through Git.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented CR-03 end to end (T32.1-T32.6). `.gitignore` is now collected by `collectProjectSnapshots` through the canonical/symlink-aware `snapshotFile` path and wired into init, remove, and doctor. `planInstallation` calls T31's `planGitignoreInstall` and adds its `ignore_block` changes/conflicts; `planRemoval` calls `planGitignoreRemoval` and keeps the block by default while `--remove-state` removes the block and plan/checkpoint in one preconditioned plan (deleting `.gitignore` only when nothing unowned remains); `diagnoseProject` calls T31's `checkGitignore` only when a valid normalized configuration is loaded. DEC-15 local extractions applied: `installation-findings.ts` (conflict-to-finding map + managed-asset list) and `state-removal.ts` (`planStateDeletions`); runtime-directory removal was not implemented. Text output now prints each planned change's owner, so text and JSON carry the same owner/paths/conflicts/findings/impact/remediation. README line 117 no longer labels the behavior planned and describes the create/append/update lifecycle.
- Changed files:
  - Modified: `src/cli/snapshot-helper.ts` (adds `.gitignore`), `src/cli/commands/init.ts`, `src/cli/commands/remove.ts`, `src/cli/commands/doctor.ts` (find and pass `gitignoreSnapshot`), `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `src/core/services/doctor-service.ts`, `src/cli/output/text.ts`, `README.md`.
  - Created: `src/core/services/installation-findings.ts`, `src/core/services/state-removal.ts`, `tests/helpers/git-capability.ts`, `tests/helpers/gitignore-fixtures.ts`, `tests/unit/git-capability.test.ts`, `tests/integration/gitignore-lifecycle.test.ts`, `tests/e2e/e2e-gitignore-lifecycle.test.ts`.
  - Modified tests: `tests/test-lanes.ts` (registers `tests/integration/gitignore-lifecycle.test.ts` in the process lane), `tests/unit/removal-service.test.ts`, `tests/unit/removal-conflicts.test.ts`, `tests/unit/doctor-service.test.ts` (new required `gitignoreSnapshot` input).
- Checks:
  - `npm run build` -> passed (schemas generated, assets built, tsc).
  - Focused vitest (`git-capability`, `test-lanes`, `gitignore-lifecycle`, `e2e-gitignore-lifecycle`) -> 4 files, 17 passed.
  - `npm run schemas:check` -> passed (no contract change; `ignore_block` already present from T31).
  - `npm run lint` -> passed; `npm run typecheck` -> passed.
  - `npm test` -> 80 files, 327 passed, 1 skipped (POSIX-only shell test on Windows).
  - `npm run coverage` -> 92.07% statements / 85.39% branches / 96.11% functions / 92.07% lines (threshold 80%).
  - `npm run package:smoke` -> passed; 210 packaged files verified.
  - QA-01..QA-06 over the 19 touched TypeScript files -> 0 hits each (no `any`, `@ts-ignore`/`eslint-disable`, empty catch, `core` importing `infrastructure`/`cli`, generic `throw new Error(`, 4+ parameter declarations); largest touched file is `src/core/services/removal-service.ts` at 94 physical lines (all <= 100).
  - IT-17 three-install evidence (built-orchestration equivalent): user `.gitignore` `# user comment\n*.log\n!important.log\n`; before sha256 `0D2A25F46DA597CB13FCD7325E71C527A680035E324842304BDA0BEBE10E2A94`; `init --dry-run` planned `update .gitignore (ignore_block)` with `beforeSha256=0d2a...`, `afterSha256=e129...` and left the file at the same `0D2A...` hash; after three `init --yes` runs the hash is `E1290C39819F63405C95DD06F44183142A1594ECF1F98303D338189B367FD620` with exactly one block and user lines byte-identical. Absent `.gitignore` creates only the block; CRLF and no-final-newline fixtures preserve their EOL and final-newline state; the symlinked `.gitignore` stays a symbolic link and the resolved target gets one block.
  - IT-18 evidence (temporary `git init` repo): `git status --porcelain` after `init --yes` listed `?? .claude/  ?? .context-brake/  ?? .gitignore  ?? context-brake.config.json  ?? docs/` and no `task_plan.json`/`state_checkpoint.json`. After default `remove --yes` both state files still existed and `git status --porcelain` listed only `?? .claude/  ?? .gitignore` (state files ignored); the block was still present. `remove --yes --remove-state` planned `update .gitignore (ignore_block)` plus `delete state_checkpoint.json (config)` and `delete task_plan.json (config)`; the user `.gitignore` content survived. A repository whose `.gitignore` contained only the block would have it deleted.
  - Doctor evidence: missing file -> text and JSON `STATE_FILES_NOT_IGNORED` warning, exit 1; outdated paths -> same warning; malformed markers -> text and JSON `MALFORMED_GITIGNORE_MARKERS` error, exit 2, with `.gitignore` unchanged (before/after SHA-256 equal). Find code, severity, scope, path, message, impact, and remediation match between text and JSON.
  - Install conflict evidence: a duplicated-marker `.gitignore` during `init --yes` produced the structured conflict `{"path":".gitignore","code":"DUPLICATE_GITIGNORE_MARKERS","detail":"Multiple ContextBrake ignore blocks"}`, left `.gitignore` byte-identical, and still applied the safe Claude Code hook/config changes.
  - Local-skip/CI-fail: `tests/unit/git-capability.test.ts` proves `gitPolicy` proceeds when git is available, skips with the captured reason locally, and routes to `fail` under `CI=true`; `requireGit` rejects via `ctx.skip` locally and throws the reason in CI. IT-18 calls `requireGit(ctx, await attemptGit())` so a missing git skips with a reason locally and fails in CI (0 skipped locally because git is present).
- Validated state: uncommitted worktree over `2a26a3e` (Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0); `dist/` built from this change before E2E and manual probes. Only the files above plus the predecessor T29/T30/T31 worktree are changed. The repository's own `.gitignore` was reverted after a probe accidentally ran `init` in the workspace; `git status --porcelain` shows no unintended paths.
- Open items: T34 still owns the README Oh-My-Pi path, marker-line count, and support table, which were not touched here. PRD 1.1 FR-09 runtime-state directory removal is intentionally not implemented. Cross-platform completion evidence (Ubuntu/macOS/Windows) belongs to T35. An out-of-root `.gitignore` symlink is rejected by the existing repository-boundary check just like other snapshotted files; `.gitignore`-committed-before-RF24 remains tracked until `git rm --cached`, as the README notes. At the planning layer duplicated markers yield `DUPLICATE_GITIGNORE_MARKERS`, while doctor reports `MALFORMED_GITIGNORE_MARKERS`, matching T31 and PRD-01 `IgnoreBlock`.
