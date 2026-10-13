# TechSpec — Skill names in the configuration, invocation formatted by each harness

## Sources and traceability

- PRD: `tasks/prd-19-skills-name-and-invocation/prd.md`
- Applicable instructions, rules, and skills: `AGENTS.md`; `.agents/rules/code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`, `cli-output.md`; skill `ts-tests` for the test sweep.
- Research: `docs/research/harness-integrations.md` (each harness section; the PRD table of 2026-10-13 is added to it, FR-09).
- Evidence in existing code: `src/core/contracts/configuration.ts:24-31` (`agentCommand`, `snapshotSchema`), `src/core/services/zone-guidance.ts:15-30` (`zoneAction`, `resumeText`), `src/core/contracts/runtime.ts:35-40` (`RuntimeDescriptor`), `src/infrastructure/harnesses/*/runtime.ts` (descriptors with `newSessionCommand`), `src/core/services/brake-engine.ts:48-52`, `session-reset-handler.ts:30`, `failure-policy.ts:55`, `src/core/services/doctor-report-extras.ts:21-23`, `src/core/contracts/diagnostics.ts:24`, `src/cli/assistant/questions-snapshot.ts`, `snapshot-specs.ts`, `src/cli/output/doctor-mode-text.ts`.

## Solution summary

The configuration keeps a bare skill name validated by one schema. The text the agent receives is built from the name and a **format function** that belongs to the harness: a `RuntimeDescriptor` field for the runtime path (the hook process of that harness) and a `Record<HarnessId, …>` resolver for the CLI side (`doctor`, the wizard). Core ships four standard formats (`/name`, `$name`, `/skill:name`, plain sentence) that harness folders pick from; zone guidance only calls the function it is given, so it never branches on a harness.

Everything else follows from the name: the equivalent command, the plan, the `doctor` text and JSON, and this repository's own configuration and docs. The old format is rejected with a fix message; nothing is migrated (H-02).

## Technical decisions

| ID | PRD obligations | Decision | Reason and evidence | Alternatives and trade-offs |
| --- | --- | --- | --- | --- |
| DEC-01 | FR-01, FR-02 | One `skillNameSchema` in a new `src/core/contracts/skill-name.ts`, used by `snapshotSchema` for `command` and `resumeCommand`. Pattern `^[a-z0-9]+(-[a-z0-9]+)*$` with an optional `plugin:` prefix of the same shape, each part up to 64 characters. A value that starts with `/`, `$`, or `@`, or has spaces, gets a dedicated issue message with the bare name. | The rule is shared with slice 20 (catalog names). `configuration.ts` already has 12 exports (terrain baseline), so the schema lives in its own file. Vendor name rules: PRD sources. | Keep `agentCommand` and test shape in the wizard only: rejected, the hooks load the config too. |
| DEC-02 | FR-03, FR-04, NFR-01 | `type SkillInvocationFormat = (skill: string) => string` in `src/core/contracts/skill-invocation.ts`. Core service `src/core/services/skill-invocation.ts` exports `slashInvocation` (`/n`), `dollarInvocation` (`$n`), `skillSlashInvocation` (`/skill:n`), and `sentenceInvocation` (`use the n skill`, the default and the fallback). | `newSessionCommand: '/clear'` in the descriptors is the precedent for harness text in the runtime object. Functions are testable with no harness. | A closed union of styles with a `switch`: rejected, a new style would edit core. A method on each adapter class: rejected, AUTO-06 (`codex-cli/adapter.ts` is already 101 lines). |
| DEC-03 | FR-03, NFR-01 | `RuntimeDescriptor` gets a required `skillInvocation: SkillInvocationFormat`. Each harness folder adds `skill-invocation.ts` exporting its constant with the doc link as the only comment-worthy fact; the descriptor and the CLI resolver import it. Forms: claude-code `slash`, cursor `slash`, github-copilot-cli `slash`, codex-cli `dollar`, pi `skillSlash`, oh-my-pi `sentence` (AUTO-05), opencode `sentence`, antigravity-cli `sentence` (AUTO-04). | PRD table of 2026-10-13. | See AUTO-05 for the Oh-My-Pi choice. |
| DEC-04 | FR-07, NFR-01 | `src/infrastructure/harnesses/skill-invocations.ts` exports `SKILL_INVOCATIONS: Readonly<Record<HarnessId, SkillInvocationFormat>>`. Core gets it through a port type `SkillInvocationResolver = (harness: HarnessId) => SkillInvocationFormat` in the same contract file, wired by the composition root of the CLI. | A `Record` over `HarnessId` fails to compile when a harness is added without a form. | Resolve in `doctor` through the adapter list: rejected, no method on adapters (DEC-03). |
| DEC-05 | FR-03, FR-04 | `zoneAction(zone, snapshot, options)` with `options: { mode?: RestartMode; invoke?: SkillInvocationFormat }` and `resumeText(snapshot, invoke = sentenceInvocation)`. The text keeps today's shape: `run "<invocation>"[ now], then end reply with …` and `Run "<invocation>" before continuing.` Callers pass `options.descriptor.skillInvocation`; `failure-policy` passes `descriptor?.skillInvocation`. | Three parameters at most (`code-standards.md`). Slash forms keep today's exact text, so existing golden strings only lose the stored `/`. | A fourth parameter: rejected (rule). |
| DEC-06 | FR-07 | `doctor`'s `snapshot` report gains `invocations: [{ harness, command, resumeCommand }]` for the active harnesses (`config.activeHarnesses`), computed with the resolver. The text prints one line per harness with the form as the agent receives it; a sentence form already reads as words. | `doctor-report-extras.ts` already builds `snapshot`; the schema is `strict`, so the field is added to `snapshotReport` and the schemas are regenerated. | Print forms only in text: rejected, FR-07 requires JSON. |
| DEC-07 | FR-05, FR-06, FR-02 | Flags `--snapshot-command` and `--resume-command` keep their names and are validated by `mergeSnapshot` through `snapshotSchema`, so the sigil message appears for the flags too. The wizard validates with the same schema (`checked` in `questions-snapshot.ts`), shows one preview line per selected harness, and the prompt texts say "skill name". | `mergeSnapshot` already parses `snapshotSchema` and returns `Invalid snapshot option: …`. AUTO-03 keeps the keys. | A separate validator in the wizard: rejected, duplicated rule. |
| DEC-08 | FR-08 | This repository's `context-brake.config.json`, README, `AGENTS.md`, `.agents/skills/sdd-orchestrate-flow/references/autonomous-mode.md` (`.claude/skills` is a symlink to it), `docs/research/terminal-tty.md`, and the SDD skills' ContextBrake check are updated to the bare name in the **last** task, after the code; `npm run build` and `schemas:generate` run before `schemas:check`. | The hooks already installed in the repo run the previous bundled script, which accepts any string, so the order cannot break the live session. After the change, `init` re-run in the repo refreshes the hook script. | Change the config first: rejected, a stricter schema would reject it before the code is ready. |
| DEC-09 | OBJ-04, FR-09 | `docs/research/harness-integrations.md` gets, in each harness section, a "Skills" entry (folders, invocation form, verification date 13/10/2026, link) from the PRD table. The file is Portuguese; the entries follow its language and format. | `AGENTS.md`: update the section when behavior differs. | A separate document: rejected, the rule names this file. |

## Components and flow

| ID | Component | New or modified | Responsibility | Dependencies |
| --- | --- | --- | --- | --- |
| CMP-01 | `src/core/contracts/skill-name.ts` | New | `skillNameSchema`, `SKILL_NAME_PATTERN`, the sigil message | — |
| CMP-02 | `src/core/contracts/skill-invocation.ts` | New | `SkillInvocationFormat`, `SkillInvocationResolver` types | — |
| CMP-03 | `src/core/services/skill-invocation.ts` | New | Four standard formats | CMP-02 |
| CMP-04 | `src/core/contracts/configuration.ts` | Modified | `snapshotSchema` uses `skillNameSchema`; `agentCommand` removed | CMP-01 |
| CMP-05 | `src/core/contracts/runtime.ts` | Modified | `RuntimeDescriptor.skillInvocation` | CMP-02 |
| CMP-06 | `src/core/services/zone-guidance.ts` | Modified | `zoneAction` and `resumeText` take the format | CMP-02, CMP-03 |
| CMP-07 | `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts` | Modified | Pass the descriptor's format to CMP-06 | CMP-05, CMP-06 |
| CMP-08 | `src/infrastructure/harnesses/<8>/skill-invocation.ts` and `<8>/runtime.ts` | New and modified | Each harness's form and descriptor field | CMP-03, CMP-05 |
| CMP-09 | `src/infrastructure/harnesses/skill-invocations.ts` | New | `SKILL_INVOCATIONS` resolver | CMP-08 |
| CMP-10 | `src/core/contracts/diagnostics.ts`, `src/core/services/doctor-report-extras.ts`, `src/core/services/doctor-service.ts` | Modified | `snapshot.invocations` | CMP-02, CMP-09 |
| CMP-11 | `src/cli/output/doctor-mode-text.ts` | Modified | Per-harness lines | CMP-10 |
| CMP-12 | `src/cli/assistant/questions-snapshot.ts`, `snapshot-specs.ts`, `summary-rows.ts`, `src/cli/init-arguments.ts`, composition root | Modified | Prompts, preview, help text, resolver wiring | CMP-01, CMP-09 |
| CMP-13 | Repo config, README, `AGENTS.md`, autonomous-mode reference, research doc, `schemas/` | Modified | FR-08, FR-09 | all |

Flow at a hook event: the harness hook process builds its `RuntimeDescriptor` (with its format), the engine reads the zone, and `zoneAction` renders `run "<format(config.snapshot.command)>"`. Flow in the CLI: the config is validated by `snapshotSchema`; `doctor` and the wizard call `SKILL_INVOCATIONS[harness]` through the resolver.

## Contracts and data

- `context-brake.config.json`: `snapshot.command` and `snapshot.resumeCommand` are skill names (DEC-01). `schemaVersion` stays `1` (PRD constraint). A value in the old format is an `InvalidConfigurationError` with the key path and the message `"/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot` (FR-02).
- `schemas/context-brake.config.schema.json`: `pattern` and `maxLength` replace the free string; regenerated by `npm run schemas:generate`.
- `doctor --json`: `snapshot.invocations` (array of `{ harness, command: string, resumeCommand: string | null }`); the `doctor` report keeps `schemaVersion` 1 (additive optional field in a `strict` object, regenerated schema).
- Agent-facing text: unchanged shape (DEC-05); the sentence form reads `run "use the sdd-snapshot skill", then end reply with [REQUEST_SESSION_RESET]`.

## Integrations and interfaces

Every harness hook keeps its payload and response; only the guidance string changes. No new process, timeout, or file.

## Errors, security, and recovery

- Errors and edges: sigil, uppercase, spaces, double hyphen, and over-long names are rejected at load (`init`, `doctor`, hooks). A hook whose config is invalid already follows the failure policy: the tool call proceeds and the error is logged.
- User files and sensitive data: no file is written by this slice beyond the existing `init` flow; the skill name is not sensitive.
- Concurrency and idempotency: none added.
- Rollback or reversal: revert the commit; the config in this repo returns to `/sdd-snapshot` by the same revert.

## Sequencing

| Step | Depends on | Verifiable result |
| --- | --- | --- |
| S1 CMP-01..CMP-04 | — | `skill-name` and configuration unit tests pass (TC-01, TC-02) |
| S2 CMP-05..CMP-07 | S1 | zone guidance and engine tests pass with a fake and a real format (TC-04, TC-05, TC-11) |
| S3 CMP-08, CMP-09 | S2 | the resolver covers every `HarnessId`; one test per harness form (TC-03) |
| S4 CMP-10, CMP-11 | S3 | `doctor` text and JSON (TC-08) |
| S5 CMP-12 | S3 | flags, wizard, and equivalence (TC-06, TC-07) |
| S6 test sweep over the ~26 files that hold `/sdd-snapshot`-style values | S1..S5 | `npm test` green |
| S7 CMP-13 | S6 | `schemas:check`, `git grep`, build, coverage (TC-09, TC-10, TC-13) |

## Test approach

- Profile: Node.js 20+, TypeScript strict, ESM, Vitest; surfaces: CLI (`src/cli/`) and hooks run as one process per event (the descriptors and guidance). No in-process harness code is touched. Commands from `AGENTS.md`: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`, `npm run build`.
- End-to-end: one smoke case on the built CLI: `init --snapshot-command sdd-snapshot --resume-command sdd-orchestrate-flow` in a fixture repo, then a Claude Code `PostToolUse` round trip in the red zone whose output contains `run "/sdd-snapshot"` (TC-13). No new process lane file unless the case needs one.
- Platforms: Linux, macOS, Windows; nothing here depends on a shell or a path.
- Command prerequisites and exclusions: none; `tests/e2e` uses temporary directories.
- Manual acceptance: none.

| ID | Obligations | Level | Scenario | Expected result | Command or suite |
| --- | --- | --- | --- | --- | --- |
| TC-01 | FR-01 | unit | the valid and rejected names of the PRD table plus `a:b`, `a::b`, `:a`, and a 65-character name | accepts and rejects exactly as listed | `tests/unit/skill-name.test.ts` |
| TC-02 | FR-02 | unit, integration | `/sdd-snapshot`, `$x`, `@x`, `a b` through the schema, `mergeSnapshot`, `init --snapshot-command`, and a config file | the message names key, file or flag, and the bare name; `init` writes nothing | `tests/unit/configuration-snapshot.test.ts`, `tests/unit/snapshot-merge.test.ts`, `tests/integration/init-snapshot.test.ts` |
| TC-03 | FR-03, NFR-01 | unit | `SKILL_INVOCATIONS[id]('sdd-snapshot')` for each id | the eight forms of the PRD table; the `Record` has every id | `tests/unit/skill-invocation.test.ts` |
| TC-04 | FR-03 | unit | `zoneAction` at RED and CRITICAL, and `resumeText`, with each standard format | exact strings; slash forms equal today's text without the stored `/` | `tests/unit/zone-guidance.test.ts` |
| TC-05 | FR-04 | unit | no descriptor in `failure-policy`; no `invoke` in `zoneAction` | sentence form | `tests/unit/failure-policy.test.ts`, `tests/unit/zone-guidance.test.ts` |
| TC-06 | FR-05 | integration | `init` with bare names; replay of the printed command | config holds bare names; replay computes the same plan | `tests/integration/init-snapshot.test.ts`, `tests/integration/init-assistant-equivalence.test.ts` |
| TC-07 | FR-06 | unit | scripted wizard: typed `/sdd-snapshot`, then a valid name, two harnesses selected | refusal with the FR-02 message, prompt repeats; two preview lines | `tests/unit/assistant-questions-invalid.test.ts`, `tests/unit/assistant-questions.test.ts` |
| TC-08 | FR-07 | unit, integration | `doctor` with two active harnesses; `--json` | text lines and `snapshot.invocations`; schema parses | `tests/unit/doctor-mode-text.test.ts`, `tests/integration/doctor-light-mode.test.ts`, `npm run schemas:check` |
| TC-09 | FR-08 | automated | `git grep -nE '"/sdd-(snapshot|orchestrate-flow)"|command "/sdd-'` outside `tasks/` and `tests/`; `schemas:check`; `context-brake doctor` in this repo | no hit; schemas current; doctor reports no error | review command list |
| TC-10 | FR-09, OBJ-04 | review | each harness section of the research doc | has the Skills entry matching the PRD table | `rg -n "Skills" docs/research/harness-integrations.md` |
| TC-11 | NFR-01 | unit | `zoneAction` with a fake format `(n) => '<<' + n + '>>'` | the fake appears; no harness id appears in `zone-guidance.ts` | `tests/unit/zone-guidance.test.ts` |
| TC-12 | NFR-02 | unit | telemetry block with the sentence form at CRITICAL | stays within the 60-token budget | `tests/unit/telemetry-block-budget.test.ts` |
| TC-13 | FR-05, FR-03 | end-to-end | built CLI `init` in a fixture, then a red-zone hook round trip | the response contains `run "/sdd-snapshot"` | `tests/e2e/` (extend the existing init and hook smoke) |

## Quality profile

| ID | Rule | Class | Verification command | Prior justification |
| --- | --- | --- | --- | --- |
| QA-01 | `any` in any form | blocking | `"${RG[@]}" ':\s*any\b|\bas any\b|<any>' "${files[@]}"` | — |
| QA-02 | `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | blocking | `"${RG[@]}" '@ts-ignore|@ts-nocheck|eslint-disable' "${files[@]}"` | — |
| QA-03 | `core` importing `infrastructure` or `cli` | blocking | `"${RG[@]}" "from '(\.\./)+(infrastructure|cli)/" "${core_files[@]}"` | — |
| QA-04 | `throw new Error(` where a dedicated class fits | reservation | `"${RG[@]}" 'throw new Error\(' "${files[@]}"` | — |
| QA-05 | 4+ parameters in a declaration | reservation | `"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{|=>)' "${files[@]}"` | — |
| QA-06 | File above 100 lines | reservation | `rg -c -H '^' "${files[@]}" \| awk -F: '$2 > 100'` | — |
| QA-07 | Harness id branching in core guidance | blocking | `rg -n "claude-code|codex-cli|opencode|cursor|'pi'|oh-my-pi|antigravity|copilot" src/core/services/zone-guidance.ts src/core/services/skill-invocation.ts` | — |

- Verification scope: the TypeScript files in each task diff; `core_files` is the subset under `src/core/`.
- Escalation trigger: 8+ reservations, a touched file above 200 lines, or duplication in 3+ places (eight `skill-invocation.ts` files are one line each by design and are not duplication).

### Terrain baseline

| File | Lines | Exported members | Max parameters | Cases | Pre-existing hits | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| `src/core/contracts/configuration.ts` | 51 | 12 | 3 | 0 | QA-06 none; exports above 10 (structural) | absorbed in `DEC-01`: the new schema goes to its own file, no new export here |
| `src/core/contracts/runtime.ts` | 40 | 7 | 0 | 0 | none | recorded |
| `src/core/contracts/diagnostics.ts` | 46 | 15 | 0 | 0 | exports above 10 (structural) | recorded; the change edits one schema line |
| `src/core/services/zone-guidance.ts` | 33 | 3 | 3 | 0 | none | recorded; `zoneAction` stays at 3 parameters (`DEC-05`) |
| `src/core/services/doctor-report-extras.ts` | 43 | 2 | 1 | 0 | none | recorded |
| `src/core/services/brake-engine.ts` | 63 | 4 | 3 | 4 | none | recorded |
| `src/core/services/session-reset-handler.ts` | 38 | 2 | 3 | 0 | none | recorded |
| `src/core/services/failure-policy.ts` | 68 | 8 | 1 | 0 | none | recorded |
| `src/cli/assistant/questions-snapshot.ts` | 71 | 2 | 3 | 0 | none | recorded |
| `src/cli/assistant/snapshot-specs.ts` | 27 | 3 | 1 | 0 | none | recorded |
| `src/cli/output/doctor-mode-text.ts` | 12 | 1 | 1 | 0 | none | recorded |
| `src/infrastructure/harnesses/*/runtime.ts` (8) | 57-93 | 1-3 | 2 | 0 | none | recorded; `codex-cli/runtime.ts` is 93 lines, one line added |
| `src/infrastructure/harnesses/registry.ts` | 99 | 3 | 0 | 0 | none | not modified |

- Preparatory refactoring: not recommended. The two structural hits (export counts) are avoided by placing new code in new files (`DEC-01`).

## Observability and rollout

- Signals: `doctor` output (DEC-06); invalid configuration already reaches the runtime error log (`InvalidConfigurationError`).
- Migration and compatibility: none (H-02). A user with the old format sees the FR-02 message.
- Rollout and rollback: tasks run in S1..S7 order; the repository's own configuration changes last (DEC-08); rollback is a revert.

## Risks and open items

- Risk: a harness changes its skill invocation syntax. Probability medium over time, impact low (the text is still understandable); mitigation: one constant per harness and the dated research entry.
- Risk: Cursor CLI may not accept `/name` (assumption A-03). Impact low (the model still reads the name); mitigation: recorded in the research entry.
- Risk: the ~26 test files hold the old format. Mitigation: S6 is a dedicated task with `npm test` as its gate.
- Open item: none blocking.

## Relevant files

- Modify: `src/core/contracts/configuration.ts`, `runtime.ts`, `diagnostics.ts`; `src/core/services/zone-guidance.ts`, `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts`, `doctor-report-extras.ts`, `doctor-service.ts`; `src/infrastructure/harnesses/*/runtime.ts`; `src/cli/assistant/questions-snapshot.ts`, `snapshot-specs.ts`, `summary-rows.ts`; `src/cli/init-arguments.ts`; `src/cli/output/doctor-mode-text.ts`; the CLI composition root; `context-brake.config.json`; `README.md`; `AGENTS.md`; `.agents/skills/sdd-orchestrate-flow/references/autonomous-mode.md`; `docs/research/harness-integrations.md`; `docs/research/terminal-tty.md`; `schemas/*` (generated); about 26 test files.
- Create: `src/core/contracts/skill-name.ts`, `skill-invocation.ts`; `src/core/services/skill-invocation.ts`; `src/infrastructure/harnesses/skill-invocations.ts`; `src/infrastructure/harnesses/<harness>/skill-invocation.ts` (8); `tests/unit/skill-name.test.ts`, `skill-invocation.test.ts`.
