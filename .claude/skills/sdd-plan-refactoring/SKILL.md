---
name: sdd-plan-refactoring
description: SDD refactoring when a structural change must preserve behavior; does not implement or add functionality.
argument-hint: --slug [NN]-refactoring-name [--update]
disable-model-invocation: true
---

# Plan SDD refactoring

1. Fix target, limits, and slug. A new slug is `[NN]-[name]`, numbered after the highest folder under `tasks/`. Resolve `tasks/prd-[slug]/prd.md` and `techspec.md`. Preserve both when they exist without update authorization; with it, read current versions and keep IDs.
   **Output:** unambiguous operation without implicit overwrite.
2. Trace inputs, outputs, errors, effects, callers, persistence, integrations, and edges of the target. Use code, tests, logs, fixtures, and contracts as evidence. Number behaviors `R-01`, `R-02`; distinguish intent, apparent defect, and gap.
   **Output:** every in-scope behavior has an origin and verification, or a concrete question that changes acceptance.
3. Plan characterization only for behavior without protection; prefer semantic assertions. A snapshot requires a reviewed baseline. Sequence characterization before mutation and reversible slices before irreversible changes.
   When the target includes harness adapters, hook responses, code that edits user files, or CLI output, read [references/cli-and-adapters.md](references/cli-and-adapters.md) in full. End-to-end checks follow the CLI policy in `AGENTS.md`; record the existing unit, integration, and end-to-end suites, runner, and commands, plus a manual script for behavior no test covers proportionally. Record an unavailable environment or platform as pending.
   **Output:** every `R-NN` has a proportional safety net and safe sequence; new behavior is separate from scope.
4. When drafting, read [assets/TEMPLATE_PRD_REFACTOR.md](assets/TEMPLATE_PRD_REFACTOR.md) and [assets/TEMPLATE_TECHSPEC_REFACTOR.md](assets/TEMPLATE_TECHSPEC_REFACTOR.md) in full. Write only the two artifacts: behavior and acceptance in the PRD; decisions, components, tests, and rollback in the TechSpec. Reference IDs without copying requirements.
   Fill in the quality profile with today's measure and the target at the end — in a refactoring the baseline is the target to reduce, and without a number there is no way to prove the structure improved. When this refactoring prepares the terrain for a feature, the target is what makes that change easy, not perfection of the target code.
   **Output:** documents cover every `R-NN`, have no placeholders, include a measured profile and a declared target, and serve `sdd-plan-tasks`.
5. Report paths, risks, gaps, and impacts on derivatives. In standalone use, point to task planning; in the orchestrated flow, return to behavior HIL before decomposition.
   **Output:** reviewable contracts, with no code change or silent promotion of decisions.

Read sources once per version and code only in scope. A behavior contradiction or missing critical verification blocks affected items until a human decision; preserve evidence.
