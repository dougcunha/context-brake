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

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.
