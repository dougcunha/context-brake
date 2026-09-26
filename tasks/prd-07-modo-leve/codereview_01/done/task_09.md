# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T09 — Protocolo editado mantido: orientar a volta ao modo completo

## Outcome

When `init --light` keeps a modified protocol, the `LIGHT_MODE_ASSET_KEPT` finding explains how to return to full mode. Its remediation says to delete or move the file before `context-brake init --no-light`, because the file is no longer managed and `--no-light` would otherwise stop with `UNMANAGED_PROTOCOL_CONFLICT`.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope:
  - the `impact` and `remediation` text of `keptProtocolFinding` in `support-files.ts`;
  - the README sentence about switching to light mode, if needed;
  - test assertions.
- Out of scope, because each would change a TechSpec contract (DEC-08, "no protocol asset in light mode") or full-mode output (NFR-01):
  - keeping the protocol in the light-mode manifest;
  - changing `UNMANAGED_PROTOCOL_CONFLICT` or its generic remediation;
  - overwriting the user's edits.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/OI-01 | `codereview.md#Optional improvements` | A kept modified protocol makes `init --no-light` exit 2 with the remediation "Fix syntax or structure" |
| DEC-08 | `techspec.md#technical-decisions` | A modified protocol is kept and reported with `LIGHT_MODE_ASSET_KEPT` (warning) |
| DEC-CORR-01 | `workflow.md#Human Decisions Log` | The user included OI-01 in this round |

## Requirements

- The code (`LIGHT_MODE_ASSET_KEPT`), the severity (`warning`), the scope, and the path stay unchanged.
- The remediation names the file and says to delete or move it before `context-brake init --no-light`. It follows `cli-output.md`: it says what happened, which file, and how to fix it.
- Nothing changes in full or delegated mode.

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` (DEC-08), `#doctor---json` (finding codes).
- Rules and skills: `cli-output.md`, `file-changes.md`, `tests.md`.
- Code: `src/core/services/support-files.ts:56-63` `keptProtocolFinding`, and `README.md` `### Light Mode` (the "unless you edited it" sentence).
- Tests: `tests/integration/init-light-switch.test.ts:28-34`.

## Work

- [x] T09.1 Update `keptProtocolFinding`'s remediation, and its impact if needed, as the requirements say.
- [x] T09.2 In `init-light-switch.test.ts`, assert that the remediation mentions `--no-light` and the path.
- [x] T09.3 In the README, say in one clause that an edited protocol is kept and must be removed before `--no-light`.

## Acceptance criteria

- The `LIGHT_MODE_ASSET_KEPT` finding printed by `init --light` tells the user to delete or move `docs/context-brake-protocol.md` before `context-brake init --no-light`.
- After the user follows that remediation, `init --no-light --yes` exits 0 and recreates the managed protocol. Check it with the built CLI.
- No other finding or output changes.

## Verification

- Unit: not applicable.
- Integration: `init-light-switch.test.ts`, plus `readme-light-example.test.ts`, which must still pass.
- End-to-end: not applicable.
- Manual: the report's modified-protocol spot check with the built CLI. Follow the remediation, then run `--no-light`; the expected exit code is 0.
- Platforms: Windows locally; CI matrix.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (targeted), and `npm run coverage` at the end of the round.
- Expected evidence: test counts and the spot-check output.

## Affected files

- Modify: `src/core/services/support-files.ts`, `tests/integration/init-light-switch.test.ts`, `README.md`

## Observability and recovery

- Operational signal: the `LIGHT_MODE_ASSET_KEPT` finding in the `init` output.
- Recovery: revert the text change.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: the `LIGHT_MODE_ASSET_KEPT` remediation now reads: `Delete or move <path> before running context-brake init --no-light, because ContextBrake no longer manages it; keep it only if the project still needs it.` Code, severity, scope, path, message, and impact are unchanged. The README's switching paragraph says that an edited protocol stays unmanaged and must be removed before `--no-light`, or `--no-light` stops with `UNMANAGED_PROTOCOL_CONFLICT`.
- Changed files: `src/core/services/support-files.ts` (remediation text), `README.md` (one sentence), `tests/integration/init-light-switch.test.ts` (the modified-protocol case now asserts the path and remediation).
- Checks:
  - `npm run build`, `npm run typecheck`, and ESLint on the touched files pass.
  - `init-light-switch` and the README suites pass (4 files, 18 tests).
  - Built CLI spot check: after `init`, an edited protocol, and `init --light`, the finding shows the new remediation. After deleting the file as told, `init --no-light --yes` exits 0 and recreates the protocol.
  - Quality profile QA-01 to QA-03 have no hits.
- Validated state: worktree at `c3fb6a8` plus the feature diff and the T07–T09 corrections, with `dist/` rebuilt, on Windows 11 with Node 24.
- Open items: `UNMANAGED_PROTOCOL_CONFLICT` keeps its generic remediation ("Fix syntax or structure"). Changing it would alter full-mode output (NFR-01), so it stays out of scope.
