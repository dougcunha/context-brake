# Stable execution context

Load in this exact order:

1. `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/qa_01/qa.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T01 — The block covers an owned file through a linked harness folder in both paths

## Outcome

When an owned file sits under a harness folder that is a link (`.claude` -> `.agents`), the block lists the logical path (`/.claude/hooks/...`) and the target path (`/.agents/hooks/...`). With a Windows junction, which Git walks as a normal folder, no owned file stays visible in `git status`; with a symbolic link, the extra line matches nothing.

## Dependencies and boundaries

- Depends on: exception HIL decision on the FR-03 and DEC-01 change (DEC-HIL-06, approved).
- Unblocks: new delegated review, then new delegated QA (qa_02).
- In scope: `ownedPathsFor` in `gitignore-plan.ts`; its unit and integration tests; FR-03 text and acceptance in `prd.md`; DEC-01 and TC-02/TC-04 in `techspec.md` (and its stale PRD hash); the README bullet "What is listed".
- Out of scope: telling a junction from a symbolic link (Node reports both as symbolic links; NFR-03 forbids a process to build the block); harness files ContextBrake only edits (still never listed).

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| qa_01/BUG-01 | `qa.md#bugs` | With `.claude` a junction to `.agents`, the block lists only `/.agents/hooks/*.mjs`; Git shows `.claude/hooks/*.mjs` as untracked (FR-03, OBJ-01) |

## Requirements

- For each owned path, list its logical project-relative path, and also its real path when that differs and lies inside the project; sort and deduplicate as today.
- A real path outside the project is still not listed, but the logical path is.
- The config, manifest, runtime state files, and paths without links produce the same lines as today.

## Context to recover on demand

- PRD: FR-03, OBJ-01. TechSpec: DEC-01, TC-02, TC-04.
- Rules: `code-standards.md` (file at 93 of 100 lines), `tests.md` (link tests use `tests/helpers/link-capability.ts`), `file-changes.md`.
- Code: `src/core/services/gitignore-plan.ts` `ownedPathsFor`, `projectRelative`; `tests/unit/gitignore-plan.test.ts` (TC-02); `tests/integration/init-gitignore.test.ts` FR-03 case (already a junction on Windows).

## Work

- [x] T01.1 `ownedPathsFor` emits the logical path and the in-root real path.
- [x] T01.2 Unit: a linked folder yields both lines; an outside-root target yields only the logical line.
- [x] T01.3 Integration: the FR-03 case asserts both `/.claude/hooks/context-brake.mjs` and `/.agents/hooks/context-brake.mjs`.
- [x] T01.4 Amend FR-03 (PRD), DEC-01, TC-02, TC-04 (TechSpec, plus the header PRD hash), and the README bullet.

## Acceptance criteria

- The new assertions fail against the current code and pass after the change.
- In a real `git init` folder on Windows with `.claude` a junction and with `.claude` a directory symlink, `git status --porcelain -uall` lists no owned file after `init --yes`.

## Verification

- Unit: `npm test -- tests/unit/gitignore-plan.test.ts`.
- Integration: `npm test -- tests/integration/init-gitignore.test.ts`.
- End-to-end: S11 of qa_01 (junction and directory symlink) rerun by the next QA run; scripts in `qa_01/evidence/scripts/`.
- Platforms: Windows driven here; Linux and macOS through the in-process suite only.
- Environment dependency: none.
- Commands: the tests above, `npm run lint`, `npm run typecheck`, `npm run coverage`.
- Expected evidence: tests citing `FR-03`, `BUG-01`.

## Affected files

- Modify: `src/core/services/gitignore-plan.ts`, `tests/unit/gitignore-plan.test.ts`, `tests/integration/init-gitignore.test.ts`, `README.md`, `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/prd.md`, `tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/techspec.md`

## Observability and recovery

- Operational signal: the block lines in the plan, `--dry-run`, and `--json`. Recovery: revert the change; the next `init` rewrites the block.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `ownedPathsFor` lists each owned file's logical path and its in-root real path, so a linked `.claude` -> `.agents` gives both `/.claude/hooks/...` and `/.agents/hooks/...`; an outside-root target keeps the logical line. FR-03 (PRD), DEC-01, TC-02, TC-04 and the PRD hash in the TechSpec header, and the README bullet amended under DEC-HIL-06.
- Changed files: modified src/core/services/gitignore-plan.ts, tests/unit/gitignore-plan.test.ts, tests/integration/init-gitignore.test.ts, README.md (LF kept), prd.md, techspec.md
- Checks: the 3 changed assertions failed against the old code and pass now; `npm test` on gitignore-plan, init-gitignore, init-gitignore-lifecycle, init-gitignore-tracked, remove-gitignore, symlinked-harness-config, symlinked-harness-lifecycle: 7 files passed; `npm run lint` no issues; `npm run typecheck` exit 0; `npm run build` exit 0; `npm run coverage` exit 0: 258 files passed, 94.78 % lines, 117 s. End-to-end on the built CLI in real `git init` folders (Windows, Git Bash): with `.claude` a junction and with `.claude` a directory symlink to `.agents`, `init --yes` then `git status --porcelain -uall` shows only `.agents/settings*.json`, `.claude/settings*.json` or the `.claude` link, and `.gitignore`; no owned file.
- Validated state: HEAD `5c97f37` plus the uncommitted working tree; Windows 11.
- Open items: Linux and macOS not driven (in-process suite only).
