# Stable execution context

Load in this exact order:

1. `tasks/prd-01-instalacao-deteccao-diagnostico/codereview_08/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward.

---

# T29: Preserve trailing JSONC comments through hook installation and removal

## Outcome

Installing and removing ContextBrake from Codex CLI or Cursor restores every byte of the original user hook arrays, including comments after the final user item, while repeated installation remains idempotent.

## Dependencies and boundaries

- Depends on: historical T25 in `codereview_07/done/task_25.md`; do not modify or move it.
- Unblocks: T35.
- In scope: JSONC array insertion/removal trivia ownership, focused unit coverage, all three registered events for Codex CLI and Cursor, and the existing built-CLI preservation regression.
- Out of scope: replacing `jsonc-parser`, reformatting complete documents, other harness registration formats, and unrelated JSON property edits.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| `codereview_08/CR-01` | `codereview.md#findings` | Removing an appended owned entry deletes the trailing comment that originally followed the last user item. |
| PRD-01 | RF6, RF19, CA-05, CA-07, CA-12 | Preserve user configuration and remove only owned content. |
| PRD-01 TechSpec | UT-19 and `FileChange` | Token-span edits preserve trivia and bytes outside the owned edit. |
| `codereview_07/done/task_25.md` | Acceptance criteria | The prior correction is incomplete and remains immutable history. |

## Requirements

- When appending to a non-empty JSONC array, preserve trailing line or block comments as trivia belonging to the existing item. Insert any required comma before that trivia without moving the comment onto the ContextBrake line.
- Removing the appended ContextBrake item must reproduce the original document byte-for-byte. Cover LF, CRLF, final-newline, and no-final-newline inputs.
- Preserve valid comma placement for compact and multiline arrays, with and without existing comments.
- Exercise `PreToolUse`, `PostToolUse`, and `SessionStart` for Codex CLI and `preToolUse`, `postToolUse`, and `sessionStart` for Cursor. Every event starts with a user entry and trailing comment.
- Three consecutive installations produce the same bytes as the first installation. Removal after any of those runs restores the original bytes and retains every user hook.
- Do not weaken owned-entry matching or broaden the removal span to comments that predate the owned entry.

## Context to recover on demand

- TechSpec: `FileChange`, UT-19, IT-01, IT-02, and IT-09.
- Rules and skills: `file-changes.md`, `harness-adapters.md`, `tests.md`, `code-standards.md`, `javascript-typescript.md`, `node.md`, `antislop`, and `antislop-code` if comments are added.
- Code: `src/infrastructure/storage/json-span-utils.ts:28-80` - shared insertion and removal spans.
- Code: `src/infrastructure/storage/json-document-editor.ts:27-58` - array-item API used by both updaters.
- Code: `src/infrastructure/harnesses/common/codex-hooks-updater.ts:updateCodexHooks` - Codex caller and event set.
- Code: `src/infrastructure/harnesses/common/cursor-hooks-updater.ts:updateCursorHooks` - Cursor caller and event set.

## Work

- [ ] T29.1 Add failing pure span/editor tests for final-item `//` and `/* ... */` comments across compact, LF, CRLF, and missing-final-newline documents.
- [ ] T29.2 Correct array insertion/removal trivia handling without changing public editor APIs or unrelated property behavior.
- [ ] T29.3 Extend the Codex/Cursor integration test so all six registered events use distinct user hooks and trailing comments, and compare the final removed document with the exact initial bytes.
- [ ] T29.4 Keep the built-CLI preservation scenario as a regression and run the completion gates and applicable TechSpec quality profile.

## Acceptance criteria

- The focused probe from CR-01 returns `commentAfterInstall=true`, `commentAfterRemove=true`, and `userAfterRemove=true` for Codex CLI and Cursor.
- For every registered event, `afterRemove === initial` as a string, not only by parsed-value or substring comparison.
- Install run two and run three are byte-identical to run one.
- Existing minified JSON, legacy-hook cleanup, symlinked configuration, and malformed-document tests remain green.

## Verification

- Unit: `json-span-safety.test.ts` and `json-document-editor.test.ts` cover comment/comma/EOL combinations and exact round trips.
- Integration: `codex-cursor-user-hooks.test.ts` covers every registered event and exact initial/final bytes.
- End-to-end: rerun `e2e-user-hook-preservation.test.ts` against the built CLI with trailing-comment fixtures.
- Manual: none.
- Platforms: local platform during implementation; T35 supplies Ubuntu, macOS, and Windows completion evidence.
- Environment dependency: none.
- Commands: `npm run build`, focused Vitest files, `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`.
- Expected evidence: failing-then-passing regression, exact byte comparisons, zero new quality-profile hits, and green gates.

## Affected files

- Modify: `src/infrastructure/storage/json-span-utils.ts`.
- Modify if the public helper needs a narrowly justified adjustment: `src/infrastructure/storage/json-document-editor.ts`.
- Modify: `tests/unit/json-span-safety.test.ts`, `tests/unit/json-document-editor.test.ts`, `tests/integration/codex-cursor-user-hooks.test.ts`, `tests/e2e/e2e-user-hook-preservation.test.ts`.

## Observability and recovery

- Operational signal: install/remove previews still list only owned hook changes; no new CLI output is required.
- Recovery: revert T29. The preconditioned change engine continues to protect whole-file concurrency, but the CR-01 comment-loss defect returns.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: Implemented CR-01. `insertIntoContainer` now splits the pre-close gap into trivia (comments and interior whitespace) and the closing whitespace, adds the separator comma before the trivia, and emits the owned item after the trivia so it stays attached to the existing last item. `removeNodeSpan` now locates the inserted comma by scanning the region between the previous sibling and the owned node, skipping `//` and `/* */` comments, and removes only that comma plus the owned node. Result: `afterRemove === initial` byte-for-byte for LF, CRLF, final/no-final newline, compact and multiline containers, with and without trailing comments; three installs are byte-identical; all six registered events (Codex `PreToolUse`/`PostToolUse`/`SessionStart`, Cursor `preToolUse`/`postToolUse`/`sessionStart`) carry a distinct user entry plus a trailing comment.
- Changed files: `src/infrastructure/storage/json-span-utils.ts`; `tests/unit/json-span-safety.test.ts`; `tests/unit/json-document-editor.test.ts`; `tests/integration/codex-cursor-user-hooks.test.ts`; `tests/e2e/e2e-user-hook-preservation.test.ts`; new `tests/fixtures/harnesses/codex-cli/user-hooks-trailing.json` and `tests/fixtures/harnesses/cursor/user-hooks-trailing.json`. `src/infrastructure/storage/json-document-editor.ts` is unchanged; its public API, `jsonc-parser`, unrelated property behavior, and whole-document formatting are untouched.
- Checks: failing-then-passing regression confirmed (before the fix: 6 failures across the two unit files; after: all green).
  - `npm run build`: passed.
  - Focused `vitest` (`json-span-safety`, `json-document-editor`, `codex-cursor-user-hooks`, `e2e-user-hook-preservation`): 4 files, 26 passed.
  - `npm run lint`: passed (0 errors); `npm run typecheck`: passed.
  - `npm test`: 74 files, 283 passed, 1 skipped (POSIX-only shell test on Windows).
  - `npm run coverage`: passed, 91.96% statements / 84.33% branches / 95.91% functions / 91.96% lines.
  - QA-01..QA-06 `rg` scans over the five changed TypeScript files: 0 hits each; `json-span-utils.ts` is 99 physical lines (<=100) and all functions <=30 lines.
  - CR-01 probe over the built modules: `codex: commentAfterInstall=true commentAfterRemove=true userAfterRemove=true exactRoundTrip=true`; `cursor: commentAfterInstall=true commentAfterRemove=true userAfterRemove=true exactRoundTrip=true`.
- Validated state: Windows 11 Pro, PowerShell 7, Node v24.19.0, npm 11.17.0. Code state: uncommitted worktree over `2a26a3e` with `dist/` rebuilt from this change; only the files above are modified/added, and no report or other task file was touched.
- Open items: None. Trailing-comma inputs (for example `[1,]`) are rejected by `parseAndValidateJson` as invalid documents, so there is no removal path for them. Cross-platform completion evidence remains with T35.
