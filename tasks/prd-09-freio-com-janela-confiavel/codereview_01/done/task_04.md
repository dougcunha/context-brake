# Stable execution context

Load in this exact order:

1. `tasks/prd-09-freio-com-janela-confiavel/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T04 — User-facing text and the failure-policy rule match the trusted-window brake

## Outcome

The README and the Claude Code `context_usage` impact printed by `doctor` say the status line bridge is installed by default and that without it the brake only warns; `.agents/rules/harness-adapters.md#failure-policy` says an internal failure at the critical ceiling denies only when the last recorded reading has a trusted window.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope: `README.md:71`, `src/infrastructure/harnesses/claude-code/capabilities.ts:8`, its pinned text in `tests/unit/harness-adapters.test.ts:13`, and `.agents/rules/harness-adapters.md:33` (written through `.agents/`; `.claude` is a symlink to it).
- Out of scope: other README sections, the protocol generator, other rules.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-02 | `codereview.md#findings` | `README.md:71` and `claude-code/capabilities.ts:8` still call the bridge optional (FR-04, FR-08) |
| DEC-HIL-02 | `workflow.md#milestone-history` | Failure-policy rule text still says an internal failure at the critical ceiling always denies (`codereview.md#limitations-and-open-items`; FR-03) |

## Requirements

- Both user-facing texts say the context window comes from the status line bridge that `init` installs by default, and that without it the brake only warns.
- The failure-policy bullet says: at or above the critical ceiling, an internal failure denies the call only when the last recorded reading has a harness-reported or declared window and the harness supports failing closed; with the `contextWindowCeiling` fallback the call proceeds; the allowed plan, checkpoint, validation, and git commands stay as they are.
- The capabilities test pins the new text exactly.

## Context to recover on demand

- PRD: `prd.md` FR-03, FR-04, FR-08
- Rules and skills: `code-standards.md`, `tests.md`, `harness-adapters.md`
- Code: `src/infrastructure/harnesses/claude-code/capabilities.ts`; `tests/unit/harness-adapters.test.ts`

## Work

- [x] T04.1 Reword `README.md:71` and `capabilities.ts:8`; update the pinned text in `tests/unit/harness-adapters.test.ts`.
- [x] T04.2 Reword `.agents/rules/harness-adapters.md#failure-policy` per FR-03.

## Acceptance criteria

- `rg -n "optional status line bridge"` over `README.md`, `src/`, `tests/`, and `docs/` returns no hits.
- The failure-policy rule states the trusted-window condition of FR-03.
- `tests/unit/harness-adapters.test.ts` passes with the new text; build, typecheck, lint, and the full suite with coverage pass.

## Verification

- Unit: `tests/unit/harness-adapters.test.ts`.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Windows locally; Linux and macOS through CI when committed.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run coverage`
- Expected evidence: zero hits for the stale phrase; suite green.

## Affected files

- Modify: `README.md`
- Modify: `src/infrastructure/harnesses/claude-code/capabilities.ts`
- Modify: `tests/unit/harness-adapters.test.ts`
- Modify: `.agents/rules/harness-adapters.md`

## Observability and recovery

- Operational signal: `doctor` prints the new `context_usage` impact for Claude Code.
- Recovery: revert the text.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `README.md:71` (Claude Code row of the support table) and `claude-code/capabilities.ts:8` (the `context_usage` impact that `doctor` and `init` print) now say the context window comes from the status line bridge, which `init` installs by default, and that without it the brake only warns. `.agents/rules/harness-adapters.md#failure-policy` now says that at or above the critical ceiling an internal failure denies only when the last recorded reading has a trusted context window (harness-reported or declared) and the harness supports failing closed, that with the `contextWindowCeiling` fallback the call proceeds, and that the plan, checkpoint, validation, and git commands stay allowed when it denies (FR-03, `DEC-HIL-02`).
- Changed files: `README.md`, `src/infrastructure/harnesses/claude-code/capabilities.ts`, `tests/unit/harness-adapters.test.ts` (pinned text), `.agents/rules/harness-adapters.md` (written through `.agents/`; `.claude` links to it). The rule file was outside the `codereview_01` reviewable set; `codereview_02` covers it.
- Checks (Windows 11, Node 24, base `e0a9604` plus the feature diff, T03, and T04): `rg -n "optional status line bridge" README.md src tests docs` no hits; `npm run build` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run coverage` exit 0: 298 files, 1,874 passed, 3 skipped, 95.65% lines, 91.56% branches; `tests/unit/harness-adapters.test.ts` 8 passed. This run also passed `tests/e2e/e2e-support-limitations.test.ts` (2 tests, 21.4 s), which closes the T03 open item.
- Quality profile over the two touched TypeScript files: QA-01, QA-02, QA-05 zero hits; 10 and 61 lines.
- Validated state: working tree at `e0a9604` plus the feature diff, T03, and T04; Windows only; Linux and macOS through CI.
- Open items: none.
