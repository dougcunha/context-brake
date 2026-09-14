# Code review report — Installation, Detection, and Diagnostics

## Summary

- Status: REJECTED
- Git scope: `Not delimited — see limitations` (repository has zero commits; reviewed the full worktree plus handoffs)
- Previous review: —

## Sources and scope

| Source | Path or reference | State |
| --- | --- | --- |
| PRD | `tasks/prd-01-instalacao-deteccao-diagnostico/prd.md` | read |
| TechSpec | `tasks/prd-01-instalacao-deteccao-diagnostico/techspec.md` | read |
| Manifest | `tasks/prd-01-instalacao-deteccao-diagnostico/tasks.md` | read |
| Handoffs | `tasks/prd-01-instalacao-deteccao-diagnostico/done/task_1.md` … `task_6.md` | read |
| Implementation | Worktree `src/`, `tests/`, `schemas/`, `assets/`, `scripts/`, `.github/`, `README.md`, `AGENTS.md` | delimited by worktree only |

The repository has no commits (`git rev-list --count --all` = 0, no `HEAD`), so no `--base` can be resolved to a commit. The reviewable set is the entire untracked worktree, cross-checked against the six task handoffs. `tasks.md` links, the `done/` files, and every UT/IT/E2E identifier were confirmed present.

## Coverage matrix

| Source | Obligation | Implementation | Test | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| RF1 | Detect the eight MVP harnesses | `src/infrastructure/harnesses/registry.ts:20` + per-harness detectors | IT-16 | conformant | `tests/integration/detection-cross-signals.test.ts`; registry has 8 descriptors |
| RF2 | Report project vs machine origin and version | `detection-service.ts:34`, `detection-collector.ts:6` | UT-03, UT-15 | conformant | `HarnessDetection.evidence`/`versionSource` in install/doctor JSON |
| RF3 | Shared instruction files are not proof | `claude-code/detector.ts:4` (no `AGENTS.md`), `SHARED_INSTRUCTION_EVIDENCE` filter | UT-01 | conformant | `detection-service.ts:18`; IT-16 |
| RF4 | Explicit include/exclude precedence | `argument-validator.ts:20`, `detection-service.ts:35` | UT-02, IT-03 | conformant | conflicting pair rejected `INVALID_ARGUMENTS` |
| RF5 | Register in each vendor extension mechanism | per-harness `planner.ts` | IT-01, IT-02 | conformant | Claude/Codex/Cursor/Copilot/Antigravity + in-process plugins |
| RF6 | Preserve existing user integrations/config bytes | per-harness planners + `json-document-editor.ts` | IT-01, UT-04 | **non-conformant** | CR-01: valid single-line JSON is corrupted by `insertObjectEntry` |
| RF7 | Invalid vendor config isolated, peers continue | planners return `INVALID_HARNESS_CONFIG`; `installation-service.ts:82` | UT-05, IT-04, E2E-05 | conformant | `tests/integration/multi-harness-install.test.ts` |
| RF8 | Support level per harness | `support-service.ts:50` + adapter capability tables | UT-18 | conformant | `deriveSupportProfile` |
| RF9 | Warn on version below minimum | `support-service.ts:21` | UT-15 | conformant | limitation text carries detected/minimum/capability |
| RF10 | Create the protocol file | `protocol-service.ts:16` | protocol unit + E2E-01 | conformant | `docs/context-brake-protocol.md` matches `renderProtocol` |
| RF11 | Add ≤10-line reference block between own markers | `instruction-markers.ts:17`, `instruction-service.ts` | UT-07, IT-06 | conformant | 3-line block; CA-08 |
| RF12 | Do not create instruction files unless authorized | `instruction-service.ts:30` | UT-08, IT-06 | conformant | `--create-instructions` only |
| RF13 | Symlink target edited once, link preserved | `instruction-service.ts:18` dedup by `fileIdentity` | UT-06, IT-05, E2E-10 | conformant | `realPath`-targeted write; link survives |
| RF14 | Legacy `CONTEXTOPS` migration offered with preview | `instruction-service.ts:71` detects; `legacyDetected` | UT-09, IT-07 | **non-conformant** | CR-02: no preview/notice reaches the CLI output |
| RF15 | Create config with defaults | `configuration.ts:25`, `installation-builder.ts:6` | configuration tests | conformant | `DEFAULT_CONFIG` matches TechSpec |
| RF16 | Validate config with field/value/rule | `configuration-validator.ts:8` | UT-12, IT-10 | conformant | cross-field issue path/`received`/rule |
| RF17 | Publish config schema | `schemas/*.schema.json`, `generate/check-schemas.ts` | schemas:check, package:smoke | conformant | 3 Draft 2020-12 schemas current and packed |
| RF18 | Dry-run preview, no side effects | `commands/init.ts:61`, `commands/remove.ts:58` | UT-10, IT-08, E2E-06 | conformant | no write port called |
| RF19 | Conservative removal; state only on consent | `removal-service.ts`, `removal-helper.ts` | UT-11, IT-09, E2E-07 | conformant | modified assets → conflict; `--remove-state` only |
| RF20 | Doctor lists state/version/support/missing capabilities | `doctor-service.ts`, adapters, `output/text.ts` | IT-11, E2E-08 | conformant | `HarnessDiagnostic` |
| RF21 | Doctor validates config/markers/protocol/state | `doctor-checks.ts` | doctor-checks unit, IT-10 | conformant | read-only, never repairs |
| RF22 | Measure overhead p95 vs PRD-02 target | `overhead-measurer.ts`, `p95.ts` | UT-17, IT-14, E2E-08 | conformant | process 100 ms / in-process 15 ms |
| RF23 | Text + JSON parity, distinct exit codes | `report-service.ts`, `output/*`, `exit-codes.ts` | UT-16, UT-20, E2E-08 | conformant | 0/1/2, 64, 130 |
| CA-01 | `init --yes` on Claude registers + config + summary | `commands/init.ts` | E2E-01, E2E-10 | conformant | executed; exit 0 |
| CA-02 | Codex + Cursor configured together | `installation-service.ts:73` | E2E-02, IT-02 | conformant | executed |
| CA-03 | AGENTS.md-only repo → no integration, warning | `installation-service.ts:35` | E2E-03, UT-01 | conformant | executed; exit 1 with remediation |
| CA-04 | Exclude Copilot, install Cursor | `argument-validator.ts`, detection | UT-02, IT-03 | conformant | dedicated files untouched |
| CA-05 | Three runs preserve users, one integration | planners + `change-plan-service.ts:44` | E2E-04, UT-04, IT-01 | conformant* | *only multi-line fixtures; minified case fails (CR-01) |
| CA-06 | Invalid harness file untouched, error, peers continue | planners, `change-applier.ts:59` | E2E-05, IT-04, UT-05 | conformant | executed |
| CA-07 | Symlinked `AGENTS.md` → one block, link kept | `instruction-service.ts:18` | E2E-10, IT-05, UT-06 | conformant | PowerShell + Git Bash executed |
| CA-08 | Reference block ≤10 lines, points to protocol | `instruction-markers.ts:17` | UT-07, IT-06 | conformant | 3 lines |
| CA-09 | No instruction file created without option | `instruction-service.ts:30` | UT-08, IT-06 | conformant | executed |
| CA-10 | Legacy preview without confirmation | `installation-service.ts` (no output) | UT-09, IT-07 | **non-conformant** | CR-02: file unchanged but no proposed change shown |
| CA-11 | Dry-run changes nothing and lists changes | `commands/init.ts:61` | E2E-06, IT-08, UT-10 | conformant | executed |
| CA-12 | Remove owned content, keep rest and state | `removal-service.ts` | E2E-07, IT-09, UT-11 | conformant | executed |
| CA-13 | Invalid zone cross-field → error with field/value/rule | `configuration-validator.ts:16` | UT-12, IT-10 | conformant | executed |
| CA-14 | Manually removed integration → `missing`, error | `doctor-service.ts:25` | E2E-08, IT-11, UT-13 | conformant | executed |
| CA-15 | Copilot partial + timeout reason | `github-copilot-cli/adapter.ts:14` | IT-12, UT-14, E2E-08 | conformant | limitation emitted |
| CA-16 | Old version shows detected/minimum/capability | `support-service.ts:21` | IT-13, UT-15 | conformant | injected fixtures (TechSpec permits) |
| CA-17 | `doctor --json` valid per published schema, same findings | `report-service.ts:69`, `output/json.ts` | E2E-08, UT-16 | conformant | executed |
| CA-18 | Doctor shows measured p95 and goal | `overhead-measurer.ts:66` | E2E-08, IT-14, UT-17 | conformant | executed |
| CA-19 | README quick-start ≤2 min error-free | `README.md`, `e2e-09.test.ts` | E2E-09 | conformant | executed in 8.8 s |
| CA-20 | CA-01/05/07 on Linux, macOS, Windows shells | E2E-10 + `.github/workflows/ci.yml` | E2E-10 | not verifiable | Windows PowerShell + Git Bash executed here; Linux/macOS not run locally (see limitations) |

## Compliance with rules and skills

| Rule or skill | State | Evidence |
| --- | --- | --- |
| `code-standards.md` | OK | `npm run lint` exit 0; 100-line/30-line/3-param enforced in `eslint.config.js:10`; no `any` (`rg` clean) |
| `javascript-typescript.md` | OK | strict ESM, literal unions, Zod at boundaries, no `var` observed |
| `node.md` | OK | `spawn`/argument arrays in `node-process-runner.ts`/`overhead-measurer.ts`; timeouts and tree kill present |
| `tests.md` | NOT OK | coverage gate passes, but no fixture covers single-line/minified harness configs, which hides CR-01 |
| `harness-adapters.md` | OK | non-strict vendor schemas; `docs/research/harness-integrations.md` Copilot section reconciled |
| `file-changes.md` | NOT OK | `insertObjectEntry` appends bytes after the root object for single-line documents (CR-01) |
| `cli-output.md` | OK | stdout results / stderr findings, one JSON document, `[OK]/[WARN]/[ERROR]`, no TTY prompt without `--yes` |
| Hexagonal architecture (`AGENTS.md`) | OK | no `src/core` import of `infrastructure/` or `cli/` (grep clean) |

## Quality profile

| ID | Rule | Class | Command | Hits | State |
| --- | --- | --- | --- | --- | --- |
| QA-01 (derived) | ≤100 lines/file, ≤30 lines/function, ≤3 params | blocking | `npm run lint` | 0 | OK |
| QA-02 (derived) | ≥80% lines/statements/functions/branches | blocking | `npm run coverage` | 0 | OK (91.21 / 91.21 / 96.05 / 81.03) |
| QA-03 (derived) | strict typecheck | blocking | `npm run typecheck` | 0 | OK |
| — | Formal TechSpec quality profile (QA-NN rules) and Terrain baseline | — | — | — | missing — see limitations |

- Terrain baseline: missing — the TechSpec defines no quality profile or baseline. Every check above was treated as an absolute gate, not a delta; per the skill this is recorded as a limitation rather than a zeroed baseline.
- Hits discounted by baseline: not applicable (no baseline).
- Reservations accumulated in the feature: 0 (handoffs `task_2`–`task_6` report none; no reservation rules exist to count).
- Suggested escalation: no trigger fired (no profile reservations).

## TechSpec adherence

| Decision or contract | State | Evidence |
| --- | --- | --- |
| Hexagonal ports/adapters, acyclic modules | YES | `src/core/contracts/*`, `cli/composition-root.ts`; no reverse imports |
| Durable self-contained runtime assets, no hook-time npx | YES | `assets/runtime/*`, `scripts/build-assets.ts`, `package:smoke` packs 5 assets |
| Machine-only signals stay candidates | YES | `detection-service.ts:40`; UT-03 |
| Surgical edit preserving trivia; refuse invalid | PARTIAL | multi-line preserved (UT-19); single-line broken (CR-01) |
| Per-file atomicity + optimistic concurrency | YES | `atomic-writer.ts`, `change-applier.ts:8`; IT-15 |
| Legacy migration has its own consent | PARTIAL | `--migrate-legacy` gates it, but no preview is surfaced (CR-02) |
| Removal conservative, state explicit | YES | `removal-helper.ts:40`; IT-09 |
| Existing config authoritative; unmanaged protocol is a conflict | YES | `protocol-service.ts:45`; `commands/init.ts:20` |
| Stable health exits 0/1/2, 64, 130 | YES | `exit-codes.ts`, `report-service.ts:85` |
| Honest version compatibility (nullable floor) | PARTIAL | floors are `null`; the named `VERSION_FLOOR_UNVERIFIED` code is not emitted (limitation text only) |
| Overhead targets 100 ms process / 15 ms in-process | YES | adapter `benchmarkFixture()` values |

## Verified tasks

| Task | Location | State | Handoff and evidence |
| --- | --- | --- | --- |
| T01 | `done/task_1.md` | COMPLETE | package/config/schemas/exit codes; commands recorded in `AGENTS.md` |
| T02 | `done/task_2.md` | COMPLETE | detection, selection, version/support policy; 48 tests claimed |
| T03 | `done/task_3.md` | COMPLETE | change engine; contains origin of CR-01 (`json-document-editor.ts`) |
| T04 | `done/task_4.md` | COMPLETE | eight adapters; planners contain origin of CR-01; research reconciled |
| T05 | `done/task_5.md` | COMPLETE | init/remove/doctor; origin of CR-02 (drops `legacyDetected`) |
| T06 | `done/task_6.md` | COMPLETE | packaging/CI/README; origin of CR-03 (README example) |

All six tasks are linked and marked `[x]` in `tasks.md`; handoff files exist and record green commands.

## Executed validations

- Profile and scope: full worktree; Windows 11 (win32), Node v24.19.0, npm 11.17.0, PowerShell 7 and Git Bash. Linux/macOS not executed locally.
- Validated state: built `dist/` from the current worktree; configuration and platform fixed to the above.
- Reused evidence: handoff command results were not reused where a local re-run was possible; every gate below was re-run on the current tree.
- Manual acceptance: no manual TTY session was performed; non-TTY `--yes` paths were exercised. No essential manual item remains beyond platform coverage.

| Command | Result | Obligations covered |
| --- | --- | --- |
| `npm run build` | passed | RF10, RF17, assets |
| `npm run typecheck` | passed | QA-03 |
| `npm run lint` | passed | QA-01, rules |
| `npm run coverage` (50 files, 167 tests) | passed | UT-01…UT-20, IT-01…IT-16, E2E-01…E2E-10, QA-02 |
| `npm run schemas:check` | passed | RF17 |
| `npm run dependencies:check` | passed (3 deps, no install scripts) | node.md |
| `npm run assets:check` | passed | RF5 durability |
| `npm run package:smoke` | passed (183 files) | RF17, CA-19 |
| repro: `setJsonProperty('{"hooks":{"UserHook":"node custom.js"}}', …)` | **failed** (`InvalidJsonDocumentError`) | RF6, RF7, file-changes.md |
| repro: built CLI `init --yes` on legacy fixture | **no legacy output** | RF14, CA-10 |
| repro: `configurationSchema.safeParse(README example)` | **invalid** (`./task_plan.json`) | RF17, CA-19 docs |

## Findings

| ID | Severity | Source | Evidence | Impact | Proven recommendation |
| --- | --- | --- | --- | --- | --- |
| CR-01 | High | RF6, RF7, `file-changes.md` | `src/infrastructure/storage/json-span-utils.ts:37` (`insertObjectEntry`) — for a valid single-line object, it inserts `,` before the parent's closing brace and appends the new entry after the root, yielding `{"hooks":{"UserHook":"node custom.js"},}} … "PreToolUse":[…]`; the next `setJsonProperty` in `claude-code/planner.ts:56`, `cursor/planner.ts:48`, `codex-cli/planner.ts:51`, `antigravity-cli/planner.ts:52` calls `parseAndValidateJson` and throws `InvalidJsonDocumentError`, which escapes the adapter and becomes `UNEXPECTED_ERROR` (`src/cli/main.ts:46`). Reproduced directly against `dist`. | Any valid minified `.claude/settings.json`, `.cursor/hooks.json`, `.codex/hooks.json`, or `.agents/hooks.json` with existing entries makes `init` abort with exit 2, configuring nothing; the byte-preservation contract is violated and no isolated conflict is produced. | Make `insertObjectEntry`/`insertArrayItem` insert relative to the parent node's closing token regardless of formatting (do not assume the last child ends the document line), add single-line/minified fixtures for every JSON-editing adapter, and wrap adapter planning so an editor exception is converted to an isolated `INVALID_HARNESS_CONFIG` conflict instead of `UNEXPECTED_ERROR`. |
| CR-02 | High | RF14, CA-10, UT-09 | `src/core/services/instruction-service.ts:100` returns `legacyDetected`, but `src/core/services/installation-service.ts:72-88` never reads it; no finding, plan entry, or text line is produced. Built CLI on a fixture with a `CONTEXTOPS` block: `init --yes` output lists only ordinary changes, `init --dry-run --json` contains no `legacy`/`migrat`/`CONTEXTOPS` reference. | The user is never told a legacy block exists, never sees "the proposed change", and gets no hint to pass `--migrate-legacy`; RF14's "offer migration with preview" and CA-10's second clause are unmet. | Surface `legacyDetected` as a preview finding (e.g., `LEGACY_BLOCK_DETECTED`, severity warning, with the proposed replacement as preview) in the install report and text renderer, and mention `--migrate-legacy` in the remediation; keep the file unchanged without it. |
| CR-03 | Medium | Task T06 reconciliation, CA-19, RF17 | `README.md:120-121` documents `"planFile": "./task_plan.json"` and `"checkpointFile": "./state_checkpoint.json"`; `configurationSchema` rejects the `./` prefix (`configuration.ts:5`). `README.md:90` states legacy blocks "are migrated only after you confirm", but the CLI only migrates with `--migrate-legacy` and never prompts for it. | Users copying the published configuration example get `INVALID_CONTEXTBRAKE_CONFIG`; the legacy sentence describes behavior the CLI does not implement. | Change the example to `task_plan.json`/`state_checkpoint.json` and reword legacy migration to require `--migrate-legacy` (after CR-02, describe the preview/confirmation accurately). |

## Previous findings (re-review only)

Not applicable — this is the first review.

## Limitations and open items

- No git base: the repository has zero commits, so the reviewable set is the whole worktree and cannot be attributed to a commit range. A future re-review should fix a base once the work is committed.
- No formal TechSpec quality profile (QA-NN rules) and no Terrain baseline exist; the repository's declared constraints (lint limits, coverage thresholds, strict typecheck) were run as absolute gates. A profile and baseline must be added to the TechSpec to distinguish new debt from pre-existing debt.
- CA-20 is not verifiable for Linux and macOS in this environment; only Windows PowerShell and Git Bash were executed. `.github/workflows/ci.yml` configures the full matrix, but no green CI run artifact is available (no remote/commit history). CA-07 relies on Windows symlink privileges, which were available here.
- Real minimum-version handling cannot be observed end-to-end because every adapter reports `minimumVersion: null`; CA-16 is covered only by injected fixtures, which the TechSpec explicitly permits. The diagnostic code `VERSION_FLOOR_UNVERIFIED` named in the TechSpec is not emitted.
- Tests exercise multi-line/pretty JSON fixtures only; CR-01 shows the lack of single-line fixtures for `src/infrastructure/storage/json-*`.
- No manual interactive TTY confirmation session was performed; only `--yes`/non-TTY paths were executed.

## Conclusion

The feature is substantially implemented and its automated suite is green: 167 tests pass across 50 files with coverage above every threshold, and the built CLI satisfies most acceptance criteria end to end on Windows. However, two obligations are non-conformant: RF6/RF7 (and `file-changes.md`) are broken by CR-01, where the surgical JSON editor corrupts valid single-line harness configs and aborts `init` with an unhandled `UNEXPECTED_ERROR`; and RF14/CA-10 are broken by CR-02, where legacy `CONTEXTOPS` blocks are detected internally but never previewed, advised, or surfaced to the user. CR-03 additionally leaves the README's configuration example and legacy wording inconsistent with the implemented behavior. Because non-conformant obligations are present, the review is **REJECTED** pending correction of CR-01 and CR-02 (CR-03 recommended in the same pass), with revalidation of the affected adapters and report path.
