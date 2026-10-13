# Code review report — 19-skills-name-and-invocation

## Summary

- Status: REJECTED
- Execution: delegated reviewer
- Git scope: `7295a433a4f1f79430b0c5281cb46ab8495b6db6..uncommitted worktree` (83 changed paths: modified, staged none, new files included; HEAD is still `7295a43`)
- Previous review: —

Reason for the status: one obligation (FR-08, README) is non-conformant (CR-01, a corrupted option table). It is a one-line documentation fix; every code obligation is conformant and all gates are green.

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-19-skills-name-and-invocation/prd.md` | read |
| TechSpec | `tasks/prd-19-skills-name-and-invocation/techspec.md` | read |
| Manifest | `tasks/prd-19-skills-name-and-invocation/tasks.md` | read (T01-T05 `[x]`, all in `done/`) |
| Handoffs | `done/task_01.md` .. `done/task_05.md` (Handoff sections) | read |
| Decisions | `autonomous-decisions.md` (AUTO-01..AUTO-10), `workflow.md` | read |
| Snapshot | `context-snapshot.md` | loaded through the independent-stage filter (header, next step brief, open threads, on-run); `authored_code: yes` confirms the review must not be done by the author |
| Implementation | uncommitted diff against `7295a43` plus untracked files (38 non-test `.ts` files, 35 test `.ts` files, schemas, docs, README, `AGENTS.md`, `context-brake.config.json`, one SDD reference) | delimited |

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Name rule `^[a-z0-9]+(-[a-z0-9]+)*$`, 64, optional `plugin:` prefix, resume requires command | `src/core/contracts/skill-name.ts:5-26`, `configuration.ts:23` | `tests/unit/skill-name.test.ts`, `configuration-snapshot.test.ts:32-36` | conformant | coverage run green; `RESUME_REQUIRES_COMMAND_RULE` kept at `configuration.ts:21` |
| FR-02 | Old format rejected with what/where/fix; bare name for `/ $ @` | `skill-name.ts:20-23`; `snapshot-merge.ts:23` | `configuration-snapshot.test.ts:21-30`, `init-snapshot.test.ts:39-40`, `e2e-init.test.ts:31` | conformant, with a wording gap | Key and bare name are always present. The file name appears in the doctor finding (`path`, remediation); the flag path prints `snapshot.command`, not `--snapshot-command` (see CR-03) |
| FR-03 | Per-harness form in zone action (>= trigger) and resume text | `zone-guidance.ts:19-34`; 8 `skill-invocation.ts`; descriptors in 8 `runtime.ts`; `brake-engine.ts:50`, `session-reset-handler.ts:30`, `failure-policy.ts:55` | `tests/integration/skill-invocations.test.ts`, `tests/unit/zone-guidance.test.ts:36-39,63`, `light-mode-lifecycle` | conformant | Forms match the PRD table (`skill-invocations.ts:12-21`); per-harness exact RED/CRITICAL/resume strings are asserted only through the standard formats (CR-05) |
| FR-04 | Unknown formatter yields the sentence | `zone-guidance.ts:22,32` (`sentenceInvocation` default); `failure-policy.ts:55` | `zone-guidance.test.ts`, `failure-policy-snapshot-reset.test.ts` | conformant | no sigil fallback |
| FR-05 | `init` flags take bare names, config stores them, replay equal | `snapshot-merge.ts` through `snapshotSchema`; `questions-snapshot.ts:52-55` | `init-snapshot.test.ts`, `init-assistant-equivalence.test.ts`, `e2e-init.test.ts:31` | conformant | coverage run green |
| FR-06 | Wizard says "skill name", validates with FR-01, shows per-harness form | `snapshot-specs.ts:9-25`, `questions-snapshot.ts:20-40`, `invocation-facts.ts`, `summary-rows.ts:20-21` | `assistant-questions-invalid.test.ts:23`, `assistant-questions.test.ts:32-39`, `assistant-output.test.ts:27-28` | conformant | The preview is in the summary card before the confirmation (AUTO-09), not a note after the typed name; PRD text "before accepting" is read as accepting the plan |
| FR-07 | Printed values are bare names; doctor text and JSON carry forms | `doctor-report-extras.ts:23-29`, `diagnostics.ts:24-25`, `doctor-mode-text.ts:5-14`, `doctor.ts:51` | `doctor-report-extras.test.ts`, `doctor-mode-text.test.ts`, `doctor-light-mode.test.ts:16` | conformant | built `doctor --json` in this repo returns `snapshot.invocations[{claude-code,/sdd-snapshot,/sdd-orchestrate-flow}]` |
| FR-08 | Repo config, README, `AGENTS.md`, SDD references, schemas use the bare name | `context-brake.config.json`, `AGENTS.md`, `autonomous-mode.md:28`, `README.md`, `docs/telemetry-block.md` | TC-09 `git grep` | non-conformant | README option table row is corrupted (CR-01); `git grep` of TC-09 is empty; `schemas:check` passes |
| FR-09 | Skills entry in each of the 8 harness sections | `docs/research/harness-integrations.md:71,96,119,138,157,178,200,219` | TC-10 `rg` | conformant | eight entries with date 13/10/2026 and link |
| NFR-01 | Syntax in the harness folder; no id branching in guidance | `skill-invocation.ts` (core) holds only generic formats; `Record<HarnessId,...>` at `skill-invocations.ts:12` | QA-07, `zone-guidance.test.ts:36` (fake format) | conformant | QA-07 command printed nothing |
| NFR-02 | 60-token block budget | `telemetry-block-budget.test.ts` | covers the sentence form and the longest name | conformant | coverage run green |
| NFR-03 | Platforms | no shell or path code added | review | conformant | diff has no path/shell change; Windows run only (see limitations) |
| NFR-04 | Errors without a stack trace | `InvalidConfigurationError` path unchanged | doctor run by hand | conformant | `[ERROR] INVALID_CONTEXTBRAKE_CONFIG: ... use the bare name sdd-snapshot.` |
| NFR-05 | Schemas regenerated, `schemas:check` passes | `schemas/*.json` | `npm run schemas:check` | conformant | passed here; but see CR-02 on the shape |
| OBJ-03 | Old format fails in `init`, `doctor`, hooks | shared `snapshotSchema` | schema-level and flag tests; doctor checked by hand | conformant | no test drives a stored old-format file through the hook or doctor (CR-04) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` (100 lines, no comments, 30-line functions, 3 params) | OK | largest changed src file 94 lines (`codex-cli/runtime.ts`); lint clean; one aggravated test file (CR-06) |
| `javascript-typescript.md` (Zod, no `any`, dedicated errors) | OK | QA-01 and QA-02 empty; validation by Zod in `skill-name.ts:25` |
| `harness-adapters.md` / AGENTS.md architecture | OK | syntax in `infrastructure/harnesses/*/skill-invocation.ts`; QA-03 empty |
| `cli-output.md` | OK | no new output channel; messages follow what/where/fix except CR-03 |
| `tests.md` (cite IDs, pyramid, process lane) | OK | tests cite `prd-19 FR-/TC-`; e2e extended once |
| `file-changes.md` | N/A | no user-file writing code added |
| AGENTS.md "never edit instruction files" | OK | docs edits are repository docs, not `init` output |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | `any` | blocking | rg `:\s*any\b\|\bas any\b\|<any>` over changed `.ts` | 0 | OK |
| QA-02 | `@ts-ignore`, `eslint-disable` | blocking | rg over changed `.ts` | 0 | OK |
| QA-03 | core importing infrastructure/cli | blocking | rg over changed `src/core` | 0 | OK |
| QA-04 | `throw new Error(` | reservation | rg over changed `.ts` | 2 of 2 in tests, none on a diff line | pre-existing |
| QA-05 | 4+ parameters | reservation | rg PCRE over changed `.ts` | 8 matches, all destructuring, `it.each` callbacks, or a tuple type; none a declaration with 4 parameters; none on lines this diff added except destructuring in `telemetry-block-budget.test.ts:36` | OK (false positives) |
| QA-06 | File above 100 lines | reservation | `rg -c` + awk | 1 of 1: `tests/unit/assistant-output.test.ts` 104 lines (101 at base) | aggravated (CR-06) |
| QA-07 | Harness id in core guidance | blocking | rg on `zone-guidance.ts`, `skill-invocation.ts` | 0 | OK |

- Terrain baseline: applied from TechSpec (no source file crosses the limits in the baseline; the one test file above 100 lines is not in the baseline table and was measured at `7295a43` with `git show`)
- Hits discounted by baseline: 2 (QA-04, pre-existing) plus 7 QA-05 false positives
- Reservations accumulated in the feature: 1 (QA-06) plus the optional improvements CR-02, CR-04, CR-05 recorded as findings
- Suggested escalation: no trigger fired (fewer than 8 reservations, no touched file above 200 lines, no duplication in 3+ places)

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 `skillNameSchema` in its own file, `plugin:` prefix, sigil message | YES | `skill-name.ts`; `configuration.ts:23` uses it; `configuration.ts` has no new export |
| DEC-02 formats in core, default sentence | YES | `core/services/skill-invocation.ts` |
| DEC-03 required `RuntimeDescriptor.skillInvocation`, one constant per harness | YES | `runtime.ts:41`; eight descriptors |
| DEC-04 exhaustive `Record<HarnessId,...>` resolver | YES | `skill-invocations.ts:12`; test asserts all ids |
| DEC-05 `zoneAction(zone, snapshot, options)`, 3 params, text shape kept | YES | `zone-guidance.ts:19-34` |
| DEC-06 `snapshot.invocations` for active harnesses | YES | `doctor-report-extras.ts:23-29`; text lines `doctor-mode-text.ts` (AUTO-08 prints the form as is) |
| DEC-07 flags validated by `snapshotSchema`, wizard preview, "skill name" prompts | PARTIAL | flags and prompts YES; preview moved to the summary card (AUTO-09, recorded) |
| DEC-08 repo config and docs changed last | PARTIAL | done; installed hook assets are not refreshed (AUTO-10); doctor reports `ASSET_OUTDATED` |
| DEC-09 research doc entries | YES | eight entries |
| Contract: published config schema gets `pattern` and `maxLength` | NO | `git diff` of `schemas/context-brake.config.schema.json` shows `"type": "string"` only (CR-02) |
| Contract: `doctor` keeps `schemaVersion` 1, additive optional field | YES | `diagnostics.ts:24-25` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | schema, formats, fixtures; verified in code and tests |
| T02 | `done/task_02.md` | COMPLETE | descriptor field, eight forms, guidance; verified |
| T03 | `done/task_03.md` | COMPLETE | doctor JSON and text; verified by built `doctor --json` |
| T04 | `done/task_04.md` | COMPLETE | wizard and summary; verified in code and tests |
| T05 | `done/task_05.md` | INCOMPLETE | README table row corrupted (CR-01); the handoff does not mention it |

## Executed validations

- Profile and scope: Node 24 on Windows 11, Git Bash; CLI plus hooks; in-process tests plus the e2e smoke set; Linux and macOS not run.
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted diff as of this review; `npm run build` ran here before the other commands, so `dist/` is current.
- Reused evidence: handoff T05 `npm run test:budget` (101.0 s) and `npm run package:smoke` (exit 0) reused, not re-run: same code and platform and no source change since; this review's own coverage run took 113 s wall, inside the 180 s budget.
- Manual acceptance: none required. By hand (read-only): built `doctor` in a temporary repository with `"command": "/sdd-snapshot"` and `doctor --json` in this repository.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run lint` | passed | code-standards, QA-02 |
| `npm run typecheck` | passed | all code |
| `npm run build` | passed | assets, built CLI |
| `npm run schemas:check` | passed | NFR-05 |
| `npm run coverage` | passed: 258 files, 1340 tests, 95.98% statements | FR-01..FR-07, NFR-01..NFR-02, TC-01..TC-08, TC-11..TC-13 |
| `npm run dependencies:check` | passed | supply chain |
| TC-09 `git grep -nE '"/sdd-(snapshot\|orchestrate-flow)"\|command "/sdd-'` outside `tasks/`, `tests/` | no hit | FR-08 |
| QA-01..QA-07 commands | see quality profile | profile |
| built `doctor` with an old-format config (temporary repo) | exit with `INVALID_CONTEXTBRAKE_CONFIG` naming key and bare name | FR-02, NFR-04 |
| built `doctor --json` in this repository | `snapshot.invocations` for `claude-code`; findings `ASSET_OUTDATED` x2 (warnings) | FR-07, FR-08 |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | Medium | FR-08, FR-05, T05 | `README.md:325` — the `context-brake init` row reads `--snapshot-trigger <YELLOW\|RED>` with an unescaped pipe, then `--resume-command <skill>\|RED>`, `--resume-command <text>`: a half-applied replacement. The original row (`git show 7295a43:README.md`, line 316) escaped the pipe and had one `--resume-command <text>` | The only option table of the CLI (the handoff says there is no `--help` text) lists the resume flag twice, once still as `<text>`, a stale fragment `\|RED>`, and the unescaped `\|` splits the table cell on renderers | Replace the three flag entries with `--snapshot-trigger <YELLOW\|RED>`, `--resume-command <skill>` (once) |
| CR-02 | Low | TechSpec "Contracts and data" (config schema `pattern` and `maxLength`), NFR-05 | `schemas/context-brake.config.schema.json` diff: `snapshot.command` and `snapshot.resumeCommand` lost `minLength`/`maxLength` and gained nothing; `skill-name.ts:25-28` enforces the rule in a custom check, which the JSON Schema generator cannot render | The published schema no longer states the name rule; editors using `$schema` give no hint, and the TechSpec contract is not met. Runtime validation is unaffected | Cause proven (custom check is not rendered). Either add `z.regex` and `z.maxLength` as schema-visible checks (keeping the custom message path) or record a `DEC-NN` accepting the looser schema |
| CR-03 | Low | FR-02, NFR-04 | `src/core/services/snapshot-merge.ts:23` builds `Invalid snapshot option: snapshot.command "/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot.`; `composition-root.ts:41-43` prints the message only; built `doctor` output names the file only in `path` and `remediation` | FR-02 asks the message to name the file or the flag: the flag path names the key, not `--snapshot-command`; the CLI error for a stored file does not carry `filePath` | Cause pending for the exact wording; optional: include the flag (`--snapshot-command`) in the merge error and the file in `InvalidConfigurationError.message` |
| CR-04 | Low | OBJ-03, TC-02 | `rg "not a skill name" tests`: five tests, all at schema, merge, wizard, or flag level; none loads a stored `context-brake.config.json` through `doctor` or a hook | The "init, doctor, and the hooks' config load" claim rests on the shared loader (`project-config-store.ts:9,12`) and on a manual check done in this review | Optional: one doctor integration case with a stored `/sdd-snapshot` |
| CR-05 | Low | FR-03 acceptance | `tests/integration/skill-invocations.test.ts:26-35` asserts only the invocation fragment per harness; exact RED and CRITICAL text and the resume text are asserted with standard formats in `zone-guidance.test.ts` | The PRD asks one test per harness for the exact text at RED, CRITICAL, and resume; correctness follows from the descriptor identity test, not from a literal check | Optional: extend the per-harness `it.each` with `zoneAction` at RED and CRITICAL and `resumeText` through each descriptor |
| CR-06 | Low | QA-06 | `tests/unit/assistant-output.test.ts` is 104 lines (101 at `7295a43`) | Reservation, aggravated by 3 lines | Optional: move the new invocation rows to a second test file |

## Previous findings (re-review only)

Not applicable (first review).

## Limitations and open items

- Linux and macOS were not run; Windows with Git Bash only. No platform-specific code was added.
- `context-brake init` was not run (contract). TC-06 and TC-13 evidence is the in-process and built-CLI tests in the coverage run.
- `doctor` in this repository reports `ASSET_OUTDATED` for `.claude/hooks/context-brake.mjs` and the mod `register.mjs`. The installed hook script is the previous bundle: it renders the bare name without the harness form (`run "sdd-snapshot"` rather than `run "/sdd-snapshot"`) until the user runs `context-brake init --yes` (AUTO-10, snapshot O-02). Warnings only, not an error; the decision is the user's.
- `test:budget` and `package:smoke` were reused from the T05 handoff (same code, same platform), not re-run.
- Doctor overhead failure seen in T05 (machine load) was not re-measured; it is unrelated to the diff.
- Other SDD artifacts (`tasks/prd-20-skills-wizard-discovery/`, `tasks/triage-log.jsonl`) appear as worktree changes and are outside this review.

## Conclusion

The implementation is complete and sound: the name rule, the eight harness forms, the guidance, the doctor report, the wizard preview, the schemas, and the research entries conform to the PRD and TechSpec. Lint, typecheck, build, schema currency, and the full suite with coverage (258 files, 1340 tests, 95.98%) pass; no blocking profile rule has a hit and no architecture rule is broken. The status is REJECTED only because the README option table (FR-08, T05) is corrupted (CR-01), which is a one-line correction. After that, the remaining items (CR-02 to CR-06) are Low and can be accepted as optional improvements, giving APPROVED WITH RESERVATIONS on re-review.
