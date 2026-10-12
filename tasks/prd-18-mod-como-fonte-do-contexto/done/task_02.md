# Stable execution context

Load in this exact order:

1. `tasks/prd-18-mod-como-fonte-do-contexto/prd.md`
2. `tasks/prd-18-mod-como-fonte-do-contexto/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Publish and use the mod's context reading

## Outcome

With the mod loaded (installed by hand or by the existing `init --auto-restart`), every tool call and turn end publishes a validated reading file, and the `PostToolUse` hook returns `measured` from the fresher of the transcript and that file, with the real window. Nothing changes for installs without the file.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03
- In scope: CMP-01, CMP-02, CMP-03 and their tests; the event choice and the file path as T01 confirmed them.
- Out of scope: `init`, `doctor`, `remove`, the assistant, the bridge, and any change to `src/core/services/session-zone.ts`.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, FR-09 | `prd.md#functional-requirements` | Publish, select, survive failure |
| NFR-01 to NFR-05 | `prd.md#non-functional-requirements` | Validation, privacy, bundle, failure policy, platforms |
| DEC-01 to DEC-04, DEC-10 | `techspec.md#technical-decisions` | Carrier, schema, selection, events, bundle |
| CMP-01 to CMP-03 | `techspec.md#components-and-flow` | New and modified components |
| TC-01 to TC-04, TC-11 to TC-14 | `techspec.md#test-approach` | Scenarios |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`, `harness-adapters.md`.
- Existing code: `mod/hooks.ts`, `mod/register.ts`, `mod/host.ts`, `mod/mod-log.ts` (path style, `$.fs.write` without mkdir); `claude-code/runtime.ts:mapClaudeInput`; `core/services/session-zone.ts:mergeMeasurements` (read only); `tests/integration/claude-mod-bundle.test.ts`; `tests/helpers/in-process-hook.ts`.
- Contract or integration: `techspec.md#contracts-and-data`.
- Harness reference: `docs/research/harness-integrations.md`, Claude Code section, including what T01 added.

## Work

- [x] T02.1 Add `context-reading.ts` to `src/core/contracts/` with the strict schema, the directory name, and the session id check (`^[A-Za-z0-9_-]{1,128}$`).
- [x] T02.2 Add `session.usage` to `ModHost`, write `mod/context-reading.ts` (read `usage()`, skip unchanged, write, report failures) and wire `session.start`, `turn.start`, `tool.call`, and `turn.complete` in `hooks.ts` and `register.ts`, each inside `try/catch` and always returning `next(e)`.
- [x] T02.3 Add `claude-code/mod-reading.ts` (validated read, `freshestMeasured`) and use it in `mapClaudeInput`; keep `runtime.ts` within 100 lines.
- [x] T02.4 Tests TC-01 to TC-04 and TC-11 to TC-14; keep the telemetry block text tests green.
- [x] T02.5 Bump `MOD_VERSION` with the package version rule in `mod-info.ts`; run the bundle test and the quality greps of the TechSpec.

## Acceptance criteria

- A fake host that returns `{ tokens: 54452, window: 1000000, percent: 5 }` produces one file with exactly the schema fields; a second identical call writes nothing; a null token value is written as null.
- A rejecting `usage()` or a missing window writes nothing and does not throw.
- The reader returns `null` for a missing, truncated, wrong-version, or extra-field file.
- With a reading fresher than the transcript, the hook output block shows `window=harness` and the reading's tokens; with an older one, the transcript's tokens and the reading's window.
- `tests/integration/claude-mod-bundle.test.ts` still passes.

## Verification

- Unit: TC-01, TC-02, TC-03, TC-11, TC-12 as in the TechSpec.
- Integration: TC-04, TC-13, TC-14 with the in-process hook helper and a reading file in a temporary directory.
- End-to-end: not applicable (the existing smoke set stays green).
- Manual: none.
- Platforms: Linux, macOS, Windows through CI; local run on Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run test:budget`
- Environment dependency: none.
- Expected evidence: passing tests with the new files covered above 80%, and empty output from the blocking greps.

## Affected files

- Modify: `src/infrastructure/harnesses/claude-code/runtime.ts`, `mod/hooks.ts`, `mod/register.ts`, `mod/host.ts`, `mod/mod-info.ts`
- Create: `src/core/contracts/context-reading.ts`, `src/infrastructure/harnesses/claude-code/mod-reading.ts`, `mod/context-reading.ts`, `tests/integration/claude-mod-reading.test.ts`, `tests/unit/freshest-measured.test.ts`, `tests/integration/claude-hook-mod-reading.test.ts`, `tests/unit/context-reading-schema.test.ts`, `tests/integration/claude-hook-mod-reading.test.ts`

## Observability and recovery

- Operational signal: `ERROR_INTERNAL` in the mod log when a publish fails.
- Recovery: remove the reading directory; the hook falls back to the transcript and the bridge.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the mod publishes the context reading (`.context-brake/runtime/context-readings/claude-code/<sessionId>.json`) on `session.start`, `turn.start`, `tool.call`, and `turn.complete`, skipping an unchanged `(tokens, window)` by comparing with the file already written; the `PostToolUse` hook picks the fresher of the transcript and the reading, takes the window from the reading, and falls back to the bridge and the estimate unchanged. Verified on a real `claude -p` session (2.1.296) with the built bundle: `claude plugin validate` passed and the file held `windowTokens` 1000000, `inputTokens` 35235, `usedPercentage` 4 for that throwaway session.
- Changed files: created `src/core/contracts/context-reading.ts`, `src/infrastructure/harnesses/claude-code/mod/context-reading.ts`, `mod-reading.ts`, `project-root.ts`; modified `mod/host.ts` (`session.usage`), `mod/register.ts`, `runtime.ts` (90 lines; project root and measured selection extracted), `tests/fixtures/claude-mod-host.ts`; tests `tests/unit/context-reading-schema.test.ts`, `tests/unit/freshest-measured.test.ts`, `tests/integration/claude-mod-reading.test.ts`, `tests/integration/claude-hook-mod-reading.test.ts`; `docs/research/harness-integrations.md` (validator rule on `$`).
- Checks: `npm run lint` and `npm run typecheck` clean; `npm run coverage` 246 files, 1229 tests passed, overall 95.86% lines, new files 100%; `npm run test:budget` 104.8 s; blocking greps of the quality profile empty on the diff; `tests/integration/claude-mod-bundle.test.ts` passes; real-session run as above.
- Validated state: base commit `63fd5cb` plus the uncommitted T02 diff; Windows; no commit made (none requested).
- Open items: `MOD_VERSION` stays `1.0.0` because the bundle test ties it to the package version; the bump ships with the release (TechSpec rollout). The first real build of the mod failed `claude plugin validate` because the publisher was a closure; the fix is the top-level function, and no automated test runs the validator (it needs the `claude` binary), so the rule is recorded in the research file. The hook reads the reading file for every `PostToolUse` of the main thread; subagent hooks are skipped as before.

### ADR candidates

None - direct TechSpec implementation or local decision.
