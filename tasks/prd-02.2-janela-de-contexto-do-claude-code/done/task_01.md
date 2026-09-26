# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`
2. `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Zones over the status line window

## Outcome

When a session ledger contains `statusline` lines, `PreToolUse` and `PostToolUse` compute the zone over the last recorded `windowTokens`. When the transcript measurement is missing, they use the bridge's `inputTokens` recorded after the last reset. Without `statusline` lines, every result equals PRD 2.1. The research document records the Claude Code status line contract, and a stdin fixture follows it.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T05
- In scope:
  - the Status line section of `docs/research/harness-integrations.md#claude-code` (DEC-12, first item);
  - fixture `tests/fixtures/harnesses/claude-code/statusline.json`, from the documented example;
  - `statuslineLineSchema` in `src/core/contracts/statusline-line.ts`, a member of the ledger union and `SessionLedger.appendStatuslineLine` (DEC-04);
  - `NodeSessionLedger.appendStatuslineLine`;
  - `summarizeStatusline` and `SessionSummary.statusline` (DEC-05);
  - the measurement merge in `readZone` (DEC-06).
- Out of scope: the bridge process (T02); install (T03); doctor (T04); README and telemetry docs (T05).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | Line shape for the five values |
| FR-04 | `prd.md#functional-requirements` | Window from the bridge, else ceiling |
| FR-05 | `prd.md#functional-requirements` | Bridge tokens as fallback |
| FR-06 | `prd.md#functional-requirements` | Window kept, usage dropped across resets |
| FR-09 | `prd.md#functional-requirements` | Research section |
| OBJ-03 | `prd.md#outcomes-and-metrics` | No regression without the bridge |
| DEC-04, DEC-05, DEC-06, DEC-12 | `techspec.md#technical-decisions` | Ledger line, summary, merge, research |
| CMP-04–CMP-07 | `techspec.md#components-and-flow` | Components |
| TC-01–TC-05 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/code-standards.md`, `tests.md`, `harness-adapters.md` (research before code).
- Existing code:
  - `src/core/services/session-zone.ts:14-25` — `readZone` and `isStale`.
  - `src/core/services/session-counters.ts:17-41` — `summarizeLedger` and the reset index.
  - `src/core/contracts/session-ledger.ts:21-26, 43-49` — schemas, union, interface.
  - `src/infrastructure/runtime/node-session-ledger.ts:57-60` — append.
- Contract or integration: `techspec.md#contracts-and-data` (ledger line).
- Harness reference: [Status line](https://code.claude.com/docs/en/statusline), facts listed in `techspec.md#sources-and-traceability`.

## Work

- [x] T01.1 Add the Status line section to `docs/research/harness-integrations.md#claude-code`, dated 25/09/2026, and create `tests/fixtures/harnesses/claude-code/statusline.json` from the documented stdin example.
- [x] T01.2 Create `src/core/contracts/statusline-line.ts` with the schema and input type; add the member to the union in `session-ledger.ts` and `appendStatuslineLine` to `SessionLedger`.
- [x] T01.3 Implement `appendStatuslineLine` in `NodeSessionLedger` and in every `SessionLedger` fake used by tests.
- [x] T01.4 Create `src/core/services/statusline-summary.ts`; `summarizeLedger` fills `SessionSummary.statusline`.
- [x] T01.5 Merge window and tokens in `readZone` before `resolveUsage`, applying `isStale` to both token sources.
- [x] T01.6 Write TC-01 to TC-05 and keep the PRD 2.1 suites green.

## Acceptance criteria

- A ledger with `windowTokens: 1000000` and transcript tokens 200,000 yields `usage=20%` and `tokens=200000/1000000` (TC-03).
- Without transcript tokens, bridge tokens recorded after the last reset give `source=measured`, and tokens recorded before it give `source=estimated` (TC-04).
- The window survives a reset; null values do not overwrite the last valid one (TC-02).
- Without `statusline` lines, `readZone` returns the same result as before for every existing test (TC-05); a Pi-reported window wins over the bridge's.
- An older parser skips the new line without error (TC-01).

## Verification

- Unit: TC-01 `tests/unit/statusline-line.test.ts`; TC-02 `tests/unit/statusline-summary.test.ts`; TC-03 and TC-04 `tests/unit/session-zone-statusline.test.ts`; TC-05 in `tests/unit/usage-resolver.test.ts` and `session-zone-statusline.test.ts`.
- Integration: existing `tests/integration/claude-transcript-usage.test.ts` and ledger tests stay green.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows (CI).
- Commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: test count and exit code; quality profile commands over the task diff, discounting the Terrain baseline.

## Affected files

- Modify:
  - `docs/research/harness-integrations.md`
  - `src/core/contracts/session-ledger.ts`
  - `src/core/services/session-counters.ts`
  - `src/core/services/session-zone.ts`
  - `src/infrastructure/runtime/node-session-ledger.ts`
  - ledger fakes in `tests/`
- Create:
  - `src/core/contracts/statusline-line.ts`
  - `src/core/services/statusline-summary.ts`
  - `tests/fixtures/harnesses/claude-code/statusline.json`
  - `tests/unit/statusline-line.test.ts`
  - `tests/unit/statusline-summary.test.ts`
  - `tests/unit/session-zone-statusline.test.ts`

## Observability and recovery

- Operational signal: the telemetry block's `tokens=<used>/<window>` shows the recorded window.
- Recovery: reverting the task removes the merge; old ledgers with `statusline` lines are ignored.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `statusline` ledger line (DEC-04), `summarizeStatusline` feeding `SessionSummary.statusline` (DEC-05), and the measurement merge in `readZone` (DEC-06). Window = harness window ?? last recorded `windowTokens` (kept across resets); tokens = non-stale transcript ?? non-stale bridge usage recorded after the last reset. `resolveUsage` unchanged. Research: Status line bullet in `docs/research/harness-integrations.md#claude-code`, rechecked against the vendor page on 25/09/2026; the page now lists extra triggers (permission mode, vim mode, `command` change, `refreshInterval`, rate-limit and cache expiry) and the `disableAllHooks`/`allowManagedHooksOnly` gates, recorded there.
- Changed files:
  - Created: `src/core/contracts/statusline-line.ts`, `src/core/services/statusline-summary.ts`, `tests/fixtures/harnesses/claude-code/statusline.json`, `tests/unit/statusline-line.test.ts` (TC-01), `tests/unit/statusline-summary.test.ts` (TC-02), `tests/unit/session-zone-statusline.test.ts` (TC-03, TC-04, TC-05), `tests/integration/runtime-statusline-ledger.test.ts` (NodeSessionLedger round-trip and schema rejection).
  - Modified: `docs/research/harness-integrations.md`, `src/core/contracts/session-ledger.ts`, `src/core/services/session-counters.ts`, `src/core/services/session-zone.ts`, `src/infrastructure/runtime/node-session-ledger.ts`, `tests/unit/usage-resolver.test.ts` (TC-05: `readZone` without statusline lines equals `resolveUsage`), and the `SessionLedger` fakes in `tests/helpers/delegated-fixtures.ts`, `tests/integration/node-ledger-watcher.test.ts`, and nine `tests/unit/*` files.
  - Outside the listed files, required by the interface: `src/infrastructure/runtime/in-process-host.ts` (`CachedSessionLedger` implements `SessionLedger`, so it gains a delegating `appendStatuslineLine`; 83 lines).
- Checks: `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run build` exit 0; `npm run coverage` exit 0 with 248 files, 1,623 passed and 3 skipped, all files 95.42% statements / 90.33% branches (`session-zone.ts` 100% lines). A first coverage run before `npm run build` failed in 3 files (`asset-bundler.test.ts` and asset-currency checks) because the bundled runtime assets were stale after the `src/core` change; rebuilding fixed it, with no tracked file regenerated.
- Quality profile over the task diff (23 TS files): QA-01 to QA-06, QA-08 to QA-10 no hits. QA-07 hits only on pre-existing test lines (`node-ledger-watcher.test.ts:72` was touched only to add the fake method). No reservation added.
- Validated state: HEAD 5917593 plus the working-tree diff above; Windows 11, Node 20+, Git Bash.
- Open items:
  - Behavior note for review: with a bridge window but no measured tokens (no transcript reading and no bridge usage after the reset), the reading is `estimated` over `contextWindowCeiling`, because DEC-06 keeps `resolveUsage` unchanged and it ignores the window on the estimated path. FR-04's acceptance only covers measured usage; flagging in case the reviewer reads FR-06 as requiring the recorded window on estimated readings too.
  - Research assumption kept: status line `session_id` equals the hooks' `session_id` (confirmed in T05 manual step 3).

### ADR candidates

None - direct TechSpec implementation or local decision.
