# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_07/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T25 — Preserve user hooks when installing and removing the Codex CLI and Cursor integrations

## Outcome

`init` and `remove` change only ContextBrake-owned entries in `.codex/hooks.json` and `.cursor/hooks.json`. User hook entries stay byte-identical after any number of installs and after removal, whether they sit in the same event arrays ContextBrake uses or elsewhere in the file. Three consecutive installs leave exactly one ContextBrake entry per registered event. An entry written by an earlier ContextBrake version is replaced, never duplicated.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T27, T28, and the successor re-review of `codereview_07/CR-01`
- In scope:
  - install and removal edits in `codex-cli/planner.ts` and `cursor/planner.ts`, done as item-level token-span edits;
  - recognition of owned entries by the ContextBrake hook file path;
  - unit, integration, and end-to-end tests built on the existing `user-hooks.json` fixtures.
- Out of scope:
  - the Codex command string and its `commandWindows` variant (T28);
  - handling of unparsable configs in `planRemove` (T27);
  - Claude Code's merger, which keeps user groups but re-serializes whole arrays (not a `codereview_07` finding);
  - empty event arrays left after removal, which is existing behavior shared with Claude Code;
  - capability levels, the benchmark, and the `.gitignore` block (PRD 1.1).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_07/CR-01 | `codereview.md#findings` | Codex and Cursor planners replace whole event arrays on install and write `[]` on removal; probes P1 and P2 show user hooks deleted by `init` and `remove`, both exiting 0 |
| codereview_07 | `codereview.md#compliance-with-rules-and-skills` | `file-changes.md` "touch only what ContextBrake owns" and `tests.md` required user-file scenarios marked NOT OK |
| PRD-01 | RF6, CA-05, RF19, CA-12 | Preserve user integrations; three installs keep them identical with one ContextBrake integration; removal keeps the rest of the file content |

## Requirements

- An owned entry is recognized by its hook file path, whatever command form it uses:
  - Codex CLI: a handler inside a group's `hooks` array whose `command` or `commandWindows` contains `.codex/hooks/context-brake.mjs`;
  - Cursor: an entry whose `command` contains `.cursor/hooks/context-brake.mjs`.
- Install applies to each registered event (Codex CLI `PreToolUse`, `PostToolUse`, `SessionStart`; Cursor `preToolUse`, `postToolUse`, `sessionStart`):
  - When the event holds exactly one owned entry and it equals the desired entry, no edit is planned.
  - Otherwise every owned entry is removed and one desired entry is appended.
  - A Codex group that mixes owned and user handlers keeps the group and its user handlers; only the owned handler is removed.
  - A missing event array or `hooks` object is created as today.
- Removal deletes only owned entries. A Codex group is deleted only when it held nothing but owned handlers.
- Edits are item-level token spans, using `appendJsonArrayItem` and `removeJsonArrayItem` from `json-document-editor.ts` or equivalent span helpers. Arrays are never re-serialized from parsed values. User entries, comments, key order, indentation, line endings, and the final newline stay byte-identical.
- Cursor `version` is written only when it is missing.
- A second install over the result of the first plans no change to either config file.
- `code-standards.md` limits hold: 100-line files, 30-line functions, three parameters, named constants, no comments. A matcher shared by both adapters may live under `src/infrastructure/harnesses/common/`.

## Context to recover on demand

- TechSpec: `Integration Points` (Codex CLI and Cursor rows); `Testing Approach` UT-04, UT-19, IT-01, E2E-04.
- Rules and skills: `.agents/rules/file-changes.md`, `harness-adapters.md`, `tests.md`, `code-standards.md`, `javascript-typescript.md`; `sdd-execute-corrections`.
- Code:
  - `src/infrastructure/harnesses/codex-cli/planner.ts:26-34` — `updateHooks` sets whole arrays; `:67-79` — `planCodexRemove` writes `[]`
  - `src/infrastructure/harnesses/cursor/planner.ts:21-30` and `:63-75` — same pattern for Cursor
  - `src/infrastructure/storage/json-document-editor.ts:7-54` — `setJsonProperty` replaces the whole node; item-level append and remove helpers already exist
  - `src/infrastructure/harnesses/claude-code/claude-merger.ts:18-50` — owned-group recognition precedent
  - `tests/fixtures/harnesses/codex-cli/user-hooks.json`, `tests/fixtures/harnesses/cursor/user-hooks.json` — fixtures no test uses today
  - `tests/unit/hook-registration-paths.test.ts:47-62` — exact registered entries for Codex CLI and Cursor

## Work

- [x] T25.1 Add failing tests: Codex CLI and Cursor installs over `user-hooks.json`, extended with a trailing inline comment and a user entry in every registered event, lose the user entries today.
- [x] T25.2 Implement owned-entry recognition and item-level install edits for both adapters.
- [x] T25.3 Implement owned-only removal for both adapters.
- [x] T25.4 Add cases for legacy owned entries, mixed Codex groups, idempotency, CRLF and no-final-newline files, plus a built-CLI end-to-end case.
- [x] T25.5 Run the gates and the TechSpec quality profile over the task diff.

## Acceptance criteria

- **Three installs:** in Codex CLI and Cursor fixtures with user entries in every registered event and in one unrelated event, three `init --yes` runs leave every user byte identical to the original. Each registered event holds exactly one owned entry, and runs two and three plan no config change.
- **Legacy entries:** a config holding a legacy owned entry ends with a single current entry after one install. Legacy forms: `node .codex/hooks/context-brake.mjs PreToolUse`, and Cursor `node .cursor/hooks/context-brake.mjs preToolUse` without `failClosed`.
- **Removal:** `remove --yes` deletes the owned entries and leaves every user entry and comment byte-identical.
- **Probes:** the `codereview_07` probe P1 and P2 scenarios keep the user hooks after install and after removal.
- **Existing suites:** they pass. The only expectations that may change are ones that asserted whole-array output, and each change is justified in the Handoff.

## Verification

- Unit: owned-entry recognition (legacy, current, mixed group, user-only) and item-level edits against byte-exact inputs, including CRLF and no final newline.
- Integration: `planInstall` and `planRemove` for Codex CLI and Cursor on temporary copies of the user fixtures; unowned bytes compared after one, two, and three runs, and after removal.
- End-to-end: the built CLI in a temporary repository whose `.codex/hooks.json` and `.cursor/hooks.json` hold user hooks. It runs `init --yes` three times, then `remove --yes`, asserting exit codes, user entry bytes, and one owned entry per event. The test file sits under `tests/e2e/`, which is the process lane.
- Manual: none.
- Platforms: Windows locally; Ubuntu, macOS, and Windows × Node 20, 22, and 24 in CI.
- Environment dependency: none.
- Commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`; TechSpec quality profile QA-01 to QA-06 over the TypeScript files in the task diff.
- Expected evidence: failing-then-passing test output, byte comparison results, green gates, and the CI run ID.

## Affected files

- Modify:
  - `src/infrastructure/storage/json-span-utils.ts`
  - `src/infrastructure/storage/json-document-editor.ts`
  - `src/infrastructure/harnesses/codex-cli/planner.ts`
  - `src/infrastructure/harnesses/cursor/planner.ts`
- Create:
  - `src/infrastructure/harnesses/common/codex-hooks-updater.ts`
  - `src/infrastructure/harnesses/common/cursor-hooks-updater.ts`
  - `tests/fixtures/harnesses/codex-cli/legacy-hooks.json`
  - `tests/fixtures/harnesses/cursor/legacy-hooks.json`
  - `tests/integration/codex-cursor-user-hooks.test.ts`
  - `tests/integration/legacy-user-hooks.test.ts`
  - `tests/e2e/e2e-user-hook-preservation.test.ts`

## Observability and recovery

- Operational signal: the dry-run preview lists a config update only when an owned entry is added or replaced, and repeated `init` runs report no config change.
- Recovery: revert the planner changes. Hooks already deleted by earlier versions come back only from the user's version control.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented. User hooks and inline comments in `.codex/hooks.json` and `.cursor/hooks.json` are preserved across three consecutive installs and after removal. Owned entries are recognized by hook script file path. Item-level token span edits are performed without re-serializing whole arrays. Legacy entries are replaced with current entries on install. Mixed Codex groups keep user handlers while owned handlers are removed.
- Changed files:
  - `src/infrastructure/storage/json-span-utils.ts`
  - `src/infrastructure/storage/json-document-editor.ts`
  - `src/infrastructure/harnesses/codex-cli/planner.ts`
  - `src/infrastructure/harnesses/cursor/planner.ts`
  - `src/infrastructure/harnesses/common/codex-hooks-updater.ts`
  - `src/infrastructure/harnesses/common/cursor-hooks-updater.ts`
  - `tests/fixtures/harnesses/codex-cli/legacy-hooks.json`
  - `tests/fixtures/harnesses/cursor/legacy-hooks.json`
  - `tests/integration/codex-cursor-user-hooks.test.ts`
  - `tests/integration/legacy-user-hooks.test.ts`
  - `tests/e2e/e2e-user-hook-preservation.test.ts`
- Checks:
  - `npm run lint` passed (0 errors, 0 warnings).
  - `npm run typecheck` passed (0 errors).
  - `npm run build` passed.
  - `npm test` passed (68 test files, 261 passed, 0 skipped).
  - `npm run coverage` passed (Statements 91.82%, Branches 83.25%, Functions 96.61%, Lines 91.82%).
  - `npm run schemas:check` passed.
  - `npm run dependencies:check` passed (3 runtime deps, 0 install scripts).
  - `npm run assets:check` passed.
  - `npm run package:smoke` passed.
  - QA-01 to QA-06: 0 hits for `any`, `@ts-ignore`, empty catches, forbidden imports, generic errors, and lines/functions size limits.
- Validated state: Node 24.19.0, npm 11.17.0, Windows 11 Pro NT 10.0.26200. Clean worktree outside tracked PRD changes.
- Open items: None for T25. Unblocks T28 and successor review of CR-01.
