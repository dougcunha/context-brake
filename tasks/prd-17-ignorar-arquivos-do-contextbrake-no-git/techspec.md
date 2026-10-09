# TechSpec — init keeps ContextBrake's own files out of Git

## Sources and traceability

- PRD: `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md` (approved, DEC-HIL-01; amended by DEC-HIL-03 and DEC-HIL-06; sha256 `ddeb9308…ba8d2`).
- Applicable instructions, rules, and skills: `AGENTS.md`, `.agents/rules/` (`code-standards`, `javascript-typescript`, `node`, `tests`, `cli-output`, `file-changes`, the last one amended by this feature); `sdd-create-techspec` references.
- Research: none needed; no harness behavior changes.
- Evidence in existing code: `src/core/services/installation-service.ts` (`planInstallation` assembles the plan and the manifest assets), `src/core/services/restart-install-extras.ts` (`HANDOFF_IGNORE_PATH`, the model for an extra planned change), `src/core/services/installation-builder.ts` (`planConfigChange`, config key order, update merges), `src/core/services/debug-mode-merge.ts` (the `--debug`/`--no-debug` merge pattern), `src/core/contracts/configuration.ts` (`configurationSchema`), `src/core/contracts/changes.ts` (`CHANGE_OWNERS`, mirrored in `schemas/install-report.schema.json` through `scripts/generate-schemas.ts`), `src/core/services/change-plan-service.ts` (a change needs a snapshot of its target; equal content is dropped), `src/cli/snapshot-helper.ts` (the fixed snapshot path list), `src/cli/commands/init.ts` and `remove.ts`, `src/core/services/removal-service.ts`, `src/cli/assistant/*` (prd-16).

## Solution summary

`.gitignore` handling is one pure module and one planned change. After `planInstallation` knows every file ContextBrake creates in full (the configuration, the manifest, and the manifest assets), it builds the list of ignore lines, resolves each path to the path Git sees, and plans one change on the root `.gitignore`: append, replace, or remove the marked block, leaving every byte outside the markers alone. The change is an ordinary planned change (owner `gitignore`), so `--dry-run`, `--json`, the confirmation, the atomic write, and idempotency come from the existing machinery. `remove` plans the block removal the same way.

The opt-out is a config key (`gitIgnore: false`, written only when off, like `debug` is written only when on). `--gitignore` and `--no-gitignore` are normal `init` flags that go through a merge function in the pattern of `mergeDebugMode`, and the prd-16 assistant gets one yes/no question that emits the flag only when the answer differs from the stored state. Two facts come from outside the pure core and are passed in: whether the project is inside a Git working tree (a filesystem walk) and which listed files Git already tracks (one `git ls-files` through the injected `ProcessRunner`, informational only).

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-02, FR-03 | The ignore list is derived, never stored: `[context-brake.config.json, .context-brake/manifest.json, ...assets of the new manifest]`, each resolved to a project-relative path, sorted and deduplicated, anchored with a leading `/`. Harness entries (`manifest.entries`) are never listed. Each owned file yields its logical path and the planned change's `realPath` (or the snapshot's), both made relative to the project root, so a linked `.claude` -> `.agents` yields `/.claude/hooks/...` and `/.agents/hooks/...` (DEC-HIL-06: Git walks a Windows junction as a folder, and Node reports a junction and a symbolic link alike, so both lines are written); a `realPath` outside the root is skipped and the logical path is kept. To also cover the state files `init` writes under `.context-brake/runtime/` (not manifest assets; DEC-HIL-03), the lines add every non-delete planned change and every existing snapshot whose path starts with `.context-brake/runtime/` and is not planned for deletion. Characters Git treats specially (`#`, `!` at the start, `*`, `?`, `[`, `\`, trailing space) are escaped with a backslash | The manifest already lists every owned file by `path` and `kind` (`src/core/contracts/manifest.ts`); using `realPath` is what makes the repository's own `.claude` symlink work | Store the list in the config (drifts from the manifest); ignore folders (hides user files, rejected by the person) |
| DEC-02 | FR-04 | The block is delimited by two marker lines (`# >>> context-brake (managed by \`context-brake init\`; do not edit) >>>` and `# <<< context-brake <<<`). New block: appended after the file content, preceded by one blank line when the file is not empty, and by a line break first when the last line has none. Existing block: its lines are replaced in place. Line endings: CRLF when the file contains `\r\n`, otherwise LF; the block is written with that ending. A start without a matching end (or the reverse, or more than one pair) is a `GITIGNORE_MARKERS_MALFORMED` conflict and the file is not touched | `file-changes.md` (preserve bytes, refuse what you cannot parse); `applyBlock` is a pure function over strings, so its edge cases are unit-testable without a filesystem | Parse the whole file as ignore rules (needless); a separate include file with `include`: Git has none |
| DEC-03 | FR-06 | Removal drops the block and the blank line before it. When the remaining text is empty the plan deletes the file (kind `delete`), otherwise it updates it. A file whose last line had no line break gets the break that the insertion added; the clarification of the PRD edge is decided at HIL 2 (see Risks) | Reversal must leave only what the person wrote; the only information lost is the missing final newline | Record the missing newline in the marker (clutters the line); never add a missing newline (would merge the block into the last user line) |
| DEC-04 | FR-05 | New config key `gitIgnore: z.optional(z.boolean())`, written only as `false` (`--no-gitignore`) and dropped by `--gitignore`, in schema key order after `debug`. `mergeGitIgnore(current, flags)` returns `keep`, `set` (store `false`), or `remove` (drop the key) and rejects both flags together (`--gitignore cannot be combined with --no-gitignore.`). `hasConfigurationFlag` counts both flags, so they keep the assistant away. `schemas/context-brake.config.schema.json` is regenerated | Same pattern as `debug`, so merge, summary, and key order reuse the existing code | A separate state file (a second source of truth) |
| DEC-05 | FR-04, NFR-02 | `CHANGE_OWNERS` gains `gitignore`; `scripts/generate-schemas.ts` regenerates `schemas/install-report.schema.json` (an additive enum value, schema version unchanged). The text output prints `[update] .gitignore (gitignore)` and, for this owner, the preview summary line like the `config` owner does. `.gitignore` is added to `collectProjectSnapshots` so the plan finds its snapshot (`SNAPSHOT_MISSING` otherwise) | The change plan matches changes to snapshots by `realPath` (`change-plan-service.ts`); a new owner keeps `config` and `runtime_asset` rules (`asset-currency.ts`, `directory-pruner.ts`) untouched | Reusing owner `config` (misleading, and `text.ts` special-cases it) |
| DEC-06 | FR-07 | `isInsideGitWorkingTree(root)` (new `src/infrastructure/git/git-context.ts`) walks from the project root to the filesystem root looking for a `.git` file or folder; `init` passes the boolean into `planInstallation` (and `remove` into `planRemoval` is not needed: removal always deletes an existing block). Outside Git no change is planned and the finding `GITIGNORE_NO_GIT` (severity `ok`, informational) is reported | Core stays pure; no process is started | Ask `git rev-parse` (needs a process and a Git binary) |
| DEC-07 | FR-08 | `trackedOwnedFiles(runner, root, lines)` (same module) runs `git ls-files -- <paths>` through the injected `ProcessRunner` with a short timeout and returns the tracked ones; a missing runner, a failed run, or empty output yields none. `init` reports `GITIGNORE_TRACKED_FILES` (severity `ok`) naming the files and `git rm --cached -- <files>`; the exit code does not change and the index is never touched. Called from the CLI layer after planning, only when the block is enabled and the project is inside Git | Informational by decision so scripts keep their exit codes (PRD FR-08) | A warning (changes the exit code to 1); ignoring tracked files silently |
| DEC-08 | FR-09 | The assistant gains the last question `Keep ContextBrake's files out of Git (adds them to .gitignore)? [Y/n]` (rich confirm in the prompt port, line prompt as fallback), asked only when `AssistantContext.insideGit` holds; the default is the stored state (`config.gitIgnore !== false`). The flag is emitted only when the answer differs from the stored state; facts and the summary carry a `Git ignore` line | Reuses `confirmSpec` and the prd-16 equivalence tests | Asking outside Git (the answer would have no effect) |
| DEC-09 | structural | Absorb: `init.ts` is 90 lines and gains wiring, so `executeInit`, `previewReport`, and `confirmApply` move to `src/cli/init-flow.ts` (no behavior change, same tests); `installation-service.ts` (82 lines) gets one call to `planGitIgnore` and the plan-building tail is extracted if `planInstallation` passes 30 lines | Terrain baseline below | A preparatory refactoring feature: not warranted (moves only) |
| DEC-10 | FR-10 | Docs: `README.md` (init row, a "Keeping ContextBrake out of Git" paragraph in Interactive Setup/Updating, the sentence "It does not touch `.gitignore`"), `AGENTS.md` (Project constraints/rules mention), `.agents/rules/file-changes.md` (first paragraph and "Touch Only What ContextBrake Owns": the managed block is the one exception), and a one-line "Superseded for the managed block by prd-17" note in the earlier PRD sentences found by search. The repository's own `.gitignore` drops its manual ContextBrake lines once `init` generates the block (only `/.agents/settings.json` stays, because it is not an owned file) | Required by FR-10 and by the rule reversal | Leaving the rules inconsistent with the product |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/services/gitignore-block.ts` | New | `applyIgnoreBlock(content, lines)` and `removeIgnoreBlock(content)` over strings: markers, EOL detection, blank-line separator, malformed detection | — |
| CMP-02 | `src/core/services/gitignore-plan.ts` | New | `ignoreLinesFor(...)` (DEC-01) and `planGitIgnore(input)` returning the `PlannedChange`, conflicts, and the informational finding | CMP-01 |
| CMP-03 | `src/core/services/gitignore-merge.ts`, `src/core/contracts/configuration.ts`, `installation-builder.ts` | New, Modified | `mergeGitIgnore`/`applyGitIgnore`; `gitIgnore` config key and its summary | — |
| CMP-04 | `src/core/contracts/changes.ts`, `scripts` output `schemas/install-report.schema.json`, `src/cli/output/text.ts` | Modified | Owner `gitignore` (DEC-05) | — |
| CMP-05 | `src/core/services/installation-service.ts` | Modified | Calls `planGitIgnore` after the assets and the manifest are known (inputs: enabled, inside Git, the `.gitignore` snapshot) | CMP-02, CMP-03 |
| CMP-06 | `src/core/services/removal-service.ts`, `src/cli/commands/remove.ts` | Modified | Plans the block removal | CMP-01 |
| CMP-07 | `src/infrastructure/git/git-context.ts` | New | `isInsideGitWorkingTree`, `trackedOwnedFiles` (DEC-06, DEC-07) | `ProcessRunner` |
| CMP-08 | `src/cli/init-arguments.ts`, `init-option-rules.ts`, `init-config-updates.ts`, `snapshot-helper.ts`, `commands/init.ts`, new `init-flow.ts` | Modified, New | Flags, merge, snapshot of `.gitignore`, wiring of the Git facts and the tracked finding | CMP-03, CMP-05, CMP-07 |
| CMP-09 | `src/cli/assistant/questions-misc.ts`, `types.ts`, `summary.ts`, `assistant-context.ts`, `assistant-questions.ts` | Modified | The question, the fact, the summary line, `insideGit` in the context | CMP-08 |
| CMP-10 | `README.md`, `AGENTS.md`, `.agents/rules/file-changes.md`, `.gitignore`, earlier PRD notes | Modified | DEC-10 | — |

Flow: `parseInit` → config state → `planConfigUpdates` (adds the `gitIgnore` merge) → `planInstallation` (plan, assets, manifest, **then** `planGitIgnore`) → tracked-files finding → preview/confirmation → apply. `remove`: `planRemoval` → block removal change → apply.

## Contracts and data

- CLI: new `init` flags `--gitignore` and `--no-gitignore` (booleans, mutually exclusive, argument error exit `64`). Exit codes unchanged.
- Configuration: optional `gitIgnore` boolean, written only as `false`; schema version unchanged (`schemas:check` regenerated); older configs are valid.
- Reports: `owner` enum gains `gitignore` (additive; `schemaVersion` stays 1). New findings `GITIGNORE_NO_GIT`, `GITIGNORE_TRACKED_FILES` (severity `ok`) and conflict code `GITIGNORE_MARKERS_MALFORMED`.
- The block (LF shown):

```text
# >>> context-brake (managed by `context-brake init`; do not edit) >>>
/.context-brake/manifest.json
/context-brake.config.json
# <<< context-brake <<<
```

## Integrations and interfaces

CLI and files only; one optional `git ls-files` through the injected runner (timeout 5 s, skipped when the runner is absent or Git is missing). No hook, plugin, or harness change.

## Errors, security, and recovery

- Errors and edges: malformed markers leave `.gitignore` untouched and report the conflict while `init` continues; outside Git nothing is created; a `.gitignore` that is a symbolic link is written through its target (existing `realPath` handling); the file with only the block is created, and deleted by `remove`.
- User files and sensitive data: only the block is ours; everything else is preserved byte for byte, including CRLF, comments, and a missing final newline (apart from the one inserted break, DEC-03). Nothing sensitive is written; the paths are project-relative.
- Concurrency and idempotency: the block is a pure function of the manifest; a second run produces identical content, so the plan drops the change (`beforeSha256 === afterSha256`).
- Rollback or reversal: `init --no-gitignore`, `remove`, or revert the commit; ContextBrake never changes the Git index.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| S1 Block module (`gitignore-block.ts`) | — | TC-01 |
| S2 Config key, merge, flags, owner, schema regeneration | — | TC-03, TC-09 |
| S3 Lines, plan, service wiring, snapshot, Git facts, `init-flow` extraction | S1, S2 | TC-02, TC-04, TC-05, TC-07 |
| S4 `remove` | S1, S3 | TC-06 |
| S5 Assistant question | S2, S3 | TC-08 |
| S6 Docs, rules, repository `.gitignore`, gates | S3 to S5 | TC-10, TC-11 |

## Test approach

- Profile: Node.js >= 20, ESM TypeScript strict, Vitest; CLI only; commands from `AGENTS.md`. Everything runs in process with the fake runner and fixture folders; a fixture "inside Git" is a temporary folder with an empty `.git` directory (no process). The tracked-files path uses a stub runner that returns a `git ls-files` listing.
- End-to-end: QA runs the built CLI in a temporary folder created with a real `git init` and checks `git status --porcelain` (TC-11); this is the only place a real Git process runs.
- Platforms: logic on all three; CRLF and LF fixtures; Windows drive-letter and case handling of `realPath` through `path.relative`; Linux and macOS are not driven here and stay unverified.
- Manual acceptance: none; the person's own repository is the final check (HIL 3).

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-04, FR-06, NFR-01 | unit | `applyIgnoreBlock`/`removeIgnoreBlock` over null, empty, LF, CRLF, comments, no final newline, existing block, malformed markers; apply twice; apply then remove | Bytes outside the block kept; block replaced in place; second apply identical; remove restores the original (with the DEC-03 newline exception); malformed reports an error | `tests/unit/gitignore-block.test.ts` |
| TC-02 | FR-01, FR-03 | unit | `ignoreLinesFor` with config, manifest, assets, harness entries, a symlinked harness directory, an outside-root path, special characters | Sorted anchored lines; no entries; link path and target path; outside target skipped, link path kept; escapes | `tests/unit/gitignore-plan.test.ts` |
| TC-03 | FR-05 | unit | `mergeGitIgnore` matrix; `parseInit` with both flags; `hasConfigurationFlag`; config schema accepts and writes `gitIgnore` only as `false` | keep/set/remove as specified; conflict error; flags count as configuration | `tests/unit/gitignore-merge.test.ts`, `tests/unit/init-arguments.test.ts` additions |
| TC-04 | FR-01, FR-04, FR-07 | integration | `init --yes` in a fixture with `.git` and Claude Code (+ restart); without `.git`; with an existing user `.gitignore`; with `.claude` linked to `.agents` (a junction on Windows) | Block lists exactly the owned files, with both the link and the target hook lines; user lines untouched; no `.gitignore` and `GITIGNORE_NO_GIT` outside Git; `--dry-run --json` shows the planned change with owner `gitignore` | `tests/integration/init-gitignore.test.ts` |
| TC-05 | FR-02, FR-05 | integration | Restart on then off; a harness off; `--no-gitignore`, then plain `init`, then `--gitignore`; second runs; malformed markers | List follows the manifest; opt-out removes the block and persists; the flag returns it; second run plans nothing; malformed yields the conflict and no write | `tests/integration/init-gitignore-lifecycle.test.ts` |
| TC-06 | FR-06 | integration | `init` then `remove` over a user file and over no file | Original content back; block-only file deleted | `tests/integration/remove-gitignore.test.ts` |
| TC-07 | FR-08 | integration | Stub runner listing tracked files; runner absent; Git failing | Finding with the exact `git rm --cached` command; exit code unchanged; none otherwise | `tests/integration/init-gitignore-tracked.test.ts` |
| TC-08 | FR-09 | unit, integration | Scripted sessions answering yes and no with stored on and off; replay of the printed command (prd-16 TC-10 pattern); question hidden outside Git | Flag only when it differs; same tree as the replay; no question outside Git | `tests/unit/assistant-questions-gitignore.test.ts`, `tests/integration/init-assistant-equivalence.test.ts` additions |
| TC-09 | NFR-02 | suite | `npm run schemas:check`; existing `--json` documents | Schemas current; documents valid | `npm run schemas:check`, `npm test` |
| TC-10 | FR-10 | unit | README documents both flags; AGENTS and `file-changes.md` no longer say `.gitignore` is never edited | Text assertions | `tests/unit/readme-gitignore.test.ts` |
| TC-11 | OBJ-01, OBJ-05 | end-to-end (QA) | Built CLI in a real `git init` folder: `init --yes`, `git status --porcelain`, `remove` | No ContextBrake file listed as untracked; `.gitignore` back to the original after `remove` | `sdd-execute-qa`, `npm run build` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | No `any` (`: any`, `as any`, `<any>`) | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | No empty `catch` or `.catch(() => {})` | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-04 | `core` does not import `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-05 | `exec`, `execSync`, `shell: true` (Git runs only through the injected `ProcessRunner`) | blocking | `"${RG[@]}" '\bexecSync\(\|\bexec\(\|shell:\s*true' "${files[@]}"` | — |
| QA-06 | `throw new Error(` only where no dedicated class fits | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-07 | 4+ parameters in one declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"` | — |
| QA-08 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | `DEC-09` keeps `init.ts` and `installation-service.ts` at or below 100 lines |

- Verification scope: every TypeScript file in the task diff; `core_files` is the subset under `src/core/`.
- Escalation trigger: 8+ reservation hits, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured at HEAD `5c97f37` over the existing files the feature modifies; the quality-profile commands returned no hit in them.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/cli/commands/init.ts` | 90 | 2 | ≤3 | 0 | none | absorbed in `DEC-09` (move to `init-flow.ts`) |
| `src/cli/commands/remove.ts` | 63 | 1 | ≤3 | 0 | none | recorded |
| `src/cli/init-arguments.ts` | 77 | 5 | ≤3 | 0 | none | recorded (+~8 lines) |
| `src/cli/init-option-rules.ts` | 23 | 3 | ≤3 | 0 | none | recorded |
| `src/cli/init-config-updates.ts` | 30 | 2 | ≤3 | 0 | none | recorded |
| `src/cli/snapshot-helper.ts` | 28 | 2 | ≤3 | 0 | none | recorded |
| `src/core/services/installation-service.ts` | 82 | 3 | ≤3 | 0 | none | absorbed in `DEC-09` |
| `src/core/services/installation-builder.ts` | 82 | 2 | ≤3 | 0 | none | recorded |
| `src/core/services/removal-service.ts` | 63 | 3 | ≤3 | 0 | none | recorded |
| `src/core/contracts/configuration.ts` | 51 | 10 | ≤3 | 0 | structural (a): 10 exports; one key added, no new export | recorded |
| `src/core/contracts/changes.ts` | 34 | 24 | ≤3 | 0 | structural (a): 24 exports; one constant edited | recorded |
| `src/cli/assistant/questions-misc.ts` | 24 | 2 | ≤3 | 0 | none | recorded |
| `src/cli/assistant/types.ts`, `summary.ts`, `assistant-context.ts`, `assistant-questions.ts` | 28, 31, 22, 25 | ≤5 | ≤3 | 0 | none | recorded |

- Preparatory refactoring: not recommended. `configuration.ts` and `changes.ts` cross the export threshold but the feature edits one line in each (no contact); the two files near the line limit are handled by the extraction in `DEC-09`.

## Observability and rollout

- Signals: the planned `.gitignore` change in `--dry-run`, and the findings `GITIGNORE_NO_GIT` and `GITIGNORE_TRACKED_FILES`.
- Migration and compatibility: existing installations get the block on their next `init`; `--no-gitignore` opts out. Scripts that pass `--yes` see an extra planned change only inside a Git repository. The `owner` enum gain is additive for JSON consumers.
- Rollout and rollback: one package change; revert removes the flags; the block can be deleted by `remove` or by hand.

## Risks and open items

- Risk (low): the block is appended after user content with one blank line; a file whose last line had no line break gains that break, and `remove` leaves it. Decision to confirm at HIL 2 (OI-01).
- Risk (low): a repository where the person already tracks the owned files shows no effect until `git rm --cached`; the finding names the command.
- Risk (medium): existing tests that build fixture folders inside a Git repository would now see a `.gitignore`; fixtures use the temp folder with no `.git`, so none is expected (TC-12 of the plan runs the whole suite).
- Open item OI-01 (HIL 2): clarify the PRD edge for a `.gitignore` without final newline: insertion adds one line break before the block and `remove` leaves it; OBJ-03 and OBJ-05 equality holds for files that end with a line break. Recommendation: approve (the alternative is a marker flag that clutters the file).
- Open item OI-02 (HIL 2): the earlier PRD sentences get a one-line "superseded by prd-17" note rather than a rewrite (history stays intact). Recommendation: approve.

## Relevant files

- Modify: `src/cli/commands/init.ts`, `src/cli/commands/remove.ts`, `src/cli/init-arguments.ts`, `src/cli/init-option-rules.ts`, `src/cli/init-config-updates.ts`, `src/cli/snapshot-helper.ts`, `src/cli/output/text.ts`, `src/core/services/installation-service.ts`, `src/core/services/installation-builder.ts`, `src/core/services/removal-service.ts`, `src/core/contracts/configuration.ts`, `src/core/contracts/changes.ts`, `src/cli/assistant/questions-misc.ts`, `types.ts`, `summary.ts`, `assistant-context.ts`, `assistant-questions.ts`, `schemas/install-report.schema.json`, `schemas/context-brake.config.schema.json`, `README.md`, `AGENTS.md`, `.agents/rules/file-changes.md`, `.gitignore`.
- Create: `src/core/services/gitignore-block.ts`, `gitignore-plan.ts`, `gitignore-merge.ts`, `src/infrastructure/git/git-context.ts`, `src/cli/init-flow.ts`, and the test files in the table.
