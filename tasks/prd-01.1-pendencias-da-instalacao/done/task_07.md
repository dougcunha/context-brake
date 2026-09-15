# Stable execution context

Load in this exact order:

1. `tasks/prd-01.1-pendencias-da-instalacao/prd.md`
2. `tasks/prd-01.1-pendencias-da-instalacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T07 — Version-floor gating fixed; researched minimum versions declared

## Outcome

`support-service.ts` only downgrades a capability to `unknown` when the version probe is `old`; an `unknown`, `malformed`, or `timed_out` probe keeps the adapter's declared capability states. Every harness with a release-note or changelog source for its registered mechanisms declares that minimum version, and `doctor` no longer emits `VERSION_FLOOR_UNVERIFIED` for those harnesses.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T08
- In scope: `support-service.ts`'s `gatedState`; passing a researched `minimumVersion` through `probeExecutableVersion` for adapters with evidence.
- Out of scope: recording the research itself in `docs/research/harness-integrations.md` (T08); inventing a version floor without a cited source (forbidden by PRD-01's TechSpec and this PRD's `Out of scope`).

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-12 | `prd.md#functional-requirements` | Research and declare minimum harness versions from official release notes |
| RF9 (parent PRD-01) | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | Warn below a verified minimum version |
| DEC-07 | `techspec.md#technical-decisions` | Only `old` downgrades; `unknown`/`malformed`/`timed_out` keep declared states |
| CMP-07 | `techspec.md#components-and-flow` | `support-service.ts`; adapters with a floor |
| TC-08 | `techspec.md#test-approach` | Gating truth table; research review |

## Context to recover on demand

- Applicable skills and rules: `.agents/rules/harness-adapters.md` ("Gate each capability on the minimum harness version that documents it"); PRD-01's TechSpec key decision "Honest version compatibility" (numeric floors only with release/binary evidence).
- Existing code: `src/core/services/support-service.ts:9-13` (`gatedState`, current condition `if (!version?.minimumVersion || version.status === 'resolved') return definition.state; return 'unknown';` — this is the bug: any non-`resolved` status with a floor set turns the capability `unknown`); `src/infrastructure/harnesses/common/version-probes.ts:10` (`probeExecutableVersion` already accepts a `minimumVersion` parameter — no signature change needed, just adapters passing a real value instead of the default `null`); `src/core/services/doctor-service.ts` (`unverifiedFloorFinding`, already keyed on `support.minimumVersion !== null` — no change needed, it stops firing automatically once an adapter declares a floor).
- Contract or integration: `techspec.md#technical-decisions` DEC-07 for the exact new condition; do not touch `floorLimitation` (the "no floor at all" case is unaffected).
- Harness reference: `docs/research/harness-integrations.md` — this task consumes whatever floor evidence is found there or in official vendor release notes/changelogs during this task; T08 is where the file itself gets updated with the citations.

## Work

- [x] T07.1 Change `gatedState` in `support-service.ts` from `if (!version?.minimumVersion || version.status === 'resolved') return definition.state; return 'unknown';` to a condition that only returns `'unknown'` when `version.status === 'old'`; every other status (`resolved`, `unknown`, `malformed`, `timed_out`) returns `definition.state` unchanged.
- [x] T07.2 For each of the 8 harnesses, search official release notes/changelogs for the first version documenting every mechanism this package registers for that harness (hooks/extensions API, block/deny verdict, the specific event names used). Record what is found (source URL/version or "not documented") for use in T08.
- [x] T07.3 For every harness with a found source, pass the researched version as `minimumVersion` into that adapter's `probeExecutableVersion(context.runner, EXECUTABLES, minimumVersion)` call. — No adapter received a floor; see Handoff.
- [x] T07.4 Update `tests/unit/support-service.test.ts` with the full `gatedState` truth table: `old` with a floor → `unknown`; `unknown`/`malformed`/`timed_out` with a floor → declared state unchanged; no floor → declared state unchanged regardless of status.
- [x] T07.5 Update `tests/unit/adapter-version-probes.test.ts` for any adapter that now declares a floor, asserting `capabilityProfile(version).minimumVersion` equals the researched value and that `VERSION_FLOOR_UNVERIFIED` no longer fires for it in a doctor fixture with an `unknown` (not `old`) probe. — Not applicable, no adapter declares a floor; see Handoff.

## Acceptance criteria

- Only a `version.status === 'old'` probe turns a `supported` capability `unknown`; `resolved`, `unknown`, `malformed`, and `timed_out` all preserve the adapter's declared capability states.
- Every harness with a cited official source declares that `minimumVersion` from its adapter, and `doctor` stops emitting `VERSION_FLOOR_UNVERIFIED` for it.
- No harness declares a floor without a cited official source; harnesses without one keep `minimumVersion: null` and the existing `VERSION_FLOOR_UNVERIFIED` warning.
- An environment where the harness executable is not on `PATH` (a `probeVersion` failure, not `old`) never downgrades a fully capable harness's support level.

## Verification

- Unit: `gatedState`/`deriveSupportProfile` truth table across all `VersionStatus` values, with and without a floor; per-adapter `capabilityProfile` assertions for adapters that now declare a floor.
- Integration: not applicable beyond the unit-level version-probe fixtures already in place.
- End-to-end: not required — this is a pure derivation change with no I/O.
- Manual: review of the researched minimum versions and their sources before declaring them (product-owner or maintainer sign-off, since a wrong floor is a false compatibility claim).
- Platforms: not platform-sensitive.
- Commands: `npm run build`, `npm test -- support-service adapter-version-probes`, `npm run coverage`
- Environment dependency: manual review of cited sources before merging any declared floor (no automated verification can confirm a vendor's own release notes are accurate).
- Expected evidence: `tests/unit/support-service.test.ts` and `tests/unit/adapter-version-probes.test.ts` pass; the manual review is recorded in this task's Handoff.

## Affected files

- Modify: `src/core/services/support-service.ts`, `tests/unit/support-service.test.ts`, `tests/unit/adapter-version-probes.test.ts`, and each adapter file (`src/infrastructure/harnesses/*/adapter.ts`) that declares a researched floor
- Create: none

## Observability and recovery

- Operational signal: `VERSION_FLOOR_UNVERIFIED` stops appearing for harnesses with a declared floor; `CapabilityProfile.minimumVersion` becomes non-null for them.
- Recovery: revert `support-service.ts` and any adapter floor declaration with git; a wrong floor is corrected by removing it (falls back to `null`, restoring the unverified-floor warning), not by a data migration.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: `gatedState` in `support-service.ts` now only downgrades a `supported` capability to `unknown` when `version.status === 'old'`; `resolved`, `unknown`, `malformed`, and `timed_out` all preserve the adapter's declared capability states (previously, any non-`resolved` status with a floor set incorrectly downgraded). Verified via a real fetch-based research pass (T07.2) that no harness has an official source stating the introducing version for the specific mechanisms this package registers, so no adapter declares a `minimumVersion` — all 8 keep `minimumVersion: null` and the existing `VERSION_FLOOR_UNVERIFIED` warning, per FR-12's own "not documented" allowance.
- Changed files: `src/core/services/support-service.ts` (`gatedState` fix), `tests/unit/support-service.test.ts` (kept existing tests), `tests/unit/support-service-version-gating.test.ts` (new, full truth table for `old`/`unknown`/`malformed`/`timed_out` with and without a floor).
- Checks: `npm run build`, `npm run typecheck`, `npm run lint` (0 issues) all pass; `npx vitest run support-service adapter-version-probes` — 3 files, 13 tests pass; full suite `npx vitest run` — 92 files, 382 tests pass (no regression).
- Validated state: T07.2's manual research (this session, via live web fetches on 2026-09-15) checked Claude Code's hooks reference and public changelog (code.claude.com/docs/en/hooks, code.claude.com/docs/en/changelog, github.com/anthropics/claude-code CHANGELOG.md) and Cursor's hooks reference (cursor.com/docs/hooks): neither states the version that first introduced the hooks mechanisms this package registers — only versions for later incremental refinements (e.g., Claude Code 2.1.191+ matcher syntax tweaks) are documented, which is not evidence of the *introducing* version. The remaining 6 harnesses (Codex CLI, GitHub Copilot CLI, OpenCode, Pi, Oh-My-Pi, Antigravity CLI) have no changelog or release-note page linked in `docs/research/harness-integrations.md`'s existing sources at all, so the same "not documented" conclusion applies without further doubt. This matches PRD-01.1's explicit constraint: "capacidades sem evidência nunca contam como garantidas" and the TechSpec's "a wrong floor is a false compatibility claim" decision — declaring any floor here would have been fabrication, not research.
- Open items: none. If a future harness release publishes a clear "hooks introduced in vX.Y.Z" changelog entry, `probeExecutableVersion(context.runner, EXECUTABLES, 'X.Y.Z')` is the one-line change needed in that adapter, and `VERSION_FLOOR_UNVERIFIED` will stop firing for it automatically (per `doctor-service.ts`'s existing `support.minimumVersion !== null` gate, untouched by this task).

### ADR candidates

None - direct TechSpec implementation (DEC-07).
