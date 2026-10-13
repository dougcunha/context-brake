# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/prd.md`
2. `tasks/prd-19-skills-name-and-invocation/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — Harness-rendered guidance

## Outcome

The zone action and the resume text carry the invocation in the form of the harness that receives them. Each of the eight harnesses declares its form in its own folder, the runtime descriptor carries it, and a resolver gives the CLI the same forms.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: T03, T04
- In scope: `RuntimeDescriptor.skillInvocation`; `zoneAction` and `resumeText` signatures (DEC-05); callers in `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts`; eight `skill-invocation.ts` files and eight descriptors; `skill-invocations.ts` resolver; tests TC-03, TC-04, TC-05, TC-11, TC-12.
- Out of scope: doctor, wizard, flags, docs, repo config.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03, FR-04, NFR-01, NFR-02 | `prd.md#functional-requirements` | Per-harness text, fallback, no harness branch in core, token budget |
| DEC-02..DEC-05, DEC-09 (forms), CMP-05..CMP-09 | `techspec.md#technical-decisions` | Descriptor field, forms, resolver, signatures |
| TC-03, TC-04, TC-05, TC-11, TC-12, QA-07 | `techspec.md#test-approach` | Tests |

## Context to recover on demand

- Applicable skills and rules: `harness-adapters.md`, `code-standards.md`, `tests.md` (agent-facing text), `ts-tests`.
- Existing code: `src/core/services/zone-guidance.ts`, `brake-engine.ts:48-52`, `session-reset-handler.ts:30`, `failure-policy.ts:55`, `src/core/contracts/runtime.ts`, `src/infrastructure/harnesses/*/runtime.ts`, `tests/unit/zone-guidance.test.ts`, `telemetry-block-budget.test.ts`, `failure-policy*.test.ts`, `session-reset-handler.test.ts`.
- Contract or integration: TechSpec DEC-03 table of forms: claude-code, cursor, github-copilot-cli `slash`; codex-cli `dollar`; pi `skillSlash`; oh-my-pi, opencode, antigravity-cli `sentence`.
- Harness reference: PRD "Assumptions and sources" table; `docs/research/harness-integrations.md` (updated in T05).

## Work

- [x] T02.1 Add `skillInvocation` to `RuntimeDescriptor`; create `<harness>/skill-invocation.ts` in the eight harness folders and use it in each descriptor.
- [x] T02.2 Create `src/infrastructure/harnesses/skill-invocations.ts` (`SKILL_INVOCATIONS`, a `Record<HarnessId, …>`).
- [x] T02.3 Change `zoneAction(zone, snapshot, options)` and `resumeText(snapshot, invoke)`; pass the descriptor's format from the engine, the reset handler, and the failure policy (`descriptor?.skillInvocation`).
- [x] T02.4 Update the expected strings in the guidance, engine, reset, failure-policy, telemetry, and runtime tests (slash forms equal today's text), and add TC-03, TC-04, TC-05, TC-11, TC-12.

## Acceptance criteria

- For `sdd-snapshot`, `zoneAction` at RED and CRITICAL and `resumeText` produce the exact strings of each form (`run "/sdd-snapshot"`, `run "$sdd-snapshot"`, `run "/skill:sdd-snapshot"`, `run "use the sdd-snapshot skill"`).
- A descriptor-less failure path yields the sentence form.
- No harness id appears in `zone-guidance.ts` or `skill-invocation.ts` (QA-07).
- A hook round trip of each process harness still passes with the new descriptor field.
- The telemetry block at CRITICAL with the sentence form stays within 60 tokens.

## Verification

- Unit: TC-03, TC-04, TC-05, TC-11, TC-12.
- Integration: the existing per-harness runtime round trips (`runHookInProcess`).
- End-to-end: not applicable (T05).
- Manual: none.
- Platforms: Linux, macOS, Windows.
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Environment dependency: none.
- Expected evidence: green commands; QA-07 command prints nothing.

## Affected files

- Modify: `src/core/contracts/runtime.ts`, `src/core/services/zone-guidance.ts`, `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts`, `src/infrastructure/harnesses/*/runtime.ts`, the affected tests.
- Create: `src/infrastructure/harnesses/*/skill-invocation.ts` (8), `src/infrastructure/harnesses/skill-invocations.ts`.

## Observability and recovery

- Operational signal: the guidance text in the telemetry block.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `RuntimeDescriptor.skillInvocation` (required); eight `skill-invocation.ts` files (claude-code, cursor, github-copilot-cli `slash`; codex-cli `dollar`; pi `skillSlash`; oh-my-pi, opencode, antigravity-cli `sentence`); `SKILL_INVOCATIONS` and `resolveSkillInvocation` in `src/infrastructure/harnesses/skill-invocations.ts`; `zoneAction(zone, snapshot, options)` and `resumeText(snapshot, invoke)` with the sentence form as the fallback; engine, reset handler, and failure policy pass the descriptor's format.
- Changed files: `src/core/contracts/runtime.ts`, `src/core/services/zone-guidance.ts`, `brake-engine.ts`, `session-reset-handler.ts`, `failure-policy.ts`, eight `src/infrastructure/harnesses/*/runtime.ts`; new `skill-invocations.ts` and eight `skill-invocation.ts`; tests: `zone-guidance`, `telemetry-block-budget`, `session-reset-handler`, `failure-policy-snapshot-reset`, `light-mode-lifecycle`, the descriptor literals in 13 test files and fixtures, new `tests/integration/skill-invocations.test.ts`.
- Checks: `npm run lint` and `npm run typecheck` clean; `npm run coverage` 257 files, 1329 tests passed, 95.98% statements; `npm run build` before the built-CLI lifecycle test. QA-07 command (harness ids in `zone-guidance.ts` and `skill-invocation.ts`) printed nothing; QA-01/02/06 over the touched files printed nothing.
- Validated state: working tree on `master` at base `7295a43` plus T01 and T02 diffs, Windows, Node 24.
- Open items: `GuidanceOptions` fields allow explicit `undefined` because the project uses `exactOptionalPropertyTypes`. The budget test now covers the sentence form and the longest valid name (129 characters) under 400 characters.

### ADR candidates

None - direct TechSpec implementation or local decision.
