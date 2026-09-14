# T07 — Make the JSON editor safe for single-line harness configs and isolate editor failures

## Outcome

`init` correctly updates valid single-line (minified) harness JSON for Claude Code, Cursor, Codex CLI, and Antigravity CLI while preserving every byte outside the owned entry, and any editor failure is reported as an isolated `INVALID_HARNESS_CONFIG` conflict for that harness instead of aborting the command with `UNEXPECTED_ERROR`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: insertion fix in `src/infrastructure/storage/json-span-utils.ts`; exception isolation in the JSON-editing planners; single-line and malformed fixtures; unit, integration, and E2E coverage for the corrected behavior.
- Out of scope: redesigning `json-document-editor` beyond insertion; changing vendor event schemas, capability tables, or support levels; harness research updates.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | RF6 and RF7 non-conformant: valid minified harness JSON is corrupted by `insertObjectEntry`, the following `setJsonProperty` throws `InvalidJsonDocumentError`, and the exception escapes as `UNEXPECTED_ERROR`; `file-changes.md` byte-preservation violated |

## Requirements

- `setJsonProperty` and `appendJsonArrayItem` must produce valid, parseable JSON for both multi-line and single-line documents, inserting relative to the parent node's closing token and preserving unrelated bytes, key order, indentation, line endings, comments where allowed, and final-newline state (`file-changes.md`, TechSpec "Surgical editing, not parse/stringify").
- A harness document that ContextBrake must edit but cannot parse or edit must be left untouched and reported as `INVALID_HARNESS_CONFIG` with the file path and error detail, while the remaining harnesses are still planned and applied (RF7, CA-06).
- No editor exception may reach the CLI error envelope as `UNEXPECTED_ERROR`; `task_2` handoff and TechSpec "Key Decisions" require per-file isolation.

## Context to recover on demand

- TechSpec: `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` — "FileChange", "ChangePlan", "Key Decisions" (surgical editing, per-file atomicity), "Known Risks" (`jsonc-parser` edit edge cases).
- Rules and skills: `file-changes.md`, `harness-adapters.md`, `javascript-typescript.md`, `code-standards.md`, `tests.md`; `sdd-execute-corrections`.
- Code: `src/infrastructure/storage/json-span-utils.ts` (`insertObjectEntry`, `insertArrayItem`) — root cause; `src/infrastructure/storage/json-validator.ts` (`parseAndValidateJson`) — throw site; `src/infrastructure/harnesses/claude-code/planner.ts`, `cursor/planner.ts`, `codex-cli/planner.ts`, `antigravity-cli/planner.ts` — unguarded edit calls.

## Work

- [x] T07.1 Add a failing unit test: `setJsonProperty('{"hooks":{"UserHook":"node custom.js"}}', ['hooks','PreToolUse'], group)` returns parseable JSON containing both `UserHook` and `PreToolUse`.
- [x] T07.2 Fix `insertObjectEntry` and `insertArrayItem` to insert immediately before the parent node's closing token based on `parentNode.offset + parentNode.length`, independent of trailing newline or line length, so no byte is emitted after the root object.
- [x] T07.3 Guard the JSON edits in the four planners so `InvalidJsonDocumentError` (and any editor exception) becomes a per-harness `INVALID_HARNESS_CONFIG` conflict; keep valid-document planning unchanged.
- [x] T07.4 Add fixtures and assertions for minified `.claude/settings.json`, `.cursor/hooks.json`, `.codex/hooks.json`, and `.agents/hooks.json` (each with an existing user entry), plus a malformed variant that must yield a conflict and not block peers; assert unchanged bytes outside the owned span.
- [x] T07.5 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, and `npm run build`; confirm all gates stay green.

## Acceptance criteria

- On a repository whose `.claude/settings.json` is exactly `{"hooks":{"UserHook":"node custom.js"}}`, `context-brake init --yes` exits 0, keeps `UserHook`, adds exactly one ContextBrake entry, and a second run is byte-idempotent.
- Equivalent minified fixtures for Cursor, Codex CLI, and Antigravity CLI install correctly, or produce an `INVALID_HARNESS_CONFIG` conflict for that file while the other detected harnesses still install.
- No input reaches `UNEXPECTED_ERROR` through the JSON editor; each failure is diagnosable by path and detail.
- The existing multi-line/trivia guarantees (UT-19) still hold.

## Verification

- Unit: `tests/unit/json-document-editor.test.ts` — minified insert/replace, empty object, multi-line trivia, CRLF, and malformed-document throw.
- Integration: per-adapter tests using minified fixtures that assert the user entry survives, exactly one ContextBrake entry exists, and an invalid file yields a conflict without affecting a second harness (extends IT-01/IT-04/IT-15).
- End-to-end: built CLI against a minified-config fixture; re-run E2E-01, E2E-04 (idempotency), and E2E-05 (partial installation) per the `AGENTS.md` CLI policy, plus a new minified-config scenario.
- Manual: not applicable.
- Platforms: Windows PowerShell and Git Bash executed locally; Linux and macOS through `.github/workflows/ci.yml`.
- Environment dependency: none.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`, `npm run build`, `npm run package:smoke`.
- Expected evidence: new failing-then-passing tests, conflict findings with path/detail, green coverage at or above the 80% thresholds.

## Affected files

- Modify: `src/infrastructure/storage/json-span-utils.ts`, `src/infrastructure/harnesses/claude-code/planner.ts`, `src/infrastructure/harnesses/cursor/planner.ts`, `src/infrastructure/harnesses/codex-cli/planner.ts`, `src/infrastructure/harnesses/antigravity-cli/planner.ts`, `tests/unit/json-document-editor.test.ts`, `tests/integration/claude-preservation.test.ts`, `tests/integration/multi-harness-install.test.ts`
- Create: `tests/fixtures/harnesses/<harness>/minified-*.json`, `tests/integration/minified-config.test.ts`

## Observability and recovery

- Operational signal: `INVALID_HARNESS_CONFIG` finding with `path` and parse detail; install report status `errors` with `exitCode 2` only when a real conflict remains.
- Recovery: file edits are planned before writing and applied atomically; a rejected file is left unchanged.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `insertObjectEntry`/`insertArrayItem` now insert before the container's closing token (`container.offset + container.length - 1`), choose the structural comma only when it is the first non-whitespace character of the gap (so a comma inside a `//` or `/* */` comment is ignored), and stay minified for documents without newlines (`formatJsonValue` receives an empty indent and no separator is emitted). `detectIndent` now returns an empty string when no indentation exists, so unindented multi-line documents no longer drift on re-plan. `removeNodeSpan` removes an adjacent comma so removing from single-line containers stays valid. The four JSON-editing planners (`claude-code`, `cursor`, `codex-cli`, `antigravity-cli`) wrap edits so any editor exception becomes an isolated `INVALID_HARNESS_CONFIG` conflict.
- Changed files: `src/infrastructure/storage/json-span-utils.ts`; `src/infrastructure/storage/json-document-editor.ts`; `src/infrastructure/harnesses/claude-code/planner.ts`; `src/infrastructure/harnesses/cursor/planner.ts`; `src/infrastructure/harnesses/codex-cli/planner.ts`; `src/infrastructure/harnesses/antigravity-cli/planner.ts`; `tests/unit/json-document-editor.test.ts`; created `tests/unit/json-span-safety.test.ts`, `tests/integration/minified-config.test.ts`, `tests/e2e/e2e-minified-config.test.ts`, and minified fixtures under `tests/fixtures/harnesses/{claude-code,cursor,codex-cli,antigravity-cli}/`.
- Checks: reviewer correction round addressed F1 (minified re-plan idempotency), F2 (comma inside a JSONC comment), and F3 (unindented multi-line nested insert drift); `removeNodeSpan` safety added. `npm run build` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0; focused suites 21 passed; `npm run coverage` 53 files / 182 tests passed, coverage 91.04% statements, 81.08% branches, 96.05% functions, 91.04% lines (all ≥ 80%). Independent planner repro: four consecutive plans byte-identical; block-comment config stays valid JSONC and still registers `PreToolUse`.
- Validated state: worktree after the T07 correction rounds (built into `dist/`), `package-lock.json` unchanged, Windows win32, Node v24.19.0, npm 11.17.0, PowerShell 7 and Git Bash. Linux/macOS deferred to CI.
- Open items: the pre-existing `removeNodeSpan` single-line corruption noted by the reviewer is corrected here; no other open item. CR-03 README wording belongs to T09.
