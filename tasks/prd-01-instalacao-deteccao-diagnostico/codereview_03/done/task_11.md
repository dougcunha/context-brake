# T11 — Canonical root and canonical planned targets so linked layouts install, update, and remove correctly

## Outcome

From a repository whose working directory is reached through a symlink or junction, `context-brake init`, `doctor`, and `remove` complete normally instead of aborting, and a second `init --yes` is a byte-identical no-op. Every planned `realPath` equals the canonical snapshot `realPath`, so a symlinked `context-brake.config.json` or a linked `.context-brake/` no longer produces a false `FILE_CHANGED_SINCE_PREVIEW`.

## Dependencies and boundaries

- Depends on: T10 (`resolveChangeTarget` in `src/infrastructure/harnesses/common/change-target.ts`, already merged); T03 (change plan and snapshot engine); T05 (CLI commands and composition root).
- Unblocks: `codereview_03/CR-01`; a re-review of PRD-01 can drop `CR-01` and, once platform evidence exists, close `CA-20`.
- In scope: canonicalizing the project root once at the CLI boundary; symmetric root-confinement for a missing target; canonical `realPath` for the config, manifest, and their removals, following the pattern already used by the protocol, instruction, asset, and harness planners; unit, integration, and end-to-end regression coverage for linked layouts.
- Out of scope: `resolveChangeTarget` and the eight harness planners (already correct, keep them as the canonical-resolution reference), `change-applier` precondition semantics, the JSON editor, vendor schemas, capability tables, `VERSION_FLOOR_UNVERIFIED` (see the report's limitations), and `codereview_03/OI-01`–`OI-03`.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_03/CR-01` | `codereview.md#findings` | TechSpec `ChangePlan.projectRoot` ("Absolute canonical root") and `file-changes.md` ("Resolve symbolic links and junctions before writing", "Write only inside the repository root") are violated: the CLI passes raw `process.cwd()`, `isWithinRepository` canonicalizes only the root, and the config/manifest planned changes use `resolve(root, …)` instead of the canonical target. On a junction-reached root, `init`, `doctor`, and `remove --dry-run` all exit 2 with `UNEXPECTED_ERROR: Path '…' resolves outside repository root`; with a canonical root but a symlinked config or linked `.context-brake/`, the second `init --yes` exits 2 with `FILE_CHANGED_SINCE_PREVIEW: file was created after plan was computed`. |

## Requirements

- `CommandEnv.projectRoot` and `ChangePlan.projectRoot` must be the absolute canonical root: `process.cwd()` resolved through `realpath`, with the unresolved `process.cwd()` kept only as a fallback when `realpath` fails.
- Root confinement must never report an inside-root relative path as outside the repository when the caller passes a non-canonical root: canonicalize the target's nearest existing ancestor before the prefix comparison, reusing `resolveCanonicalPath`/`computeFileIdentity` from `src/infrastructure/storage/path-boundary.ts` and the ancestor walk already implemented in `src/infrastructure/harnesses/common/change-target.ts`.
- The config and manifest planned changes (`create`, `update`, and `delete`) must carry the canonical target used by `snapshotFile`, taken from the matching `FileSnapshot.realPath` exactly as `protocol-service.ts`, `instruction-service.ts`, and `removal-helper.ts` already do — not a fresh `resolve(root, …)`.
- A genuinely changed file between plan and apply must still fail with `FILE_CHANGED_SINCE_PREVIEW`; nothing may widen the precondition.
- Non-linked repositories and all current behavior must not regress; second and third runs stay byte-idempotent.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — `FileChange`, `ChangePlan` ("`projectRoot`: Absolute canonical root"), `InstallationManifest`, "Per-file atomicity with optimistic concurrency", "Known Risks" (Windows symlink privileges).
- Rules and skills: `.agents/rules/file-changes.md` (resolve links, stay inside the root, write atomically), `.agents/rules/node.md`, `.agents/rules/tests.md`, `.agents/rules/cli-output.md`, `AGENTS.md` (hexagonal architecture: `src/core/` must not import `infrastructure/` or `cli/`); `sdd-execute-corrections`.
- Code: `src/cli/main.ts:40` (`projectRoot: process.cwd()`); `src/infrastructure/storage/path-boundary.ts:22-47` (`resolveCanonicalPath`, `isWithinRepository`, `assertWithinRepository`); `src/infrastructure/harnesses/common/change-target.ts` (the canonical resolver to reuse or mirror); `src/core/services/change-plan-service.ts:21-45` (`matchSnapshot`, `processPlannedChanges`); `src/core/services/installation-builder.ts:6-35` (`planConfigChange`, `planManifestChange`); `src/core/services/installation-service.ts:70,80` (wiring, `input.allSnapshots` is already available); `src/core/services/removal-service.ts:38-48` (`planCoreDeletions`); `src/infrastructure/storage/manifest-store.ts:9,26-34` (`planSave`); `src/core/services/protocol-service.ts` and `src/core/services/removal-helper.ts` (the snapshot-`realPath` pattern to follow).

## Work

- [x] T11.1 Canonicalize the project root once: resolve `process.cwd()` with `realpath` before building `CommandEnv` in `src/cli/main.ts` (or in the composition root, keeping `main.ts` free of the detail), and use that single value everywhere the root flows. Keep `process.cwd()` as the fallback when `realpath` rejects. `ChangePlan.projectRoot` must then equal the canonical root.
- [x] T11.2 Make root confinement symmetric in `src/infrastructure/storage/path-boundary.ts`: when the target does not exist, compare the canonical root against the canonicalized nearest existing ancestor plus the remaining segments, so an inside-root relative path is never reported as outside, and an outside-pointing link or `../` escape is still rejected.
- [x] T11.3 Give the config and manifest planned changes the canonical target: pass the config and manifest snapshots into `planConfigChange`/`planManifestChange` (`src/core/services/installation-builder.ts`) from `planInstallation` (`installation-service.ts`, `input.allSnapshots`) and use `snapshot.realPath`; do the same for the manifest and config deletions in `planCoreDeletions` (`removal-service.ts`). Align `NodeManifestStore.planSave` (`manifest-store.ts`) with the same rule. Do not import `infrastructure/` from `src/core/`.
- [x] T11.4 Add regression tests: a unit test that `assertWithinRepository` accepts a missing path under a linked root and still rejects an out-of-root path and an outside-pointing link; an integration fixture for a junctioned/symlinked project root asserting the plan's `projectRoot` and every `realPath` are canonical and that a repeat plan reports no changes; integration fixtures for a symlinked `context-brake.config.json` and a linked `.context-brake/` asserting `beforeSha256` carries the existing hash and a repeat plan reports no changes; an end-to-end built-CLI scenario for `init --yes` twice plus `doctor` and `remove --dry-run` from a linked root.
- [x] T11.5 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run schemas:check`, and `npm run package:smoke`; confirm the `codereview_03/CR-01` repros no longer fail and every gate stays green.

> State reconciliation (`codereview_04/CR-03`, T13): all five work items above were independently re-verified against the current worktree and are complete. T11's original `doctor` exit-0 expectation is intentionally superseded by `codereview_04/CR-02` (T12): `doctor` now reports an unknown version floor as a warning with exit 1, and the linked-root E2E asserts that result together with the stable finding code. T11.4 and T11.5 remain complete — the named regression tests exist and the repository gates are green.

## Acceptance criteria

- From a repository whose working directory is a symlink or junction to the real repository, built-CLI `init --yes`, `doctor`, and `remove --dry-run` exit 0 with no `UNEXPECTED_ERROR` and no `RepositoryBoundaryError`; `init --yes` run twice leaves the repository byte-identical.
- `ChangePlan.projectRoot` and every `FileChange.realPath` equal the canonical target that `snapshotFile` reports for the same path.
- With `context-brake.config.json` a symlink inside the repository, the second `init --yes` is a byte-identical no-op (no `FILE_CHANGED_SINCE_PREVIEW`), the symlink survives, and the edit lands in the link target. The same holds when `.context-brake/` is a junction: `.context-brake/manifest.json` updates without error.
- A file modified after planning still fails with `FILE_CHANGED_SINCE_PREVIEW` and exit 2 (existing IT-15 stays green).
- An outside-pointing link or a `../` escape is still rejected; no non-linked fixture changes behavior.

## Verification

- Unit: `assertWithinRepository`/`isWithinRepository` accept a missing target under a linked root and reject `../../outside.txt` and a link pointing outside the root; `createChangePlan` yields the snapshot hash (not `null`) for a symlinked config change and zero changes on a repeat plan. Expected result: pass.
- Integration: new linked-root, symlinked-config, and linked-manifest fixtures assert plan/snapshot identity, byte-idempotent second runs, link preservation, and that `resolve()`-style logical paths no longer appear in `change.realPath`. Existing `tests/integration/symlinked-harness-config.test.ts`, `change-applier.test.ts`, `symlink-junction.test.ts`, and the instruction symlink tests stay green.
- End-to-end: built CLI on a junctioned/symlinked root fixture — `init --yes` exits 0 twice with identical bytes, `doctor` exits 0, `remove --dry-run` exits 0; rerun E2E-01 and E2E-04 per the CLI policy in `AGENTS.md`.
- Manual: not applicable.
- Platforms: Linux, macOS, and Windows. Use the junction variant on Windows (no symlink privilege needed) and the directory-symlink variant on POSIX; skip a variant only when the runner cannot create the link, and record the reason in the test output.
- Environment dependency: none; the link variants rely on the same capabilities the T10 fixtures already use.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run schemas:check`, `npm run package:smoke`.
- Expected evidence: new failing-then-passing tests, a green linked-root E2E, canonical `projectRoot`/`realPath` assertions, and coverage at or above the 80% thresholds.

## Affected files

- Modify: `src/cli/main.ts` (and `src/cli/composition-root.ts` only if the root is resolved there), `src/infrastructure/storage/path-boundary.ts`, `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `src/infrastructure/storage/manifest-store.ts`, `tests/unit/path-boundary.test.ts` (extend the existing confinement cases).
- Create: `tests/integration/linked-project-root.test.ts`, `tests/e2e/e2e-linked-project-root.test.ts`. The linked layouts are built at runtime in temporary directories with `mkdtemp` + `symlink`/junction, following the T10 fixtures, so no new static fixture files are needed.

## Observability and recovery

- Operational signal: `ChangePlan.projectRoot` and each `change.realPath` are canonical; `FILE_CHANGED_SINCE_PREVIEW` and `RepositoryBoundaryError` appear only for real concurrent edits or real out-of-root targets.
- Recovery: every change is planned before writing and applied per-file atomically; a rejected file is left untouched, and a plan that fails to apply leaves the root, the links, and every unowned byte intact.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Resolved CR-01 by canonicalizing the project root at CLI boundaries (`main.ts` and `composition-root.ts`) via `realpath(root).catch(() => root)`, adding symmetric nearest-existing-ancestor resolution to `path-boundary.ts` (`findExistingAncestor`), and propagating snapshot canonical `realPath` into config and manifest planned changes and deletions (`installation-builder.ts`, `installation-service.ts`, `removal-service.ts`, `manifest-store.ts`, `manifest.ts`). Added unit tests for linked-root confinement and out-of-root / outside-symlink rejection (`tests/unit/path-boundary.test.ts`), integration tests for linked project root, symlinked config, and linked `.context-brake/` with idempotency checks (`tests/integration/linked-project-root.test.ts`), and end-to-end built-CLI regression testing `init --yes` twice, `doctor`, and `remove --dry-run` on a junctioned root fixture (`tests/e2e/e2e-linked-project-root.test.ts`).
- Changed files:
  - Modified: `src/cli/main.ts`, `src/cli/composition-root.ts`, `src/infrastructure/storage/path-boundary.ts`, `src/core/contracts/manifest.ts`, `src/infrastructure/storage/manifest-store.ts`, `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `tests/unit/path-boundary.test.ts`.
  - Created: `tests/integration/linked-project-root.test.ts`, `tests/e2e/e2e-linked-project-root.test.ts`.
- Checks:
  - `npm run lint`: passed (0 errors, 0 warnings; max-lines <=100, max-lines-per-function <=30, max-params <=3).
  - `npm run typecheck`: passed (0 errors with strict TypeScript configuration).
  - `npm test`: passed (61 test files, 203 tests passed).
  - `npm run coverage`: passed (all coverage thresholds met across 61 test files).
  - `npm run build`: passed (clean build into `dist/`).
  - `npm run schemas:check`: passed (schemas current and valid).
  - `npm run package:smoke`: passed (187 packaged files, clean CLI launch).
  - `npm run dependencies:check`: passed (3 runtime dependencies, 0 install scripts).
- Validated state:
  - Code & architecture: Hexagonal architecture clean (0 imports from `infrastructure/` or `cli/` inside `src/core/`). All files strictly meet limits.
  - Platform & environment: Windows 11 (win32), Node.js v24.19.0, npm 11.17.0.
  - Behavior: Linked project roots (`linkrepo -> realrepo`), symlinked `context-brake.config.json`, and linked `.context-brake/` install without `RepositoryBoundaryError` or `UNEXPECTED_ERROR`; second `init --yes` runs are byte-idempotent no-ops; built-CLI `doctor` reports healthy (exit 0) and `remove --dry-run` exits 0.
- Open items:
  - None for T11 / CR-01. Optional review improvements OI-01 to OI-03 and CA-20 Linux/macOS multi-platform evidence remain recorded in `codereview.md`.
