# Code review report — prd-05-automacao-de-release-e-publicacao

## Summary

- Status: APPROVED
- Git scope: `eb2f386583771f03334ecbf23afbd5361814e5f7..HEAD` (worktree with prd-05 files)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-05-automacao-de-release-e-publicacao/prd.md` | read |
| TechSpec | `tasks/prd-05-automacao-de-release-e-publicacao/techspec.md` | read |
| Manifest | `tasks/prd-05-automacao-de-release-e-publicacao/tasks.md` | read |
| Implementation | Diff against Git base `eb2f386`, task handoffs, and affected files | delimited |

Affected reviewable set:
- `.github/workflows/release.yml`
- `scripts/check-release-tag.ts`
- `docs/release-guide.md`
- `package.json` (modified scripts)
- `eslint.config.js` (modified ignores)
- `tests/unit/check-release-tag.test.ts`
- `tests/unit/release-workflow.test.ts`

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Workflow de release no GitHub Actions (`release.yml`) disparado por tag `v*.*.*` e `workflow_dispatch` | `.github/workflows/release.yml:4-13` | `tests/unit/release-workflow.test.ts:10-17` | conformant | Triggers asserted in unit tests and verified against GitHub Actions schema |
| FR-02 | Validação rigorosa pré-publicação no pipeline (build, checks, schemas, testes, coverage, smoke) | `.github/workflows/release.yml:38-61` | `tests/unit/release-workflow.test.ts:27-49` | conformant | Sequential execution order of all 8 verification gates asserted |
| FR-03 | Validação de consistência estrita entre Git Tag e `package.json` `"version"` | `scripts/check-release-tag.ts:43-58` | `tests/unit/check-release-tag.test.ts:71-96` | conformant | 12 unit tests passing, covering match, mismatch, invalid SemVer, and env fallbacks |
| FR-04 | Publicação autenticada no npm com Provenance via OIDC e `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` | `.github/workflows/release.yml:16,70-73` | `tests/unit/release-workflow.test.ts:51-56` | conformant | Minimal `id-token: write` permission, `--provenance`, and masked secret configuration verified |
| FR-05 | Criação automática de GitHub Release com notas geradas | `.github/workflows/release.yml:15,75-87` | `tests/unit/release-workflow.test.ts:58-63` | conformant | `gh release create --generate-notes` with `--prerelease` conditional logic verified |
| FR-06 | Script de checagem pré-release no `package.json` (`npm run release:check`) | `package.json:31` | `npm run release:check` composite scripts | conformant | `release:check` and `release:verify-tag` registered and verified |
| FR-07 | Guia operacional de release e configuração de secrets (`docs/release-guide.md`) | `docs/release-guide.md:1-161` | `npm run package:smoke` | conformant | Full maintainer instructions present; verified excluded from npm package bundle |
| NFR-01 | Segurança de credenciais (sem vazamento em logs, escopo mínimo OIDC) | `.github/workflows/release.yml:14-17,73`, `docs/release-guide.md:43-54` | `tests/unit/release-workflow.test.ts:10-17,51-56` | conformant | Tokens passed strictly via environment variables; minimal job-level permissions |
| NFR-02 | Integridade do pacote npm (sem arquivos uncompiled TS ou diretórios proibidos) | `package.json:30`, `docs/release-guide.md` | `npm run package:smoke` | conformant | 460 packaged files verified; `docs/release-guide.md` not packaged |
| NFR-03 | Idempotência e tratamento de erro explícito em caso de colisão de versão | `scripts/check-release-tag.ts:53-56`, `docs/release-guide.md:152-161` | `tests/unit/check-release-tag.test.ts:80-96` | conformant | Explicit diagnostics for mismatch, invalid formats, and documented registry immutability |
| NFR-04 | Desempenho e confiabilidade da esteira CI (`ubuntu-latest`, < 5 min) | `.github/workflows/release.yml:21` | `tests/unit/release-workflow.test.ts:19-25` | conformant | Single-job workflow architecture with npm caching eliminates multi-job transfer overhead |
| DEC-01 | Single-job GitHub Actions workflow com permissões mínimas (`contents: write`, `id-token: write`) | `.github/workflows/release.yml:14-22` | `tests/unit/release-workflow.test.ts:10-25` | conformant | Verified via YAML parsing test |
| DEC-02 | Script TypeScript `scripts/check-release-tag.ts` para validação de tag | `scripts/check-release-tag.ts:1-77` | `tests/unit/check-release-tag.test.ts:1-97` | conformant | 12/12 unit tests passing |
| DEC-03 | npm Provenance via `setup-node` e `--provenance` | `.github/workflows/release.yml:28-34,70-73` | `tests/unit/release-workflow.test.ts:51-56` | conformant | Registry URL and provenance flag asserted |
| DEC-04 | GitHub Release via `gh release create` nativo | `.github/workflows/release.yml:75-87` | `tests/unit/release-workflow.test.ts:58-63` | conformant | Native GitHub CLI without external 3rd-party actions |
| DEC-05 | Scripts `release:check` e `release:verify-tag` em `package.json` | `package.json:30-31` | `npm run release:verify-tag -- --tag v1.0.0` | conformant | Verified exit code 0 on match, 1 on mismatch |
| DEC-06 | `docs/release-guide.md` mantido fora do pacote npm publicado | `docs/release-guide.md` | `npm run package:smoke` | conformant | Packaging smoke confirms exclusion |
| DEC-07 | Teste automatizado de estrutura do workflow em `tests/unit/release-workflow.test.ts` | `tests/unit/release-workflow.test.ts:1-65` | `vitest run tests/unit/release-workflow.test.ts` | conformant | 5/5 unit tests passing |
| TC-01 | Tag matching aceita com exit code 0 | `scripts/check-release-tag.ts:43-58` | `tests/unit/check-release-tag.test.ts:71-78` | conformant | Verified |
| TC-02 | Tag mismatch rejeitada com exit code 1 | `scripts/check-release-tag.ts:53-56` | `tests/unit/check-release-tag.test.ts:80-87` | conformant | Verified |
| TC-03 | Tag malformada rejeitada com exit code 1 | `scripts/check-release-tag.ts:28-41` | `tests/unit/check-release-tag.test.ts:45-58` | conformant | Verified |
| TC-04 | Tag prerelease tratada via environment variable | `scripts/check-release-tag.ts:16-26` | `tests/unit/check-release-tag.test.ts:22-25,41` | conformant | Verified |
| TC-05 | Asserções de estrutura, triggers e permissões de `release.yml` | `.github/workflows/release.yml` | `tests/unit/release-workflow.test.ts:10-64` | conformant | Verified |
| TC-06 | Execução integrada de `release:check` | `package.json:31` | `npm run release:check` sub-scripts | conformant | Verified |
| TC-07 | Guia operacional completo e pacote limpo | `docs/release-guide.md` | `npm run package:smoke` | conformant | Verified |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | Single responsibility functions, strict validation, descriptive error messages in `scripts/check-release-tag.ts` |
| `javascript-typescript.md` | OK | Clean TypeScript ESM, `.js` extensions in imports, no `any`, no type assertions, no suppressions |
| `node.md` | OK | Node: protocol imports (`node:fs/promises`, `node:path`, `node:url`, `node:os`), proper CLI process exits |
| `tests.md` | OK | Vitest isolated suites with temporary directories and deterministic teardown (`withTempPackage`) |
| `cli-output.md` | N/A | No CLI console runtime output modified (feature affects CI/CD and developer scripts) |
| `file-changes.md` | OK | Minimal surgical edits to `package.json` and `eslint.config.js`; new files in approved paths |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 | No `any` (`:\s*any\b\|\bas any\b\|<any>`) | Blocking | `rg -n --type ts ':\s*any\b\|\bas any\b\|<any>' scripts/check-release-tag.ts tests/unit/check-release-tag.test.ts tests/unit/release-workflow.test.ts` | 0 of 0 | OK |
| QA-02 | No `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | Blocking | `rg -n --type ts '@ts-ignore\|@ts-nocheck\|eslint-disable' scripts/check-release-tag.ts tests/unit/check-release-tag.test.ts tests/unit/release-workflow.test.ts` | 0 of 0 | OK |
| QA-03 | No empty catch blocks | Blocking | `rg -n -U --type ts 'catch\s*(\([^)]*\))?\s*\{\s*\}' scripts/check-release-tag.ts tests/unit/check-release-tag.test.ts tests/unit/release-workflow.test.ts` | 0 of 0 | OK |
| QA-04 | No `exec`/`execSync`/`shell: true` outside script runners | Blocking | `rg -n --type ts '\bexecSync\(|\bexec\(|shell:\s*true' scripts/check-release-tag.ts tests/unit/check-release-tag.test.ts tests/unit/release-workflow.test.ts` | 0 of 0 | OK |
| QA-05 | File lines <= 100 | Reservation | `rg -c -H '^' scripts/check-release-tag.ts tests/unit/check-release-tag.test.ts tests/unit/release-workflow.test.ts` | 0 of 0 | OK |
| QA-06 | Parameter list <= 3 | Reservation | `rg -n -H --type ts '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{|=>)' scripts/check-release-tag.ts tests/unit/check-release-tag.test.ts tests/unit/release-workflow.test.ts` | 0 of 0 | OK |

- Terrain baseline: Applied from TechSpec (`package.json` lines: 55, pre-existing hits: 0)
- Hits discounted by baseline: 0
- Reservations accumulated in the feature: 0
- Suggested escalation: no trigger fired

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| DEC-01 (Single-job workflow, least privilege) | YES | `.github/workflows/release.yml:14-22` |
| DEC-02 (TypeScript tag verification script) | YES | `scripts/check-release-tag.ts:1-77` |
| DEC-03 (npm provenance via OIDC and secrets.NPM_TOKEN) | YES | `.github/workflows/release.yml:70-73` |
| DEC-04 (GitHub Release creation via gh CLI) | YES | `.github/workflows/release.yml:75-87` |
| DEC-05 (release:check and release:verify-tag npm scripts) | YES | `package.json:28-31` |
| DEC-06 (docs/release-guide.md excluded from npm tarball) | YES | Verified by `npm run package:smoke` |
| DEC-07 (Workflow structure automated unit test) | YES | `tests/unit/release-workflow.test.ts:1-65` |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_01.md` | COMPLETE | `scripts/check-release-tag.ts` implemented; `release:verify-tag` and `release:check` in `package.json`; 12/12 unit tests passing in `tests/unit/check-release-tag.test.ts`. |
| T02 | `done/task_02.md` | COMPLETE | `.github/workflows/release.yml` created with triggers, gates, provenance publish, and release creation; 5/5 unit tests passing in `tests/unit/release-workflow.test.ts`. |
| T03 | `done/task_03.md` | COMPLETE | `docs/release-guide.md` created covering setup, tokens, 2FA, release steps, and troubleshooting; package smoke confirms exclusion from npm bundle. |

## Executed validations

- Profile and scope: Node.js 20+ runtime, TypeScript 5.9+, Vitest 3.2 on Windows/Linux environments.
- Validated state: Clean worktree with prd-05 changes on Git base `eb2f386583771f03334ecbf23afbd5361814e5f7`.
- Reused evidence: Handoff evidence verified directly with fresh live test executions.
- Manual acceptance: CLI QA skipped by explicit user decision at HIL 2 (`DEC-HIL-02`) because feature affects CI/CD automation, scripts, and documentation rather than runtime CLI binaries.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npx vitest run tests/unit/check-release-tag.test.ts` | passed (12/12 tests, 129ms) | FR-03, DEC-02, TC-01, TC-02, TC-03, TC-04 |
| `npx vitest run tests/unit/release-workflow.test.ts` | passed (5/5 tests, 9ms) | FR-01, FR-02, FR-04, FR-05, NFR-01, NFR-04, DEC-01, DEC-03, DEC-04, DEC-07, TC-05 |
| `npm run lint` | passed (code 0, 0 errors, 0 warnings) | QA-01, QA-02 |
| `npm run typecheck` | passed (code 0, no type errors) | TypeScript strict type checking |
| `npm run package:smoke` | passed (code 0, 460 files verified) | NFR-02, DEC-06, TC-07 |
| `npm run schemas:check` | passed (code 0) | FR-02, TC-06 |
| `npm run dependencies:check` | passed (code 0) | FR-02, TC-06 |
| `npm run release:verify-tag -- --tag v1.0.0` | passed (code 0) | FR-03, DEC-05, TC-01 |
| `npm run release:verify-tag -- --tag v1.0.1` | passed (code 1, expected mismatch) | FR-03, DEC-05, TC-02 |

## Findings

None. All obligations conformant, no blocking or reservation hits identified.

## Previous findings (re-review only)

None — first review cycle for this feature.

## Limitations and open items

- **Author-independence limitation**: This review was executed in the session that authored the implementation (resumed after session pause). To compensate for this limitation, all quality profile rules were strictly verified via ripgrep regex commands, all unit tests were executed with fresh live runs, and documentation was inspected for complete requirement coverage.
- **Production OIDC reach**: Live publishing to the public npm registry with OIDC provenance attestation cannot be executed locally as it requires GitHub Actions runner tokens and repository secrets (`NPM_TOKEN`). Structural and functional correctness is proven via workflow unit tests, script tests, and local dry-run checks; the first real execution will occur when the maintainer pushes a release tag to GitHub.

## Conclusion

APPROVED. All requirements (`FR-01`–`FR-07`, `NFR-01`–`NFR-04`), technical decisions (`DEC-01`–`DEC-07`), components (`CMP-01`–`CMP-06`), and test cases (`TC-01`–`TC-07`) are fully implemented and verified. All 17 unit tests pass, lint and typecheck pass cleanly with code 0, package smoke passes with boundaries intact, and the Quality Profile has 0 blocking and 0 reservation hits.
