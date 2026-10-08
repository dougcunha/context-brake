# AGENTS.md

ContextBrake is a TypeScript CLI (Node.js 20+, npm package `context-brake`) that adds context telemetry and an advisory brake to coding-agent harnesses: each zone header carries an action, and at the trigger zone it names an optional snapshot command and asks for a session reset. The repository contains the package foundation and is implementing the approved feature specifications.

`CLAUDE.md` loads this file through the `@AGENTS.md` import; keep shared instructions here and only Claude Code-specific ones in `CLAUDE.md`.

## Specifications and research

- Feature requirements live in `tasks/prd-<NN>-<slug>/prd.md`, numbered in implementation order; that feature's TechSpec and task list belong in the same folder.
- Before changing code, read the PRD and, when present, the TechSpec of the feature involved, and reference the PRD and TechSpec identifiers the change implements (`FR`/`NFR`, `DEC`, `TC`; PRDs still written in Portuguese use `RF`/`CA`).
- MVP PRDs: `prd-01-instalacao-deteccao-diagnostico` (init, detection, doctor) and `prd-02-telemetria-zonas-e-freio` (zones and telemetry). `prd-12-refatoracao-modo-leve-modo-unico` supersedes the plan, checkpoint, and boot of `prd-03-plano-checkpoint-e-boot`, the runner and `wrap` of `prd-04-runner-de-reinicio-automatico`, and the tool-call deny of prd-02: one mode remains, with an optional snapshot command.
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

- `src/core/`: entities (telemetry, zones, snapshot settings), pure services, and port interfaces in `contracts/`. Never import from `infrastructure/` or `cli/`.
- `src/infrastructure/`: port implementations, with one adapter per harness in `harnesses/`, plus `storage/`, `tokenizers/`, and `git/`.
- `src/cli/`: command entrypoints and terminal output; wires `core` to adapters through dependency injection.
- `tests/unit/`, `tests/integration/`, `tests/e2e/` (smoke set), `tests/bench/` (benchmarks), `tests/fixtures/`.

Harness event names, payload shapes, and config file formats stay inside that harness's adapter; `core` depends only on its ports. Keep module dependencies acyclic, with shared contracts in `src/core/contracts/`.

## Project constraints

- ContextBrake is a CLI plus harness hooks and plugins. There is no web server, frontend, or browser UI, so skip port allocation, browser E2E, and visual or responsive checks. Tests run in process by default; `tests/e2e/` holds only a smoke set that runs the built CLI and built hooks against fixture repositories in temporary directories (`.agents/rules/tests.md`, Time Budget and Processes).
- Commands must work on Linux, macOS, and Windows (PowerShell and Git Bash), including repositories whose instruction files are symlinks.

## Commands

- Install: `npm install --ignore-scripts`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Coverage: `npm run coverage`
- Benchmarks: `npm run test:bench`
- Test budget: `npm run test:budget` (fails when `npm test` exceeds 180 s)
- Schema currency: `npm run schemas:check`
- Dependency scripts: `npm run dependencies:check`
- Package smoke: `npm run package:smoke`

Before finishing a code change, run lint, typecheck, and tests with coverage.

## Context protocol

When tool results include a ContextBrake telemetry block, follow its `action=` text. At the trigger zone it names the snapshot command (`/sdd-snapshot` here) and asks you to end the reply with `[REQUEST_SESSION_RESET]`; after a reset, the resume text names the resume command. ContextBrake never denies a tool call.
