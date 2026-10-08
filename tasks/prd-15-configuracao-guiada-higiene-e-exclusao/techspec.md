# TechSpec — Upgrade hygiene and persistent harness exclusion

## Sources and traceability

- PRD: `tasks/prd-15-configuracao-guiada-higiene-e-exclusao/prd.md` (approved, DEC-HIL-01 in `workflow.md`; sha256 `cb5123fc…911f8`).
- Applicable instructions, rules, and skills: `AGENTS.md`, `.agents/rules/` (`code-standards`, `javascript-typescript`, `node`, `tests`, `harness-adapters`, `file-changes`, `cli-output`), `sdd-create-techspec` references.
- Research: `docs/research/harness-integrations.md` (hook formats of Claude Code, Codex CLI, Cursor, GitHub Copilot CLI, Antigravity CLI). The hook formats this feature edits are the ones the adapters already write; no new harness behavior is relied on.
- Evidence in existing code:
  - Config contract and validation: `src/core/contracts/configuration.ts:41` (`z.strictObject`), `src/core/validation/configuration-validator.ts:11-22`, `src/infrastructure/storage/project-config-store.ts:8-12`.
  - Config consumers: `src/cli/commands/init.ts:22-29`, `remove.ts:19-26`, `doctor.ts:21-30`; runtime read `src/infrastructure/runtime/runtime-composition.ts:44`.
  - Install/remove/doctor services: `installation-service.ts:62-90`, `installation-builder.ts:28-61`, `removal-service.ts:35-80`, `doctor-service.ts:62-91`, `detection-service.ts:26-62`.
  - Hook updaters: `claude-code/claude-hooks-config.ts:4-27`, `claude-code/claude-merger.ts:13-50`, `common/codex-hooks-updater.ts:5-79`, `common/cursor-hooks-updater.ts:5-66`, `common/antigravity-hooks-updater.ts:24-49`, `github-copilot-cli/planner.ts:30-74`.
  - Codex ownership still matches the hook command after commit `c845728` (`CODEX_HOOK_FILE` is inside the git alias definition), so `isCodexOwnedHandler` is unchanged.

## Solution summary

Three independent changes share one gate (`init`). (1) Configuration repair: a pure sanitizing parse in `core/validation` strips unrecognized keys and reports them; `init` reads the configuration tolerantly and lists the dropped keys in the config change preview, while every command that reads the file strictly (`remove`, `doctor`, hooks) reports the keys with a remediation line. (2) Hook hygiene: one shared surgical helper removes ContextBrake-owned entries under any `hooks.*` event outside the adapter's current set, wired into the Claude Code, Codex CLI, Cursor, and Antigravity updaters for both `init` and `remove`; Copilot rewrites its own file and needs only a test. (3) Persistent exclusion: the configuration gains an optional `excludedHarnesses` list; `init` resolves exclusion from the file and the flags in a pure core function, plans the removal of an excluded harness's artifacts by reusing `remove`'s per-harness logic, and persists the list.

No new dependency. Reports keep their published shapes (only the configuration schema changes). Three core services are near the 100-line limit and would cross it; the TechSpec absorbs that with local extractions (DEC-13).

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-04 | `InvalidConfigurationError` gets `remediation: string \| null`, set only when every issue is an unrecognized key. Its `message` stays the body; for an unrecognized-only error the body is one header line plus one line per key (`  stateStorage is not a recognized key`). With `init` and `remove` tolerant (DEC-03, DEC-12), `doctor` is the only command that surfaces an unrecognized-only error: its finding carries the body in `message` and `error.remediation` in `remediation`. No CLI error-document change and no `composition-root` change. Mixed errors keep today's single-line message and no remediation | `report-service.ts` is 100 lines and the CLI error document has only `{code, message}` (`diagnostics.ts:30-35`); doctor findings already have `remediation` | A structured `keys[]` field in the CLI error document: changes `install-report`/CLI error schemas for a path no command reaches any more |
| DEC-02 | FR-02 | `sanitizeConfiguration(input): { config, dropped }` (pure, `core/validation/configuration-sanitizer.ts`): `safeParse`; if every issue is `unrecognized_keys`, delete those keys by issue path from a deep copy, record `{ path, received }`, repeat until valid. The first pass containing any other issue throws `InvalidConfigurationError` built from that pass, so the message names what the person can fix. `ProjectConfigStore` gets `readTolerant(): Promise<{ config, dropped }>`; `read()` stays strict | Nested keys (`telemetry.zones.x`) need the loop because zod reports unrecognized keys per object level. Throwing the failing pass's error avoids telling the person to run `init --yes` only to hit a different error | Regex-editing the raw file: breaks key order/indent and is unsafe; keeping a retired-keys list: rejected at HIL 1 (OI-15-01) |
| DEC-03 | FR-01, FR-02 | `init` never raises `INVALID_CONTEXTBRAKE_CONFIG` for an unrecognized-keys-only file. It meets FR-01 through the preview: the config change summary names every key to drop (`; drop unrecognized keys: stateStorage, brake`). **Accepted at HIL 2 (DEC-HIL-02, OI-01)** | Printing an error from `init` that tells the person to run `init --yes` is circular | Literal reading (init errors too): the person must run a second command that is the same command |
| DEC-04 | FR-02, NFR-01 | The config change is rebuilt from the parsed object (`planConfigChange`), so dropped keys disappear at every depth, order stays `inSchemaOrder`, and a second `init` produces identical content (`createChangePlan` drops an unchanged sha). `--dry-run` goes through the same plan. Confirmation is the existing `authorizeWrite` | `installation-builder.ts:51-61` already serializes the parsed config; no new write path | Surgical text deletion of keys: more code, same result |
| DEC-05 | FR-03, FR-04, NFR-01, NFR-02 | New `infrastructure/harnesses/common/hook-event-cleanup.ts`: `removeOwnedFromEvent(text, event, isOwned)` (generalizes `codex-hooks-updater.ts:37-56`; handles grouped `{matcher, hooks:[…]}` and flat `{command}` shapes) and `removeOwnedFromOtherEvents(text, currentEvents, isOwned)`. For every `hooks.*` key outside `currentEvents` that holds ≥1 owned handler it removes owned handlers surgically via `jsonc-parser` edits (purely-owned groups first, then owned handlers inside mixed groups), and removes the event key only when it ends empty because of that removal. Ownership predicates are event-independent: Claude `invocation.includes(CLAUDE_HOOK_FILE)` (new export `isClaudeOwnedHandler`; `context-brake-statusline.mjs` does not contain `…/context-brake.mjs`), existing `isCodexOwnedHandler`, existing `isCursorOwned`. Wired at the end of `applyHooks` (Claude, merge and remove), `updateCodexHooks`, `updateCursorHooks`. Retired events are detected by exclusion from the current set, so no list of retired event names is kept | Same ownership rule each adapter uses today (PRD constraint); surgical edits keep foreign bytes, key order, indentation, and CRLF | Hard-coding `PreToolUse`: misses other retired events and contradicts the no-retired-list stance of OI-15-01 |
| DEC-06 | FR-03, FR-04 | Antigravity: `cleanLegacyHooks` iterates every `hooks.<event>` object child holding a `context-brake` key (not only `PreToolUse`/`PreInvocation`), removes it, and removes the event object when emptied by that removal; the existing empty-`hooks` cleanup follows. Copilot: no code change; `planCopilotInstall` already rewrites the whole `context-brake.json`, `planCopilotRemove` deletes it. A test proves a retired event in that file disappears. PRD assumption on Copilot confirmed | `antigravity-hooks-updater.ts:24-38`; `github-copilot-cli/planner.ts:30-74` | Leaving Antigravity as is: keeps the `PreToolUse`-only special case |
| DEC-07 | FR-05, FR-06, FR-07 | Configuration schema: `excludedHarnesses: z.optional(z.array(z.enum(HARNESS_IDS)).check(uniqueCheck(DUPLICATE_ENTRIES_RULE)))`, right after `activeHarnesses` (key order follows `Object.keys(configurationSchema.shape)`). `init` omits the key when the list is empty. If a hand-edited file lists a harness in both lists, exclusion wins. `schemas/context-brake.config.schema.json` is regenerated | Optional keeps every existing file valid and idempotent; no schema version bump because no config shape is removed or reinterpreted | Required array: rewrites every config on the next `init`; cross-field "not both" check: extra failure mode for no benefit |
| DEC-08 | FR-05, FR-06, FR-07 | New pure `core/services/harness-exclusion.ts`: `resolveHarnessExclusion({ configured, include, exclude }) → { excluded, selection }` with `excluded = unique((configured − include) ∪ exclude)` sorted, and `selection = { include?, exclude: excluded }` fed to `detectHarnesses` (already yields state `excluded`, which wins). `--harness` therefore clears the exclusion; `--harness X --exclude-harness X` stays the existing argument error (`argument-validator.ts:20-24`). `activeHarnesses = ((current ∪ detected project harnesses) − excluded) ∪ retainedOnConflict` | `detection-service.ts:26-32` already gives `excluded` priority; the PRD changes only where the exclusion comes from | Persisting through a separate flag: rejected (OI-15-02) |
| DEC-09 | FR-05, FR-08 | Excluded harnesses that were installed (`config.activeHarnesses ∪ previousManifest.entries[].harness`) get their artifacts removed by the same code `remove` uses: `planAdapterRemovals` is extracted from `removal-service.ts` into `harness-removal.ts` (`planHarnessRemovals`) and `installation-service` calls it for the installed-and-excluded set. The manifest and assets of the harness vanish because they are rebuilt from active plans only. If a harness's removal reports a conflict (unparseable or modified file), it stays in `activeHarnesses` this run so the next `init` retries; conflicts surface as the existing findings. Because "installed" is derived from the pre-run configuration and manifest, later runs plan nothing for it (FR-06). `remove` is unchanged and still deletes the configuration, exclusion included (FR-08) | Reuses `adapter.planRemove` (`opencode/planner.ts:27`, `claude-code/planner.ts:61-76`, `codex-cli/planner.ts:63-82`) so "as `remove` would for that harness alone" holds by construction | Calling `planRemoval` as a whole: also deletes config and manifest |
| DEC-10 | FR-05 | When no harness stays active, `init` still plans a config-only change if the exclusion changed or a removal is planned (edge: `--exclude-harness X` where X is the only detected harness, or a first run). Otherwise `emptyResult` returns. A new `core/services/no-harness-finding.ts` builds the `NO_PROJECT_HARNESS` warning for `init` and `doctor`; when some detection is `excluded` the message is `All detected harnesses are excluded by configuration.` with remediation `Include one with --harness <id>.` | `installation-service.ts:62-64` returns before any config write, which would silently lose the exclusion; the finding is duplicated in `installation-service.ts:39-43` and `doctor-service.ts:72-76` | Writing nothing and warning: loses the user's explicit request |
| DEC-11 | FR-06, NFR-04 | `doctor` passes `exclude: config.excludedHarnesses − explicit` to `detectHarnesses`, drops excluded ids from its target set, and reports them as `excluded`, never `missing`. Text: new `cli/output/detection-text.ts` prints `  - <harness>: excluded by configuration` for `state === 'excluded'` in `renderInstallText` and `renderDoctorText`. JSON already carries `detections[].state: "excluded"`; no report schema change | `diagnostics.ts` already allows `excluded`; neither renderer prints detections today | New JSON field `excludedBy`: schema change without a consumer |
| DEC-12 | FR-01, FR-08 | `remove` reads the configuration tolerantly (`readTolerant`) and proceeds: unrecognized keys never block uninstalling, and the configuration is deleted as today. `doctor` keeps the finding and also receives the sanitized configuration, so it still diagnoses the active harnesses. **Decided at HIL 2 (DEC-HIL-02, OI-02); a documented clarification of the approved FR-01 clause that lists `remove`; the PRD file is unchanged** | Uninstalling must not require installing first | Follow FR-01 literally (remove fails with "run init --yes"): rejected at HIL 2 |
| DEC-13 | structural | Absorb near-limit files with local extractions that change no public contract and need no new characterization tests: `planAdapters` (`installation-service.ts:32-60`) → `installation-adapters.ts`; `planManifestChange`/`ManifestChangeInput` (`installation-builder.ts:75-94`) → `manifest-change.ts` (imports updated); `planAdapterRemovals` → `harness-removal.ts` (DEC-09). `init.ts` gets a new `cli/init-config-state.ts` (`loadInitConfigState`: tolerant read, exclusion merge, selection) so `runInit` does not grow | Terrain baseline below: builder 94, service 90, doctor-service 91 lines, `runInit` 33 lines | Preparatory refactoring feature: not warranted, every move is local to one task |
| DEC-14 | FR-01 | Runtime hooks keep the strict read (`runtime-composition.ts:44`) and the failure policy: until the person runs `init --yes`, hooks answer neutral and record the error in `errors.jsonl`. Not changed | `harness-adapters.md` Failure Policy; PRD scopes the repair to `init` | Tolerant runtime read: widens the hook path and hides the stale file |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/configuration.ts` | Modified | `excludedHarnesses` field (DEC-07) | — |
| CMP-02 | `src/core/validation/configuration-validator.ts` | Modified | `remediation` on `InvalidConfigurationError`, unrecognized-only body (DEC-01) | — |
| CMP-03 | `src/core/validation/configuration-sanitizer.ts` | New | Strip-and-reparse loop returning `{ config, dropped }` (DEC-02) | CMP-02 |
| CMP-04 | `src/infrastructure/storage/project-config-store.ts` | Modified | `readTolerant()` (DEC-02) | CMP-03 |
| CMP-05 | `src/cli/commands/remove.ts` | Modified | Reads the configuration with `readTolerant` (DEC-12) | CMP-04 |
| CMP-06 | `src/core/services/doctor-checks.ts` | Modified | Doctor finding uses `error.remediation` (DEC-01) | CMP-02 |
| CMP-07 | `src/core/services/installation-builder.ts`, `manifest-change.ts` (new) | Modified, New | Config change takes `excluded`, `dropped`, `retained`; summary names dropped keys; manifest change moved out (DEC-04, DEC-07, DEC-13) | CMP-01 |
| CMP-08 | `src/core/services/harness-exclusion.ts` | New | `resolveHarnessExclusion` (DEC-08) | CMP-01 |
| CMP-09 | `src/core/services/harness-removal.ts` | New | `planHarnessRemovals` shared by `remove` and `init` (DEC-09) | adapter port |
| CMP-10 | `src/core/services/removal-service.ts` | Modified | Uses CMP-09 | CMP-09 |
| CMP-11 | `src/core/services/installation-service.ts`, `installation-adapters.ts` (new), `no-harness-finding.ts` (new) | Modified, New | Removal of excluded harnesses, config-only plan, finding variant (DEC-09, DEC-10, DEC-13) | CMP-07..09 |
| CMP-12 | `src/core/services/doctor-service.ts` | Modified | Exclusion in detection and targets, shared finding (DEC-10, DEC-11) | CMP-08 |
| CMP-13 | `src/cli/init-config-state.ts` (new), `src/cli/commands/init.ts` | New, Modified | Tolerant read, exclusion resolution, passes `dropped` and `excluded` | CMP-04, CMP-08 |
| CMP-14 | `src/cli/commands/doctor.ts` | Modified | Keeps the strict read for the finding and adds the sanitized configuration when the error is repairable; passes the configured exclusion (via config) | CMP-04, CMP-12 |
| CMP-15 | `src/cli/output/detection-text.ts` (new), `text.ts` | New, Modified | Excluded detection lines (DEC-11) | — |
| CMP-16 | `src/infrastructure/harnesses/common/hook-event-cleanup.ts` | New | Shared surgical retired-event removal (DEC-05) | `jsonc-parser`, `json-document-editor` |
| CMP-17 | `claude-code/claude-merger.ts`, `claude-hooks-config.ts`; `common/codex-hooks-updater.ts`; `common/cursor-hooks-updater.ts`; `common/antigravity-hooks-updater.ts` | Modified | Wire CMP-16 with each adapter's predicate and current events (DEC-05, DEC-06) | CMP-16 |
| CMP-18 | `schemas/context-brake.config.schema.json`, `README.md`, `docs/research/harness-integrations.md` | Modified | Regenerated schema; document `--exclude-harness` semantics, `excludedHarnesses`, and the retired-event cleanup | CMP-01 |

Flow of `init`: `loadInitConfigState` (tolerant read → `config`, `dropped`; `resolveHarnessExclusion` → `excluded`, `selection`) → `planInstallation` detects with `selection`, plans adapters for active harnesses, plans `planHarnessRemovals` for installed-and-excluded harnesses, builds the config change (`excluded`, `dropped`, `retained`) and the manifest from active plans, and merges everything through `createChangePlan` → preview/confirmation/apply as today. Hook cleanup runs inside each adapter's `planInstall`/`planRemove` content computation, so it appears in the same plan and in `--dry-run`.

## Contracts and data

- Configuration `context-brake.config.json`: new optional `excludedHarnesses: HarnessId[]` (unique values). `schemaVersion` stays `1`. Omitted when empty. Example: `"activeHarnesses": ["claude-code"], "excludedHarnesses": ["opencode"]`.
- Unrecognized-only configuration error, as the `doctor` finding `message` (the `remediation` field carries the last line):

  ```
  Configuration validation failed:
    stateStorage is not a recognized key
    telemetry.zones.legacy is not a recognized key
  ```

  `remediation`: `Run context-brake init --yes to drop them, or remove them from context-brake.config.json.` Finding code `INVALID_CONTEXTBRAKE_CONFIG`, severity `error`. Mixed errors keep `Configuration validation failed: <issue>; <issue>.` and the existing remediation. `init` and `remove` do not raise this error (DEC-03, DEC-12).
- Install report: `plan.changes[].preview.summary` of the config change gains `; drop unrecognized keys: <paths>` when keys are dropped. No schema change. `detections[].state` may be `excluded` (already allowed).
- Published report schemas stay as they are; `npm run schemas:check` covers the configuration schema regeneration.

## Integrations and interfaces

- Claude Code (`.claude/settings.json`, grouped shape, `hooks.<event>[].hooks[]` with `command: "node"` and `args`), Codex CLI (`.codex/hooks.json`, grouped, `command`/`commandWindows`), Cursor (`.cursor/hooks.json`, flat `{command}`), Antigravity (`.agents/hooks.json`, `hooks.<event>.context-brake`), Copilot (`.github/hooks/context-brake.json`, owned file). All reached through their resolved real paths (symlinked `.claude → .agents` works because planners already call `resolveChangeTarget`).
- Failure policy unchanged: an unparseable harness file yields the existing `INVALID_HARNESS_CONFIG` conflict and is left untouched; the cleanup runs only on a parsed document.
- Idempotency: every edit is a function of the current text; a second run finds no owned retired entry and returns the same text, so `createChangePlan` drops the change.

## Errors, security, and recovery

- Errors and edges:
  - Only-unrecognized configuration repairs; any other issue throws the failing pass's error (DEC-02). A typo such as `telemtry` leaves the required `telemetry` missing, so it is not repairable and the person sees both issues.
  - Excluded id absent from every detection: persisted, no removal.
  - `--exclude-harness X` with X the only detected harness: config-only plan (DEC-10).
  - Harness removal conflict: harness stays active, retried next run (DEC-09).
  - `--harness X` for an excluded X: exclusion cleared, harness installed.
  - A user-owned empty event array is never touched (cleanup only acts on events holding an owned handler).
- User files and sensitive data: only entries recognized by the adapters' path predicate are removed; foreign entries, key order, indentation, line endings, comments in files that allow them, and the final newline stay (`file-changes.md`). No prompt or tool output is logged.
- Concurrency: unchanged; `FILE_CHANGED_SINCE_PREVIEW` precondition in `NodeChangeApplier` covers edits between preview and apply.
- Rollback or reversal: re-run `init --harness <id>` to reinstall an excluded harness; dropped configuration keys are recoverable from version control only (they are not migrated, by design). `--dry-run` previews both.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| S1 Config contract + schema (`excludedHarnesses`), regenerate schema | — | `npm run schemas:check`, TC-12 |
| S2 Error remediation and doctor finding, sanitizer, tolerant store read, tolerant `remove` | — | TC-01..03 |
| S3 `init` tolerant flow and dropped-keys preview (`init-config-state.ts`, builder) | S1, S2 | TC-04, TC-05 |
| S4 Hook cleanup helper + Claude/Codex/Cursor/Antigravity wiring + fixtures | — | TC-06..09 |
| S5 Exclusion: resolver, `harness-removal.ts`, installation-service, doctor, text, extractions | S1 | TC-10..16 |
| S6 Docs (`README.md`, research note), final gates, CLI QA | S3, S4, S5 | `npm run lint`, `typecheck`, `coverage`, `test:budget`, `schemas:check`, QA-run |

S4 shares no code with S1-S3; S5's removal extraction and S3's builder changes touch `installation-builder.ts`/`installation-service.ts`, so S5 runs after S3.

## Test approach

- Profile: Node.js >= 20, ESM TypeScript (`strict`), Vitest. CLI commands run as one short process; hook updaters run inside `init`/`remove` (the CLI), not on a hook response path; no plugin in a harness process is touched. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm run coverage` (includes tests), `npm run test:budget`, `npm run schemas:check`.
- End-to-end: no additions to the smoke set in `tests/e2e/` (`.agents/rules/tests.md` limits it). Built-CLI acceptance runs once through `sdd-execute-qa` (TC-17, TC-18) against a temporary TokenHound-like fixture: retired config keys, an owned `PreToolUse` entry in Claude/Codex/Cursor files, `.claude` linked to `.agents`, and a detected-but-excluded OpenCode. Build with `npm run build`; QA invokes `node dist/src/cli/main.js`.
- Platforms: logic tests run on all three; byte-identical checks include an LF and a CRLF fixture; the symbolic-link case uses `tests/helpers/link-capability.ts` (`attemptLink`, `linkPolicy`) and skips with the reason when links are unavailable (never silently passes). Git Bash and PowerShell differences do not apply here (no shell command string is built).
- Command prerequisites and exclusions: tests run in process through `runInProcessCli`/`dispatchCommand` with `fakeOverheadMeasurer` and `fakeProcessRunner` (`tests/helpers`); no file is added to `PROCESS_LANE_FILES`.
- Manual acceptance: none (HIL 2 records CLI QA on, no manual script).

New fixtures (M-06): per-harness retired-event files in `tests/fixtures/harnesses/{claude-code,codex-cli,cursor,github-copilot-cli,antigravity-cli}/` carrying an owned `PreToolUse` entry beside a foreign one under the same event and a foreign entry under another event.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, NFR-04 | unit | `parseConfiguration` with `stateStorage`, `brake`, `lightMode`, `runner`, `instructionFiles`; and a mixed invalid file | Unrecognized-only: body lists every path, `remediation` set. Mixed: today's one-line message, `remediation` null. Update the existing expectation in `tests/unit/configuration-snapshot.test.ts:21` | `tests/unit/configuration-validator.test.ts` |
| TC-02 | FR-01, NFR-04 | integration | `doctor` and `remove` on a config with the five retired keys, text and `--json` | `doctor`: error finding whose `message` names every key and whose `remediation` names `init --yes`; JSON validates against `doctorReportSchema`; the finding does not hide the active harnesses. `remove --yes`: succeeds and deletes the configuration, manifest, and harness artifacts | `tests/integration/config-repair-errors.test.ts` |
| TC-03 | FR-02 | unit | `sanitizeConfiguration` with nested unknown key, several passes, unknown key plus a non-key issue, key typo that also leaves `telemetry` missing | Valid config + `dropped` paths for repairable input; failing pass's error otherwise; input not mutated | `tests/unit/configuration-sanitizer.test.ts` |
| TC-04 | FR-02, NFR-01 | integration | `init --dry-run`, then `init --yes` on the five-key fixture | Dry run: nothing written, summary lists the keys. Apply: file valid, recognized values unchanged, key order canonical; second `init --yes` plans no configuration change | `tests/integration/init-config-repair.test.ts` |
| TC-05 | FR-02 | integration | `init` without `--yes` on a non-TTY with dropped keys; `--json --dry-run` | Same confirmation behavior as any write (`CONFIRMATION_REQUIRED` when unconfirmed); JSON preview summary carries the dropped keys and validates against `installReportSchema` | `tests/integration/init-config-repair.test.ts` |
| TC-06 | FR-03, FR-04, NFR-01 | integration | Claude Code `settings.json` with owned retired-event entry beside foreign handlers in the same group, in another group, and under another event; `init`, then `remove` | After `init`: no owned entry outside current events; foreign groups/handlers byte-identical; event key kept when a foreign handler remains and removed when the owned entry was its last. After `remove`: no owned entry under any event. Second run: no change. LF and CRLF | `tests/integration/retired-hook-events.test.ts` |
| TC-07 | FR-03, FR-04, NFR-01 | integration | Same matrix for Codex CLI (`command` and `commandWindows` forms, including the current git-alias command) and Cursor (flat shape) | As TC-06 | `tests/integration/retired-hook-events.test.ts` |
| TC-08 | FR-03, FR-04 | integration | Copilot `context-brake.json` containing a `preToolUse` entry; Antigravity `hooks.json` with `hooks.PreToolUse.context-brake` plus a foreign `hooks.PreToolUse.other` and a retired event other than `PreToolUse` | Copilot: `init` rewrites without it, `remove` deletes the file. Antigravity: every `context-brake` child under any `hooks.*` removed, foreign kept, emptied event removed | `tests/integration/retired-hook-events.test.ts` |
| TC-09 | NFR-02 | integration | TC-06 with `.claude` a symbolic link to `.agents` | Edit lands on the link target; the link survives | `tests/integration/retired-hook-events.test.ts` |
| TC-10 | FR-05, FR-06, FR-07 | unit | `resolveHarnessExclusion` with configured, include, exclude combinations; `detectHarnesses` fed its selection | `excluded = (configured − include) ∪ exclude`, sorted, unique; `--harness` clears; detection state `excluded` | `tests/unit/harness-exclusion.test.ts` |
| TC-11 | FR-05 | integration | OpenCode installed, `init --exclude-harness opencode` (`--dry-run`, then `--yes`) | Preview lists deletion of the OpenCode asset and entries; apply removes them, drops `opencode` from `activeHarnesses`, writes `excludedHarnesses: ["opencode"]`, manifest has no OpenCode entry or asset; other harnesses untouched | `tests/integration/init-exclusion.test.ts` |
| TC-12 | FR-05, NFR-04 | unit | `configurationSchema` accepts the new key, rejects duplicates and unknown ids; `npm run schemas:check` | Valid/invalid as stated; schema file current | `tests/unit/configuration.test.ts`, `npm run schemas:check` |
| TC-13 | FR-06 | integration | Plain `init --yes` after TC-11, repeated | No OpenCode change planned, no reinstall; text shows `opencode: excluded by configuration`; `--json` detection state `excluded`; second run plans nothing | `tests/integration/init-exclusion.test.ts` |
| TC-14 | FR-07 | integration | `init --harness opencode --yes` after TC-11; `init --harness opencode --exclude-harness opencode` | First: exclusion cleared, harness active and installed. Second: argument error (existing message), exit 64 | `tests/integration/init-exclusion.test.ts` |
| TC-15 | FR-05, FR-06 | integration | Edges: excluded harness is the only detected one; first run without a configuration; removal conflict (unparseable harness file); harness modified asset | Config-only plan persists the exclusion; finding `All detected harnesses are excluded…` on a later plain run; conflict keeps the harness active, reports `INVALID_HARNESS_CONFIG`, retried and cleared on the next run after the file is fixed | `tests/integration/init-exclusion-edges.test.ts` |
| TC-16 | FR-06, FR-08 | integration | `doctor` with the harness excluded; `remove --yes` afterward | Doctor lists it as excluded, no `INTEGRATION_MISSING`, no `NO_PROJECT_HARNESS` when only excluded ones exist. `remove` deletes the configuration (exclusion included); no ContextBrake artifact remains | `tests/integration/doctor-exclusion.test.ts` |
| TC-17 | OBJ-01, OBJ-02, OBJ-03 | end-to-end (QA) | Built CLI on the TokenHound-like fixture: `doctor` (finding with keys), `init --dry-run`, `init --yes`, `init --exclude-harness opencode --yes`, plain `init --yes`, `remove --yes` on a fresh copy that still carries the retired keys, each with `--json` where applicable | Matches TC-02, TC-04, TC-06..07, TC-11, TC-13, TC-16 results on the built artifact, exit codes as specified | `sdd-execute-qa` run, `npm run build` |
| TC-18 | NFR-03 | suite | Budget check after adding tests | `npm test` and `npm run coverage` within 120 s | `npm run test:budget` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | No `any` (`: any`, `as any`, `<any>`) | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | No empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | `throw new Error(` only where no dedicated class fits | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-06 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-07 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | DEC-13 expects the extractions to keep every target at or below 100 lines |

- Verification scope: every TypeScript file in the task diff, `core_files` = the subset under `src/core/`; no `in_process_files` or `hook_files` apply (no plugin or hook response path is touched). The process, clock, and synchronous-I/O rules are left out because the feature spawns no process, reads no clock in `core`, and loads nothing inside a harness process.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at HEAD `c845728` over the existing files the feature modifies (`rg` commands of `references/preparatory-refactoring.md` plus the quality profile commands). Max parameters and case counts are zero hits for all rows (no declaration with 4+ parameters; no `case` labels).

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 51 | 10 | ≤3 | 0 | none (exports at the structural threshold; the feature adds a field, no export) | recorded |
| `src/core/validation/configuration-validator.ts` | 28 | 4 | ≤3 | 0 | none | recorded |
| `src/infrastructure/storage/project-config-store.ts` | 13 | 1 | ≤3 | 0 | none | recorded |
| `src/core/services/installation-builder.ts` | 94 | 4 | ≤3 | 0 | none | absorbed in `DEC-13` |
| `src/core/services/installation-service.ts` | 90 | 3 | ≤3 | 0 | none | absorbed in `DEC-13` |
| `src/core/services/removal-service.ts` | 80 | 3 | ≤3 | 0 | none | absorbed in `DEC-09`, `DEC-13` |
| `src/core/services/doctor-service.ts` | 91 | 2 | ≤3 | 0 | none | absorbed in `DEC-10` (shared finding file) |
| `src/core/services/doctor-checks.ts` | 22 | 1 | ≤3 | 0 | none | recorded |
| `src/core/services/detection-service.ts` | 60 | 2 | ≤3 | 0 | none (read, not modified) | recorded |
| `src/cli/commands/init.ts` | 66 | 2 | ≤3 | 0 | `runInit` spans 33 lines (rule: 30), pre-existing | absorbed in `DEC-13` (new `init-config-state.ts` keeps it from growing) |
| `src/cli/commands/remove.ts` | 63 | 1 | ≤3 | 0 | none | recorded |
| `src/cli/commands/doctor.ts` | 59 | 1 | ≤3 | 0 | none | recorded |
| `src/cli/composition-root.ts` | 63 | 1 | ≤3 | 0 | none (read, not modified) | recorded |
| `src/cli/output/text.ts` | 59 | 4 | ≤3 | 0 | none | recorded |
| `src/infrastructure/harnesses/claude-code/claude-hooks-config.ts` | 27 | 1 | ≤3 | 0 | none | recorded |
| `src/infrastructure/harnesses/claude-code/claude-merger.ts` | 50 | 6 | ≤3 | 0 | none | recorded |
| `src/infrastructure/harnesses/common/codex-hooks-updater.ts` | 79 | 6 | ≤3 | 0 | none | recorded |
| `src/infrastructure/harnesses/common/cursor-hooks-updater.ts` | 66 | 3 | ≤3 | 0 | none | recorded |
| `src/infrastructure/harnesses/common/antigravity-hooks-updater.ts` | 49 | 4 | ≤3 | 0 | none | recorded |

- Preparatory refactoring: not recommended. No target file has structural debt and contact together: the three near-limit services (94, 90, 91 lines) are absorbed by local extractions that change no public contract (`DEC-13`).

## Observability and rollout

- Signals: the install/doctor reports are the signal (dropped keys in the config change summary, excluded detection lines, the all-excluded warning). No new log.
- Migration and compatibility: none (prd-12 DEC-PD-03). `excludedHarnesses` is optional; existing files stay valid. `--exclude-harness` changes meaning (OI-15-02); `README.md` and the research note state the new semantics. ContextBrake was never released, so no published behavior breaks.
- Rollout and rollback: ship as one package change; revert restores the old strict behavior. A configuration that already carries `excludedHarnesses` is rejected by an older build as an unrecognized key, which is the same repair path.

## Risks and open items

- Risk (low): `applyHooks` still rewrites the whole array of the three current Claude events through `setJsonProperty` (`claude-hooks-config.ts:17-21`) and `parseHooks` swallows invalid JSON (`:8-15`). Foreign groups under current events may be reformatted (not byte-identical). The retired-event path is surgical, and the new tests cover only that path. Mitigation: out of scope, recorded for a later hygiene feature.
- Risk (low): between an upgrade and `init --yes`, hooks still fail neutral on the strict read (DEC-14); `doctor` points to the repair.
- Risk (low): a removal conflict on an excluded harness keeps it listed as active for one more run (DEC-09); the finding names the file to fix.
- Risk (low): runtime hook scripts of a retired build left on disk after `remove` are deleted only if the adapter's path matches; unchanged behavior.
- Decided at HIL 2 (DEC-HIL-02): OI-01 accepted (`init` meets FR-01 through the preview) and OI-02 resolved as tolerant `remove`. No open item remains.
- Note: the approved PRD text for FR-01 and FR-08 is unchanged; reviewers read FR-01 together with DEC-03, DEC-12, and `workflow.md#DEC-HIL-02`.

## Relevant files

- Modify: `src/core/contracts/configuration.ts`, `src/core/validation/configuration-validator.ts`, `src/infrastructure/storage/project-config-store.ts`, `src/core/services/doctor-checks.ts`, `src/core/services/installation-builder.ts`, `src/core/services/installation-service.ts`, `src/core/services/removal-service.ts`, `src/core/services/doctor-service.ts`, `src/cli/commands/init.ts`, `src/cli/commands/doctor.ts`, `src/cli/output/text.ts`, `src/infrastructure/harnesses/claude-code/claude-merger.ts`, `src/infrastructure/harnesses/claude-code/claude-hooks-config.ts`, `src/infrastructure/harnesses/common/codex-hooks-updater.ts`, `src/infrastructure/harnesses/common/cursor-hooks-updater.ts`, `src/infrastructure/harnesses/common/antigravity-hooks-updater.ts`, `schemas/context-brake.config.schema.json` (generated), `README.md`, `docs/research/harness-integrations.md`, `tests/unit/configuration-snapshot.test.ts`, `tests/unit/configuration.test.ts`.
- Create: `src/core/validation/configuration-sanitizer.ts`, `src/core/services/harness-exclusion.ts`, `src/core/services/harness-removal.ts`, `src/core/services/installation-adapters.ts`, `src/core/services/manifest-change.ts`, `src/core/services/no-harness-finding.ts`, `src/cli/init-config-state.ts`, `src/cli/output/detection-text.ts`, `src/infrastructure/harnesses/common/hook-event-cleanup.ts`, the test files named in the table, and the retired-event fixtures under `tests/fixtures/harnesses/`.
- Modify: `src/cli/commands/remove.ts` (tolerant read, DEC-12).
