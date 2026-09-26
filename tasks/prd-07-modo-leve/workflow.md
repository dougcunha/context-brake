# Workflow and Decisions — prd-07-modo-leve

## Feature Summary

- Feature: `prd-07-modo-leve` (explicit light mode: telemetry with size, zone, and snapshot timing only; no plan, checkpoint, snapshot, protocol, instruction, or `.gitignore` files; no brake; no boot)
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `completed`
- Git base: `c3fb6a894ca056fde67b19a6c0350544b51f6b11`
- Predecessors: `prd-01` to `prd-06` (`completed`)

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-HIL-01 | 2026-09-26 | Product | PRD approved (`FR-01`–`FR-13`, `NFR-01`–`NFR-05`, `OBJ-01`–`OBJ-04`, `US-01`–`US-05`) with PD-01 to PD-04 as proposed (sha256 ccf72941c39dfb554a93b5d062a9117cf59caf96b5ad2f9548abd6f34d322fef). Human text: "Aprovar como está (Recommended)". | APPROVED |
| DEC-HIL-02-R | 2026-09-26 | Architecture & Plan | HIL 2 returned for revision. Human text: "Ajuste o plano: a instrução não deve citar diretamente a skill de snapshot, mas sim instruir a fazer snapshot/checkpoint. Nesse modo não vai ter suporte a configurar skill de snapshot. Segundo: adicione uma informação adicional no doctor - se for viável - para exibir também a o percentual de uso atual da context window das sessões em execução naquele repo." CLI QA: "Pular QA de CLI (Recommended)" (recorded; applies to the revised plan). Session: "Continuar nesta sessão (Recommended)". | REVISION REQUESTED |
| DEC-HIL-02 | 2026-09-26 | Architecture & Plan | Revised PRD (sha256 2b8f0f33fdff2f16efd99989d999965bc56439bcdec673711b99b5493a39e17c), TechSpec (`DEC-01`–`DEC-12`, `TC-01`–`TC-17`, `QA-01`–`QA-09`; sha256 189cbcb2ffd257f72052ffc731a441fca6e59db3a3b7dc5cf5558cf8d8c9aafb), and tasks `T01`–`T06` (sha256 0a30bc6f994939d194338eb9151522a4b9c19ce2f2cbb35dc54dcb52c6866381) approved; implementation and corrections within these contracts authorized. Preparatory refactoring not recommended. CLI QA skipped. Human text: "Aprovar e autorizar (Recommended)"; session: "Continuar nesta sessão (Recommended)". | APPROVED |
| DEC-PAUSE-T06 | 2026-09-26 | Session continuity | After T06: "Encerrar e revisar em nova sessão (Recommended)". The authoring session ends; the review runs in a new session. | RECORDED |
| DEC-CORR-01 | 2026-09-26 | Corrections (codereview_01) | The correction round covers `CR-01` and `CR-02`, which `DEC-HIL-02` already authorizes, plus two optional improvements the user chose: `OI-01` and `OI-03`. `OI-02` is not included. Human text: "OI-01 --no-light conflict, OI-03 null-usage text test"; session: "Continue in this session (Recommended)". The review session plans and applies the corrections; the re-review runs in a new session. | APPROVED |
| DEC-PAUSE-HIL1 | 2026-09-26 | Session continuity | "Continuar nesta sessão (Recommended)". Proceeding to TechSpec. | RECORDED |
| DEC-RES-01 | 2026-09-26 | Reservations (codereview_02) | `codereview_02/OI-01` (QA-09, `tests/test-lanes.ts` at 106 lines) is accepted as an open item; the lane lists are split at the next change to that file. Human text: "Finalize, accept OI-01 (Recommended)". | ACCEPTED |
| DEC-HIL-03 | 2026-09-26 | Acceptance | The delivery is accepted on `codereview_02` (APPROVED WITH RESERVATIONS; CLI QA skipped by `DEC-HIL-02`). Also accepted: the three NFR-01 deviations (`inSchemaOrder` key order on the first delegated write; `remove` restoring the original bytes for a block that ends a file, with and without a trailing newline). Open items: Linux and macOS CI, the optional manual acceptance, and `OI-01`. No commit or push is authorized. Human text: "Accept as is (Recommended)"; session: "Continue in this session (Recommended)". | APPROVED |

## Milestone History

1. **Flow start (2026-09-26)**: No pending checkpoints (prd-02 to prd-06 all `completed`). The request (a super-light mode that only monitors the context window and injects size, zone color, and snapshot timing, without status, snapshot, or checkpoint files, for use with SDD) has one primary outcome, so there is no slicing. It overlaps PRD-06 (delegated mode), which still installs the protocol, instruction and `.gitignore` blocks, boot, and a brake with allowlist; PRD-07 defines a separate explicit mode. PRD written with proposed product decisions PD-01 to PD-04. HIL 1 opened.
2. **HIL 1 approved (2026-09-26)**: `DEC-HIL-01`. Advanced to `sdd-create-techspec`.
3. **PRD revised during TechSpec (2026-09-26)**: three corrections found while inspecting code, pending approval at HIL 2: (a) the telemetry block is `[ContextBrake v2]` (`telemetry-block.ts`), not v1 (factual); (b) FR-09 keeps the `.gitignore` block while a state file exists, because `.agents/rules/file-changes.md` removes it only together with plan and checkpoint; (c) FR-10 also rejects `--migrate-legacy` and `--instruction-file`, and applies when light mode is already configured. PRD sha256 now f45cf0a717847a79f60ca8efbedab9f6e5d79a06e16c0afab08805c7361b7155.
4. **TechSpec and plan written (2026-09-26)**: `techspec.md` (`DEC-01`–`DEC-11`, `CMP-01`–`CMP-11`, `TC-01`–`TC-15`, `QA-01`–`QA-08`) and `tasks.md` (`T01`–`T05`). Preparatory refactoring not recommended; three files at the 100-line limit are relieved by absorbed extractions (DEC-07, DEC-08, DEC-10). HIL 2 opened.
5. **HIL 2 revision (2026-09-26)**: `DEC-HIL-02-R`. PRD revised: no snapshot command in light mode and generic "snapshot or checkpoint" action (FR-04, FR-05, FR-10, FR-12, PD-03, NFR-04 now the 60-token budget); new FR-14/OBJ-05/US-06/NFR-05/PD-05 for active-session usage in `doctor` (feasible from the session ledgers; "running" approximated by activity in the last 30 minutes). TechSpec gains DEC-12 and TC-16/TC-17; tasks renumbered: new T05 (doctor active sessions), e2e and docs moved to T06. HIL 2 re-presented.
6. **HIL 2 approved (2026-09-26)**: `DEC-HIL-02`. Advanced to `sdd-orchestrate-tasks` (T01).
7. **T01–T06 completed (2026-09-26)**: handoffs in `done/task_01.md` to `done/task_06.md`. Integrated validation: build, typecheck, lint, `schemas:check`, `dependencies:check`, and `package:smoke` pass. `npm run coverage`: 1,765 passed, 3 skipped, 95.54% lines. Two local fixes are recorded in T03 for review: config key order and trailing-newline removal. Next is `sdd-review-code` in a session that did not author the code.

8. **Review 01 (2026-09-26)**: `codereview_01/codereview.md`, status `REJECTED`, run in a new session (`session_01TBeDgaQbko97hrGYSbmGig`) that authored none of the code. Findings:
   - `CR-01` (Medium, FR-09): an instruction file without a trailing newline gains one byte after full → light.
   - `CR-02` (Low, PRD UX): `init --light` prints the `plan init` next-step hint.

   Optional improvements `OI-01` to `OI-03`. Full suite green: 1,765 passed, 95.54% lines. Two NFR-01 deviations from T03 await acceptance at HIL 3. The correction round is authorized within `DEC-HIL-02`.

9. **Correction round 1 (2026-09-26)**: `DEC-CORR-01`. `codereview_01/done/task_07.md` to `task_10.md` are completed in the review session, which from here on authored code. The tasks cover `CR-01` (reference block removal inverts insertion), `CR-02` (no `plan init` hint in light mode), `OI-01` (the `LIGHT_MODE_ASSET_KEPT` remediation and the README), and `OI-03` (a TC-17 test for null usage). Integrated validation passes: build, typecheck, lint, `schemas:check`, `dependencies:check`, `package:smoke`, and `npm run coverage` (280 files; 1,775 passed, 3 skipped; 95.56% lines). The re-review must run in a new session.

10. **Review 02 (2026-09-26)**: `codereview_02/codereview.md`, status `APPROVED WITH RESERVATIONS`. It ran after `/clear`, in a context that authored no code; the host kept session ID `session_01TBeDgaQbko97hrGYSbmGig`, and the report records this limitation. Results:
   - `codereview_01` `CR-01`, `CR-02`, `OI-01`, and `OI-03` are resolved; `OI-02` persists as `codereview_02/OI-01` (QA-09 reservation, `tests/test-lanes.ts` 106 lines).
   - No new findings. Validation passes: build, typecheck, lint, `schemas:check`, `dependencies:check`, `package:smoke`, and `npm run coverage` (280 files; 1,775 passed, 3 skipped; 95.56% lines), plus built-CLI spot checks.
   - For HIL 3: three NFR-01 deviations, Linux and macOS evidence (CI not run), and the optional manual acceptance.
   The reservations HIL and HIL 3 are open. CLI QA is skipped (`DEC-HIL-02`).

11. **Acceptance (2026-09-26)**: `DEC-RES-01` and `DEC-HIL-03`. The feature is completed; the checkpoint is `completed`, and the snapshot is `closed`.

Recorded at flow start:

- Git base commit: `c3fb6a894ca056fde67b19a6c0350544b51f6b11`.
- Pre-existing uncommitted changes (dogfood install of this repo, not part of this feature): `.agents/hooks/context-brake.mjs`, `.agents/settings.json`, `.context-brake/manifest.json`, `.gitignore`, `context-brake.config.json`; untracked `.agents/hooks/context-brake-statusline.mjs`, `.agents/settings.local.json`.
