# Stable execution context

Load in this exact order:

1. `tasks/prd-07-modo-leve/codereview_01/codereview.md`
2. This file

Use the already loaded report version; recover relevant contracts and code afterward. This order does not guarantee a host cache hit.

---

# T07 — Remover o bloco de referência devolve os bytes originais

## Outcome

Removing the ContextBrake reference block from an instruction file restores the exact bytes the file had before the block was inserted. This holds whether or not the file ended with a newline, with LF and with CRLF. So full → light → full leaves user content identical, and it reproduces a fresh full install.

## Dependencies and boundaries

- Depends on: —
- Unblocks: —
- In scope:
  - `removeReferenceFromBody` in `src/core/services/removal-helper.ts`;
  - unit cases for insertion followed by removal;
  - a TC-08 case with an instruction file without a trailing newline.
- Out of scope:
  - how the block is inserted (`instruction-service.ts`);
  - legacy `CONTEXTOPS` blocks;
  - blocks the user edited around by hand, where the original bytes cannot be known.

## Traceability

| Source | Section | Finding covered |
| --- | --- | --- |
| codereview_01/CR-01 | `codereview.md#Findings` | An instruction file without a trailing newline gains one byte after full → light, and `init --no-light` then differs from a fresh full install |
| FR-09 | `prd.md#functional-requirements` | User content byte-identical across full → light → full |
| DEC-08 | `techspec.md#technical-decisions` | Light mode removes the reference blocks (`planInstructionRemoval`) |

## Requirements

- Removal must be the inverse of `planExistingInstruction` (`instruction-service.ts:80-82`), which inserts:
  - `content + EOL + block + EOL` when the content ends with an EOL;
  - `content + EOL + EOL + block` when it does not;
  - `block` alone for empty content.
- When nothing follows the end marker, and the text before the block ends with two EOLs, remove both. When one EOL follows the end marker, keep the current behavior: remove one EOL on each side.
- The EOL is `\r\n` when the content contains it, and `\n` otherwise.
- A block in the middle of the file keeps today's behavior.
- `remove` shares this function and gets the same fix. This extends the NFR-01 deviation recorded in `codereview.md#Limitations and open items`.

## Context to recover on demand

- TechSpec: `techspec.md#technical-decisions` (DEC-08).
- Rules and skills: `code-standards.md`, `javascript-typescript.md`, `tests.md`, `file-changes.md`.
- Code:
  - `src/core/services/removal-helper.ts:7-23` `removeReferenceFromBody`;
  - `src/core/services/instruction-service.ts:55-83` `planExistingInstruction`, the insertion;
  - existing removal tests (`rg -l removeReferenceFromBody tests`);
  - `tests/integration/init-light-switch.test.ts`, `tests/helpers/light-world.ts`.

## Work

- [x] T07.1 Change `removeReferenceFromBody` so that when the block ends the file with no EOL after the end marker, it also strips the second EOL that insertion added before the block.
- [x] T07.2 Add unit round-trip cases: insert with `planExistingInstruction`, then remove with `removeReferenceFromBody`, and assert the bytes equal the original. Cover:
  - `''`;
  - `'X'`, `'X\n'`, and `'X\n\n'`;
  - `'A\r\nB'` and `'A\r\nB\r\n'`.
- [x] T07.3 Extend TC-08 (`init-light-switch.test.ts`) with an instruction file that has no trailing newline:
  - after full → light, it equals the original bytes;
  - after `--no-light`, it equals a fresh full install.

## Acceptance criteria

- `CLAUDE.md` = `# Project\nrules` survives `init`, then `init --light --yes`, byte for byte. After `init --no-light --yes`, it equals the same file after a fresh full `init`.
- Every T07.2 round-trip case restores the original bytes.
- The existing removal, `remove`, and instruction suites pass unchanged, or with an expected value updated only where the old value was the extra-newline residue. Record any such update in the handoff.

## Verification

- Unit: the T07.2 round-trip cases.
- Integration: the T07.3 case in `init-light-switch.test.ts`.
- End-to-end: not applicable. The built CLI check in the report is rerun manually.
- Manual: rerun the report's spot check (`# Project\nrules` through full → light → full) with the built CLI.
- Platforms: Windows locally; CI matrix.
- Environment dependency: none.
- Commands: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (targeted), and `npm run coverage` at the end of the round.
- Expected evidence: test counts and `cmp` output from the spot check.

## Affected files

- Modify: `src/core/services/removal-helper.ts`, `tests/integration/init-light-switch.test.ts`
- Create or modify: a unit test for the round trip (for example `tests/unit/reference-block-roundtrip.test.ts`)

## Observability and recovery

- Operational signal: the `init` preview shows the instruction update, and the file diff shows no residue.
- Recovery: revert the change. The previous behavior leaves one extra newline.

## Handoff

> Updated by `sdd-execute-corrections` during implementation.

- Produced result: `removeReferenceFromBody` now inverts the insertion. When the block ends the file, with no EOL after the end marker, it strips both EOLs that insertion added before the block. The function stops returning the extra newline. A block ending the file with no EOL before it after one strip (a hand-made layout) keeps the previous behavior. `remove` shares the fix, which extends the NFR-01 deviation already recorded in the report.
- Changed files:
  - Modified: `src/core/services/removal-helper.ts` (90 lines; new private `stripTrailingEol`, no comment, per `code-standards.md`), `tests/integration/init-light-switch.test.ts` (89 lines; new no-trailing-newline round trip).
  - New: `tests/unit/reference-block-roundtrip.test.ts` (6 cases: empty, no EOL, EOL, blank line, CRLF without EOL, CRLF with EOL).
- Checks:
  - `npm run build`, `npm run typecheck`, and ESLint on the touched files pass.
  - Round trip: 6/6. The affected init, removal, instruction, and symlink suites pass (8 files, 34 tests). The `remove` and e2e suites pass as well (`e2e-07-08`, `e2e-remove-invalid-config`, `e2e-user-hook-preservation`, `e2e-linked-project-root`, `safe-removal`, `runtime-state-removal`, `invalid-config`: 7 files, 13 tests). No existing expected value needed a change.
  - Built CLI spot check: `CLAUDE.md` = `# Project
rules` is byte-identical after `init` then `init --light`. After `--no-light`, it equals a fresh full install (`cmp`).
  - Quality profile QA-01 to QA-03 have no hits in the touched files.
- Validated state: worktree at `c3fb6a8` plus the feature diff and this correction, with `dist/` rebuilt, on Windows 11 with Node 24.
- Open items: none. The full `npm run coverage` runs at the end of the round.
