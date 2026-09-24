# Stable execution context

Load in this exact order:

1. `tasks/prd-05-automacao-de-release-e-publicacao/prd.md`
2. `tasks/prd-05-automacao-de-release-e-publicacao/techspec.md`
3. This file

Use the current PRD and TechSpec versions already loaded; recover only missing or changed sources. This order does not guarantee a host cache hit.

---

# T03 — Maintainer release guide documentation

## Outcome

A clear, actionable operational guide `docs/release-guide.md` providing step-by-step instructions for repository maintainers on setting up npm publishing tokens, configuring GitHub repository secrets, 2FA requirements, tagging releases, manual workflow dispatch, and troubleshooting, verified to reside outside the published npm package files.

## Dependencies and boundaries

- Depends on: T01
- Unblocks: —
- In scope:
  - Create `docs/release-guide.md`
  - Verify package boundary isolation (`npm run package:smoke`) ensuring the guide does not bloat the npm package tarball
- Out of scope:
  - Modifying code or package manifest files

## Traceability

| Source | Section | Obligation covered |
| --- | --- | --- |
| FR-07 | `prd.md#functional-requirements` | Guia operacional de release e configuração de secrets (`docs/release-guide.md`) |
| NFR-01 | `prd.md#non-functional-requirements` | Segurança de Credenciais |
| NFR-02 | `prd.md#non-functional-requirements` | Integridade de Conteúdo |
| NFR-03 | `prd.md#non-functional-requirements` | Idempotência e Tratamento de Erro |
| DEC-06 | `techspec.md#technical-decisions` | `docs/release-guide.md` mantido fora do pacote npm publicado |
| CMP-04 | `techspec.md#components-and-flow` | `docs/release-guide.md` |
| TC-07 | `techspec.md#test-approach` | Guia operacional completo e pacote limpo |

## Context to recover on demand

- TechSpec section DEC-06 and CMP-04
- Workflow created in T02 (`.github/workflows/release.yml`)
- Packaging script `scripts/check-package.ts`

## Work

- [x] T03.1 Author `docs/release-guide.md` detailing:
  - Overview of release architecture (tag push, provenance, GitHub Release)
  - npm token generation: Granular Access Token (with Read & Write on `context-brake`) or Automation Token, and 2FA requirements
  - GitHub Secret configuration: adding `NPM_TOKEN` under Repository Settings -> Secrets and variables -> Actions
  - Release execution steps: local verification with `npm run release:check`, version bump, Git tag creation (`git tag vX.Y.Z`), and pushing tag (`git push origin vX.Y.Z`)
  - Manual dispatch flow via GitHub Actions UI
  - Verification on npmjs.com and GitHub Releases
  - Troubleshooting (version conflict, missing secret, failed tests, unpublishing guidelines)
- [x] T03.2 Run `npm run package:smoke` to ensure `docs/release-guide.md` is not included in the npm package tarball.
- [x] T03.3 Verify full documentation consistency and clarity.

## Acceptance criteria

- `docs/release-guide.md` covers all requirements specified in FR-07.
- `npm run package:smoke` passes without including `docs/release-guide.md` in the published tarball.
- Instructions are fully reproducible and accurately describe repository workflows and scripts.

## Verification

- Manual / Inspection: Review `docs/release-guide.md` against FR-07 checklist.
- Packaging check: `npm run package:smoke` confirms published files match `REQUIRED_FILES` and contain no unwanted docs.
- Commands: `npm run package:smoke`
- Expected evidence: Verified documentation file on disk; clean package smoke output.

## Affected files

- Create:
  - `docs/release-guide.md`

## Observability and recovery

- Operational signal: Documentation available for all current and future maintainers.
- Recovery: Documentation updates can be made directly via git commits.

## Handoff

> Updated by `sdd-execute-task` during implementation.

- Produced result: Created comprehensive maintainer release guide `docs/release-guide.md` detailing repository secret configuration (`NPM_TOKEN`), npmjs.com granular and automation token generation, 2FA prerequisites, local pre-release verification (`release:check`), tag push procedure, manual workflow dispatch, post-publish verification, and troubleshooting. Confirmed through `npm run package:smoke` that `docs/release-guide.md` remains outside the published npm package tarball.
- Changed files:
  - `docs/release-guide.md`
- Checks:
  - Manual inspection against FR-07 acceptance criteria: All items covered.
  - `npm run package:smoke` passed (460 files verified, clean).
  - `npm run lint` passed (code 0).
  - `npm run typecheck` passed (code 0).
- Validated state: Documentation complete and verified on Windows / Node 20+.
- Open items: None.

### ADR candidates

None - direct TechSpec implementation or local decision.
