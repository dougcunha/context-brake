# Stable execution context

Load in this exact order:

1. `tasks/prd-22-claude-code-version-floor/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T02 — Cite TC-05 in its test and fix 2 wording gaps

## Outcome

The TC-05 test name cites `TC-05`; the research line names the DEC-03 edge; the T01 manual check names the real built entry point.

## Dependencies and boundaries

- Depends on: T01 (done)
- Unblocks: —
- In scope: one test name, one sentence in `docs/research/harness-integrations.md:69`, one path in `done/task_01.md` Verification.
- Out of scope: any behavior or assertion change.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#findings` | TC-05 test does not cite `TC-05` (`.agents/rules/tests.md`, Test Structure) |
| codereview_01 limitation (research text) | `codereview.md#limitations-and-open-items` | Line 69 omits that the warning stays when Claude Code is not detected (DEC-03) |
| codereview_01 limitation (task artifact) | `codereview.md#limitations-and-open-items` | `done/task_01.md` names `dist/cli/index.js`; the entry point is `dist/src/cli/main.js` |

## Requirements

- The `it` name at `tests/integration/linked-project-root-lifecycle.test.ts:48` contains `TC-05`.
- Line 69 says the warning stays when Claude Code is not detected (no version probe).
- Authorization: H-03 in `workflow.md`.

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` (DEC-03), `#test-approach` (TC-05).
- Rules: `.agents/rules/tests.md`.

## Work

- [x] T02.1 Add `(TC-05)` to the `it` name.
- [x] T02.2 Add the DEC-03 edge to line 69 of the research section.
- [x] T02.3 Replace `node dist/cli/index.js` with `node dist/src/cli/main.js` in `done/task_01.md`.

## Acceptance criteria

- `rg -n "TC-05" tests/integration/linked-project-root-lifecycle.test.ts` gives 1 line.
- The suite still passes with the same test count.

## Verification

- Integration: `npx vitest run tests/integration/linked-project-root-lifecycle.test.ts`.
- End-to-end: not applicable.
- Platforms: Windows locally.
- Environment dependency: none.
- Commands: `npm run lint`.
- Expected evidence: rg line, test count, lint clean.

## Affected files

- Modify: `tests/integration/linked-project-root-lifecycle.test.ts`, `docs/research/harness-integrations.md`, `tasks/prd-22-claude-code-version-floor/done/task_01.md`.

## Observability and recovery

- Recovery: revert the 3 lines.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the TC-05 `it` name ends with `(TC-05)`; research line 69 says the warning stays when Claude Code is not detected (no version probe, DEC-03); `done/task_01.md` Verification names `node dist/src/cli/main.js`.
- Changed files: `tests/integration/linked-project-root-lifecycle.test.ts`, `docs/research/harness-integrations.md`, `tasks/prd-22-claude-code-version-floor/done/task_01.md`.
- Checks: `rg -n "TC-05" tests/integration/linked-project-root-lifecycle.test.ts` gives 1 line (48); `npx vitest run tests/integration/linked-project-root-lifecycle.test.ts` 1 passed (same count as before); `npm run lint` clean. No production code changed, so the earlier typecheck and coverage evidence stays valid.
- Validated state: worktree on base 419c0bd with the T01 and T02 diff; Windows 11, Node 24.20.0.
- Open items: none.
