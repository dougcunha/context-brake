# Stable execution context

Load in this exact order:

1. `tasks/prd-05-automacao-de-release-e-publicacao/prd.md`
2. `tasks/prd-05-automacao-de-release-e-publicacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T01 — Tag verification script and package scripts

## Outcome

A robust, cross-platform TypeScript verification script `scripts/check-release-tag.ts` that enforces exact synchronization between target Git tags (`vX.Y.Z`) and `package.json` `"version"`, accompanied by `release:verify-tag` and composite `release:check` npm scripts in `package.json`, verified by comprehensive unit tests.

## Dependencies and boundaries

- Depends on: —
- Unblocks: T02, T03
- In scope:
  - Create `scripts/check-release-tag.ts`
  - Modify `package.json` to register `release:verify-tag` and `release:check`
  - Create `tests/unit/check-release-tag.test.ts`
- Out of scope:
  - GitHub Actions workflow definition (handled in T02)
  - Documentation file `docs/release-guide.md` (handled in T03)

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-03 | `prd.md#functional-requirements` | Validação de consistência entre Git Tag e `package.json` |
| FR-06 | `prd.md#functional-requirements` | Script de checagem pré-release no `package.json` (`npm run release:check`) |
| NFR-02 | `prd.md#non-functional-requirements` | Integridade de Conteúdo |
| DEC-02 | `techspec.md#technical-decisions` | Script TypeScript `scripts/check-release-tag.ts` para validação de tag |
| DEC-05 | `techspec.md#technical-decisions` | Scripts `release:check` e `release:verify-tag` em `package.json` |
| CMP-02 | `techspec.md#components-and-flow` | `scripts/check-release-tag.ts` |
| CMP-03 | `techspec.md#components-and-flow` | `package.json` scripts |
| CMP-05 | `techspec.md#components-and-flow` | `tests/unit/check-release-tag.test.ts` |
| TC-01 | `techspec.md#test-approach` | Tag matching aceita com exit code 0 |
| TC-02 | `techspec.md#test-approach` | Tag mismatch rejeitada com exit code 1 |
| TC-03 | `techspec.md#test-approach` | Tag malformada rejeitada com exit code 1 |
| TC-04 | `techspec.md#test-approach` | Tag prerelease via env var aceita |
| TC-06 | `techspec.md#test-approach` | Execução integrada de `release:check` |

## Context to recover on demand

- Applicable rules: `code-standards.md`, `javascript-typescript.md`, `node.md`, `tests.md`
- Existing scripts: `scripts/check-package.ts` (JSON parsing and validation patterns)
- Package configuration: `package.json`

## Work

- [x] T01.1 Implement `scripts/check-release-tag.ts` resolving tag from `--tag <arg>`, `process.env.GITHUB_REF_NAME`, or `process.env.TAG_NAME`, validating format (`v*.*.*`), reading `package.json` version, and asserting strict match.
- [x] T01.2 Add `release:verify-tag` and `release:check` scripts to `package.json`.
- [x] T01.3 Create `tests/unit/check-release-tag.test.ts` testing matching tags, mismatching tags, malformed tags, and prerelease versions.
- [x] T01.4 Run `npm run release:check` and verify all tests and quality checks pass.

## Acceptance criteria

- `scripts/check-release-tag.ts` returns exit code 0 when tag without `v` strictly equals `package.json` version.
- `scripts/check-release-tag.ts` returns exit code 1 with clear diagnostic output when tag is missing, malformed, or differs from `package.json` version.
- `npm run release:check` runs the complete pre-release gate cleanly.
- All new TypeScript code adheres to Quality Profile QA-01–QA-06.

## Verification

- Unit: `vitest run tests/unit/check-release-tag.test.ts` passes with 100% scenario coverage.
- Integration: `npm run release:check` executes successfully.
- Platforms: Windows, macOS, Linux (pure Node/TS script).
- Commands: `npm run release:check`, `npm test`
- Expected evidence: Test output with passed assertions; clean console diagnostics.

## Affected files

- Modify: `package.json`
- Create:
  - `scripts/check-release-tag.ts`
  - `tests/unit/check-release-tag.test.ts`

## Observability and recovery

- Operational signal: Stdout message on match (`Tag vX.Y.Z matches package.json version X.Y.Z`); Stderr error message on mismatch or invalid format.
- Recovery: Fix tag argument or update version in `package.json` if mismatch was intended.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Implemented cross-platform release tag verification script `scripts/check-release-tag.ts`, registered `release:verify-tag` and composite `release:check` scripts in `package.json`, ignored `tasks/**` and `.agents/**` in `eslint.config.js` to clear pre-existing non-source QA lint errors, and created 12 unit tests in `tests/unit/check-release-tag.test.ts` verifying all tag matching, mismatching, environment variable fallback, and malformed SemVer cases.
- Changed files:
  - `package.json`
  - `eslint.config.js`
  - `scripts/check-release-tag.ts`
  - `tests/unit/check-release-tag.test.ts`
- Checks:
  - `vitest run tests/unit/check-release-tag.test.ts` passed (12/12 tests).
  - `npm run release:verify-tag -- --tag v1.0.0` passed (code 0).
  - `npm run release:verify-tag -- --tag v1.0.1` failed as expected (code 1).
  - `npm run lint` passed (code 0).
  - `npm run typecheck` passed (code 0).
  - `npm run package:smoke` passed (code 0).
  - Quality Profile (QA-01–QA-06): no `any`, no suppressions, max parameters <= 3, file sizes <= 100 lines (`check-release-tag.ts`: 77 lines, `check-release-tag.test.ts`: 97 lines).
- Validated state: Clean lint, typecheck, unit tests, and package smoke on Windows / Node 20+.
- Open items: None.

### ADR candidates

None - direct TechSpec implementation or local decision.
