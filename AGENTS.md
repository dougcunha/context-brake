# AGENTS.md

ContextBrake is a TypeScript CLI (Node.js 20+, npm package `context-brake`) that adds context telemetry, a tool-call brake, and checkpoint/boot state to coding-agent harnesses. The repository contains the package foundation and is implementing the approved feature specifications.

`CLAUDE.md` loads this file through the `@AGENTS.md` import; keep shared instructions here and only Claude Code-specific ones in `CLAUDE.md`.

## Specifications and research

- Feature requirements live in `tasks/prd-<NN>-<slug>/prd.md`, numbered in implementation order; that feature's TechSpec and task list belong in the same folder.
- Before changing code, read the PRD and, when present, the TechSpec of the feature involved, and reference the PRD and TechSpec identifiers the change implements (`FR`/`NFR`, `DEC`, `TC`; PRDs still written in Portuguese use `RF`/`CA`).
- MVP PRDs: `prd-01-instalacao-deteccao-diagnostico` (init, detection, doctor), `prd-02-telemetria-zonas-e-freio` (zones, telemetry, brake) and `prd-03-plano-checkpoint-e-boot` (plan, checkpoint, boot). `prd-04-runner-de-reinicio-automatico` (runner and `wrap`) is post-MVP.
- The SDD skills in `.agents/skills/` run this flow; `sdd-orchestrate-flow` drives a feature from PRD to acceptance with human checkpoints and keeps its resumable state in the feature's `checkpoint.json`. SDD stages write artifacts and code in the session that runs them, use subagents only as read-only explorers, pause between units so the user can continue or start a new session, and carry distilled context between sessions in the feature's `context-snapshot.md`. Review and QA run in a session that did not write the code they judge.
- Supporting research is indexed in `docs/research/README.md`; PRDs win when they conflict with it. Before implementing or changing a harness adapter, read that harness's section in `docs/research/harness-integrations.md`, re-check the vendor docs it links, and update the section when behavior differs.

## Coding rules

Before writing or reviewing code, read the rules in `.agents/rules/` that apply to the change:

- `code-standards.md`, `javascript-typescript.md`, `node.md`, and `tests.md` for all code.
- `harness-adapters.md` for harness adapters and their fixtures.
- `file-changes.md` for code that creates, changes, or removes user files.
- `cli-output.md` for anything the CLI prints.

## Architecture

Hexagonal (ports and adapters), with this planned layout:

- `src/core/`: entities (plan, checkpoint, telemetry, zones), pure services, and port interfaces in `contracts/`. Never import from `infrastructure/` or `cli/`.
- `src/infrastructure/`: port implementations, with one adapter per harness in `harnesses/`, plus `storage/`, `tokenizers/`, and `git/`.
- `src/cli/`: command entrypoints and terminal output; wires `core` to adapters through dependency injection.
- `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/`.

Harness event names, payload shapes, and config file formats stay inside that harness's adapter; `core` depends only on its ports. Keep module dependencies acyclic, with shared contracts in `src/core/contracts/`.

## Project constraints

- ContextBrake is a CLI plus harness hooks and plugins. There is no web server, frontend, or browser UI, so skip port allocation, browser E2E, and visual or responsive checks. End-to-end tests run the built CLI against fixture repositories in temporary directories.
- Commands must work on Linux, macOS, and Windows (PowerShell and Git Bash), including repositories whose instruction files are symlinks.

## Commands

- Install: `npm install --ignore-scripts`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Coverage: `npm run coverage`
- Schema currency: `npm run schemas:check`
- Dependency scripts: `npm run dependencies:check`
- Package smoke: `npm run package:smoke`

Before finishing a code change, run lint, typecheck, and tests with coverage.

## Context protocol

<!-- CONTEXTBRAKE:START -->
When `task_plan.json` exists or tool results include a ContextBrake telemetry block, follow `docs/context-brake-protocol.md`.
<!-- CONTEXTBRAKE:END -->

`context-brake init` manages the block above. Keep project rules outside the markers, and keep the full protocol in `docs/context-brake-protocol.md`, aligned with RF10 of the telemetry PRD and the boot requirements of the plan PRD.
