# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Adapter payload schemas match documented field names

## Outcome

`antigravity-cli`, `pi`, and `oh-my-pi` payload schemas parse the field names each vendor documents (`toolCall.name`/`toolCall.args` for Antigravity; `toolName`/`toolCallId`/`input`/`content` for Pi and Oh-My-Pi), matching what each adapter's own `benchmarkFixture()` already sends.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T08
- In scope: the three adapters' `schemas.ts` files and their fixtures under `tests/fixtures/harnesses/{antigravity-cli,pi,oh-my-pi}/`.
- Out of scope: the adapters' detection, planning, or benchmark logic (already correct); any other harness's schemas.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-06 | `prd.md#functional-requirements` | Read harness payloads by documented field names |
| DEC-01 | `techspec.md#technical-decisions` | Rewrite the three schemas non-strict, to the documented shape |
| CMP-01 | `techspec.md#components-and-flow` | Schemas and fixtures |
| TC-01 | `techspec.md#test-approach` | Unit parse test against documented and extra fields |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` (source of truth, non-strict Zod, adapter-owned schemas), `.agents/rules/javascript-typescript.md` (Zod validation of external data).
- Existing code: `src/infrastructure/harnesses/antigravity-cli/schemas.ts:14-17` (`toolName`, no `toolCall`); `src/infrastructure/harnesses/pi/schemas.ts:6-14` and `oh-my-pi/schemas.ts:6-14` (`name` instead of `toolName`); `src/infrastructure/harnesses/pi/adapter.ts:70-77` (`benchmarkFixture` already sends the correct documented shape) — use it as the target shape.
- Contract or integration: `techspec.md#contracts-and-data` "Payload schemas (DEC-01)" table for exact field names per schema.
- Harness reference: `docs/research/harness-integrations.md` sections `Pi`, `Oh-My-Pi`, `Antigravity CLI`.

## Work

- [x] T01.1 Rewrite `antigravity-cli/schemas.ts`'s `antigravityPreToolUsePayloadSchema` to `{ conversationId?: string; toolCall?: { name?: string; args?: unknown } }`, non-strict (`.passthrough()`).
- [x] T01.2 Rewrite `pi/schemas.ts`'s `piToolCallPayloadSchema`/`piToolResultPayloadSchema` to `{ toolName?: string; toolCallId?: string; input?: unknown }` / `{ toolName?: string; toolCallId?: string; content?: unknown }`, non-strict.
- [x] T01.3 Rewrite `oh-my-pi/schemas.ts`'s `ompToolCallPayloadSchema`/`ompToolResultPayloadSchema` to the same shape as T01.2, non-strict.
- [x] T01.4 Rewrite the JSON fixtures under `tests/fixtures/harnesses/{antigravity-cli,pi,oh-my-pi}/` to the documented field names, including at least one extra undocumented field per fixture to prove `.passthrough()` still parses it.
- [x] T01.5 Update or add unit tests parsing the rewritten fixtures and asserting typed access to the new field names.

## Acceptance criteria

- Every rewritten schema parses its rewritten fixture, including the extra field, without `.strict()`.
- Typed access after parsing reads `toolCall.name`/`toolCall.args` for Antigravity and `toolName`/`toolCallId`/`input`/`content` for Pi/Oh-My-Pi.
- No schema uses the old `name` or top-level `toolName` (Antigravity) field names.

## Verification

- Unit: parse each rewritten fixture with its schema; assert both the documented fields and passthrough of an extra field.
- Integration: not applicable — schemas have no I/O.
- End-to-end: not applicable.
- Manual: none.
- Platforms: not platform-sensitive.
- Commands: `npm run typecheck`, `npm run lint`, `npm test -- harness-schemas`
- Environment dependency: none.
- Expected evidence: `tests/unit/harness-schemas-process.test.ts` and `tests/unit/harness-schemas-in-process.test.ts` pass with the new field assertions.

## Affected files

- Modify: `src/infrastructure/harnesses/antigravity-cli/schemas.ts`, `src/infrastructure/harnesses/pi/schemas.ts`, `src/infrastructure/harnesses/oh-my-pi/schemas.ts`, `tests/fixtures/harnesses/antigravity-cli/*.json`, `tests/fixtures/harnesses/pi/*.json`, `tests/fixtures/harnesses/oh-my-pi/*.json`, `tests/unit/harness-schemas-process.test.ts`, `tests/unit/harness-schemas-in-process.test.ts`
- Create: none

## Observability and recovery

- Operational signal: none (schema-only change; no new finding or log).
- Recovery: revert the three schema files and fixtures with git; no data migration involved.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `antigravity-cli`, `pi`, and `oh-my-pi` payload schemas now parse the documented field names (`toolCall.name`/`toolCall.args`; `toolName`/`toolCallId`/`input`/`content`), non-strict, and the rewritten fixtures include an extra passthrough field each.
- Changed files: `src/infrastructure/harnesses/antigravity-cli/schemas.ts`, `src/infrastructure/harnesses/pi/schemas.ts`, `src/infrastructure/harnesses/oh-my-pi/schemas.ts`, `src/infrastructure/harnesses/oh-my-pi/adapter.ts` (benchmark fixture now includes `toolCallId`, matching Pi's), `tests/fixtures/harnesses/antigravity-cli/pre-tool-use.json`, `tests/fixtures/harnesses/pi/tool-call.json`, `tests/fixtures/harnesses/oh-my-pi/tool-call.json`, `tests/unit/harness-schemas-process.test.ts`, `tests/unit/harness-schemas-in-process.test.ts`.
- Checks: `npm run typecheck` pass; `npm run lint` pass (0 issues); `npx vitest run harness-schemas pi oh-my-pi antigravity` — 5 files, 17 tests pass.
- Validated state: code change only, no configuration/schema/platform impact; verified the three schemas' consumers (only their own fixtures/tests — no other adapter code reads them) before editing, so no downstream break.
- Open items: none.

### ADR candidates

None - direct TechSpec implementation (DEC-01).
