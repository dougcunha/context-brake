---
name: sdd-create-techspec
description: SDD TechSpec when a PRD exists and the solution must be specified; does not create requirements or a task plan.
argument-hint: --prd feature-name [--update]
---

# Create SDD TechSpec

1. Resolve `tasks/prd-[slug]/prd.md` and `techspec.md`. When `context-snapshot.md` exists there, apply the load protocol in `.agents/skills/sdd-orchestrate-tasks/references/session-continuity.md` first. Require the PRD; if missing, point to `sdd-create-prd`. Read the PRD once per version. Reuse an existing TechSpec; update only when authorized, preserving IDs.
   **Output:** exact sources and destination, with no implicit overwrite.
2. Map every PRD obligation to a technical consequence. Inspect only involved modules, callers, contracts, persistence, errors, tests, and configuration, following `AGENTS.md` and the applicable `.agents/rules/`. When that inspection spans many modules, send read-only explorers in parallel with one question each and verify the lines they cite; this session writes the TechSpec. Reuse existing patterns; justify new dependencies and components with a proven gap. Consult primary documentation for external technical questions, starting from `docs/research/harness-integrations.md` for harness behavior.
   Measure the terrain where the change will land: read [references/preparatory-refactoring.md](references/preparatory-refactoring.md) in full and apply its measures to the files the feature will modify. The result is the baseline of pre-existing hits and, when structural debt and contact coincide, a preparatory refactoring recommendation with minimal scope. Existing code the feature only reads generates no recommendation.
   **Output:** every obligation has a decision or pending item; every component has a path, responsibility, and integration; every target file has a measured baseline and a destination for the debt found.
3. Identify the affected modules and runtime surfaces: CLI command, hook run as one process per event, or plugin or extension loaded inside a harness process. Read [references/typescript-node.md](references/typescript-node.md) in full before specifying validation. End-to-end tests follow the CLI policy in `AGENTS.md`.
   Also specify the quality profile: read [references/quality-typescript.md](references/quality-typescript.md) in full and select the rules this feature can violate, with class and verification command. A rule outside the profile is checked by no gate. An already decided deviation becomes `DEC-NN` and stops being a finding.
   **Output:** validation profile with evidence of runtime surfaces, runner, commands, fixtures, platforms, and limitations; quality profile with relevant rules, classes, commands, and prior justifications.
4. Read [assets/techspec.template.md](assets/techspec.template.md) in full when drafting. Use `DEC-01`, `CMP-01`, `TC-01`, `QA-01`, and the PRD IDs; a legacy PRD keeps its own IDs, such as `RF-01` or `CA-01`. Cover applicable contracts, errors, edges, security, concurrency, rollback, and rollout without duplicating requirements. Every obligation must have a test or other proportional evidence; remove inapplicable sections.
   **Output:** all obligations covered; unresolved decisions explicitly pending, without imposing a coverage percentage beyond the project rules.
5. Write only the TechSpec. Report decisions, gaps, and tasks invalidated by the update. In the orchestrated flow, return it for plan preparation and joint technical HIL. In standalone use, run the session pause from that reference with `sdd-plan-tasks` as next step; code map entries from the terrain measurement are worth a snapshot.
   **Output:** reviewable artifact with identified impacts; conflicts between PRD, code, and contract that require human decisions were not invented.

Keep stable sources ahead of recovered code and state; reread only changed versions. Reading order helps consistency but does not guarantee provider caching.
