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

- [ ] T04.1 Add `src/core/services/boot-summary.ts` rendering the fixed sections in English Markdown, constraints as a list rather than prose.
- [ ] T04.2 Apply the budget: drop modified files first, then oldest decisions, never constraints, appending a pointer to the full checkpoint when anything was reduced.
- [ ] T04.3 Add `src/core/services/boot-policy.ts` returning boot, no boot, or invalid-state instruction, using the T01 validators.
- [ ] T04.4 Tests: content, suppression, invalid-state, reduction order, and the 1,000-token budget for the reference fixture.

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

- Produced result: Pending execution.
- Changed files: Pending execution.
- Checks: Pending execution.
- Validated state: Pending execution (code or diff, configuration, platform, and environment).
- Open items: Pending execution.

### ADR candidates

Pending execution. `sdd-execute-task` replaces this text with structured candidates or `None - direct TechSpec implementation or local decision`.
