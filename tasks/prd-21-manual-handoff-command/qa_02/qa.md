# QA report — Manual handoff command in Claude Code (PRD-21), live run

## Summary

- Status: REJECTED
- Execution: live run by the user in an interactive Claude Code 2.1.306 session, transcribed by the coordinator session; cause reproduced by the coordinator with `claude plugin test` on a scratch copy of the installed mod
- Previous QA: `qa_01/qa.md` (BLOCKED, MA-01..MA-05 not verifiable)
- Code state: the installed bundle `.context-brake/claude-mod/context-brake-restart/hooks/register.mjs` is byte-equal to `dist/assets/runtime/claude-code-mod.mjs` built from the reviewed state (`codereview_02`)

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| MA-01 live `/handoff` | the user, after `/reload-plugins` | `/handoff` printed the accepted line `ContextBrake: asking the agent to save its state; the session restarts when the reply ends.`, then `ContextBrake: automatic restart skipped: an internal error occurred. This session keeps running.`; no agent turn started; the restart log of the session has one `ERROR_INTERNAL` record (2026-10-21T21:51:09Z) | FAILED |
| MA-02..MA-05 | not run | depend on MA-01 | NOT RUN |

## Findings

| ID | Severity | Obligation | Evidence | Cause |
| --- | --- | --- | --- | --- |
| BUG-01 | High | FR-03, FR-08, OBJ-01, DEC-06 | Live output above. Reproduced with `claude plugin test` (Claude Code 2.1.306) on a copy of the installed mod (`evidence/kit-probe.test.ts.txt`): `$.command.run({ command: 'handoff' })` answers the accepted line, no prompt reaches `prompt.submit`, and the rejection text is `prompt.submit: called from a command.run hook, it would wait on the turn this hook is holding; submit from a later event (turn.complete) (host check)` | `submitPrompt` calls `$.prompt.submit` inside the `command.run` hook. The host refuses it. In the same probe, a submit scheduled with `$.clock.after(100, …)` from the hook reached `prompt.submit` with the exact prompt text and resolved |

## Limitations and open items

- The live run is the user's; the coordinator transcribed it. The independent QA re-run after the correction stays with a delegated QA runner and the user's live retest.
- The in-process host fake did not model this host check, so TC-09 passed while the live run failed.
