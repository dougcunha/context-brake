# Stable execution context

Load in this exact order:

1. `tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/qa_01/qa.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T23 — Per-harness restart lines name their harness in text output

## Outcome

`init --auto-restart` and `doctor` text output name the harness on each `AUTO_RESTART_MODE` and semi-automatic `AUTO_RESTART_READY` line, for example `Restart is semi-automatic on codex-cli.`, so the per-harness report reads without `--json`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: re-review `codereview_08`, QA `qa_02`
- In scope: the two message strings in `src/core/services/restart-install-extras.ts` and `src/core/services/restart-doctor-findings.ts`, using the harness id (the value `--harness` accepts); tests that assert them.
- Out of scope: `renderFinding` and other findings' wording.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| qa_01/BUG-01 | `qa.md#findings` | `AUTO_RESTART_MODE` and `AUTO_RESTART_READY` text lines say "on this harness" without naming it |

## Requirements

- PRD User experience: `init --auto-restart` reports the restart mode for each active harness; `doctor` shows the restart state per harness.
- `cli-output.md`: the text output carries the same findings as `--json`.

## Work

- [x] T23.1 Replace "on this harness" with "on <harness id>" in both messages.
- [x] T23.2 Update the assertions in `init-auto-restart.test.ts` and any other suite that pins these messages.

## Acceptance criteria

- `init --auto-restart` text with Pi and Codex prints `Restart is automatic on pi.` and `Restart is semi-automatic on codex-cli.`; doctor's semi-automatic ready line names its harness.

## Verification

- Integration: `tests/integration/init-auto-restart.test.ts`, doctor suites that pin `AUTO_RESTART_READY`.
- End-to-end: QA scenario `init-all` rerun by `qa_02`.
- Commands: `npx vitest run` over the touched suites; `npm run lint`; `npm run typecheck`; `npm run schemas:check`.

## Affected files

- Modify: `src/core/services/restart-install-extras.ts`, `src/core/services/restart-doctor-findings.ts`, tests that pin the messages

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `AUTO_RESTART_MODE` now reads `Restart is <mode> on <harness id>.` and the semi-automatic `AUTO_RESTART_READY` reads `Semi-automatic restart is ready on <harness id>.`, so each text line names its harness; JSON keeps the `harness` field.
- Changed files: src/core/services/restart-install-extras.ts; src/core/services/restart-doctor-findings.ts; tests/integration/init-auto-restart.test.ts (mode messages for pi and codex-cli); tests/integration/doctor-remove-restart.test.ts (ready message for codex-cli).
- Checks: the updated assertions pin the new text (the old strings fail them); init-auto-restart, doctor-remove-restart, auto-restart-doctor: 3 files, 19 tests green. `npx eslint` over the four files, `npm run typecheck`, and `npm run schemas:check` exit 0.
- Validated state: worktree on a31e183 plus the feature diff and T10-T23; Windows 11, Node 24.
- Open items: the QA scenario `init-all` is rerun by `qa_02`. The harness id is used rather than a display name because core has no shared label map.
