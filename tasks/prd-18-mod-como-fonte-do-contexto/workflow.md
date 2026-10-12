# Workflow — prd-18-mod-como-fonte-do-contexto

## Decisions

| ID | Date | Gate | Decision | Scope and provenance |
| --- | --- | --- | --- | --- |
| D-01 | 2026-10-11 | HIL 0 | `sdd-lean`, although the rubric recommended `sdd-full` (S1, S2, S5, S6, S8 present). HIL 1 and HIL 2 are merged into one decision after the short PRD and a plan of one or two tasks; independent review is kept. | Human choice at the triage question; line in `tasks/triage-log.jsonl`. |
| D-02 | 2026-10-11 | Flow | Folder number 18 continues the removed series (prd-01 to prd-17) so identifiers cited by `AGENTS.md` and test names stay unambiguous. | Coordinator, from `git log` of `tasks/`. |
| D-03 | 2026-10-11 | HIL 1 | A plain `init` installs the mod when Claude Code supports mods (mod-first). | Human answer to the mod-default question ("Sim, mod-first"). |
| D-04 | 2026-10-11 | HIL 1 | Automatic restart stays opt-in through `--auto-restart`. | Not asked; carried over from prd-11 to keep behavior, written in PRD FR-04. |
| D-05 | 2026-10-11 | HIL 1 | An installed bridge migrates to the mod at the next `init`, plan visible in `--dry-run`. | Human answer to the migration question ("Automática, plano visível"). |
| D-06 | 2026-10-11 | HIL 1 | While the mod is on but silent, the hook still uses an installed bridge's readings (freshest source). | Not asked separately; stated in PRD FR-02 and approved with it. |
| D-07 | 2026-10-11 | HIL 1 | PRD `prd.md` approved as written, with the probe as the first task. | Human answer "Aprovar"; sha256 de1aac07a38ab77fef95be191977de2fd641efb5d70850c690f89cf8ea08937d. |
| D-08 | 2026-10-11 | Session | Continue in this session (22% measured, below the 65% threshold). | Human answer at the combined gate and session question. |
| D-09 | 2026-10-11 | HIL 2 | PRD-A1 and PRD-A2 accepted: FR-02 and NFR-01 reworded to match the TechSpec (fresher of mod and transcript; a reader never merges readings). | Human answer "Aceitar as duas"; PRD sha256 5796f9eec7ad349f867881c1147bf1c9f236b93271dbb5117139ba1e9ae563e5. |
| D-10 | 2026-10-11 | HIL 2 | T01 may install Claude Code 2.1.287 and 2.1.289 through npm in a temporary folder outside the repository and delete it afterwards. | Human answer "Autorizar". |
| D-11 | 2026-10-11 | HIL 2 | TechSpec and plan T01 to T03 approved (three tasks, no CLI QA, manual acceptance by the user), with authorization to implement and correct within that contract. | Human answer "Aprovar e autorizar"; techspec sha256 7230292ae116206955ec29132d0a22659224db95edbfa2ce9e2d675b4d0cadd4; tasks sha256 77607b29e656b1fdafe016124f59955fa8f753251a558eed083bf86d941f47de. |
| D-12 | 2026-10-11 | Session | Continue in this session (32% measured). | Human answer at the combined gate and session question. |
| D-13 | 2026-10-11 | Execution | T01 approved by the coordinator's review of the diff (docs only) against its acceptance criteria; TechSpec amended by T01 within its scope (DEC-02, DEC-04, DEC-05, risks); no new human gate needed because the contract and PRD are unchanged. | techspec sha256 64d66b297446ed969c547ec2164079b5887f3ecb388dc294607221b182e37c75; tasks sha256 668ccf604434152a20f6571dba86135ff238e0720a8f6e8e30af6a4eb4eedd44. |
| D-14 | 2026-10-11 | Execution | T02 approved by the coordinator's review of its diff against the contract and the quality profile; TechSpec text aligned with what was built (top-level publisher, test file names), no contract change. | techspec sha256 c7349054f24ff88c0d2a3f6b6cf32ece503a90799a77d0f73764d1d8f9b611fd; tasks sha256 a25b886faac4d7611ba1a0d7252587e273e805f9cc575ed406c8d8636e93a207. |
| D-15 | 2026-10-11 | Execution | T03 approved by the coordinator's review against its acceptance criteria and the quality profile, with an end-to-end run on the built CLI and a real session; TechSpec aligned (DEC-05 runner fallback, doctor findings in the core, shared-marketplace risk). Next: the delegated review of T01 to T03. | techspec sha256 290aed5cfee45078a7683369b9664e9500d92ef690f8ededbe884e959f74adfa; tasks sha256 a6934ff8a1f479881090477b444b3366bb97c90d591e799ba895e6fea7205f8b. |
| D-16 | 2026-10-11 | Review | Delegated review `codereview_01` received: status REJECTED (CR-01 blocking; CR-02 to CR-06 low). Worktree unchanged by the reviewer apart from its report folder. Correction round 1 opened and authorized within D-11: CR-01, CR-02, CR-04, CR-05 are corrected; CR-03 is documented as "reporting means a session has reported" instead of adding a freshness bound; CR-06 stays an accepted open item for the release commit. | `codereview_01/codereview.md` sha256 b14c34b22fccd61db06d7d117d55ebd8e84ed2af2810c4116ca3913becc34cbf. |
| D-17 | 2026-10-11 | Corrections | Correction tasks T01 to T03 of `codereview_01` approved by the coordinator against their acceptance criteria and moved to `codereview_01/done/`. CR-02's test exposed a real gap (the runtime `.gitignore` did not exist when the mod published first); fixed in the mod. CR-03 documented, CR-06 kept on the release checklist. A new reviewer re-reviews next (`codereview_02`). | techspec sha256 98b94697c01253ba21bfba94cf10cc307c75820b54df15df15e0c18b67661e16; tasks sha256 a6934ff8a1f479881090477b444b3366bb97c90d591e799ba895e6fea7205f8b. |
| D-18 | 2026-10-11 | Review | Re-review `codereview_02` received from a new delegated reviewer: status APPROVED WITH RESERVATIONS (codereview_01 findings closed; two Low reservations: CR-01 `tests/unit/test-lanes.test.ts` 103 lines against 102 at the base, CR-02 `MOD_VERSION` bump waits for the release). Reservations HIL opens. | `codereview_02/codereview.md` sha256 62b0957cc712a532efd5b48eef2d072008c73df40ac0c1cf3be812855bfea93e. |
| D-19 | 2026-10-11 | Reservations | Reservations of `codereview_02` finalized without correction: CR-01 (test-lanes test at 103 lines, 102 at the base) and CR-02 (`MOD_VERSION` bump at the release) are accepted open items. No CLI QA (not enabled at HIL 2). Next: HIL 3. | Human answer "Finalizar aceitando as duas". |
| D-20 | 2026-10-11 | Session | End the session and resume in a new one (66% measured, RED); snapshot and checkpoint written before the question. | Human answer "Encerrar e retomar em sessão nova". |
| D-21 | 2026-10-11 | HIL 3 | Current delivery accepted (reservations CR-01 and CR-02 and the unverified non-Windows platforms kept as accepted open items; no CLI QA). Integrated validation re-run: lint, typecheck, build, coverage (252 files, 1259 tests), schemas:check. No commit requested. | Human answer "Accept and close here (Recommended)". |

## Stops changed

- Lean: HIL 1 (PRD) and HIL 2 (TechSpec, DAG, tasks) become one decision after the plan exists. The TechSpec stays short and the plan has one or two tasks plus the probe.

## Worktree evidence

- W-01: at the start of the flow the only untracked path is `tasks/`; HEAD is `63fd5cb5a4855d6147690fdefc016e0b3a23a408` on `master`. Local commits `854d42f`, `adb04d1`, and `63fd5cb` are not pushed.

## Recovery events

- None.
