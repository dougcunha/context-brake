# Stable execution context

Load in this exact order:

1. `tasks/prd-04-runner-de-reinicio-automatico/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T10 — The runner recognizes a reset signal on the last line of the final message

## Outcome

A runner session whose final assistant message ends with `[REQUEST_SESSION_RESET]` on its last non-blank line ends with `endReason: reset_signal`, even when text comes before the signal. The TechSpec DEC-05 and TC-10 describe the new rule.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T14 (both edit `techspec.md`)
- In scope:
  - a new runner-only signal predicate;
  - the `SessionWatch` switch to it;
  - the TechSpec DEC-05 and TC-10 text;
  - unit tests;
  - a fake-harness end-to-end scenario with text before the signal.
- Out of scope:
  - `hasResetSignal` and the PRD-02 brake `response_end` path (`brake-engine.ts:76`) stay exact-match (DEC-EXC-CR01; OI-03 stays open);
  - the runner prompt text (DEC-03).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | The exact-match signal conflicts with the prompt, so real sessions are misclassified (RF3, RF9, RF17) |
| DEC-EXC-CR01 | `workflow.md#Human Decisions Log` | Human decision: the signal counts on the last non-blank line |

## Requirements

- Recognize the signal when the trimmed last non-blank line of the final text ends with `[REQUEST_SESSION_RESET]`. This covers the bare signal, text followed by a line break and the signal, and `Done. [REQUEST_SESSION_RESET]` on one line, which matches the protocol's "End the response with".
- Do not recognize a signal anywhere else, such as one quoted mid-message or one followed by more text.
- Record the exact rule in DEC-05.
- The 10 s exit grace after the signal (`SIGNAL_EXIT_GRACE_MILLISECONDS`) applies unchanged.

## Context to recover on demand

- TechSpec: DEC-05, TC-10
- Rules: `code-standards.md`, `javascript-typescript.md`, `tests.md`
- Code:
  - `src/core/services/reset-notice.ts:3` — keep `hasResetSignal` unchanged
  - `src/core/services/session-watch.ts:76-79` — `finish` uses the predicate
  - `tests/support/fake-harness/fake-harness.mjs:24` — `finalText` default
  - `tests/unit/run-session.test.ts` — TC-10

## Work

- [x] T10.1 Add a runner predicate (for example `endsWithResetSignal`) to `reset-notice.ts`, with unit cases for:
  - the bare signal;
  - text, a line break, then the signal;
  - text and the signal on the same last line;
  - the signal mid-message;
  - trailing whitespace.
- [x] T10.2 Use the predicate in `SessionWatch.finish`, and extend TC-10 in `run-session.test.ts` with a final text that ends with the signal.
- [x] T10.3 Add an end-to-end case with a fake-harness `finalText` of `"Step done.\n\n[REQUEST_SESSION_RESET]"` that writes no checkpoint. Expect `endReason: reset_signal` and a validation that runs, not a `no_checkpoint` stop.
- [x] T10.4 Update the TechSpec DEC-05 and TC-10 to state the rule and cite DEC-EXC-CR01.

## Acceptance criteria

- A final message ending with the signal yields `reset_signal` through the fake harness, on Claude Code and Codex CLI.
- A mid-message signal still yields `harness_exit`.
- The brake tests (`tests/unit/brake-*.test.ts`) pass unchanged.

## Verification

- Unit: the predicate cases and the TC-10 extension
- Integration: not applicable
- End-to-end: the new scenario, in `tests/e2e/e2e-run-steps.test.ts` or a new `e2e-run-signal.test.ts`, through `runAcceptance` on the sealed `PATH` (L-10)
- Manual: not required
- Platforms: Windows locally; Linux and macOS in CI (PI-03)
- Environment dependency: none
- Commands:
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint` (only the 14-error prd-03 baseline is allowed)
  - `npm run coverage` (serialized; about 8.5 min, so run it in the background)
- Expected evidence: the new tests are green, and the brake tests are unchanged

## Affected files

- Modify:
  - `src/core/services/reset-notice.ts`
  - `src/core/services/session-watch.ts`
  - `tests/unit/run-session.test.ts`
  - `tasks/prd-04-runner-de-reinicio-automatico/techspec.md`
- Create: the predicate unit test and the end-to-end case

## Observability and recovery

- Operational signal: `end reset_signal` in the progress line, and `endReason` in `sessions.jsonl`
- Recovery: revert the predicate switch

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: CR-01 corrected. The runner recognizes a reset signal at the end of the final assistant message, including text on the same or earlier line. A signal followed by more text remains `harness_exit`; the PRD-02 brake keeps its exact-match predicate. DEC-05 and TC-10 now state the rule under DEC-EXC-CR01.
- Changed files: `src/core/services/reset-notice.ts`, `src/core/services/session-watch.ts`, `tests/unit/run-session.test.ts`, `tests/unit/runner-reset-signal.test.ts`, `tests/e2e/e2e-run-signal.test.ts`, `techspec.md`.
- Checks: `npm run build` passed; `npm run typecheck` passed; focused Vitest run passed 33 tests across the predicate, session, brake reset, and built-CLI suites; `npm run coverage` passed at 94.78% lines (8,405/8,868); `npm run lint` reported only the 14 pre-existing PRD-03 QA evidence errors, with no T10 error. The full coverage run includes the unchanged brake tests.
- Validated state: Uncommitted T01–T09 implementation plus this T10 change, on Windows with Node v24.19.0. The fake harness ran through `runAcceptance` and its sealed PATH on Claude Code and Codex CLI; each trailing-signal case validated and completed without a fresh checkpoint, while each mid-message case stopped `no_checkpoint` with the original `PENDING` plan. No real harness was launched. The existing 10 s signal grace test passed unchanged.
- Open items: Linux and macOS execution remains for CI (PI-03). OI-03 on changing the PRD-02 brake predicate remains outside T10 by DEC-EXC-CR01. T11, T12, and T14 are now eligible; T13 requires T12.
