# Stable execution context

Load in this exact order:

1. `tasks/prd-11-reinicio-automatico-no-claude-code/prd.md`
2. `tasks/prd-11-reinicio-automatico-no-claude-code/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Documentation and manual acceptance

## Outcome

README, protocol document and research file describe the feature, and the manual acceptance script MA-01 has been run in a real session on Windows and one POSIX system.

## Dependencies and boundaries

- Depends on: T06
- Unblocks: —
- In scope: README section (what it does, how to switch on and off, per-mode gate, requirements and causes when mods are off), `docs/context-brake-protocol.md` note on automatic restart, final reconciliation of the research section, docs test, MA-01 run and record.
- Out of scope: code changes, except fixes MA-01 exposes (those return as corrections).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-11 | `prd.md#functional-requirements` | Docs and research |
| OBJ-01, OBJ-02 | `prd.md#outcomes-and-metrics` | Observed end to end |
| TC-26, TC-27 | `techspec.md#test-approach` | Docs test, MA-01 |
| CMP-10 | `techspec.md#components-and-flow` | Documentation files |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md` (English, labels), `code-standards.md` not applicable to prose.
- Existing code: `README.md` (init flags section, status line bridge section as a model), `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md#claude-code`.
- Contract or integration: `techspec.md#test-approach` (MA-01 script).
- Harness reference: the same research section.

## Work

- [x] T07.1 Write the README section and the protocol note; keep the protocol hash drift rules in mind (`context-brake init` manages a block; do not edit text between markers).
- [x] T07.2 Reconcile the research section with what T01 and the implementation verified (dates and versions).
- [x] T07.3 Write the docs test (TC-26).
- [x] T07.4 Run MA-01 on Windows PowerShell and one POSIX system, full and light mode, and record the results.

## Acceptance criteria

- Each of the three documents covers the topics that apply to it, with the check date and Claude Code version.
- MA-01 shows a notice, a cleared session, one seed, work continuing, and the counter reset after a typed prompt, in both modes.
- Any MA-01 failure is recorded as a finding for correction, not patched silently.

## Verification

- Unit: not applicable.
- Integration: TC-26.
- End-to-end: not applicable.
- Manual: MA-01 by the maintainer, results in the handoff.
- Platforms: Windows PowerShell and one POSIX system.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: interactive Claude Code >= 2.1.287 and scratch repositories (see `tasks.md`).
- Expected evidence: docs diff, test results, MA-01 record.

## Affected files

- Modify: `README.md`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md`
- Create: `tests/integration/docs-auto-restart.test.ts`

## Observability and recovery

- Operational signal: none.
- Recovery: documentation revert.

## Handoff

- Produced result: README section "Automatic Restart in Claude Code" (on/off flags, mechanism, per-mode gate, loop guards and kill switches, requirements with 2.1.287 minimum and check on 2.1.289 dated 4 October 2026, causes when mods are off, doctor codes, remove). Protocol note added to the generator `src/core/services/protocol-service.ts` (end of "Starting a new session"; `docs/context-brake-protocol.md` is generated and must equal `renderProtocol(DEFAULT_CONFIG)`, so it was regenerated; installed repositories get the new line on their next `init`). Research section: implementation check dated 05/10/2026 added to the mods loader bullet.
- Changed files: `README.md`, `src/core/services/protocol-service.ts`, `docs/context-brake-protocol.md`, `docs/research/harness-integrations.md`; created `tests/integration/docs-auto-restart.test.ts`.
- Checks: TC-26 3/3; protocol tests 21/21; lint and typecheck clean; build ok; full `npm run coverage`: 2033 passed, 2 failed, 3 skipped. Both failures are known and outside this feature: the `e2e-support-limitations` timeout (L-06) and the `boot-git-delivery` flake.
- Validated state: worktree on `c7529c5` plus T02-T07 diff; Windows 11.
- MA-01 partial record (2026-10-05, Windows, interactive Claude Code 2.1.289, light mode, repository TokenHound): session `84ab8be9` logged `RESTARTED` at 23:49:20Z; the new session `5e9b0d0c` shows `/clear` and then one prompt "Prompt from the context-brake-restart plugin" with the generic seed (no boot sentence, as DEC-14 requires); the maintainer saw it on screen and confirmed the work continued correctly after the seed. Observations: the `$.ui.log` notice of the old session leaves the screen with the clear, which is acceptable because the new session shows the plugin prompt; the counter reset in step 3 cannot be seen in `.context-brake/runtime/claude-mod/*.json` (the counter lives in `$.store`), so check it with a second signal and no typed prompt between restarts, which must log `PAUSED_LOOP_GUARD` after the limit; `doctor` reads the old session's file, because `session.start` does not fire after `/clear` (expected).
- MA-01 scope (DEC-MA-02, 2026-10-06): the full-mode run is waived by the human; it remains covered only by the automated tests. Still open: the loop guard check, a POSIX run, and the first-launch trust prompt.
- MA-01 close (DEC-MA-03, 2026-10-06): the first-launch folder trust prompt works. The loop guard check and the POSIX run are waived by the human, so the release gate "MA-01 passed on Windows and one POSIX system" (techspec.md#Observability and rollout) is not met; it goes to HIL 3 as an accepted gap.
- Resolved by DEC-MA-03: superseded open item T07.4 / MA-01 (TC-27), a manual run by the maintainer in interactive Claude Code on Windows PowerShell and one POSIX system, in full and light mode, including the first-launch folder trust prompt (DEC-AMEND-01, O-03).

### ADR candidates

None - direct TechSpec implementation or local decision.
