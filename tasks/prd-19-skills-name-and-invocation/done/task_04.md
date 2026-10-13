# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/prd.md`
2. `tasks/prd-19-skills-name-and-invocation/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Flags and wizard in skill names

## Outcome

`init` flags and the assistant speak in skill names: prompts and help say "skill name", a rejected value shows the fix message and repeats the prompt, and after a valid name the assistant shows the form each selected harness will receive. The summary and plan print the bare name.

## Dependencies and boundaries

- Depends on: T02
- Unblocks: T05
- In scope: `snapshot-specs.ts`, `questions-snapshot.ts`, `summary-rows.ts` (resolver for the preview), `init-arguments.ts` help text, the equivalent command, tests TC-06 and TC-07, the `doctor`-independent printing places (`installation-builder.ts`, `restart-doctor-findings.ts`).
- Out of scope: discovery of skills (slice 20), doctor, repo docs.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-02, FR-05, FR-06, FR-07, NFR-04 | `prd.md#functional-requirements` | Fix message for flags and prompt, bare names stored, preview, printed names |
| DEC-07, CMP-12 | `techspec.md#technical-decisions` | Same schema for flags and wizard |
| TC-06, TC-07 | `techspec.md#test-approach` | Integration and scripted wizard |

## Context to recover on demand

- Applicable skills and rules: `cli-output.md`, `tests.md` (scripted prompts), `ts-tests`.
- Existing code: `src/cli/assistant/questions-snapshot.ts` (`checked`, `validateCommand`, `validateResume`), `snapshot-specs.ts`, `src/cli/assistant/summary-rows.ts`, `src/cli/init-arguments.ts`, `src/core/services/installation-builder.ts:89`, `src/core/services/restart-doctor-findings.ts:21`, `tests/unit/assistant-questions*.test.ts`, `tests/integration/init-snapshot.test.ts`, `init-assistant-equivalence.test.ts`.
- Contract or integration: TechSpec DEC-07; `docs/research/terminal-tty.md` quotes a flags list (T05 updates the doc).

## Work

- [x] T04.1 Reword `commandSpec` and `resumeSpec` ("skill name") and the help text; keep the flag names.
- [x] T04.2 Show, after a valid answer, one preview line per selected harness using the resolver (plain-sentence label for the sentence form).
- [x] T04.3 Make sure a rejected value from the flags prints the FR-02 message without writing, and the equivalent command prints bare names.
- [x] T04.4 Update and add the tests (TC-06, TC-07).

## Acceptance criteria

- A scripted wizard session that types `/sdd-snapshot` is refused with the fix message and asked again; `sdd-snapshot` is accepted and previews each selected harness.
- `init --snapshot-command /sdd-snapshot` exits with the usage error and writes nothing; `--snapshot-command sdd-snapshot` writes the bare name.
- The replay of the printed equivalent command computes the same plan.

## Verification

- Unit: wizard questions with `ScriptedPrompts`.
- Integration: `init-snapshot`, `init-assistant-equivalence`.
- End-to-end: not applicable (T05).
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: green commands.

## Affected files

- Modify: `src/cli/assistant/snapshot-specs.ts`, `questions-snapshot.ts`, `summary-rows.ts`, `src/cli/init-arguments.ts` (help only), possibly `installation-builder.ts` and `restart-doctor-findings.ts` wording, the affected tests.
- Create: none.

## Observability and recovery

- Operational signal: prompt text and the preview lines.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: the assistant asks for a "skill name" (prompts reworded), refuses a typed `/name`, `$name`, or `@name` with the fix message and asks again, and records `AssistantFacts.invocations` for the selected harnesses; the summary's Snapshot card shows `In <harness>  <form>[, resume: <form>]` rows before the confirmation (AUTO-09). `init --snapshot-command /sdd-snapshot` exits 64 with the fix message and writes nothing. The dead `valueFlag` code from T01's open item is removed.
- Changed files: `src/cli/assistant/types.ts`, `assistant-context.ts`, `assistant-questions.ts`, `snapshot-specs.ts`, `questions-snapshot.ts`, `summary-rows.ts`; new `src/cli/assistant/invocation-facts.ts`; tests `assistant-output`, `assistant-questions`, `assistant-questions-invalid`, `init-snapshot`, helper `tests/helpers/assistant-context.ts`.
- Checks: `npm run lint`, `npm run typecheck` clean; `npm run coverage` 258 files, 1339 tests passed, 95.98% statements; `npm run schemas:check` passes. Quality checks (any, ts-ignore, throw new Error, files above 100 lines) over the touched assistant files: empty output.
- Validated state: working tree on `master` at base `7295a43` plus T01 to T04, Windows, Node 24.
- Open items: other printed phrases still say "snapshot command" (`installation-builder.ts`, `restart-doctor-findings.ts`, `questions-restart.ts`) because the config key is `command`; the value they print is the bare name. `--help` text does not exist in this CLI, so the README option table (T05) is the help.

### ADR candidates

None - direct TechSpec implementation or local decision.
