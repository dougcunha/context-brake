# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T08 — Research file reflects the 2026-09-14 re-check

## Outcome

`docs/research/harness-integrations.md` records the field-name facts behind T01 (Antigravity `toolCall.name`/`toolCall.args`; Pi/Oh-My-Pi `toolName`/`toolCallId`/`input`/`content`) and the minimum-version findings from T07, each with a source or "não documentada (14/09/2026)".

## Dependencies and boundaries

- Depends on: T01, T07 (needs their confirmed field names and researched versions to record accurately)
- Unblocks: —
- In scope: the 8 harness sections and the header note of `docs/research/harness-integrations.md`.
- Out of scope: the README support table and `.omp/extensions/` wording (already current per `codereview_08` `CR-05`, not touched again here); PRD-02-only facts already recorded.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-13 | `prd.md#functional-requirements` | Correct documentation to reflect the real state |
| DEC-08 | `techspec.md#technical-decisions` | Research file records the 2026-09-14 re-check |
| CMP-08 | `techspec.md#components-and-flow` | `docs/research/harness-integrations.md` |
| TC-08 | `techspec.md#test-approach` (shared with T07) | Research sections record floor/source or "not documented" with date |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` ("update the harness section, the adapter, and its fixtures in the same change" whenever behavior differs — T01 and T07 are exactly such changes, and this task is their required research-file counterpart).
- Existing code: `docs/research/harness-integrations.md` header (line 3) states "Resume a documentação oficial consultada em 12 e 13 de setembro de 2026" — update the consultation date only for the sections this task actually re-verifies, not the whole file, unless every section is in fact re-checked; per-harness sections around lines 29, 48, 67, 84, 98, 111, 124, 138 for the 8 harnesses.
- Contract or integration: `techspec.md#technical-decisions` DEC-08 for what must be recorded; the exact field-name and version facts come from T01's and T07's completed Handoffs, not from re-deriving them here.
- Harness reference: this task *is* the harness reference update.

## Work

- [x] T08.1 In the `Antigravity CLI` section, record that `PreToolUse` nests the tool call under `toolCall: { name, args }` (matching T01's schema), with the consultation date.
- [x] T08.2 In the `Pi` and `Oh-My-Pi` sections, record the `tool_call`/`tool_result` field names `toolName`, `toolCallId`, `input`, `content` (matching T01's schema), with the consultation date.
- [x] T08.3 For each of the 8 harness sections, add a `**Versão mínima:**` line with T07's finding: a source (release note/changelog URL and version) or "não documentada (14/09/2026)".
- [x] T08.4 Scan the whole file for any other place where code (post-T01/T07/any earlier corrections) now differs from what is documented, and correct it in the same change, per `harness-adapters.md`.
- [x] T08.5 Confirm the README support table and `.omp/extensions/`/three-line-block wording remain untouched and still pass `tests/unit/readme-support-table.test.ts` (no code change expected here, just a check that this task did not regress it).

## Acceptance criteria

- Every one of the 8 harness sections has a `**Versão mínima:**` line with a source or the "não documentada" wording and the 2026-09-14 date.
- The Antigravity, Pi, and Oh-My-Pi sections describe the exact field names used by their (now corrected) schemas from T01.
- No section still describes a payload shape or capability that the current adapters (post-T01–T07) contradict.
- `readme-support-table.test.ts` still passes unchanged.

## Verification

- Unit: not applicable — this is a documentation file with no executable schema; verified by manual review against the code it describes.
- Integration: not applicable.
- End-to-end: not applicable.
- Manual: review comparing each updated section against the corresponding adapter/schema/support-service code from T01 and T07; owner: whoever executes this task, cross-checked at this feature's review.
- Platforms: not applicable.
- Commands: `npm run lint` (Markdown is not linted, but this confirms no other file was inadvertently touched), `npm test -- readme-support-table`
- Environment dependency: none.
- Expected evidence: the diff to `docs/research/harness-integrations.md` and `readme-support-table.test.ts` still passing, recorded in this task's Handoff.

## Affected files

- Modify: `docs/research/harness-integrations.md`
- Create: none

## Observability and recovery

- Operational signal: not applicable (documentation only).
- Recovery: revert the file with git; no runtime effect.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: All 8 harness sections in `docs/research/harness-integrations.md` now carry a `**Versão mínima:**` line (all "não documentada (14/09/2026)", per T07's completed research). The `Antigravity CLI` section records `toolCall: { name, args }` for `PreToolUse`, and the `Pi`/`Oh-My-Pi` sections record `toolName`/`toolCallId`/`input`/`content` for `tool_call`/`tool_result` — both matching T01's corrected schemas.
- Changed files: `docs/research/harness-integrations.md` only.
- Checks: `npm run lint` (0 issues, confirms no other file touched); `npx vitest run readme-support-table` — 5 tests pass, unchanged.
- Validated state: manual review comparing each updated section against T01's schemas (`antigravity-cli/schemas.ts`, `pi/schemas.ts`, `oh-my-pi/schemas.ts`) and T07's Handoff (no adapter declares a floor) — every fact recorded here traces to a completed task's own verified output, not re-derived speculation. Scanned the rest of the file (T08.4) for other code/doc drift; found none beyond what T01 and T07 already introduced.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation (DEC-08).
