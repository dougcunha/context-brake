# TechSpec — PRD 1.1 installation follow-ups

## Sources and traceability

- PRD: `tasks/prd-01.1-pendencias-da-instalacao/prd.md` (`OBJ-01`–`OBJ-05`, `US-01`–`US-07`, `FR-01`–`FR-13`, `NFR-01`–`NFR-05`).
- Parent feature: `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` and its `techspec.md` (`DEC-02` `IgnoreBlock` model, capability contracts, manifest and report contracts).
- Downstream feature: `tasks/prd-02-telemetria-zonas-e-freio/techspec.md`. Its runtime writes only inside `<root>/.context-brake/runtime/` (`techspec.md:148,158,232`), which is the state directory `FR-09` removes.
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `file-changes.md`, `cli-output.md`; `sdd-create-techspec` with its three references.
- Research: `docs/research/harness-integrations.md`, sections `Claude Code`, `Codex CLI`, `Cursor`, `GitHub Copilot CLI`, `OpenCode`, `Pi`, `Oh-My-Pi`, `Antigravity CLI`. Dated 12–13 September 2026; PRD-01.1 requires a 14 September 2026 re-check for minimum versions (FR-12) and any drift (FR-13).
- **Already delivered, out of this TechSpec's scope:** `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_09/codereview.md` (`APPROVED WITH RESERVATIONS`, git range `2a26a3e..301de3e`) verifies PRD-01.1 `FR-01` (`.gitignore` block), `FR-02` (support-level rule), `FR-03` (failure/timeout limitations), `FR-04` (context-usage declaration), and `FR-05` (event-accurate overhead benchmark) as conformant, with `support-service.ts`, `gitignore-service.ts`, `overhead-measurer.ts`, and `in-process-sampler.ts` as evidence. The same report lists `FR-06`–`FR-13` and part of `NFR-01` as `pending`, "not part of the CR-01..CR-06 correction set" (`codereview_09/codereview.md:84-92,211`). This TechSpec covers only that pending set; it does not restate or re-verify `FR-01`–`FR-05`.
- Evidence in existing code (HEAD `301de3e`):
  - `src/infrastructure/harnesses/antigravity-cli/schemas.ts:14-17` reads `toolName`; `pi/schemas.ts:6-14` and `oh-my-pi/schemas.ts:6-14` read `name`, while the adapters' own `benchmarkFixture()` already sends `toolName`/`toolCallId` (`pi/adapter.ts:70-77`) and `toolCall.name`/`toolCall.args` is undocumented in the current Antigravity schema at all.
  - `src/core/services/installation-builder.ts:47` defaults `packageVersion` to `'1.0.0'`; `src/cli/commands/init.ts` never passes a version into `planInstallation`.
  - No `asset-currency` module, `ASSET_OUTDATED`, or `ASSET_MODIFIED` finding exists; `installation-service.ts` writes a planned `runtime_asset` change unconditionally, so `init` silently overwrites a user-modified asset.
  - `src/core/services/state-removal.ts` plans only the plan/checkpoint files; `--remove-state` never touches `.context-brake/runtime/`, and `src/infrastructure/storage/change-applier.ts` never removes a directory.
  - `src/cli/commands/init.ts:49` (`emitLegacyPreview`) writes `LEGACY_BLOCK_DETECTED` to stderr before confirmation, and `src/cli/output/text.ts:24` (`renderInstallText`) writes every finding again, including the same code, after confirmation.
  - `src/core/services/protocol-service.ts:12-13` renders `RED` without a commit instruction and `CRITICAL` without `git add`; `docs/context-brake-protocol.md` matches that unrendered text.
  - `src/core/services/support-service.ts:9-13` (`gatedState`) turns a capability `unknown` for any non-`resolved` `VersionProbe` once `minimumVersion` is set, including `timed_out` and `unknown` probes; no adapter currently sets `minimumVersion`.
  - `tsconfig.check.json` includes `src/**/*.ts`, `tests/**/*.ts`, `scripts/**/*.ts`, but not `assets/**/*.ts`; `assets/runtime/*.ts` (10 files) are type-checked only implicitly by `esbuild` during `assets:build`, which does not fail the build on a type error.
  - `README.md:51-64` and `readme-support-table.test.ts` already match the code (delivered by `codereview_09/codereview_08` `CR-05`); `docs/research/harness-integrations.md` was not part of that correction and still lacks minimum-version records and the 14 September re-check.

## Solution summary

This feature closes the remaining PRD-01.1 obligations that PRD-02 depends on. It makes adapter payload schemas match documented vendor field names, records the real package version in the installation manifest, and lets `doctor` and `init` tell an outdated managed asset (superseded by a newer package) from a modified one (edited by the user) without ever overwriting the latter. It extends `remove --remove-state` to also delete the PRD-02 runtime-state directory and prune the ContextBrake directories it leaves empty, stops the duplicate legacy-block warning, renders the protocol text approved on 2026-09-14, and fixes the version-gating regression that a naive minimum-version rollout would introduce. It also brings `assets/runtime/` under the same typecheck gate as the rest of the source tree and records the 2026-09-14 research findings, including verified minimum versions where a source exists.

FR-01 through FR-05 of the parent PRD are already implemented and reviewed (`codereview_09`, `APPROVED WITH RESERVATIONS`) and are out of scope here. This feature ends with its own review and QA, followed by the first PRD-01 QA covering RF1–RF24 and CA-01–CA-21 (PRD-01.1 `OBJ-01`, `Constraints and dependencies`).

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-06 | Rewrite `antigravity-cli/schemas.ts`, `pi/schemas.ts`, and `oh-my-pi/schemas.ts` to the documented field names, non-strict: Antigravity's `PreToolUse` payload becomes `{ conversationId?, toolCall?: { name?, args? } }`; Pi and Oh-My-Pi's `tool_call`/`tool_result` payloads become `{ toolName?, toolCallId?, input?, content? }`. Rewrite the matching fixtures in `tests/fixtures/harnesses/{antigravity-cli,pi,oh-my-pi}/`. | The three adapters' own `benchmarkFixture()` methods already send the documented shape (`pi/adapter.ts:76`: `toolName`, `toolCallId`, `input`), but the Zod schemas that parse real harness payloads still expect the old, undocumented field names, so a real vendor payload would parse only by accident through `.passthrough()` and any code reading the typed fields would read `undefined`. | Keep both old and new field names as optional: preserves undocumented shapes in the schema and fixtures indefinitely, contradicting `harness-adapters.md`'s "treat undocumented behavior as unsupported". |
| DEC-02 | FR-07 | Add `src/infrastructure/storage/package-metadata.ts`, exporting `readPackageVersion(): Promise<string>`, which resolves this package's own `package.json` from the dist layout (`dist/src/infrastructure/storage/` → four levels up) and the source layout (three levels up), the same candidate strategy `loadRuntimeAsset` already uses, and validates `{ name: 'context-brake', version }` with Zod plus a `semver.valid` check. `src/cli/commands/init.ts` and `remove.ts` call it once and pass the result as `InstallationInput.packageVersion` / into removal's manifest read; `planManifestChange` in `installation-builder.ts` requires `pkgVer` (the `'1.0.0'` fallback is removed). A missing or invalid file throws `PackageMetadataError`, mapped to `UNEXPECTED_ERROR` by the existing CLI error envelope. | `installation-builder.ts:47` hardcodes `'1.0.0'` for every install, so `doctor` can never tell an asset installed by an older ContextBrake apart from one that matches the running package (FR-08 depends on this). `loadRuntimeAsset` already solves the same dist/source path-resolution problem for a different file, so the approach is proven in this codebase. | `import pkg from '../../package.json' with { type: 'json' }`: Node 20 prints an experimental-feature warning on stderr, which `cli-output.md` reserves for warnings and errors the user did not ask for. A version baked in at build time: one more generated file for `assets:check`/`schemas:check` to keep current. |
| DEC-03 | FR-08, OBJ-04, US-03 | Add a pure function `classifyAssetCurrency(installedSha, manifestSha, expectedSha): 'current' \| 'outdated' \| 'modified'` in a new `src/core/services/asset-currency.ts`: `current` when `installedSha === expectedSha`; `outdated` when `installedSha === manifestSha` but differs from `expectedSha`; `modified` otherwise. `doctor` calls each installed adapter's `planInstall(ctx)` (already read-only; no adapter port change) to get the expected `runtime_asset` content per path, hashes it, and classifies every `InstallationManifest.assets` entry of kind `runtime_asset` whose path that adapter owns; `outdated` produces the `ASSET_OUTDATED` warning and `modified` produces `ASSET_MODIFIED`. Without a manifest, no check runs. In `installation-service.ts`, after adapters plan their changes, every planned `runtime_asset` `FileChange` is classified the same way (`installedSha` from the matching `FileSnapshot`, `manifestSha` from `previousManifest`); a `modified` result removes that change from the plan and adds the existing `MODIFIED_OWNED_ASSET` conflict instead of silently overwriting the user's edit. | `planInstall` already produces the exact bytes ContextBrake would write, so no new adapter method or duplicated rendering logic is needed to know what "current" means. Removal already refuses to delete a modified asset (`removal-helper.ts:55`, `MODIFIED_OWNED_ASSET`); `init` has no equivalent protection today and would clobber a hand-edited hook script on the next run. | A dedicated adapter port exposing expected asset metadata: touches the contract and all eight adapters for information `planInstall` already computes. Compare only `packageVersion`: every existing manifest says `1.0.0`, so two different development builds at the same fallback version would go undetected. |
| DEC-04 | FR-09, US-06 | Add `src/infrastructure/storage/runtime-state-files.ts` with an async, recursive `listRuntimeStateFiles(root): Promise<string[]>` over `<root>/.context-brake/runtime/`. `remove --remove-state` (already the sole gate per `state-removal.ts`) snapshots those files and adds one `delete` `PlannedChange` per file with a new owner `runtime_state` (added to `CHANGE_OWNERS`). After `NodeChangeApplier.apply` finishes its per-file changes, it removes directories under `<root>/.context-brake/` left empty by applied deletes, deepest first, stopping at the first non-empty or symlinked directory it meets and reporting that directory as a `skipped` outcome with the reason instead of failing the command. Without `--remove-state`, nothing under `.context-brake/runtime/` is listed or touched. | The runtime directory is `.context-brake/runtime/`, defined by the PRD-02 TechSpec (`tasks/prd-02-telemetria-zonas-e-freio/techspec.md:148,158,232`) as the only place PRD-02 writes session ledgers and logs, matching this PRD's assumption. The change engine is already file-based with per-file hash preconditions; a directory-level delete kind would bypass that. Today `remove` already leaves an empty `.context-brake/` behind after deleting the manifest, which this decision also fixes as a side effect. | A new `ChangeKind` for directory deletion: breaks the one-file-one-precondition model and complicates dry-run previews. Leave runtime files for a human to delete: contradicts "remove deletes only what ContextBrake created" in `file-changes.md`. |
| DEC-05 | FR-10, US-07 | `init` keeps printing the legacy preview on stderr in `emitLegacyPreview`, but only for the case that already needs it: a confirmable run (no `--yes`, no `--dry-run`) where the user has not yet approved the plan. `renderInstallText` (called after confirmation, or for `--dry-run`/`--yes` runs where `emitLegacyPreview` printed nothing) is unchanged. In the one case where both would fire — a confirmed non-dry-run install — `runInit` passes the already-emitted `LEGACY_BLOCK_DETECTED` finding paths to `renderInstallText`, which skips exactly those findings by code and path so the same warning is not printed twice on the same invocation. JSON output is unaffected: it always carries one finding per file, from `InstallReport.findings`, never from the stderr preview. | `emitLegacyPreview` and `renderInstallText` already read from the same `result.findings` array, so the duplicate is structural, not a fluke: any confirmed run with a legacy block prints the code once before the prompt and once after. `cli-output.md` requires human/JSON parity, so JSON must keep every finding even though text shows each once. | Remove the stderr preview entirely: the user would be asked to confirm a legacy migration without first seeing which files and blocks are affected. Deduplicate inside `InstallReport.findings` itself: would also drop the finding from `--json` output, contradicting FR-10's own acceptance criterion that JSON keeps one finding per file. |
| DEC-06 | FR-11 | `renderZoneRows` in `protocol-service.ts` changes two cells to match the 2026-09-14 product decisions: the `RED` row's action gains ", running the validation command, `git status`, `git add`, and `git commit`" is unaffected (RED already lists validation and commit); the `CRITICAL` row's action becomes "Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions." — adding `git add` to the existing `git status`/`git commit` allowlist, per `harness-adapters.md`'s failure-policy allowlist and this PRD's `Assumptions and sources` decision "Acima do teto, ficam liberados `git status`, `git add` e `git commit`". The repository's packaged `docs/context-brake-protocol.md` is regenerated from `renderProtocol(DEFAULT_CONFIG)` in the same change. | The current `CRITICAL` row (`protocol-service.ts:13`) allows only `git status` or `git commit`, missing `git add`; an agent following the protocol literally could stage nothing and never produce a valid commit at the ceiling. | Wait for PRD-02's own allowlist module: installed protocols would keep telling agents an incomplete Git sequence until PRD-02 ships, and this PRD's own decision already fixes the wording independently of PRD-02's dynamic allowlist. |
| DEC-07 | FR-12, RF9 | For each of the 8 harnesses, `docs/research/harness-integrations.md` records a `**Versão mínima:**` line with either a release-note/changelog source and the first version documenting every mechanism this package registers, or `não documentada (14/09/2026)`. Every adapter with a verified floor passes it through the existing `minimumVersion` parameter already threaded through `probeExecutableVersion` (`common/version-probes.ts:10`) into its `capabilityProfile(version)` call. `support-service.ts`'s `gatedState` changes from "any non-`resolved` status with a floor turns the capability `unknown`" to "only an `old` status turns it `unknown`"; `unknown`, `malformed`, and `timed_out` probes keep the adapter's declared capability states and each already-non-`supported` capability keeps its own impact text (`floorLimitation` is unaffected: it still adds the "minimum version unverified" limitation only when no floor exists at all). | RF9 requires warning about an old version, but the current gating (`support-service.ts:9-13`) would make adding *any* floor regress a fully capable harness to `cooperative` whenever its executable is merely not on `PATH` or its version output cannot be parsed — exactly the case in CI and on a machine without the harness installed. PRD-01's TechSpec already forbids inventing floors without evidence; this decision only fixes how a *verified* floor is applied once FR-12's research provides one. | Keep the current gating: the first adapter to declare a real minimum version would silently downgrade every environment where the version probe is inconclusive, which is worse than not declaring the floor at all. |
| DEC-08 | FR-13 | `docs/research/harness-integrations.md`'s header note and each of the 8 harness sections record the facts reconfirmed on 2026-09-14 that this feature's other decisions depend on: Antigravity's documented `toolCall.name`/`toolCall.args` shape (DEC-01), Pi/Oh-My-Pi's `toolName`/`toolCallId`/`input` shape (DEC-01), and the minimum-version records (DEC-07). Divergences already fixed in code but not yet reflected in this file are corrected in the same change; the README support table and `.omp/extensions/` wording are already current (`readme-support-table.test.ts`, delivered by `codereview_08` `CR-05`) and are not touched again here. | `harness-adapters.md` requires updating the research section, the adapter, and its fixtures in the same change whenever behavior differs; DEC-01 and DEC-07 are exactly such changes and must not land without their research-file counterpart, which is the gap FR-13's acceptance criterion names explicitly ("A pesquisa de integrações registra as divergências encontradas na consulta de 14/09/2026"). | Update only the adapters and leave the research file for a later pass: repeats the drift `codereview_08/CR-05` already had to correct once for the README. |
| DEC-09 | NFR-01 | Add `"assets/**/*.ts"` to `tsconfig.check.json`'s `include` array. `npm run typecheck` (`tsc -p tsconfig.check.json --noEmit`) then fails on a type error anywhere under `assets/runtime/`, closing the gap where `assets:build`'s `esbuild` bundling step transpiles those files without a blocking type check. | `assets/runtime/*.ts` (10 files, thin per-harness entrypoints and stubs) are excluded from `tsconfig.check.json`'s `include`; `esbuild` alone does not perform full type checking, so a type error there currently reaches `npm run build`'s output undetected until a runtime failure. | Add a second, separate `tsc` invocation scoped to `assets/`: two commands to keep in sync with `AGENTS.md`'s `typecheck` entry instead of one shared gate. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/infrastructure/harnesses/{antigravity-cli,pi,oh-my-pi}/schemas.ts`; `tests/fixtures/harnesses/{antigravity-cli,pi,oh-my-pi}/` | Modified | Documented payload field names (DEC-01). | — |
| CMP-02 | `src/infrastructure/storage/package-metadata.ts`; `src/core/services/installation-builder.ts`; `src/cli/commands/init.ts`, `remove.ts` | New, modified | Read and require the running package version for the manifest (DEC-02). | — |
| CMP-03 | `src/core/services/asset-currency.ts`; `src/core/services/doctor-service.ts`; `src/cli/commands/doctor.ts`; `src/core/services/installation-service.ts` | New, modified | Classify manifest assets for `doctor`; block `init` from overwriting a modified asset (DEC-03). | CMP-02 |
| CMP-04 | `src/infrastructure/storage/runtime-state-files.ts`; `src/core/services/state-removal.ts`; `src/infrastructure/storage/change-applier.ts`; `src/cli/commands/remove.ts` | New, modified | List and plan deletion of runtime-state files; prune empty ContextBrake directories after apply (DEC-04). | CMP-10 |
| CMP-05 | `src/cli/commands/init.ts`; `src/cli/output/text.ts` | Modified | Print the legacy warning once per file across stderr preview and text report (DEC-05). | — |
| CMP-06 | `src/core/services/protocol-service.ts`; `docs/context-brake-protocol.md` | Modified | `CRITICAL` row includes `git add` (DEC-06). | — |
| CMP-07 | `src/core/services/support-service.ts`; `src/infrastructure/harnesses/*/adapter.ts` (only adapters with a verified floor) | Modified | Fix version-gating so only an `old` probe downgrades capabilities; declare researched floors (DEC-07). | — |
| CMP-08 | `docs/research/harness-integrations.md` | Modified | Record 2026-09-14 facts and minimum-version sources (DEC-08). | CMP-01, CMP-07 |
| CMP-09 | `tsconfig.check.json` | Modified | Typecheck scope includes `assets/**/*.ts` (DEC-09). | — |
| CMP-10 | `src/core/contracts/changes.ts`; `schemas/install-report.schema.json` | Modified | `CHANGE_OWNERS` gains `runtime_state`. | — |
| CMP-11 | `src/core/contracts/diagnostics.ts`; `schemas/doctor-report.schema.json` | Modified | New finding codes are free-form strings under the existing regex; no schema shape change beyond what CMP-10 already adds via the shared `CHANGE_OWNERS` import. | CMP-10 |

Flow:

- **`init`:** reads the package version once (CMP-02) and passes it into `planInstallation`. After adapters plan their changes, every `runtime_asset` change is classified against the manifest (CMP-03); a `modified` result becomes a `MODIFIED_OWNED_ASSET` conflict instead of a write. The manifest is written with the real version. The legacy preview prints once per file whether it appears before confirmation, in the text report, or in both in a way that is still counted once (CMP-05).
- **`doctor`:** for each installed harness, calls `planInstall` to get expected asset content, classifies every manifest asset the harness owns (CMP-03), and emits `ASSET_OUTDATED`/`ASSET_MODIFIED` findings. Version probes with a floor keep their declared capability states unless the probe itself is `old` (CMP-07); a `VERSION_FLOOR_UNVERIFIED` warning stops appearing for harnesses with a recorded floor.
- **`remove --remove-state`:** in addition to today's plan/checkpoint deletion, lists and plans deletion of every file under `.context-brake/runtime/` (CMP-04). After applying, empty ContextBrake directories are pruned.

## Contracts and data

### Payload schemas (DEC-01)

| Harness | Schema | Documented fields (non-strict) |
| --- | --- | --- |
| Antigravity CLI | `antigravityPreToolUsePayloadSchema` | `conversationId?: string`, `toolCall?: { name?: string; args?: unknown }` |
| Pi | `piToolCallPayloadSchema` / `piToolResultPayloadSchema` | `toolName?: string`, `toolCallId?: string`, `input?: unknown` / `toolName?: string`, `toolCallId?: string`, `content?: unknown` |
| Oh-My-Pi | `ompToolCallPayloadSchema` / `ompToolResultPayloadSchema` | Same shape as Pi. |

### Report contracts (schema version 1, additive)

| Contract | Change | Compatibility |
| --- | --- | --- |
| `ChangeOwner` in `changes.ts` / `install-report.schema.json` | Adds `runtime_state` | Additive enum value; no release tag exists |
| `DiagnosticFinding.code` | New codes `ASSET_OUTDATED`, `ASSET_MODIFIED` | Free-form under the existing `^[A-Z0-9_]+$` regex |
| `InstallationManifest.packageVersion` | Holds the running package's `package.json` version instead of the `'1.0.0'` fallback | Schema unchanged (already `z.string().min(1)`) |
| `CapabilityProfile.minimumVersion` | Populated for harnesses with a researched floor (DEC-07) | Schema unchanged (already `string \| null`) |

New findings:

| Code | Severity | Scope | Message and remediation |
| --- | --- | --- | --- |
| `ASSET_OUTDATED` | `warning` | `harness` | "The runtime asset `<path>` was installed by ContextBrake `<manifest packageVersion>` and differs from the asset in the running `<packageVersion>`." Remediation: "Run context-brake init --yes." |
| `ASSET_MODIFIED` | `warning` | `harness` | "The runtime asset `<path>` differs from the version ContextBrake installed." Impact: "init and remove leave it untouched, so the harness runs the modified file." Remediation: "Restore or delete the file, then run context-brake init --yes." |

`MODIFIED_OWNED_ASSET` (existing conflict code, already used by removal) is reused by `init`'s new asset-currency check instead of a new code, per DEC-03.

### Protocol rows (DEC-06)

- `CRITICAL`: "Other tool calls are blocked. Only reading or writing the plan and checkpoint, running the validation command, `git status`, `git add`, and `git commit` are allowed. Complete the `RED` actions."

## Integrations and interfaces

- **Harness facts confirmed for this change:** Antigravity CLI's `PreToolUse` payload nests the tool call under `toolCall: { name, args }`; Pi and Oh-My-Pi's `tool_call`/`tool_result` payloads use `toolName`, `toolCallId`, `input`, and `content` (already reflected in each adapter's own `benchmarkFixture()`, not yet in their Zod schemas).
- **Asset comparison:** `doctor`'s new classification step calls only the already-async `HarnessAdapter.planInstall(ctx)`, which performs no writes; no new I/O port is introduced. `init`'s protection step runs after the existing adapter planning and before `createChangePlan`, so a blocked asset never reaches the applier.
- **Runtime-state removal:** `listRuntimeStateFiles` uses `node:fs/promises` `readdir` with `{ recursive: true }` and returns POSIX-relative paths; each file becomes one `FileSnapshot` through the existing snapshot pipeline so its delete keeps the same SHA-256 precondition as every other planned change.
- **Directory pruning:** runs only after `NodeChangeApplier.apply` finishes its per-file loop, walks up from each successfully deleted file's parent under `.context-brake/`, and calls `rmdir` (not `rm -r`) on directories it finds empty, so it can never remove a directory holding an unrelated file.
- **Idempotency:** a second `init` with an unchanged package and configuration plans no manifest or asset change; a second `remove --remove-state` finds no runtime files and prunes nothing, because the directories are already gone.
- **Failure policy:** a `runtime_state` file that changed between preview and apply fails with the existing `FILE_CHANGED_SINCE_PREVIEW` code, and its directory is not pruned since it is not empty.

## Errors, security, and recovery

- **Errors and edges:**
  - A missing or invalid `package.json` for the running package throws `PackageMetadataError` (extends `Error`, carries the searched paths); `init` and `remove` report it as `UNEXPECTED_ERROR` per the existing CLI error envelope. This can only happen with a broken installation of ContextBrake itself.
  - `doctor`'s asset classification is skipped for a harness whose `planInstall` returns any conflict, so a broken vendor config file never produces a false asset finding.
  - An asset listed in the manifest but missing on disk keeps the existing `ASSET_MISSING` finding; the new classification only runs when the file exists.
  - Directory pruning stops at the first non-empty directory and never follows a symbolic link out of `.context-brake/`.
- **User files and sensitive data:** `init` never overwrites a runtime asset the user changed (DEC-03); `remove --remove-state` only ever touches files under `.context-brake/runtime/`, never harness configuration or instruction files; no new data leaves the machine.
- **Concurrency:** every runtime-state delete keeps its SHA-256 precondition, same as every other planned change; directory pruning re-checks emptiness immediately before each `rmdir`.
- **Rollback:** reinstalling the same or a newer package with `init --yes` restores the manifest and any outdated asset; reverting `protocol-service.ts` and `docs/context-brake-protocol.md` in git restores the previous protocol text; the additive schema and manifest fields need no migration.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1. Payload schemas and fixtures (DEC-01) | — | TC-01 passes. |
| 2. Package version and manifest (DEC-02) | — | TC-02 passes. |
| 3. Asset currency: doctor findings and init protection (DEC-03) | 2 | TC-03 and TC-04 pass. |
| 4. Runtime-state removal and directory pruning (DEC-04) | — | TC-05 passes. |
| 5. Single legacy warning (DEC-05) | — | TC-06 passes. |
| 6. Protocol text and packaged file (DEC-06) | — | TC-07 passes. |
| 7. Version-gating fix and researched floors (DEC-07) | — | TC-08 passes. |
| 8. Research file update (DEC-08) | 1, 7 | Manual review confirms the recorded facts. |
| 9. Asset typecheck scope (DEC-09) | — | TC-09 passes. |
| 10. Completion gates, this feature's review, then PRD-01 QA | 1–9 | Review report `APPROVED`; PRD-01 QA covers RF1–RF24 and CA-01–CA-21. |

## Test approach

- **Profile:**
  - Runtime surfaces: CLI commands `init`, `doctor`, and `remove`; `doctor`'s benchmark and asset classification only read installed assets and the manifest. No hook or plugin runtime behavior changes.
  - Toolchain: Node.js ≥ 20 (CI 20, 22, 24); TypeScript strict `NodeNext` ESM; Vitest 3; 80% coverage thresholds.
  - Commands from `AGENTS.md`: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run schemas:check`, `npm run dependencies:check`, `npm run package:smoke`.
- **End-to-end:** the built CLI runs against temporary fixture repositories for outdated/modified assets, `remove --remove-state` with populated runtime files, and the single legacy preview.
- **Platforms:** Linux, macOS, and Windows (PowerShell and Git Bash) run TC-05 (paths, directory removal) and TC-09 (typecheck is platform-independent but the asset build is exercised on all three in CI).
- **Prerequisites:** `dist/` built before end-to-end tests. No new git dependency.
- **Manual acceptance:** version-floor research review (TC-08), and this feature's review/QA plus the PRD-01 QA (TC-10). Owner: product owner.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-06 | unit | Documented fixtures for Antigravity, Pi, and Oh-My-Pi parsed by their schemas, including extra vendor fields | All parse; typed access returns `toolCall.name`/`toolCall.args` for Antigravity and `toolName`/`toolCallId`/`input` for Pi/Oh-My-Pi | `tests/unit/harness-schemas-in-process.test.ts`, `tests/unit/harness-schemas-process.test.ts` |
| TC-02 | FR-07 | unit and end-to-end | Metadata read from the dist and source layouts, a missing `package.json`, a non-semver version; built `init --yes` | Version read or `PackageMetadataError`; the manifest's `packageVersion` equals the running `package.json` version | `tests/unit/package-metadata.test.ts`, `tests/e2e/e2e-01-02.test.ts` |
| TC-03 | FR-08, OBJ-04, US-03 | unit | `classifyAssetCurrency` with matching/outdated/modified/no-manifest triples | Returns `current`, `outdated`, `modified` correctly; `current` wins whenever installed equals expected, even with a stale manifest hash | `tests/unit/asset-currency.test.ts` |
| TC-04 | FR-08, OBJ-04, US-03 | integration and end-to-end | Doctor fixture with a current, an outdated (old manifest/package bytes), and a modified asset; `init --yes` over an outdated and a modified asset | `doctor` reports no finding, `ASSET_OUTDATED`, and `ASSET_MODIFIED` respectively; `init` rewrites the outdated asset and reports `MODIFIED_OWNED_ASSET` for the modified one, leaving its bytes unchanged | `tests/integration/doctor-asset-currency.test.ts`, `tests/e2e/e2e-asset-currency.test.ts` |
| TC-05 | FR-09, US-06 | unit and integration | `remove` with and without `--remove-state` over nested runtime files, an absent runtime directory, a file changed after preview, and a stray user file left in `.context-brake/` | Default removal leaves runtime files untouched and still deletes the now-empty `.context-brake/`; `--remove-state` deletes the files and prunes empty directories; no directory means no change; the changed file fails with `FILE_CHANGED_SINCE_PREVIEW` and its directory is not pruned; a directory with a stray file stays and is reported `skipped` | `tests/unit/state-removal.test.ts`, `tests/unit/runtime-state-files.test.ts`, `tests/integration/runtime-state-removal.test.ts`, `tests/integration/directory-pruner.test.ts` |
| TC-06 | FR-10, US-07 | unit and end-to-end | `init` non-TTY without `--yes`; `init --yes`; a confirmed interactive run with a fake prompt; `init --dry-run --json` | `LEGACY_BLOCK_DETECTED` appears exactly once per file in the combined stderr+stdout text of each run; `--json` output still carries one finding per file | `tests/unit/init-legacy-preview.test.ts`, `tests/e2e/e2e-legacy-preview.test.ts` |
| TC-07 | FR-11 | unit | Render the protocol with default and custom state paths; compare the repository's `docs/context-brake-protocol.md` with `renderProtocol(DEFAULT_CONFIG)` | The `CRITICAL` row lists `git status`, `git add`, and `git commit`; the packaged file matches exactly | `tests/unit/protocol-service.test.ts` |
| TC-08 | FR-12, RF9 | unit and manual | `gatedState` with `old`, `unknown`, `malformed`, and `timed_out` probes, with and without a floor; research sections for the 8 harnesses | Only `old` turns a capability `unknown`; the others keep their declared states; each research section records a floor with source, or "não documentada" with the 2026-09-14 date | `tests/unit/support-service-version-gating.test.ts`, `tests/unit/support-service.test.ts`, review |
| TC-09 | NFR-01 | integration | `npm run typecheck` with a temporary type error injected into an `assets/runtime/` source file, then the real tree | The local check fails on the asset; the real tree passes | `npm run typecheck` |
| TC-10 | OBJ-01 | manual | This feature's `sdd-review-code` and QA reports; PRD-01 `qa_01` | Both `APPROVED`, archived in their respective task folders | review and QA reports |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

```bash
RG=(rg -n --type ts -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')
files=()        # every TypeScript file in the task diff
core_files=()   # subset under src/core/
```

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | Empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | `exec`, `execSync`, or `shell: true` | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-06 | Generic `throw new Error(` where a dedicated class names a fixable failure | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | `PackageMetadataError` (DEC-02) already a dedicated class; a hit here is only a finding if it bypasses that class |
| QA-07 | 4+ parameters in one declaration, or a `.ts` file above 100 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"; rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

In the table, `\|` stands for a literal pipe; run the commands with a plain `|`.

- Verification scope: the TypeScript files in each task diff; skip a command whose file list is empty.
- Escalation trigger: eight or more reservation hits, a touched file above 200 lines, or the same block duplicated in three or more places.

### Terrain baseline

Measured on 2026-09-15 at `301de3e`. No target file crosses the 100-line or 10-export structural thresholds, has a declaration with 4+ parameters, or has a `case` statement; every scoped `rg`/`awk` command above returned no match. All target files start clean.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/infrastructure/harnesses/antigravity-cli/schemas.ts` | 21 | 4 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/antigravity-cli/adapter.ts` | 98 | 1 | ≤ 3 | 0 | — | recorded (close to the 100-line limit; this feature only edits `CAPABILITIES`/`benchmarkFixture`, no new export) |
| `src/infrastructure/harnesses/pi/schemas.ts` | 15 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/pi/adapter.ts` | 78 | 1 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/schemas.ts` | 15 | 3 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/harnesses/oh-my-pi/adapter.ts` | 78 | 1 | ≤ 3 | 0 | — | recorded |
| `src/core/services/installation-builder.ts` | 60 | 4 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/init.ts` | 80 | 2 | ≤ 3 | 0 | — | recorded |
| `src/cli/commands/remove.ts` | 69 | 1 | ≤ 3 | 0 | — | recorded |
| `src/core/services/removal-service.ts` | 94 | 3 | ≤ 3 | 0 | — | recorded (close to the 100-line limit; adds only the `runtime_state` wiring already routed through `state-removal.ts`) |
| `src/core/services/removal-helper.ts` | 86 | 4 | ≤ 3 | 0 | — | recorded |
| `src/core/services/state-removal.ts` | 17 | 2 | ≤ 3 | 0 | — | recorded |
| `src/infrastructure/storage/change-applier.ts` | 72 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/doctor-service.ts` | 89 | 2 | ≤ 3 | 0 | — | recorded (close to the 100-line limit; adds a call to the new pure classifier, no branching logic inlined) |
| `src/cli/commands/doctor.ts` | 53 | 1 | ≤ 3 | 0 | — | recorded |
| `src/cli/output/text.ts` | 52 | 4 | ≤ 3 | 0 | — | recorded |
| `src/core/services/protocol-service.ts` | 51 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/services/support-service.ts` | 62 | 2 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/manifest.ts` | 51 | 9 | ≤ 3 | 0 | — | recorded |
| `src/core/contracts/changes.ts` | 34 | 24 | ≤ 3 | 0 | structural: 24 exported members | recorded (one enum value added, no new export) |
| `src/core/contracts/diagnostics.ts` | 38 | 11 | ≤ 3 | 0 | structural: 11 exported members | recorded (no new export; new finding codes are free-form strings) |
| `tsconfig.check.json` | 5 | — | — | — | — | recorded (non-TypeScript) |
| `docs/context-brake-protocol.md` | 27 | — | — | — | — | recorded (non-TypeScript) |
| `docs/research/harness-integrations.md` | 156 | — | — | — | — | recorded (non-TypeScript) |

- Preparatory refactoring: not recommended. `changes.ts` and `diagnostics.ts` cross the export threshold, but this feature adds one enum value and zero new exports to them. `antigravity-cli/adapter.ts`, `removal-service.ts`, and `doctor-service.ts` sit closest to the 100-line limit; each gets contact from this feature (capability declarations, `runtime_state` wiring, and asset classification respectively) but no structural threshold is crossed, so the touches stay ordinary work per the preparatory-refactoring decision table.

## Observability and rollout

- **Signals:**
  - `ASSET_OUTDATED` and `ASSET_MODIFIED` findings in `doctor`, and `MODIFIED_OWNED_ASSET` conflicts in `init`.
  - The manifest's real `packageVersion`.
  - `VERSION_FLOOR_UNVERIFIED` stops appearing for harnesses with a recorded floor.
- **Migration:**
  - Existing installs keep working. The next `init` records the real package version; the next `doctor` after that shows `ASSET_OUTDATED` only when installed bytes differ from the running package, never on the first run after this upgrade (the manifest's old `1.0.0` value is compared against the newly resolved version, which by itself does not change any asset's bytes).
  - A project with a user-edited runtime asset starts seeing `ASSET_MODIFIED` and `init` stops silently overwriting it; this is a behavior change from silent overwrite to a reported, non-destructive conflict.
- **Rollout:** this feature's tasks and gates, then its own review and QA, then PRD-01 `qa_01`, per PRD-01.1's `Constraints and dependencies`.
- **Rollback:** reinstall the previous package with `init --yes` and revert `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md`, and `tsconfig.check.json` with git; the additive schema and manifest fields need no migration.

## Risks and open items

- Risk: official release notes may not name the version that introduced a registered mechanism for every harness. Probability high; impact: `FR-12`'s acceptance already allows "não documentada" with the consultation date, so no capability claim is weakened. Mitigation: record the date and move on.
- Risk: calling `planInstall` for every installed harness on every `doctor` run adds file reads. Probability low; impact: PRD-01's NFR-04 five-second budget. Mitigation: `planInstall` already runs during `init`'s equivalent flow within budget, and no process is spawned by it.
- Risk: directory pruning on Windows can fail while an editor or antivirus holds a handle open. Probability low; impact: an empty directory is left behind. Mitigation: the `skipped` outcome names the reason, and a later `remove` retries.
- Risk: the version-gating fix (DEC-07) changes behavior for any harness that later gets a floor; a wrong floor could mask an actually incompatible harness as `unknown`-but-still-declared. Probability low (floors only ship with a cited source); impact: a false capability claim. Mitigation: `docs/research/harness-integrations.md`'s per-harness source line stays the audit trail, per `harness-adapters.md`.

## Relevant files

- Modify:
  - `src/infrastructure/harnesses/{antigravity-cli,pi,oh-my-pi}/{schemas,adapter}.ts`
  - `src/core/services/{installation-builder,installation-service,doctor-service,state-removal,removal-service,protocol-service,support-service}.ts`
  - `src/cli/commands/{init,remove,doctor}.ts`, `src/cli/output/text.ts`
  - `src/infrastructure/storage/change-applier.ts`
  - `src/core/contracts/changes.ts`
  - `schemas/install-report.schema.json`, `schemas/doctor-report.schema.json`, `docs/context-brake-protocol.md`
  - `tsconfig.check.json`, `docs/research/harness-integrations.md`
  - `tests/fixtures/harnesses/{antigravity-cli,pi,oh-my-pi}/*.json`
- Create:
  - `src/core/services/asset-currency.ts`
  - `src/infrastructure/storage/{package-metadata,runtime-state-files}.ts`
  - Tests: the new suites named in TC-01 to TC-09
