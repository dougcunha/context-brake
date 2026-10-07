# Workflow and Decisions — prd-13-refatoracao-modo-leve-testes-rapidos

## Feature Summary

- Feature: `prd-13-refatoracao-modo-leve-testes-rapidos`
- Workspace: `D:/MyProjects/ContextBrake`
- Status: `completed` (accepted at HIL 3, DEC-HIL-03)
- Git base: `cca3a29` (prd-12 accepted and committed, DEC-HIL-03 in the prd-12 workflow)
- Pre-existing changes: untracked `tasks/prd-11-reinicio-automatico-no-claude-code/rtk/`
- Slice set (prefix `refatoracao-modo-leve`): prd-12-refatoracao-modo-leve-modo-unico → prd-13-refatoracao-modo-leve-testes-rapidos → prd-14-refatoracao-modo-leve-reinicio-multi-harness. Shared decisions (triage, slicing, product decisions) live in `tasks/prd-12-refatoracao-modo-leve-modo-unico/workflow.md`.

## Human Decisions Log

| Decision ID | Date | Scope | Decision & Summary | Status |
| --- | --- | --- | --- | --- |
| DEC-HIL-01 | 2026-10-06 | HIL 1 (sliced set) | "Aprovar os três (Recommended)": this PRD approved together with its siblings. Product decisions for this slice: DEC-PD-04, DEC-PD-05 in the prd-12 workflow. | APPROVED |
| DEC-HIL-02 | 2026-10-07 | HIL 2 | "Aprovar (Recommended)": TechSpec (DEC-01..DEC-09) and DAG T01-T07 approved, with authorization to implement and to correct within these contracts (hashes in `checkpoint.json#approved_sources`). CLI QA: no delegated QA run; T07 records the budget runs and the reviewer repeats them. Session: "Continuar nesta sessão" at ~64% estimated. | APPROVED |
| DEC-EXC-01 | 2026-10-07 | Exception HIL (codereview_01) | Human choices: CR-02 "Emendar a DEC-04 (Recommended)": the TechSpec DEC-04 list becomes the 12 files in `tests/test-lanes.ts` (adding `codex-hook-root` for shell quoting and `statusline-bridge-lifecycle` for the bridge through the user shell) and allows the `git-capability` and `process-capability` unit probes; "Aceitar os dois (Recommended)": DEC-06 keeps only the global `MAX_WORKERS = 6` (Vitest 3.2.7 has no per-project fork cap) and DEC-03 keeps the three in-process plugin round trips in `runtime-in-process.test.ts`; optional fake runner "Não incluir (Recommended)". CR-01 corrected within HIL 2. Session: "Continuar nesta sessão (Recommended)". | APPROVED |
| DEC-EXC-02 | 2026-10-07 | Exception HIL (codereview_02 CR-01) | Human text, reporting repeated `git.exe` error dialogs (0xc0000142) while the tests ran: "Tem alguma coisa nos testes desse repo que fica disparando erro no git aqui pra mim." Human choice: "Manter a T10 (Recommended)": the fake `ProcessRunner` in in-process tests (`codereview_01/done/task_10.md`) stays, superseding the "Não incluir" optional choice of DEC-EXC-01. Dialogs after the fix: "Não observei ainda" (open item for HIL 3). | APPROVED |
| DEC-RES-01 | 2026-10-07 | Reservations HIL (codereview_03, APPROVED WITH RESERVATIONS) | Human choice: "Corrigir 1 e 3 (Recommended)": round 3 adds the fake process runner to `.agents/rules/tests.md` and corrects the T10 handoff on the version probes; the duplicated guard list in `test-lanes.test.ts`, the missing template sections in T10/T11, and the mixed relative paths stay accepted open items. Session: "Continuar nesta sessão (Recommended)". | APPROVED |
| DEC-RES-02 | 2026-10-07 | Reservations (codereview_04, APPROVED WITH RESERVATIONS) | Human choice: "Aceitar como item aberto (Recommended)": the rule wording that asks direct `init`/`remove` callers for the fake measurer (only `doctor` reads it) stays an accepted open item. | APPROVED |
| DEC-HIL-03 | 2026-10-07 | HIL 3 (acceptance) | Human choice: "Aceitar e commitar (Recommended)". Delivery accepted on codereview_04 (APPROVED WITH RESERVATIONS, no findings). Accepted open items: DEC-RES-01 items 2, 4, 5 and DEC-RES-02. Accepted limitations: budget margin depends on machine load (115.6 s run; two runs over 120 s under concurrent Claude Code sessions), `git.exe` 0xc0000142 dialogs not yet observed after T10 (DEC-EXC-02), Linux/macOS unverified, `test:bench` and `coverage` reused from earlier reviews. `tasks.md` re-hashed to `291bb70ddc26…`. Commit authorized, no push. Session: "Encerrar e retomar a prd-14 em nova sessão (Recommended)". | APPROVED |
