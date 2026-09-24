# Stable execution context

Load in this exact order:

1. `tasks/prd-05-automacao-de-release-e-publicacao/prd.md`
2. `tasks/prd-05-automacao-de-release-e-publicacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T02 — GitHub Actions release workflow and structure tests

## Outcome

A complete GitHub Actions release pipeline definition `.github/workflows/release.yml` executing the full pre-publication verification suite, checking tag-version synchronization, publishing to the public npm registry with cryptographic provenance via OIDC, and generating a GitHub Release, validated by automated unit tests in `tests/unit/release-workflow.test.ts`.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: —
- In scope:
  - Create `.github/workflows/release.yml`
  - Create `tests/unit/release-workflow.test.ts`
- Out of scope:
  - Maintainer documentation in `docs/release-guide.md` (handled in T03)

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-01 | `prd.md#functional-requirements` | Workflow de release no GitHub Actions (`release.yml`) disparado por tag `v*.*.*` e `workflow_dispatch` |
| FR-02 | `prd.md#functional-requirements` | Validação rigorosa pré-publicação no pipeline |
| FR-04 | `prd.md#functional-requirements` | Publicação autenticada no npm com Provenance via OIDC e `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` |
| FR-05 | `prd.md#functional-requirements` | Criação automática de GitHub Release com notas geradas |
| NFR-01 | `prd.md#non-functional-requirements` | Segurança de credenciais (sem vazamento em logs, escopo mínimo OIDC) |
| NFR-03 | `prd.md#non-functional-requirements` | Idempotência e tratamento de erro explícito |
| NFR-04 | `prd.md#non-functional-requirements` | Desempenho e confiabilidade da CI (`ubuntu-latest`, < 5 min) |
| DEC-01 | `techspec.md#technical-decisions` | Single-job workflow com permissões mínimas (`contents: write`, `id-token: write`) |
| DEC-03 | `techspec.md#technical-decisions` | npm Provenance via `setup-node` e `--provenance` |
| DEC-04 | `techspec.md#technical-decisions` | GitHub Release via `gh release create` nativo |
| DEC-07 | `techspec.md#technical-decisions` | Teste automatizado de estrutura do workflow em `tests/unit/release-workflow.test.ts` |
| CMP-01 | `techspec.md#components-and-flow` | `.github/workflows/release.yml` |
| CMP-06 | `techspec.md#components-and-flow` | `tests/unit/release-workflow.test.ts` |
| TC-05 | `techspec.md#test-approach` | Asserções de estrutura, triggers e permissões de `release.yml` |

## Context to recover on demand

- Existing CI workflow: `.github/workflows/ci.yml` (reference for Node setup, caching, and steps)
- Verification script from T01: `scripts/check-release-tag.ts`
- PRD requirements FR-01, FR-02, FR-04, FR-05

## Work

- [x] T02.1 Create `.github/workflows/release.yml` specifying:
  - Name `Release`
  - Push tag trigger for `v[0-9]+.[0-9]+.[0-9]+*` and `workflow_dispatch`
  - Minimal permissions: `contents: write`, `id-token: write`
  - Steps: checkout, setup Node 20 with npm registry URL, `npm ci --ignore-scripts`, all pre-release checks (`schemas:check`, `dependencies:check`, `build`, `typecheck`, `lint`, `test`, `coverage`, `package:smoke`), tag consistency check (`tsx scripts/check-release-tag.ts`), npm publish with `--provenance` using `NODE_AUTH_TOKEN`, and GitHub Release creation via `gh release create`.
- [x] T02.2 Create `tests/unit/release-workflow.test.ts` to parse and assert workflow triggers, permissions, step order, and publish parameters.
- [x] T02.3 Run tests and verify the workflow meets all non-functional requirements (NFR-01, NFR-03, NFR-04).

## Acceptance criteria

- `.github/workflows/release.yml` is valid YAML and includes all specified steps in strict sequential order.
- Permissions are strictly limited to `contents: write` and `id-token: write`.
- Secrets are masked and only referenced in the publish step via `NODE_AUTH_TOKEN`.
- `tests/unit/release-workflow.test.ts` passes and asserts all structural invariants.

## Verification

- Unit: `vitest run tests/unit/release-workflow.test.ts` passes.
- Lint/Typecheck: `npm run lint` and `npm run typecheck` pass.
- Commands: `npm test`
- Expected evidence: Green test output verifying all structural properties of `release.yml`.

## Affected files

- Create:
  - `.github/workflows/release.yml`
  - `tests/unit/release-workflow.test.ts`

## Observability and recovery

- Operational signal: Visual GitHub Actions pipeline steps with explicit step names; Sigstore provenance attestation on npmjs.com.
- Recovery: If workflow fails before publish, fix issue and re-push tag or run via `workflow_dispatch`.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Created complete GitHub Actions release pipeline `.github/workflows/release.yml` with tag push (`v*.*.*`) and `workflow_dispatch` triggers, least-privilege permissions (`contents: write`, `id-token: write`), full pre-release gate execution, tag-version synchronization check via `check-release-tag.ts`, npm publishing with provenance (`--provenance`) via `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`, and automatic GitHub Release creation via `gh release create`. Created 5 unit tests in `tests/unit/release-workflow.test.ts` verifying all structural, security, trigger, and sequencing invariants.
- Changed files:
  - `.github/workflows/release.yml`
  - `tests/unit/release-workflow.test.ts`
- Checks:
  - `vitest run tests/unit/release-workflow.test.ts` passed (5/5 tests).
  - `npm run lint` passed (code 0).
  - `npm run typecheck` passed (code 0).
  - Quality Profile (QA-01–QA-06): no `any`, no suppressions, max parameters <= 3, file size <= 100 lines (`release-workflow.test.ts`: 65 lines).
- Validated state: Clean lint, typecheck, and unit test pass on Windows / Node 20+.
- Open items: None.

### ADR candidates

None - direct TechSpec implementation or local decision.
