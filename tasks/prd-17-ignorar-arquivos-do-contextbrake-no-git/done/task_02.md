# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`
2. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — `gitIgnore` setting, flags, and plan owner

## Outcome

`init --no-gitignore` and `init --gitignore` parse, merge into the configuration (`gitIgnore: false` written only when off), count as configuration flags, and the plan can carry a change with owner `gitignore`; the generated schemas are current.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T03, T05
- In scope: `gitignore-merge.ts`, the `gitIgnore` key in `configuration.ts` and `installation-builder.ts` (key order, summary), the two flags in `init-arguments.ts`, `init-option-rules.ts`, and `init-config-updates.ts`, `hasConfigurationFlag`, owner `gitignore` in `changes.ts` and `text.ts`, regenerated `schemas/*.json`.
- Out of scope: building lines, the plan change, the service wiring (T03).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-05 | `prd.md#functional-requirements` | Opt-out and return flags stored in the configuration |
| NFR-02 | `prd.md#non-functional-requirements` | Schemas and exit codes |
| DEC-04, DEC-05 | `techspec.md#technical-decisions` | Key, merge, owner, schema |
| CMP-03, CMP-04, TC-03, TC-09 | `techspec.md` | Components and tests |

## Context to recover on demand

- Applicable skills and rules: `code-standards.md` (30-line functions, 100-line files, three parameters), `javascript-typescript.md`, `file-changes.md`, `tests.md`.
- Code: `src/core/services/debug-mode-merge.ts` (pattern), `installation-builder.ts` (`planConfigChange`, `CONFIG_KEY_ORDER`, summaries), `init-arguments.ts` (`INIT_OPTIONS`, `hasConfigurationFlag`), `scripts/generate-schemas.ts`.

## Work

- [x] T02.1 `mergeGitIgnore(current, flags)` and `applyGitIgnore(config, update)` in `gitignore-merge.ts`: keep, set (`false`), or remove; both flags together is an error naming both.
- [x] T02.2 `gitIgnore: z.optional(z.boolean())` after `debug` in `configurationSchema`; thread the update through `planConfigUpdates`, `ConfigChangeInput`, and `planConfigChange` with a summary text.
- [x] T02.3 `--gitignore` and `--no-gitignore` in `INIT_OPTIONS`, `ParsedInitArgs`, the conflict rule, and `hasConfigurationFlag`.
- [x] T02.4 Owner `gitignore` in `CHANGE_OWNERS`; `text.ts` prints the preview summary for it; run `npm run schemas:generate`.
- [x] T02.5 Tests: `tests/unit/gitignore-merge.test.ts`, additions for the parse rules, the config round trip, and `schemas:check`.

## Acceptance criteria

- `--no-gitignore` stores `gitIgnore: false`; `--gitignore` removes the key; with neither flag the stored value is kept.
- Both flags together exit `64` naming both; either flag keeps the assistant away on a terminal.
- `npm run schemas:check` passes; existing `--json` documents still validate.
- Touched `src/` files at or below 100 lines.

## Verification

- Unit: `npm test -- tests/unit/gitignore-merge.test.ts` and the parse tests.
- Integration: existing config and plan suites unchanged.
- End-to-end: not applicable. Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: the tests above, `npm run schemas:check`, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: tests citing `FR-05`, `TC-03`, `TC-09`; schemas current.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `src/core/contracts/changes.ts`, `src/core/services/installation-builder.ts`, `src/cli/init-arguments.ts`, `src/cli/init-option-rules.ts`, `src/cli/init-config-updates.ts`, `src/cli/output/text.ts`, `schemas/context-brake.config.schema.json`, `schemas/install-report.schema.json`
- Create: `src/core/services/gitignore-merge.ts`, `tests/unit/gitignore-merge.test.ts`

## Observability and recovery

- Operational signal: the config summary line. Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Config key gitIgnore (written only as false), mergeGitIgnore/applyGitIgnore, --gitignore and --no-gitignore parsed (conflict is an exit-64 argument error naming both), counted by hasConfigurationFlag, threaded through planConfigUpdates, planInstallation, and planConfigChange (summary text added); owner gitignore added to CHANGE_OWNERS and printed with its preview line by the text output; schemas regenerated. planConfigChange stays within 30 lines through the extracted updatesOf.
- Changed files: created src/core/services/gitignore-merge.ts, tests/unit/gitignore-merge.test.ts (11 tests); modified src/core/contracts/configuration.ts, changes.ts, src/core/services/installation-builder.ts (91 lines), installation-service.ts, src/cli/init-arguments.ts (81 lines), init-option-rules.ts, init-config-updates.ts, commands/init.ts, output/text.ts, schemas/context-brake.config.schema.json, schemas/install-report.schema.json
- Checks: npm run lint, typecheck, schemas:check exit 0; npm test (whole suite, not coverage): 250 files, 1415 tests passed, 121.8 s wall; quality sweep over the touched files: no hit, every file at or below 100 lines. Coverage run is deferred to T03.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11, Node 24.20.0.
- Open items: none

### ADR candidates

None - direct TechSpec implementation or local decision.
