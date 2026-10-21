# Workflow — prd-22-claude-code-version-floor

## Context

- Git base: `419c0bd328b2cd209ed98846e6b50b73ef4664fd` (master).
- Pre-existing changes: untracked `tasks/prd-21-manual-handoff-command/` (another feature, not touched here) and the appended line in `tasks/triage-log.jsonl`.
- Mode: `monitored`.
- Out-of-scope change seen before review (2026-10-21): `.gitignore` gained the `# >>> context-brake` managed block that `context-brake init` writes. This feature did not write it; it is not part of the feature diff and is not reviewed here.

## Decisions

### H-00 — Triage level (HIL 0)

- Decision: `sdd-lean`.
- Scope: whole feature.
- Provenance: 2026-10-21, `sdd-triage` rubric `sdd-full` (S1: doctor output values and exit code change). The session autopick first took `sdd-full`; the user then wrote "Mude para sdd-enxuto se der". Line in `tasks/triage-log.jsonl`.
- Change to the stops: HIL 1 and HIL 2 are one joint decision (short PRD, TechSpec, 1-task plan); independent review stays.

### H-01 — Use the changelog floor

- Decision: use the highest changelog version of the adapter's core mechanisms, 2.1.97, as the Claude Code minimum version, and record the gaps in the research section.
- Scope: PRD FR-01 to FR-04.
- Provenance: 2026-10-21. Assistant recommended "Use 2.1.97 como `minimumVersion` do adapter do claude-code. Registre as 3 lacunas…"; user answered "Sim".

### H-02 — Joint HIL (HIL 1 + HIL 2)

- Decision: PRD, TechSpec, and the 1-task plan approved; D-01 = 2.1.97; CLI QA does not run (e2e-09 covers the built CLI); implementation and corrections within these contracts are authorized; continue in this session.
- Scope: `prd.md`, `techspec.md`, `tasks.md`, `task_01.md`.
- Provenance: 2026-10-21, question tool answers: "Aprovar com 2.1.97 (Recomendado)", "Não rodar QA (Recomendado)", "Continuar nesta sessão (Recomendado)".

### R-01 — Review received

- codereview_01: `APPROVED WITH RESERVATIONS`, Execution: delegated reviewer. Worktree after the review matched the pre-review state plus `codereview_01/`. One reservation: CR-01 (Low).

### H-03 — Reservations HIL

- Decision: correct CR-01; also fix the 2 wording limitations (DEC-03 note in the research line, CLI entry path in `done/task_01.md`); continue in this session.
- Scope: codereview_01 CR-01 and the 2 wording limitations.
- Provenance: 2026-10-21, question tool answers: "Corrigir CR-01 (Recomendado)", "Continuar nesta sessão (Recomendado)". The offered option text named the test ID and "as 2 frases da pesquisa e do handoff".

### R-02 — Re-review received

- codereview_02: `APPROVED`, Execution: delegated reviewer. Worktree after the re-review matched the pre-review state plus `codereview_02/`. Review cycle closed; CLI QA does not run (H-02). Next: HIL 3.

### H-04 — HIL 3

- Decision: delivery accepted; feature completed; no commit requested.
- Scope: whole feature (codereview_02 APPROVED, no QA by H-02, no ADR candidates).
- Provenance: 2026-10-21, question tool answer: "Aceitar (Recomendado)".
