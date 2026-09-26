# Stable execution context

Load in this exact order:

1. `tasks/prd-02.2-janela-de-contexto-do-claude-code/prd.md`
2. `tasks/prd-02.2-janela-de-contexto-do-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T05 — Documentation and overhead budgets

## Outcome

The README documents the bridge:

- the `--statusline-bridge` option and its local scope;
- the footer effect;
- the effect on zones with 1M models;
- the non-interactive limit;
- the PowerShell-only Windows limit.

`docs/telemetry-block.md` §5 lists the `statusline` ledger line. The `context_usage` capability text names the bridge. The p95 budgets hold: at most 50 ms added by the bridge, and at most 100 ms per hook with 200 `statusline` lines in the ledger. The user runs the manual acceptance script, and its result is recorded here.

## Dependencies and boundaries

- Depends on: T01, T02, T03, T04
- Unblocks: —
- In scope:
  - `README.md`;
  - `docs/telemetry-block.md`;
  - `capabilities.ts` impact text (DEC-12);
  - bridge and hook overhead cases in `tests/integration/runtime-overhead.test.ts` (DEC-13);
  - README assertions (TC-19);
  - the manual acceptance record.
- Out of scope: behavior changes; any finding from the manual script opens a correction, not a change here.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-09 | `prd.md#functional-requirements` | User documentation |
| NFR-01 | `prd.md#non-functional-requirements` | Performance budgets |
| OBJ-01, OBJ-04 | `prd.md#outcomes-and-metrics` | Real window and overhead |
| US-01, US-03 | `prd.md#stories-and-journeys` | 1M sessions and `/model` |
| DEC-12, DEC-13 | `techspec.md#technical-decisions` | Docs and measurement |
| CMP-14 | `techspec.md#components-and-flow` | Docs and capability |
| TC-19, TC-20 | `techspec.md#test-approach` | Tests |
| Manual acceptance | `techspec.md#test-approach` | Five-step script |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/tests.md` (exact agent-facing text), `node.md`.
- Existing code:
  - `tests/integration/runtime-overhead.test.ts:13-59, 80-98` — sampler, CI and local split, existing cases.
  - `src/infrastructure/diagnostics/p95.ts:1-8`.
  - `tests/unit/readme-config-example.test.ts`.
  - `src/infrastructure/harnesses/claude-code/capabilities.ts:8`.
- Contract or integration: `techspec.md#observability-and-rollout`.
- Harness reference: the Status line section written in T01.

## Work

- [x] T05.1 Update `README.md` with the Delegated Snapshot–style subsection for the bridge, covering the five points in the outcome; update `docs/telemetry-block.md` §5.
- [x] T05.2 Update the `context_usage` impact text in `capabilities.ts` and the tests that assert it.
- [x] T05.3 Add the TC-19 README assertions.
- [x] T05.4 Add the TC-20 overhead cases: bridge in `--pipe` mode against the user command alone (≤ 50 ms p95 difference in CI), and `PreToolUse`/`PostToolUse` with 200 `statusline` lines (≤ 100 ms).
- [x] T05.5 Hand the manual acceptance script to the user and record the result in the handoff.

## Acceptance criteria

- TC-19 asserts the documented strings for the flag, the local scope, the non-interactive limit, and the ledger line.
- TC-20 passes in CI on Linux, macOS, and Windows with the stated budgets.
- The manual script passes, or its failures are recorded as open items with evidence:
  - the status line looks unchanged;
  - `tokens=…/1000000` appears with a 1M model;
  - the window changes after `/model`;
  - `remove` restores the previous status line.

## Verification

- Unit: TC-19 in `tests/unit/readme-config-example.test.ts`; capability text tests.
- Integration: TC-20 in `tests/integration/runtime-overhead.test.ts` (process lane).
- End-to-end: not applicable beyond T04.
- Manual:
  - Script: `techspec.md#test-approach`, manual acceptance.
  - Expected result: the four checks above.
  - Owner: the user.
- Platforms: Linux, macOS, Windows (CI); manual on the user's machine.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run coverage`, `npm run package:smoke`.
- Environment dependency: Claude Code with a 1M model and an existing status line, for the manual script only.
- Expected evidence: test count, exit code, p95 values from TC-20, and the manual result.

## Affected files

- Modify:
  - `README.md`
  - `docs/telemetry-block.md`
  - `src/infrastructure/harnesses/claude-code/capabilities.ts`
  - `tests/integration/runtime-overhead.test.ts`
  - `tests/unit/readme-config-example.test.ts`
- Create: none.

## Observability and recovery

- Operational signal: none beyond T04.
- Recovery: documentation changes revert independently.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result:
  - `README.md`: new "Claude Code Status Line Bridge" subsection after Delegated Snapshot Mode, covering the flag and its local scope, the preserved status line and the footer-hints effect, zones on 1M models (`RED` above 650,000 tokens, `/model` after the next response), the non-interactive limit (`claude -p` and `context-brake run`), and the unverified PowerShell-only Windows case; the `contextWindowCeiling` paragraph links to it; the Claude support-table row and the `init` options row mention the bridge.
  - `docs/telemetry-block.md` §5: the `statusline` ledger line with an example and its read rules, the `StatusLine` error event, and the privacy scope of what the bridge stores.
  - `capabilities.ts`: the `context_usage` impact adds "The context window comes from the optional status line bridge." (`state` stays `unknown`).
  - TC-19 in `tests/unit/readme-config-example.test.ts`; TC-20 in the new `tests/integration/statusline-overhead.test.ts` (process lane).
- Changed files: `README.md`, `docs/telemetry-block.md`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `tests/unit/harness-adapters.test.ts` (expected impact text), `tests/unit/readme-config-example.test.ts`, `tests/integration/statusline-overhead.test.ts` (created instead of adding to `runtime-overhead.test.ts`, which already has 107 physical lines; same sampler rules: 3 warmups, 20 samples, CI difference against baseline, local `max(target, baseline*3 + 150)`), `tests/test-lanes.ts`.
- Checks: `npm run build`, `npm run typecheck`, and `npm run lint` exit 0; TC-19 and the doc suites (`readme-config-example`, `readme-support-table`, `harness-adapters`: 18 tests) pass; TC-20 (3 tests) passes. Full `npm run coverage -- --coverage.reportOnFailure` over the integrated T01–T05 state: exit 0, 260 of 260 files, 1,705 passed and 3 skipped, all files 95.31% statements / 90.68% branches. `npm run package:smoke` exit 0.
- TC-20 p95 on this machine (Windows 11, local rule): bridge in `--pipe` mode 147.2 ms against the user command alone at 119.5 ms (+27.7 ms, budget 50); `PreToolUse` 154.6 ms and `PostToolUse` 161.7 ms with 200 `statusline` lines against `node -e ''` at 74.6 and 67.1 ms (+80.0 and +94.6 ms, budget 100 under the CI rule). The hook margin is thin on this machine; CI numbers come from the pipeline.
- Quality profile over the task diff: QA-01 to QA-06 and QA-08 to QA-10 no hits; QA-07 only on the pre-existing lines 9 and 22 of `readme-config-example.test.ts`.
- Validated state: HEAD 5917593 plus the T01–T05 working-tree diff; Windows 11, Node 20+, Git Bash.
- Manual acceptance (owner: the user): PASSED, reported by the user on 25/09/2026 ("o teste funcionou") on Claude Code with a 1M model and an existing status line; no per-step detail was given. Script from `techspec.md#test-approach`, on Claude Code with a 1M model and an existing status line:
  1. Run `npx context-brake init --statusline-bridge --yes`.
  2. Start Claude Code and check that the status line looks the same.
  3. After one tool call, check that the block shows `tokens=…/1000000`.
  4. Run `/model` to a 200k model and check that the block shows `…/200000` after the next response.
  5. Run `npx context-brake remove --yes` (or `init --no-statusline-bridge --yes`) and check that the previous status line is back.
- Open items: none for this task; the review points are listed in the feature snapshot (O-02).

### ADR candidates

None - direct TechSpec implementation or local decision.
