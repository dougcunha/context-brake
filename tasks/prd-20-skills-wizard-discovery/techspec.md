# TechSpec — Skill discovery and alternatives in the init wizard

## Sources and traceability

- PRD: `tasks/prd-20-skills-wizard-discovery/prd.md` (approved, AUTO-16)
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/` `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`; `ts-tests`
- Research: `docs/research/harness-integrations.md`, the "Skills no projeto e invocação (PRD-19)" line of each of the eight harness sections (project folders, verified 13/10/2026). Slice 19 (accepted, AUTO-15) supplies the name rule and the invocation formats.
- Evidence in existing code: `src/cli/assistant/questions-snapshot.ts` (`askSnapshot`, `askCommandOptions`, `validateCommand`), `snapshot-specs.ts`, `ask.ts` (`askValidated`), `ui-prompt.ts` (`select` kind), `clack-prompt-port.ts`, `assistant-context.ts`, `types.ts`, `src/core/contracts/skill-name.ts` (`isSkillName`), `src/infrastructure/harnesses/skill-invocations.ts` (exhaustive resolver pattern), `tests/helpers/assistant-context.ts`, `tests/helpers/scripted-prompts.ts`

## Solution summary

The wizard reads the skills of the selected harnesses only when it is about to ask the snapshot question. A catalog reader in `infrastructure/skills/` scans the project folders each harness declares, reads only the frontmatter of each `SKILL.md`, and returns validated names with description and folder. Two pure `core` services merge the catalogs of the selected harnesses (deduplicated by name, with the harnesses and folders where each skill lives) and rank the candidates by name, then description, for the snapshot role and the resume role. The CLI turns the ranking into a `select` prompt (best match first and marked recommended, up to three alternatives, "type another", "none") and falls back to the existing typed question when nothing matches or the catalog fails.

Nothing else changes: the configuration, schemas, `--json` output, flags, equivalent printed command, and hooks stay as in slice 19. The harness knowledge is one constant per harness folder (project-relative skill folders); the reader and the scoring are shared.

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, NFR-03, OBJ-03 | Port `SkillCatalogReader` in `src/core/contracts/skill-catalog.ts`: `(harness, projectRoot) => Promise<SkillCatalog>`, with `SkillCatalog = { skills, warnings }` and `CatalogSkill = { name, description, folder }` (`folder` is project-relative, forward slashes). One `skill-folders.ts` per harness folder exports its project-relative skill folders; `src/infrastructure/harnesses/skill-folders.ts` is an exhaustive `Record<HarnessId, readonly string[]>` resolver (same pattern as `skill-invocations.ts`, slice 19 DEC-04), so a ninth harness fails to compile until it declares its folders. | The folders are the only harness-specific fact; the file format (`SKILL.md` with frontmatter) is common to all eight (research doc lines per harness). Keeps adapters tiny and the reader single-sourced. | A reader per adapter: rejected, eight copies of the same bounded scan. A method on `HarnessAdapter`: rejected, the adapters are loaded by hooks and the catalog is wizard-only. |
| DEC-02 | FR-01, FR-02, NFR-01, NFR-04 | `src/infrastructure/skills/skill-catalog-reader.ts` implements the port. For each folder of the harness it lists `<projectRoot>/<folder>/*` with `readdir`, follows symbolic links and junctions with `stat`, and for each directory opens `SKILL.md` and reads at most `MAX_FRONTMATTER_BYTES` (8192) with a file handle; the body is never read. The name is the frontmatter `name`, or the folder name when absent; it must pass `isSkillName` (slice 19) or the skill is ignored. Duplicates inside one harness (same name in two folders) keep the first and add no second entry. Bounds: `MAX_SKILL_DIRECTORIES` (500 per harness) listed in name order. A missing folder is empty; any other filesystem error on one folder or file is collected as a warning and does not stop the scan. | PRD FR-02 bounds and NFR-04 platforms. The frontmatter parser is a small function (`frontmatter.ts`): lines between the first two `---` lines, single-line `key: value` scalars for `name` and `description`, surrounding quotes removed; block scalars (`>`, `|`) give an empty description. No YAML dependency (`package.json` has none; `node.md`: add one only when it removes real complexity). | `yaml` package: rejected, 100 KB for two scalar keys. Reading the whole file: rejected, FR-02 bounded work. Walking up to ancestor directories (Codex, Pi, OpenCode do): rejected for this slice, `init` runs at the project root; recorded as a limit. |
| DEC-03 | FR-06 | `src/core/services/skill-candidates.ts`: `mergeCatalogs(entries: readonly { harness: HarnessId; skills: readonly CatalogSkill[] }[]): SkillCandidate[]`, where `SkillCandidate = { name, description, origins: { harness, folder }[] }`, deduplicated by name (description of the first origin, origins accumulated, sorted by harness id). | Pure and testable with literals; the union is the PRD rule. | Merging inside the reader: rejected, the reader should not know the selection. |
| DEC-04 | FR-03, FR-04, OBJ-04 | `src/core/services/skill-ranking.ts`: `rankSkills(role, candidates, options)`, `role` is `'snapshot'` or `'resume'`, `options = { selectedCount, exclude }`. Score: 100 when the name contains any term of the role, 10 when the description (first 300 characters, lowercase) contains any term, 0 otherwise. Terms: snapshot `snapshot`, `handoff`, `checkpoint`; resume `resume`, `continue`, `retomar`, `retomada`, `continuar`, `orchestrate`, `flow`. Candidates with score 0 and the `exclude` name are dropped. Order: score descending, then the number of origin harnesses descending (FR-06), then name ascending. The body is never an input. | A name match dominates, so a look-alike whose description cites a checkpoint cannot beat `sdd-snapshot` (OBJ-04). FR-06 "ranks above" is applied among equal scores: a universal skill with a weaker match must not outrank a name match, which would break OBJ-04. | Additive scoring with a coverage bonus: rejected, a bonus can invert a name match. Fuzzy matching: rejected, unpredictable suggestions. |
| DEC-05 | FR-05, FR-07, FR-08, NFR-05, US-03 | New `src/cli/assistant/questions-skill.ts` holds the picker. `AssistantContext` gains `projectRoot: string` and `catalog: SkillCatalogReader`; `buildAssistantContext` supplies the real reader, so nothing is scanned unless `askSnapshot` runs (the assistant is skipped by `--yes`, `--json`, any flag, and non-interactive terminals: `shouldRunAssistant`, `src/cli/terminal.ts`). `askSnapshot(context, selected, prompts)` receives the selected harnesses (3 parameters). The picker reads the catalog of every selected harness, merges, ranks, and builds a `select` prompt: the configured value first when it is not among the matches (labelled `current`), then the best match marked `(recommended)`, up to three alternatives, `type another`, and for the snapshot role `none`. Option values `?other` and `?none` cannot be valid names. The initial option is the configured value, else the best match. Each option's hint says where it was found in words: `found in .claude/skills`, or `found in codex-cli (.agents/skills)` when only some harnesses have it. `type another` opens the existing typed question and its slice 19 validation. With no match and no configured value, or when the catalog throws, the existing typed question is used unchanged; a catalog failure writes one warning line to stderr. | Reuses `select` and `askValidated`; the readline fallback shows the same options as numbered lines and also accepts a skill name, `none`, or Enter (initial option). Keeping the typed question for the empty case preserves every current wizard behavior and test (US-03 reads "only type another and none": the typed question accepts both). | A new prompt kind: rejected, `select` exists in both ports. Showing the description in the label: rejected, long and untrusted text (NFR-01); the description feeds only the score. |
| DEC-06 | FR-04 | The resume question is asked as today only after a snapshot skill is set (`askCommandOptions`). Its ranking excludes the chosen snapshot name; its `select` has no `none` option, and Enter with no choice keeps the configured resume value, or no resume skill when none exists. | Matches the PRD and the current flow (`questions-snapshot.ts`). | — |
| DEC-07 | NFR-01 | Only the validated name leaves the picker: `SnapshotChoice` is unchanged, the flags and the equivalent command contain the name, and descriptions are never written to configuration, flags, or output other than as ranking input. | PRD NFR-01. | — |
| DEC-08 | FR-02, NFR-04 | Only directories containing a `SKILL.md` are skills. Claude Code command files (`.claude/commands/*.md`) and plugin folders are not scanned. User-scope folders (PRD out of scope) are not scanned. | The PRD limits the slice to skill folders at project scope. | Command files: rejected, not skills; recorded open item if users ask. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/skill-catalog.ts` | New | `CatalogSkill`, `SkillCatalogReader` | — |
| CMP-02 | `src/core/services/skill-candidates.ts` | New | `mergeCatalogs`, `SkillCandidate` | CMP-01 |
| CMP-03 | `src/core/services/skill-ranking.ts` | New | `rankSkills`, role terms | CMP-02 |
| CMP-04 | `src/infrastructure/skills/frontmatter.ts` | New | bounded frontmatter scalar parser | — |
| CMP-05 | `src/infrastructure/skills/skill-catalog-reader.ts` | New | folder scan, symlinks, bounds, validation, warnings | CMP-01, CMP-04, slice 19 `isSkillName`, CMP-06 |
| CMP-06 | `src/infrastructure/harnesses/<harness>/skill-folders.ts` (8) and `src/infrastructure/harnesses/skill-folders.ts` | New | project-relative folders per harness, exhaustive resolver | `HarnessId` |
| CMP-07 | `src/cli/assistant/questions-skill.ts` | New | picker: catalog read, merge, rank, `select` spec, typed fallback, stderr warning | CMP-02, CMP-03 |
| CMP-08 | `src/cli/assistant/questions-snapshot.ts` | Modified | calls the picker for the snapshot and the resume questions; `askSnapshot` gets the selected harnesses | CMP-07 |
| CMP-09 | `src/cli/assistant/assistant-context.ts`, `types.ts`, `assistant-questions.ts` | Modified | context carries `projectRoot` and `catalog`; selected harnesses passed on | CMP-05 |

Flow: `runQuestions` asks the harnesses, then `askSnapshot(context, selected, prompts)`. The picker calls `context.catalog(harness, projectRoot)` for each selected harness, merges, ranks, shows the select, and returns the chosen name (or null for none, or a typed name through the existing validation). The trigger question, the resume question (same picker, snapshot name excluded), and the rest of the wizard are unchanged.

## Contracts and data

- Port: `type SkillCatalogReader = (harness: HarnessId, projectRoot: string) => Promise<SkillCatalog>` with `SkillCatalog = { skills: readonly CatalogSkill[]; warnings: readonly string[] }`. A warning is one short sentence naming the project-relative folder and the cause, never content of a file.
- No change to `context-brake.config.json`, the schemas, `--json` output, exit codes, hooks, or agent-facing text. `npm run schemas:check` must stay green without regeneration.
- Folders (project-relative, from the research doc; each is re-checked against the vendor page before its adapter file is written, and the research line is updated when it differs):

| Harness | Folders |
| --- | --- |
| claude-code | `.claude/skills` |
| codex-cli | `.agents/skills` |
| cursor | `.cursor/skills`, `.agents/skills`, `.claude/skills`, `.codex/skills` |
| github-copilot-cli | `.github/skills`, `.claude/skills`, `.agents/skills` |
| opencode | `.opencode/skills`, `.claude/skills`, `.agents/skills` |
| pi | `.pi/skills`, `.agents/skills` |
| oh-my-pi | `.omp/skills`, `.github/skills`, `.agents/skills` |
| antigravity-cli | `.agents/skills` |

## Integrations and interfaces

- CLI only (`init` assistant). No hook, plugin, or extension code changes, so no startup or in-process budget is affected.
- Reads are asynchronous (`node:fs/promises`), bounded, and read-only; no file is created, changed, or removed (`file-changes.md` does not apply).
- Failure policy: a missing folder is empty; an unreadable folder or file produces a warning and the scan continues; a throwing catalog is caught in the picker, one line goes to stderr, and the typed question is shown (FR-08).
- Idempotent: the scan has no side effect.

## Errors, security, and recovery

- Errors and edges: malformed frontmatter or an invalid name is ignored silently (counted in no output); a symlink loop is bounded by the directory limit and `stat` of a broken link is ignored; names that start with `/`, `$`, `@`, contain spaces, or exceed the rule never reach the prompt.
- User files and sensitive data: only the first 8 KiB of `SKILL.md` is read and only `name` and `description` are kept; the description is ranking input only and is never executed, logged, or stored (NFR-01). No prompt content is logged (`code-standards.md`).
- Concurrency and idempotency: sequential per harness, read-only.
- Rollback or reversal: revert the change; the configuration format is untouched.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| 1 Core: contract, merge, ranking (CMP-01..03) | — | unit tests TC-03, TC-04, TC-06 pass |
| 2 Reader: frontmatter, bounded scan (CMP-04, CMP-05) | 1 | integration tests TC-02, TC-12 pass on fixtures |
| 3 Folders per harness and resolver, with the vendor re-check and research doc update (CMP-06) | 2 | TC-01 passes for the eight harnesses; the research lines are current |
| 4 Wizard picker and wiring (CMP-07..09) | 1, 3 | TC-05, TC-07, TC-08, TC-09, TC-13 pass; existing wizard tests unchanged |
| 5 Benchmark, README and docs, closing gates | 4 | TC-10 passes; README interactive-setup section and `docs/` describe the suggestion |

## Test approach

- Profile: Node.js 20+ (development on 24), TypeScript strict, ES modules, Vitest; commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run test:bench` (TC-10 only), `npm run schemas:check`, `npm run test:budget`. Runtime surface: the `init` assistant in `src/cli/`; no hooks or in-harness code.
- End-to-end: not added. The wizard is exercised in process with `ScriptedPrompts` and the real reader over temporary fixture projects; the existing built-CLI smoke set keeps proving that `init --yes` is unchanged (TC-14). Real TTY use is manual acceptance only if the QA run can drive a pseudo-terminal; otherwise it stays `NOT VERIFIABLE` in the QA report.
- Platforms: Windows is run here; the symlink and junction tests skip with a reason when the system cannot create links (`tests.md`); Linux and macOS stay unverified locally and the code uses `node:path` only.
- Command prerequisites and exclusions: fixture projects in temporary directories; nothing in the repository's own `.claude/skills` is read by tests.
- Manual acceptance: none required.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01, OBJ-03 | integration | per harness (`it.each` over `HARNESS_IDS`): a fixture with its first declared folder holding `a/SKILL.md`; and an empty project | names `[a]`; empty list, no warning | `tests/integration/skill-catalog-harnesses.test.ts` |
| TC-02 | FR-02 | integration | malformed frontmatter, name `a/b`, name `a b`, a symlinked skill folder, a 1000-directory folder, a 1 MB `SKILL.md` | first two ignored without failure; symlink resolves; scan stays within `MAX_SKILL_DIRECTORIES`; file read is bounded to 8 KiB (spy on bytes read) | `tests/integration/skill-catalog-reader.test.ts` |
| TC-03 | FR-03, OBJ-04 | unit | fixture: `sdd-snapshot`, `commit` (description cites a checkpoint), `sdd-triage`, `handoff-notes` | order `sdd-snapshot` and `handoff-notes` by score/name; `commit`, `sdd-triage` rank after any name match and only with the description score | `tests/unit/skill-ranking.test.ts` |
| TC-04 | FR-04 | unit | resume fixture with `sdd-orchestrate-flow`, `continuar-trabalho`, `sdd-snapshot`; the snapshot name equals a candidate | `sdd-orchestrate-flow` first; the excluded name is absent | `tests/unit/skill-ranking.test.ts` |
| TC-05 | FR-05, FR-04 | unit | scripted wizard over a fixture catalog: options order (configured, recommended, alternatives at most 3, type another, none); Enter keeps the configured value; `type another` opens the typed question and refuses `/x`; the resume question appears only after a snapshot skill and omits it | as listed | `tests/unit/questions-skill.test.ts` |
| TC-06 | FR-06 | unit | `a` in two harnesses, `b` in one, equal scores | `a` before `b`; `b`'s hint names its harness; a name match still beats a universal weaker match | `tests/unit/skill-candidates.test.ts` |
| TC-07 | FR-07 | integration | `init --yes --snapshot-command x` and a non-interactive run, with the reader module replaced by a function that fails the test when called | the reader is never called; output unchanged | `tests/integration/init-skill-catalog-not-read.test.ts` |
| TC-08 | FR-08 | unit | the catalog throws; the catalog returns warnings | the typed question is shown and works; one warning line on stderr (spy); no exit | `tests/unit/questions-skill.test.ts` |
| TC-09 | NFR-01 | unit | a candidate whose description contains `; rm -rf /` and `/evil` | the flags and facts contain only the validated name; the option label does not contain the description | `tests/unit/questions-skill.test.ts` |
| TC-10 | NFR-02 | benchmark | 200 skill directories in a temporary project | scan p95 under 500 ms | `tests/bench/skill-catalog.test.ts`, `npm run test:bench` |
| TC-11 | NFR-03 | static | `core` imports and harness ids in the ranking | no hit | QA-03, QA-07 |
| TC-12 | NFR-04 | integration | a directory symlink and, on Windows, a junction | resolved; skipped with a reason when links cannot be created | `tests/integration/skill-catalog-reader.test.ts` |
| TC-13 | NFR-05 | unit | option labels and hints | contain the words `recommended`, `current`, and `found in` | `tests/unit/questions-skill.test.ts` |
| TC-14 | FR-07, regression | end-to-end | the existing built-CLI `init` smoke | unchanged | `tests/e2e/e2e-init.test.ts` |

## Quality profile

Rules this feature can violate. A blocking hit prevents task completion and rejects the review; a reservation becomes an optional improvement and counts toward escalation. A hit covered by `DEC-NN` is expected, not a finding.

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b\|\bas any\b\|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore\|@ts-nocheck\|eslint-disable' "${files[@]}"` | — |
| QA-03 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure\|cli)/" "${core_files[@]}"` | — |
| QA-04 | empty `catch` or `.catch(() => {})` (the reader tolerates missing folders) | blocking | `"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}\|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"` | — |
| QA-05 | Harness id branching in the ranking and merge services | blocking | `rg -n "claude-code\|codex-cli\|opencode\|cursor\|'pi'\|oh-my-pi\|antigravity\|copilot" src/core/services/skill-ranking.ts src/core/services/skill-candidates.ts` | — |
| QA-06 | Synchronous file API in the reader | blocking | `"${RG[@]}" '\b(readFileSync\|writeFileSync\|existsSync\|statSync\|readdirSync)\b' src/infrastructure/skills` | — |
| QA-07 | `throw new Error(` where a dedicated class fits | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-08 | 4+ parameters in a declaration, or a file above 100 lines | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{\|=>)' "${files[@]}"`; `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |

- Verification scope: every TypeScript file in the task diff; `core_files` are the files under `src/core/`.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places.

### Terrain baseline

Measured 2026-10-13 over the existing files the feature modifies (`rg` commands of `preparatory-refactoring.md`); no QA hit existed in any of them.

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/cli/assistant/questions-snapshot.ts` | 67 | 2 | 3 | 0 | none | recorded; the picker goes to its own file (CMP-07) so this file grows by about 10 lines |
| `src/cli/assistant/assistant-context.ts` | 28 | 2 | 2 | 0 | none | recorded |
| `src/cli/assistant/types.ts` | 37 | 6 | 3 | 0 | none | recorded |
| `src/cli/assistant/assistant-questions.ts` | 26 | 1 | 2 | 0 | none | recorded |
| `tests/helpers/assistant-context.ts` | 40 | 4 | 2 | 0 | none | recorded; a default empty catalog keeps current tests unchanged |

- Preparatory refactoring: not recommended. No target crosses a structural threshold; the new code is placed in new files.

## Observability and rollout

- Signals: one stderr warning line when the catalog cannot be read; no log of names or descriptions.
- Migration and compatibility: none. No configuration, flag, or output change.
- Rollout and rollback: ship with the package; revert the change to roll back.

## Risks and open items

- Risk: a hand-written frontmatter parser meets a YAML form it does not read (block scalar descriptions, multi-line names). Impact low: the skill still appears by name; the description is only a weak signal. Mitigation: documented limit and a fixture with a block scalar.
- Risk: scoring terms such as `flow` match names like `workflow`. Impact low: the user always confirms, and the list shows alternatives. Mitigation: name-first scoring and the "found in" hint.
- Risk: the folders drift from the vendor docs. Mitigation: the re-check step before each adapter file and the research doc update.
- Open item: ancestor folders (Codex, Pi, OpenCode search upward) and user-scope folders are out of this slice; a monorepo skill in a parent folder is not suggested.
- Open item: Oh-My-Pi also reads "roots of other tools"; only the three documented folders are declared.

## Relevant files

- Modify: `src/cli/assistant/questions-snapshot.ts`, `src/cli/assistant/assistant-context.ts`, `src/cli/assistant/types.ts`, `src/cli/assistant/assistant-questions.ts`, `tests/helpers/assistant-context.ts`, `README.md`, `docs/research/harness-integrations.md` (only where the re-check differs)
- Create: `src/core/contracts/skill-catalog.ts`, `src/core/services/skill-candidates.ts`, `src/core/services/skill-ranking.ts`, `src/infrastructure/skills/frontmatter.ts`, `src/infrastructure/skills/skill-catalog-reader.ts`, `src/infrastructure/harnesses/skill-folders.ts`, `src/infrastructure/harnesses/<harness>/skill-folders.ts` (8), `src/cli/assistant/questions-skill.ts`, the test files named in the table, `tests/bench/skill-catalog.test.ts`
