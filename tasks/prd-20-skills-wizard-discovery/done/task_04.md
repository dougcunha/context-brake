# Stable execution context

Load in this exact order:

1. `tasks/prd-20-skills-wizard-discovery/prd.md`
2. `tasks/prd-20-skills-wizard-discovery/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Wizard picker and wiring

## Outcome

The snapshot and resume questions of the init wizard offer the best matches found in the selected harnesses with alternatives, "type another", and for the snapshot "none", fall back to the typed question when nothing matches or the catalog fails, and never scan when the wizard does not run.

## Dependencies and boundaries

- Depends on: T01, T03
- Unblocks: T05
- In scope: `questions-skill.ts`, the changes in `questions-snapshot.ts`, `assistant-context.ts`, `types.ts`, `assistant-questions.ts`, the test helper default catalog, and tests TC-05, TC-07, TC-08, TC-09, TC-13.
- Out of scope: Benchmark, README and docs, new flags, any change to `SnapshotChoice` or the printed command.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-04, FR-05, FR-06, FR-07, FR-08, NFR-01, NFR-05, US-01..US-04 | `prd.md#functional-requirements` | Picker behavior |
| DEC-05, DEC-06, DEC-07, CMP-07..CMP-09 | `techspec.md#technical-decisions` | Wiring and fallback |
| TC-05, TC-07, TC-08, TC-09, TC-13 | `techspec.md#test-approach` | Scripted wizard |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `code-standards.md`, `cli-output.md`, `tests.md`.
- Existing code: `src/cli/assistant/questions-snapshot.ts`, `ask.ts`, `snapshot-specs.ts`, `ui-prompt.ts` (`select`), `clack-prompt-port.ts`, `assistant-context.ts`, `tests/helpers/assistant-context.ts`, `tests/helpers/scripted-prompts.ts`, the existing wizard tests `tests/unit/assistant-questions*.test.ts`.
- Contract or integration: TechSpec DEC-05 and the Terrain baseline (questions-snapshot.ts is 67 lines; the picker lives in its own file).

## Work

- [x] T04.1 Create `src/cli/assistant/questions-skill.ts`: read the catalogs of the selected harnesses (catching a throw into the stderr warning and writing reader warnings once), merge, rank, build the `select` spec with option values `?other` and `?none`, the readline line listing numbered options and accepting a number, a name, `none`, or Enter, and return the chosen name or null; the typed question stays the fallback.
- [x] T04.2 Change `askSnapshot(context, selected, prompts)` and `askCommandOptions` to use the picker for the snapshot and the resume questions (resume excludes the snapshot name and has no `none`); keep every file under 100 lines.
- [x] T04.3 Add `projectRoot` and `catalog` to `AssistantContext`, build them in `buildAssistantContext` with `createSkillCatalogReader()`, pass `selected` from `runQuestions`, and give `tests/helpers/assistant-context.ts` a default empty catalog.
- [x] T04.4 Add `tests/unit/questions-skill.test.ts` (TC-05, TC-08, TC-09, TC-13) and `tests/integration/init-skill-catalog-not-read.test.ts` (TC-07, with the reader module replaced by a function that fails when called); run the existing wizard tests unchanged.

## Acceptance criteria

- In a scripted session the options appear as: the configured value if not among matches, the best match marked recommended, at most 3 alternatives, type another, none; Enter keeps the configured value.
- A skill in every selected harness is annotated `found in <folder>`; one in only some is annotated with its harnesses.
- The resume list never contains the snapshot skill, and the resume question is asked only after a snapshot skill is set.
- A throwing catalog still leaves a working prompt and writes one warning line to stderr; with no match the typed question is shown exactly as before.
- The flags and the equivalent command contain only the validated name; `--yes` and flag runs never call the catalog.

## Verification

- Unit: `tests/unit/questions-skill.test.ts`.
- Integration: `tests/integration/init-skill-catalog-not-read.test.ts` plus the existing wizard tests.
- End-to-end: not applicable (T05 reruns the built smoke).
- Manual: none.
- Platforms: Windows run here.
- Commands: `npx vitest run tests/unit tests/integration/init-skill-catalog-not-read.test.ts tests/integration/init-assistant-equivalence.test.ts`, `npm run lint`, `npm run typecheck`.
- Environment dependency: none.
- Expected evidence: passing tests, empty QA-01..QA-08 output for the diff.

## Affected files

- Modify: `src/cli/assistant/questions-snapshot.ts`, `src/cli/assistant/assistant-context.ts`, `src/cli/assistant/types.ts`, `src/cli/assistant/assistant-questions.ts`, `tests/helpers/assistant-context.ts`
- Create: `src/cli/assistant/questions-skill.ts`, `tests/unit/questions-skill.test.ts`, `tests/integration/init-skill-catalog-not-read.test.ts`

## Observability and recovery

- Operational signal: one stderr warning line when the catalog cannot be read
- Recovery: revert the picker call; the typed question remains

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the init wizard reads the catalogs of the selected harnesses once (`loadCandidates`), merges and ranks them, and asks the snapshot and resume questions through `askSkill`: a `select` (readline: numbered lines) with the configured skill first when it is not among the matches (`current`), the best match marked `recommended`, at most three alternatives, `type another`, and `none`; Enter keeps the configured value, else the recommended one. Each option's hint is `found in <folders>` (all selected harnesses) or `found in <harness> (<folder>)`. With no match the existing typed question is shown unchanged; a throwing catalog writes `WARN: Could not read the project skills (...)` to stderr and falls back; reader warnings are written once and the picker stays. The resume ranking excludes the chosen snapshot skill and the resume question is still asked only after a snapshot skill is set. Nothing else changed: `SnapshotChoice`, flags, printed command, and `--yes` runs (the catalog factory is only created inside `buildAssistantContext`).
- Changed files: created `src/cli/assistant/questions-skill.ts` (56 lines), `src/cli/assistant/skill-options.ts` (51 lines), `tests/helpers/skill-catalog-fake.ts`, `tests/unit/questions-skill.test.ts`, `tests/unit/questions-skill-resume.test.ts`, `tests/unit/questions-skill-harnesses.test.ts`, `tests/integration/init-skill-catalog-not-read.test.ts`; modified `src/cli/assistant/questions-snapshot.ts` (67 to 74 lines), `assistant-context.ts`, `types.ts`, `assistant-questions.ts`, `tests/helpers/assistant-context.ts`.
- Checks: 12 new unit tests and 3 integration cases pass; `npx vitest run tests/unit tests/integration`: 263 files, 1382 passed, 1 skipped (POSIX-only permission case); existing wizard tests unchanged; `npm run lint` and `npm run typecheck` pass; QA-01..QA-06 greps empty; QA-08 empty. Reservation hit: QA-07 `throw new Error(` in the test mock of `init-skill-catalog-not-read.test.ts:10` (a generic error is right for a tripwire that must never run).
- Validated state: worktree on `master`, HEAD `7295a43`, uncommitted; Windows with Git Bash.
- Open items: deviations from the TechSpec text, both recorded: the resume question also offers `none` (PRD FR-05 says the same options; DEC-06 said no `none`), and the picker functions are `loadCandidates` and `askSkill` in `questions-skill.ts` with the option building in `skill-options.ts` (file-size limit). The clack `select` path was exercised only through its option data (`ui.options`), not a real terminal.

### ADR candidates

None - direct TechSpec implementation or local decision
