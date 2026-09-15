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

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.
