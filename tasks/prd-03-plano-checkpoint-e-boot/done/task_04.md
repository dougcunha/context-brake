# Stable execution context

Load in this exact order:

1. `tasks/prd-03-plano-checkpoint-e-boot/prd.md`
2. `tasks/prd-03-plano-checkpoint-e-boot/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T04 — Boot summary, policy, and budget

## Outcome

Given a plan, a checkpoint, and a git reading, the core produces either a boot summary within the configured token budget, no boot at all, or a short instruction naming an invalid file and its error.

## Dependencies and boundaries

- Depends on: T01, T03
- Unblocks: T05
- In scope: the boot renderer, the delivery policy, and the budget reduction order.
- Out of scope: delivering the text to any harness (T05), the protocol file routine (T06), and measuring real model adherence, which the PRD excludes.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| RF9 | `prd.md#boot-no-início-da-sessão` | Task, active and next step, constraints, decisions, blocks, divergences, and the validation command to run first |
| RF10 | `prd.md#boot-no-início-da-sessão` | No boot without an active plan or when every step is complete |
| RF11 | `prd.md#boot-no-início-da-sessão` | Invalid plan or checkpoint yields a short instruction naming file and error |
| RF12 | `prd.md#boot-no-início-da-sessão` | Respect the size limit, reducing modified files and old decisions first, never constraints |
| RF15 | `prd.md#verificação-do-estado-herdado` | Instruct running the validation command before any edit |
| CMP-07, CMP-08 | `techspec.md#components-and-flow` | Boot summary and boot policy |
| DEC-10 | `techspec.md#technical-decisions` | Fixed reduction order with a pointer to the full checkpoint |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/tests.md` (agent-facing text is asserted exactly, with a 1,000-token boot budget), `code-standards.md`, `harness-adapters.md` (the boot summary is a versioned contract built in `core`; adapters only transport it).
- Existing code: `src/core/services/telemetry-block.ts` — the versioned single-line agent-facing contract to mirror in style and versioning.
- Existing code: `tests/unit/telemetry-block-budget.test.ts` — the exact budget-test pattern using `js-tiktoken` `getEncoding('o200k_base')` with named token and character budgets.
- Existing code: `src/core/services/block-message.ts` — how configured file names are woven into agent-facing text.
- Contract or integration: `techspec.md#contracts-and-data`; research `docs/research/single-agent-context-management.md` for the retention rationale behind the reduction order.

## Work

- [x] T04.1 Add `src/core/services/boot-summary.ts` rendering the fixed sections in English Markdown, constraints as a list rather than prose.
- [x] T04.2 Apply the budget: drop modified files first, then oldest decisions, never constraints, appending a pointer to the full checkpoint when anything was reduced.
- [x] T04.3 Add `src/core/services/boot-policy.ts` returning boot, no boot, or invalid-state instruction, using the T01 validators.
- [x] T04.4 Tests: content, suppression, invalid-state, reduction order, and the 1,000-token budget for the reference fixture.

## Acceptance criteria

- With step 3 in progress and two constraints recorded, the boot names the task, step 3, step 4, both constraints, and the validation command of step 3.
- With every step `COMPLETED`, or with no plan present, no boot is produced.
- With an unparsable or schema-invalid checkpoint, the output is only the instruction naming the file and the error, carrying no checkpoint content.
- When the summary exceeds the configured budget, every constraint still appears in full and the reduced content points to the full checkpoint.
- A plan of 20 steps with 20 constraints and decisions renders within 1,000 tokens under the default configuration.
- The boot instructs running the validation command of the active step, or of the last completed step, before any edit.
- When git was unavailable, the boot carries no repository checks and says they were omitted.

## Verification

- Unit: section content, next-step selection, suppression cases, invalid-state instruction, reduction order, and the token and character budgets via `js-tiktoken`.
- Integration: not applicable; delivery is T05.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run coverage`
- Environment dependency: none; git readings arrive as inputs from a fake.
- Expected evidence: exact-text assertions for the boot and a passing budget test naming `CA-08`.

## Affected files

- Create: `src/core/services/boot-summary.ts`, `src/core/services/boot-policy.ts`, `tests/unit/boot-summary.test.ts`, `tests/unit/boot-budget.test.ts`
- Modify: —

## Observability and recovery

- Operational signal: the invalid-state instruction is the user-visible signal that a state file needs repair.
- Recovery: pure functions; no state is written.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `renderBootSummary` emits the versioned Markdown contract with task, current and next steps, working memory, repository divergences, and a validation-first instruction (RF9, RF15; DEC-10). `decideBoot` validates both files with T01 validators, suppresses absent or complete plans, and returns a file-specific instruction without state content for invalid files (RF10, RF11). The budget drops modified files before oldest decisions, preserves every constraint, and links the full checkpoint when reduced (RF12).
- Changed files: `src/core/services/boot-summary.ts`, `src/core/services/boot-policy.ts`, `tests/unit/boot-summary.test.ts`, `tests/unit/boot-budget.test.ts`, `tests/unit/boot-policy.test.ts`. The fifth test file separates policy failure cases because `boot-summary.test.ts` reached the 100-line file limit.
- Checks: `npm run build`, `npm run lint`, `npm run typecheck`, focused T04 tests (15/15), and `npm run coverage -- --maxWorkers=4` passed. Full coverage ran 883/883 tests with 93.16% statement coverage. A preceding default-worker `npm test` run passed 882 tests and timed out once in the unrelated `e2e-support-limitations.test.ts` doctor scenario; that scenario passed alone (2/2) and in the full coverage run. `git diff --check` passed. The TechSpec quality profile found no blocking or reservation hits; all five new TypeScript files are at most 100 physical lines.
- Validated state: T04 source and tests uncommitted on `91b4e68`, Windows 11 / Node v24.19.0. The final added policy tests were run after the full coverage run; production code and configuration did not change afterward. The pure renderer uses UTF-8 byte length as a conservative upper bound on token count, so it may drop optional content earlier than the configured token limit requires; constraints remain intact.
- Open items: T05 owns harness delivery. The Linux/macOS and Node 20/22/24 matrix remains pending for feature acceptance; no T04 block.

### ADR candidates

None - direct implementation of DEC-10; no new durable architecture decision.
