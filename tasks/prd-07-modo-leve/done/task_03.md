# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/prd.md`
2. `tasks/prd-07-modo-leve/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — init: ativar e desativar o modo leve

## Outcome

On a fresh repository, `init --light` writes only these files:

- the config;
- the manifest;
- the runtime assets;
- the harness hook entries;
- the Claude Code status line bridge, when requested.

On a full install, `init --light` removes two kinds of managed leftovers: the unmodified managed protocol and the reference blocks between markers. It removes the `.gitignore` block only when neither state file exists. `init --no-light` restores the full install. Options that make no sense in light mode are rejected with exit 64.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T06
- In scope:
  - `--light` and `--no-light`, the routing of `--snapshot-trigger`, and the rejections, including `--snapshot-command` (DEC-07);
  - `init-config-updates.ts`, which extracts `delegatedUpdate` from `init.ts`;
  - `planConfigChange`, which accepts the light update and adapts the preview summary;
  - `support-files.ts`, extracted from `installation-service.ts` (DEC-08);
  - `buildManagedAssets` without the protocol in light mode.
- Out of scope: `doctor` and `snapshot-helper.ts` (T04), the runtime (T02), and `remove`.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-04 | `prd.md#functional-requirements` | `--light` / `--no-light`, trigger flag, no command |
| FR-08, FR-09, FR-10 | `prd.md#functional-requirements` | Minimal footprint, switching with the `.gitignore` rule, rejected options, delegated section kept |
| NFR-01, NFR-03 | `prd.md#non-functional-requirements` | Byte-identical full installs, symlinked instruction files |
| DEC-07, DEC-08 | `techspec.md#technical-decisions` | Flag rules, support-file planning |
| CMP-05, CMP-06, CMP-07 | `techspec.md#components-and-flow` | Merge wiring, CLI, install planning |

## Context to recover on demand

- Applicable rules: `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `file-changes.md`, `cli-output.md`.
- Existing code:
  - `src/cli/init-arguments.ts#parseInit` and `delegatedFlags`.
  - `src/cli/commands/init.ts#runInit` and `delegatedUpdate`; the file is at 100 lines.
  - `src/core/services/installation-service.ts#planInstallation` (lines 79–82); the file is at 100 lines.
  - `installation-builder.ts#planConfigChange`, `installation-findings.ts#buildManagedAssets`.
  - `removal-helper.ts`: `planInstructionRemoval`, `planAssetDeletions`.
  - `gitignore-service.ts#planGitignoreRemoval`.
- Tests to mirror: `tests/integration/init-delegated-snapshot.test.ts`, `tests/integration/*gitignore*`, and the symlinked instruction tests.

## Work

- [x] T03.1 Parse `--light` and `--no-light` in `init-arguments.ts`, keeping the file at 100 lines or fewer; parse into a helper module if needed. Create `src/cli/init-config-updates.ts`, which returns `{ delegatedSnapshot, lightMode }` updates from the current config and the parsed args, following the DEC-07 rules. Every rejection is a `CliArgumentError` that names the option. `init.ts` calls it instead of `delegatedUpdate`.
- [x] T03.2 Extend `planConfigChange` with the light update and its preview summary (`set the light mode section` / `remove the light mode section`).
- [x] T03.3 Create `src/core/services/support-files.ts#planSupportFiles` with the DEC-08 behavior. Full mode moves the current protocol, instruction, and `.gitignore` calls unchanged. Light mode plans:
  - the managed protocol deletion when the file is unmodified, and `LIGHT_MODE_ASSET_KEPT` when it is modified;
  - the removal of the instruction blocks;
  - the removal of the `.gitignore` block, only when both state snapshots report `exists: false`.

  `planInstallation` calls it. `buildManagedAssets` omits the protocol asset in light mode.
- [x] T03.4 Add unit tests: TC-07 in `tests/unit/init-light-arguments.test.ts`.
- [x] T03.5 Add integration tests: TC-08 in `tests/integration/init-light-mode.test.ts`, covering:
  - a fresh install, with its inventory and `--dry-run` preview;
  - full to light, with and without `task_plan.json`;
  - a modified managed protocol, and an unmanaged protocol;
  - a symlinked `AGENTS.md` (skipped with a reason when links cannot be created);
  - `--no-light`;
  - an idempotent second run.

## Acceptance criteria

- **Fresh install:** in a fixture with `CLAUDE.md`, `AGENTS.md`, and `.claude/`, `init --light --yes` creates or changes only the files named in the Outcome. `CLAUDE.md`, `AGENTS.md`, and `.gitignore` stay byte-identical, and the protocol file does not exist. The `--dry-run` preview lists the same paths.
- **Full to light:** after a full `init`, `init --light --yes` removes the reference blocks and the unmodified protocol. User bytes outside the markers stay identical, and `task_plan.json` and `state_checkpoint.json` stay on disk.
- **`.gitignore` rule:** with `task_plan.json` present, the `.gitignore` block stays. With neither state file present, it is removed.
- **Modified protocol:** a modified managed protocol stays on disk, and `init` reports `LIGHT_MODE_ASSET_KEPT`.
- **Back to full:** `init --no-light --yes` produces the same managed files as a fresh full install.
- **Idempotency:** a second `init --light --yes` plans no change.
- **Rejected options:** `--light --no-light`, and each option from DEC-07 used with `--light` or with an existing `lightMode`, exit 64 with a message that names the option.
- **Other sections:** an existing `delegatedSnapshot` section is kept after `init --light`.
- **No regression:** full-mode `init` suites pass unchanged, and `init.ts` and `installation-service.ts` stay at 100 lines or fewer.

## Verification

- Unit: TC-07.
- Integration: TC-08 on temporary repositories.
- End-to-end: not applicable (T06).
- Platforms: CI matrix. The symlink case runs where links are allowed, as `tests.md` requires.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: test counts and file inventories asserted in the tests.

## Affected files

- Modify: `src/cli/init-arguments.ts`, `src/cli/commands/init.ts`, `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/core/services/installation-findings.ts`
- Create: `src/cli/init-config-updates.ts`, `src/core/services/support-files.ts`, `tests/unit/init-light-arguments.test.ts`, `tests/integration/init-light-mode.test.ts`

## Observability and recovery

- Operational signal: the `init` preview and report list every removal, and a kept protocol produces a `LIGHT_MODE_ASSET_KEPT` finding.
- Recovery: `init --no-light --yes` restores the full install.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `init` parses `--light` and `--no-light`.
  - `src/cli/init-config-updates.ts#planConfigUpdates` routes `--snapshot-trigger` to `lightMode` while light mode is in effect. It rejects each of the seven options of the other modes with `<option> is not available in the light mode. Remove the option, or leave the light mode with --no-light.` (exit 64). It keeps the delegated section, which only `--no-delegated-snapshot` removes, and it absorbs `delegatedUpdate` from `init.ts`.
  - `src/core/services/support-files.ts#planSupportFiles` plans the protocol, instruction, and `.gitignore` files. Full mode keeps the same calls and the same change order. Light mode:
    - deletes the protocol only when the manifest lists it and its hash matches, and otherwise reports `LIGHT_MODE_ASSET_KEPT`;
    - removes the reference blocks;
    - removes the `.gitignore` block only without a plan or checkpoint on disk.
  - `buildManagedAssets` omits the protocol in light mode.
- Deviations within DEC-08 and FR-09 acceptance, recorded for review:
  1. `planConfigChange` now writes the config in schema key order (`inSchemaOrder`). A newly set optional section (`lightMode`, and also `delegatedSnapshot`) used to be appended after `runner`, and the next plain `init` rewrote the file in schema order. The TC-08 second-run check exposed this non-idempotency, and it existed in PRD-06 as well. Configs without optional sections are unchanged.
  2. `removal-helper.ts#removeReferenceFromBody` no longer adds an extra newline when the block was the last thing in the file and the text before it already ends with a newline. Without this fix, full → light left `AGENTS.md` with one extra blank line (FR-09 requires byte-identical user content). `remove` gets the same fix, and every existing removal suite still passes.
- Changed files:
  - Modified:
    - `src/cli/init-arguments.ts` (64 lines), `src/cli/commands/init.ts` (93)
    - `src/core/services/installation-builder.ts` (81), `installation-service.ts` (98), `installation-findings.ts`, `removal-helper.ts`
  - New code: `src/cli/init-config-updates.ts`, `src/core/services/support-files.ts`.
  - New tests: `tests/helpers/light-world.ts`, `tests/unit/init-light-arguments.test.ts` (15), `tests/integration/init-light-mode.test.ts` (6), `tests/integration/init-light-switch.test.ts` (6).
- Checks:
  - `npm run typecheck`, `npm run build`, and `npm run lint` pass.
  - New suites: 27 tests pass. The symlinked `AGENTS.md` case ran rather than skipped on this Windows host.
  - Existing install, init, gitignore, protocol, and instruction suites: 19 files and 100 tests pass.
  - Rebuilt `dist/`, then ran the e2e and init suites (`e2e-07-08`, `e2e-user-hook-preservation`, `e2e-linked-project-root`, `e2e-delegated-snapshot`, `e2e-01-02`, `init-delegated-snapshot`, `delegated-install-support`, `init-arguments`): 8 files and 33 tests pass.
- Validated state: working tree at `c3fb6a8` plus the T01 to T03 diffs, on Windows 11 with Node 24.
- Quality profile:
  - QA-01 to QA-07 and QA-09 have no hits.
  - QA-08 matched `tests/helpers/light-world.ts:24` (`changedPaths`). It is a false positive: the regex counts the commas inside `Record<string, string>`, and the function has 2 parameters.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation or local decision.
