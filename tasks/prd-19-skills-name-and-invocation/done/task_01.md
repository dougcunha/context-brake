# Stable execution context

Load in this exact order:

1. `tasks/prd-19-skills-name-and-invocation/prd.md`
2. `tasks/prd-19-skills-name-and-invocation/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Skill name rule and invocation formats

## Outcome

`snapshot.command` and `snapshot.resumeCommand` accept only a skill name; the old format fails with a message that names the key and the bare name; the four standard invocation formats exist in core; and every test fixture and expected value that held a `/name` style value holds a bare name, with the suite green.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02
- In scope: `skill-name.ts`, `skill-invocation.ts` (contract and service), `snapshotSchema` change, regenerated schemas, the fixture sweep (values only), unit tests TC-01 and TC-02 (schema and `mergeSnapshot` level), format unit tests.
- Out of scope: zone guidance, descriptors, harness folders, doctor, wizard text, repo config and docs.

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01, FR-02, NFR-04 | `prd.md#functional-requirements` | Name rule, fix message |
| DEC-01, DEC-02, CMP-01..CMP-04 | `techspec.md#technical-decisions` | Schema file, formats |
| TC-01, TC-02 | `techspec.md#test-approach` | Accept and reject table; message |

## Context to recover on demand

- Applicable skills and rules: `ts-tests`; `code-standards.md`, `javascript-typescript.md`, `tests.md`.
- Existing code: `src/core/contracts/configuration.ts` (`agentCommand`, `snapshotSchema`, `addIssue`), `src/core/services/snapshot-merge.ts`, `tests/unit/configuration-snapshot.test.ts`, `tests/unit/snapshot-merge.test.ts`.
- Contract or integration: TechSpec "Contracts and data".
- Fixture sweep: `git grep -n -E "command: '/|\"command\": \"/|resumeCommand: '/|--snapshot-command|--resume-command" -- tests` lists the values to turn into bare names (the list in the TechSpec "Relevant files" is a hint, not exhaustive).

## Work

- [x] T01.1 Create `src/core/contracts/skill-name.ts` with the pattern, the max length, the optional `plugin:` prefix, and `skillNameSchema` with the sigil/space issue message; replace `agentCommand` in `configuration.ts` (keep `MAX_AGENT_COMMAND_LENGTH` only if something else imports it).
- [x] T01.2 Create `src/core/contracts/skill-invocation.ts` (types) and `src/core/services/skill-invocation.ts` (`slashInvocation`, `dollarInvocation`, `skillSlashInvocation`, `sentenceInvocation`).
- [x] T01.3 Update the fixtures and expected strings in the tests that hold a `/name` style config value to bare names; the rendered text expectations keep passing as `run "sdd-snapshot"` for now.
- [x] T01.4 Add `tests/unit/skill-name.test.ts` (TC-01) and extend the schema and `mergeSnapshot` tests with the fix message (TC-02); add format unit tests (the four functions).
- [x] T01.5 Run `npm run schemas:generate` and keep the generated files.

## Acceptance criteria

- `sdd-snapshot`, `commit`, `anthropic-skills:docs` pass; `/sdd-snapshot`, `$x`, `@x`, `Sdd`, `a b`, `a--b`, `-a`, `a:b:c`, and a 65-character name fail.
- The message for `/sdd-snapshot` names `snapshot.command` and says to use `sdd-snapshot`.
- `resumeCommand` without `command` still fails as before.
- `npm test` is green with no test relying on a stored `/` value.

## Verification

- Unit: the TC-01 and TC-02 scenarios; the four formats for `sdd-snapshot` and for a `plugin:name`.
- Integration: `tests/integration/init-snapshot.test.ts` with bare names.
- End-to-end: not applicable.
- Manual: none.
- Platforms: Linux, macOS, Windows (no path or shell code).
- Commands: `npm run lint`, `npm run typecheck`, `npm run coverage`, `npm run schemas:check`.
- Environment dependency: none.
- Expected evidence: green commands with test counts; `git grep` shows no stored `/`-style value in `tests/` fixtures except tests of the rejection.

## Affected files

- Modify: `src/core/contracts/configuration.ts`, `schemas/*`, the test files found by the sweep.
- Create: `src/core/contracts/skill-name.ts`, `src/core/contracts/skill-invocation.ts`, `src/core/services/skill-invocation.ts`, `tests/unit/skill-name.test.ts`, `tests/unit/skill-invocation.test.ts`.

## Observability and recovery

- Operational signal: the rejection message.
- Recovery: revert the commit.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `snapshot.command` and `snapshot.resumeCommand` accept only a skill name (`skillNameSchema`, with `plugin:` prefix, 64 per part). An old-format value fails with `"<value>" is not a skill name; use the bare name <name>` (or the shape rule when the remainder is invalid). The four standard formats exist in core. All fixtures hold bare names; the equivalence scenarios for a name with a space or a leading dash were replaced because those values are no longer valid names. Rendered text still reads `run "sdd-snapshot"` until T02.
- Changed files: created `src/core/contracts/skill-name.ts`, `skill-invocation.ts`, `src/core/services/skill-invocation.ts`, `tests/unit/skill-name.test.ts`, `tests/unit/skill-invocation.test.ts`; modified `src/core/contracts/configuration.ts` (removed `agentCommand` and `MAX_AGENT_COMMAND_LENGTH`, no other user), `schemas/context-brake.config.schema.json`, three test helpers/fixtures, and ten test files (`doctor-light-mode`, `init-assistant-equivalence`, `init-snapshot`, `light-mode-lifecycle`, `assistant-questions`, `-invalid`, `-state`, `configuration-snapshot`, `snapshot-merge`).
- Checks: `npm run lint` clean; `npm run typecheck` clean; `npm run coverage` 256 files, 1306 tests passed, 95.95% statements; `npm run schemas:generate` regenerated the config schema. Quality profile QA-01 to QA-04 and QA-06 over the touched source files: empty output.
- Validated state: working tree on `master` at base `7295a43` plus this diff, Windows, Node 24; no environment dependency.
- Open items: `questions-snapshot.ts` still has `valueFlag` for values that start with a dash; no valid name can, so it is dead code. T04 removes it. The dash and space replay tests were removed with it.

### ADR candidates

None - direct TechSpec implementation or local decision.
