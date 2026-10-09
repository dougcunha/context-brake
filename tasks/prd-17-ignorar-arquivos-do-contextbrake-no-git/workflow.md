# Workflow and Decisions — prd-17-ignorar-arquivos-do-contextbrake-no-git

## Feature Summary

- Feature: `prd-17-ignorar-arquivos-do-contextbrake-no-git`
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `completed`
- Git base: `5c97f37` (local commit, not pushed; origin/master is `9df882c`)
- Origin: the person asked that `init` add ContextBrake's own files to the project `.gitignore` ("o init deveria fazer isso automaticamente"), file by file and not by folder.

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-TRIAGE-01 | 2026-10-08 | HIL 0 | Rubric `sdd-full` (S1 new flag and file write, S2 files ContextBrake writes, S8 persists a user file, S5 reverses a rule). The person answered "Pode implementar conforme sua sugestão" to the proposal "Posso começar pelo fluxo completo?", which is the full flow. | APPROVED |
| DEC-PRODUCT-01 | 2026-10-08 | Product decisions | Managed block in the project `.gitignore`, one line per file ContextBrake creates in full (not folders, not harness files it only edits); written by default; the assistant asks with the state preselected; `--no-gitignore` opts out and removes the block; the rule "never edits `.gitignore`" is reversed for this block only. Source: the person's messages of 2026-10-08. | APPROVED |
| DEC-HIL-01 | 2026-10-08 | HIL 1 | "Aprovar (Recommended)": PRD of prd-17 approved as written. Session: continue here. | APPROVED |
| DEC-HIL-02 | 2026-10-08 | HIL 2 | "Aprovar tudo (Recommended)": TechSpec DEC-01..10, tasks T01..T06, CLI QA on the built CLI in a real Git folder, no preparatory refactoring; OI-01 (no-final-newline edge, PRD clarified) and OI-02 (supersede notes) approved as recommended; implementation and in-contract corrections authorized. Session: continue here. | APPROVED |
| DEC-HIL-03 | 2026-10-08 | Exception HIL (codereview_01 CR-02) | "Listar esses arquivos no bloco (Recommended)": the block also lists the state files init writes under `.context-brake/runtime/` while they exist or are planned; OBJ-01 does not cover `.claude/settings.local.json`. Session: continue here. | APPROVED |
| DEC-HIL-04 | 2026-10-09 | Reservations HIL (codereview_02 CR-01) | "Corrigir CR-01 (Recommended)": correct the README 'What is listed' line so it names the runtime state files, and assert it in `readme-gitignore.test.ts`; a new delegated review follows, then QA (TC-11) and HIL 3. Session: continue here. | APPROVED |
| DEC-HIL-05 | 2026-10-09 | Reservations HIL (codereview_03 CR-01) | "Corrigir CR-01 (Recommended)": name `claude-statusline-opt-out.json` too in the README 'What is listed' bullet and its test; a new delegated review follows, then QA (TC-11) and HIL 3. Session: continue here. | APPROVED |
| DEC-HIL-06 | 2026-10-09 | Exception HIL (qa_01 BUG-01) | "Listar os 2 caminhos (Recommended)": for an owned file under a linked harness folder the block lists the logical path and the in-root target path; FR-03, DEC-01, TC-02, TC-04, and the README change accordingly; then a new delegated review, a new QA (qa_02), and HIL 3. Session: continue here. | APPROVED |
| DEC-HIL-07 | 2026-10-09 | HIL 3 | "Aceitar (Recommended)": the person accepted the delivery of prd-17 (codereview_05 APPROVED, qa_02 APPROVED) with the open items presented (Linux and macOS not driven, FR-09 in process only, no manual init on this repository, commit 5c97f37 not pushed, prd-17 work uncommitted). No commit or push requested. | APPROVED |

## Milestones

- 2026-10-08: PRD drafted. HIL 1 pending. Push of local commit `5c97f37` deferred by the person ("Ainda não").
- 2026-10-08: HIL 1 approved (DEC-HIL-01). TechSpec next.
- 2026-10-08: TechSpec (DEC-01..10, TC-01..11) and plan T01..T06 drafted. HIL 2 pending with OI-01 (no-final-newline edge) and OI-02 (supersede notes in earlier PRDs).
- 2026-10-08: HIL 2 approved (DEC-HIL-02). Implementation starts at T01.
- 2026-10-08: T01..T06 implemented and approved by evidence (coverage 257 files, 1452 tests, 94.77%; budget 106.7 s). The checkpoint hashes of tasks.md were refreshed after state and link updates (the PRD gained the OI-01 clarification at HIL 2). Delegated review codereview_01 started.
- 2026-10-08: Review codereview_01 received: REJECTED (CR-01 High: the CLI never injects a ProcessRunner so GITIGNORE_TRACKED_FILES cannot fire; CR-02 High: .context-brake/runtime/claude-mod-install.json and claude-statusline.json stay visible in git status because they are not manifest assets; CR-03 Low: file-changes.md section not amended). Worktree check after the review: unchanged. Exception HIL opened for CR-02.
- 2026-10-08: Exception HIL answered (DEC-HIL-03). PRD FR-01 and the assumption note, and TechSpec DEC-01, clarified. Corrections planned from codereview_01.
- 2026-10-08: Corrections T01..T03 of codereview_01 done (coverage 258 files, 1456 tests, 94.78%). Re-review codereview_02 delegated to a new reviewer.
- 2026-10-08: Re-review codereview_02 received: APPROVED WITH RESERVATIONS (CR-01..CR-03 of codereview_01 resolved; one Low reservation: the README line 'What is listed' omits the runtime state files). Worktree check after the review: identical. Checkpoint hashes of prd.md and techspec.md refreshed after the DEC-HIL-03 clarification. Reservations HIL opened.
- 2026-10-08: The person answered the reservations HIL with "Pause para continuar amanha": paused with the gate unanswered (pending_hil kept). Nothing started after the answer.
- 2026-10-09: Session resumed. Reservations HIL answered (DEC-HIL-04): correct CR-01 of codereview_02. Correction round 2 planned in codereview_02/.
- 2026-10-09: Correction codereview_02/done/task_01.md done (README bullet names 2 runtime state files; coverage 258 files, 94.78 %, 131 s). Re-review codereview_03 delegated.
- 2026-10-09: Re-review codereview_03 received: APPROVED WITH RESERVATIONS (codereview_02/CR-01 corrected only in part: the correction plan named 2 of the 3 runtime state files of the PRD clarification; new Low CR-01 asks to name `claude-statusline-opt-out.json` too). Worktree check after the review: only codereview_03/codereview.md added. Reservations HIL opened.
- 2026-10-09: Reservations HIL answered (DEC-HIL-05): correct CR-01 of codereview_03. Correction round 3 planned in codereview_03/.
- 2026-10-09: Correction codereview_03/done/task_01.md done (README names the 3 runtime state files). Re-review codereview_04 delegated.
- 2026-10-09: Re-review codereview_04 received: APPROVED (no findings; codereview_03/CR-01 resolved). Worktree check after the review: only codereview_04/codereview.md added. Review cycle closed; delegated QA qa_01 (TC-11) started.
- 2026-10-09: QA qa_01 received: REJECTED (BUG-01 Low, FR-03/OBJ-01: with `.claude` a Windows junction to `.agents`, the block lists only `/.agents/hooks/*.mjs` while Git walks the junction and shows `.claude/hooks/*.mjs` as untracked; an NTFS directory symlink passes). Worktree check after QA: only qa_01/ added. Correction planning from qa_01 started.
- 2026-10-09: Correction planned in qa_01/task_01.md (list the logical and the in-root target path). It changes FR-03 and DEC-01, so exception HIL opened.
- 2026-10-09: Exception HIL answered (DEC-HIL-06): list both paths. Executing qa_01/task_01.md.
- 2026-10-09: Correction qa_01/done/task_01.md done (both paths listed; PRD FR-03, TechSpec DEC-01/TC-02/TC-04 and header hash, README amended under DEC-HIL-06; coverage 258 files, 94.78 %, 117 s; junction and directory symlink end-to-end clean). Approved-source hashes of prd.md and techspec.md refreshed to DEC-HIL-06. Re-review codereview_05 delegated.
- 2026-10-09: Re-review codereview_05 received: APPROVED (no findings; qa_01/BUG-01 resolved). Worktree check after the review: only codereview_05/codereview.md added. Delegated QA qa_02 started (previous QA qa_01).
- 2026-10-09: QA qa_02 received: APPROVED (95 checks, 0 failed; qa_01/BUG-01 resolved; junction and directory symlink clean under Git Bash and PowerShell). Worktree check after QA: only qa_02/ added. HIL 3 opened.
- 2026-10-09: HIL 3 accepted (DEC-HIL-07). Feature completed; checkpoint completed and snapshot closed.
