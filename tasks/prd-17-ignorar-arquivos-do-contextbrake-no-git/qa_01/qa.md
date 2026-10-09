# QA report — init keeps ContextBrake's own files out of Git (prd-17)

## Summary

- Status: REJECTED
- Execution: delegated QA runner
- Code state: HEAD `5c97f37` plus the uncommitted worktree. The sha256 of `git diff 5c97f37` over `src`, `schemas`, `scripts`, `README.md`, `AGENTS.md`, `.agents/rules`, and `tests`, plus the untracked `src` and `tests` files, is `6bd33837…6031c` (`evidence/00-code-state.txt`). The md5 of `git status --porcelain` was `554d3583…` before and after every QA command, so QA changed no tracked or source file.
- Latest review: `codereview_04/codereview.md` (APPROVED)
- Previous QA: —

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0; Git 2.56.0.windows.2 |
| Platforms | Ran on Windows 11 Pro under Git Bash (S01 to S12) and PowerShell 7 (S13). Linux and macOS were not run. |
| Build command | `npm install --ignore-scripts` (exit 0), `npm run build` (exit 0) |
| Fixtures | `tests/fixtures/` has no Git repository fixture. Each scenario ran in its own new folder under the session scratchpad (`…/scratchpad/qa-runs/`), outside the worktree and with no `.git` in any parent folder. Each folder got `git init` (except S09), `.claude/settings.json` = `{"hooks": {}}` (the layout of `tests/e2e/e2e-init.test.ts`), an optional `.codex/` folder, and the `.gitignore` the scenario names. `HOME`, `USERPROFILE`, and `GIT_CONFIG_GLOBAL` pointed to a fake home folder, so no user-level harness or Git configuration was read or written. `NO_COLOR=1` was set. The driver scripts are copied to `evidence/scripts/`. |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-02, TC-04, TC-11 | end-to-end + unit/integration | PASSED | `evidence/S01-every-feature-on.log`. The block has exactly the config, the manifest, every manifest asset (both harness hook scripts, the status line hook, 4 mod files, `.context-brake/.gitignore`), and the runtime state files, all anchored with `/`. |
| FR-02 | TC-05 | end-to-end + integration | PASSED | `evidence/S02-second-run-idempotent.log`, `evidence/S03-options-change.log`. After `--no-auto-restart`, `--exclude-harness codex-cli`, and `--auto-restart`, the block equals the manifest list each time. The second-run dry-run plans 0 changes. |
| FR-03 | TC-02, TC-04 | end-to-end + unit/integration | FAILED | Harness config files were never listed (S01). With an NTFS directory symlink `.claude` -> `.agents`, the block line is `/.agents/hooks/context-brake.mjs` and the folder is clean. With a Windows junction, the line names the target but Git also sees `.claude/hooks/*.mjs`, and those files stay untracked (BUG-01). See `evidence/S11-symlinked-harness.log` and `evidence/S11-junction-repro.txt`. |
| FR-04 | TC-01, TC-04, TC-05 | end-to-end + unit/integration | PASSED | S04: `--dry-run --json` shows the change with owner `gitignore` (kind `update`, or `create` when the file is missing) and writes nothing. The `NO_COLOR` text shows `[update] .gitignore (gitignore)` / `[create] .gitignore (gitignore)` and `Keep ContextBrake's files out of Git`. S05: bytes outside the block are kept. S06: start-only, end-only, and two-pair markers each give `GITIGNORE_MARKERS_MALFORMED` naming `.gitignore`, the file is untouched, and the config and hook are still written. S07: a missing file is created with only the block. |
| FR-05 | TC-03, TC-05 | end-to-end + unit/integration | PASSED | `evidence/S08-opt-out-opt-in.log`. `--no-gitignore` removes the block and stores `gitIgnore: false`. A plain `init` keeps the opt-out. `--gitignore` brings the block back and drops the key. The default stores no key. Both flags together give exit 64 with the message. On a fresh repository, `--no-gitignore` writes no `.gitignore`. |
| FR-06 | TC-01, TC-06, TC-11 | end-to-end + integration | PASSED | S05b (LF) and S05c (CRLF): after `remove`, `.gitignore` is byte-identical to the original. S07: a block-only file is deleted. |
| FR-07 | TC-04 | end-to-end + integration | PASSED | `evidence/S09-outside-git.log`. Without `.git`, no `.gitignore` is written and the report has `GITIGNORE_NO_GIT`. |
| FR-08 | TC-07 | end-to-end (real `git ls-files`) + integration | PASSED | `evidence/S10-tracked-files.log`. A committed `context-brake.config.json` gives `GITIGNORE_TRACKED_FILES` (severity `ok`) with `git rm --cached -- context-brake.config.json`. The exit code equals the untracked baseline. `git ls-files -s` is unchanged and nothing is staged. The text output shows the command. |
| FR-09 | TC-08 | unit/integration (no TTY end-to-end route) | PASSED | `evidence/04-coverage.txt`. `assistant-questions-gitignore.test.ts` and `init-assistant-equivalence.test.ts` are green in this code state's coverage run. |
| FR-10 | TC-10 | end-to-end search + unit | PASSED | `evidence/S14-docs-fr10.txt`. The only hit, `README.md:125`, is the new wording ("does not touch instruction files … the only change … is the marked block"), not the old statement. The README documents both flags, and `AGENTS.md:39` and `file-changes.md:9,17,20` describe the block. |
| NFR-01 | TC-01, TC-05 | end-to-end + unit | PASSED | S02, S05, and S05b: a second run is byte-identical. S04: dry-run writes nothing. |
| NFR-02 | TC-09 | suite + schema validation | PASSED | `npm run schemas:check` exit 0. All 9 captured `--json` documents (init applied and dry-run, remove, malformed, outside Git, tracked) pass `installReportSchema`, the zod source the JSON schema is generated from. The `ajv@6` in `node_modules` cannot read draft-2020-12, so it was not used (`evidence/S12-json-schema-validation.txt`). Exit codes stay unchanged (S10). |
| NFR-03 | TC-02, TC-04 | end-to-end | PASSED (Windows only) | CRLF, LF, and mixed-ending files were run (S05). Git Bash and PowerShell were run (S13). Linux and macOS were not run (see limitations). |
| NFR-04 | — | suite | PASSED | `npm run coverage`: 258 files, 1457 tests, 94.78 % lines, Vitest 103.75 s, 106 s wall, under the 180 s budget |
| OBJ-01 | TC-11 | end-to-end | PASSED for the standard layout, FAILED for the junction layout | S01: with every option on (two harnesses, `--auto-restart`, `--statusline-bridge`, `--debug`, `--snapshot-command`), `git status --porcelain -uall` lists only `.claude/settings.json`, `.claude/settings.local.json`, `.codex/hooks.json`, and `.gitignore`. These are harness files that `init` edits, which FR-03 and the PRD clarification accept. In the junction layout, owned files stay visible (BUG-01). |
| OBJ-02 | TC-05 | end-to-end | PASSED | S03 |
| OBJ-03 | TC-01 | end-to-end | PASSED | S05: a CRLF/LF mixed file with comments, blank lines, and no final newline. The bytes before the block are the original plus the one break that HIL 2 (OI-01) accepted, then a blank line. The block is written in CRLF. The second run is identical. |
| OBJ-04 | TC-05 | end-to-end | PASSED | S08 |
| OBJ-05 | TC-06, TC-11 | end-to-end | PASSED | S05b and S05c are byte-identical. S05 (no final newline) keeps only the inserted break (HIL 2). S13 (PowerShell) is byte-equal. |
| US-04 | TC-07 | end-to-end | PASSED | see FR-08 |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| S01 (TC-11, OBJ-01, FR-01) | `git init`, `.claude`, `.codex`, `.gitignore`=`node_modules/\n` | `init --yes --auto-restart --statusline-bridge --debug --snapshot-command /qa-snap --harness claude-code --harness codex-cli`; `git status --porcelain -uall` | 0 | PASSED (10 checks) | `evidence/S01-every-feature-on.log` |
| S02 (FR-02, NFR-01) | S01 folder | the same options with `--dry-run --json`, then `--yes` | 0 | PASSED (4) | `evidence/S02-second-run-idempotent.log` |
| S03 (FR-02, OBJ-02) | S01 folder | `init --yes --no-auto-restart`; `init --yes --exclude-harness codex-cli`; `init --yes --auto-restart` | 0 | PASSED (8) | `evidence/S03-options-change.log` |
| S04 (FR-04) | `git init`, `.gitignore`=`dist/\n`; and no `.gitignore` | `init --dry-run --json`; `init --dry-run` | 0 | PASSED (7) | `evidence/S04-dry-run-json-text.log` |
| S05 (OBJ-03, OBJ-05) | mixed CRLF/LF without final newline; LF; CRLF | `init --yes --json`; `init --yes`; `remove --yes` | 0 | PASSED (10) | `evidence/S05-bytes-outside-block.log` |
| S06 (FR-04 malformed) | start-only, end-only, two pairs | `init --yes --json` | 2 | PASSED (9) | `evidence/S06-malformed-markers.log` |
| S07 (FR-04, FR-06) | no `.gitignore` | `init --yes`; `remove --yes` | 0 | PASSED (2) | `evidence/S07-missing-gitignore.log` |
| S08 (FR-05, OBJ-04) | `git init`, `.gitignore`=`node_modules/\n`; and a fresh folder | `init --yes`; `--no-gitignore`; plain; `--gitignore`; `--gitignore --no-gitignore` | 0 / 64 | PASSED (10) | `evidence/S08-opt-out-opt-in.log` |
| S09 (FR-07) | no `.git` | `init --yes --json`; `init --dry-run` | 0 | PASSED (3) | `evidence/S09-outside-git.log` |
| S10 (FR-08, US-04) | committed `context-brake.config.json` | `init --yes --json --gitignore`; baseline `init --yes --json`; `init --dry-run` | 0 | PASSED (6) | `evidence/S10-tracked-files.log` |
| S11 (FR-03 symlink) | `.claude` -> `.agents` as an NTFS `dir` symlink and as a junction | `init --yes`; `git status --porcelain -uall` | 0 | dir: PASSED; junction: FAILED (BUG-01) | `evidence/S11-symlinked-harness.log`, `evidence/S11-junction-repro.txt` |
| S12 (NFR-02) | captured reports | `npx tsx validate.ts` against `installReportSchema` | 0 | PASSED (9 valid) | `evidence/S12-json-schema-validation.txt`, `evidence/S12-json-docs.json` |
| S13 (NFR-03, TC-11) | PowerShell 7, `.gitignore`=`node_modules/\r\n` | `init --dry-run --json`; `init --yes`; `git status --porcelain -uall`; `remove --yes` | 0 | PASSED | `evidence/S13-powershell-run.txt` |
| S14 (FR-10) | repository docs (read only) | `grep` for the old statements and the flags | — | PASSED | `evidence/S14-docs-fr10.txt` |
| Gates | worktree | `npm run schemas:check`, `typecheck`, `lint`, `coverage` | 0 each | PASSED | `evidence/03-*.txt`, `evidence/04-coverage.txt` |

The S06 exit code of 2 comes from the conflict status of the report. It is recorded, not judged: the PRD requires only that `init` continues, and it does.

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| The TechSpec lists no manual script. HIL 3 (the person's own repository) | — | Not run. The contract forbids a real `init` on this repository, and `done/task_06.md` records that its MSYS `.claude` symlink cannot be resolved. | NOT VERIFIABLE (belongs to the person at HIL 3) |

## Findings

| ID | Severity | Obligation | Reproduction | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-01 | Low | FR-03 (OBJ-01 in this layout) | In a new folder on Windows: `git init`; `mkdir .agents`; write `.agents/settings.json` = `{"hooks": {}}`; make `.claude` a junction to `.agents` (`fs.symlinkSync(target, '.claude', 'junction')` or `mklink /J .claude .agents`); `node dist/src/cli/main.js init --yes`; `git status --porcelain -uall` | The owned hook scripts are ignored, and the block names "the path Git sees" | The block lists `/.agents/hooks/context-brake.mjs` and `/.agents/hooks/context-brake-statusline.mjs`. Git for Windows walks a junction as a normal directory, so it also lists `.claude/hooks/context-brake.mjs` and `.claude/hooks/context-brake-statusline.mjs` as untracked. `git check-ignore` matches only the `.agents` path. | `evidence/S11-symlinked-harness.log`, `evidence/S11-junction-repro.txt` |

Suspected area for BUG-01: `src/core/services/gitignore-plan.ts` (`projectRelative` and `locateOwned` use the change's `realPath`). That code treats a junction like a symbolic link, but Git for Windows does not. With an NTFS directory symlink, Git sees the link as one entry, and the same scenario passes. The PRD wording names "symbolic link". `done/task_06.md` (open item 2) and codereview_04 say that junctions resolve, but they checked only the block line, not `git status`. Whether junctions are in scope is for `sdd-plan-corrections` and the person to settle.

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| — | — | First QA run |

## Limitations and open items

- Linux and macOS were not run, which affects NFR-03 and the POSIX symlink path of FR-03. The TechSpec already records them as unverified.
- HIL 3 (the person's own repository) was not run, as the manual acceptance table explains.
- FR-09 has no end-to-end route without a TTY. Its proof is the in-process suite of the same code state.
- The `--json` documents were validated against the zod source schema. `schemas:check` confirms that `schemas/install-report.schema.json` matches that source. No standalone draft-2020-12 validator was available.
- The snapshot was loaded through the independent-stage filter: header, next step brief, open threads, and the on-run entry L-02. Its `covers_through` (codereview_03) is behind codereview_04, so the next step brief was treated as stale.
- Accepted, not findings: `.claude/settings.json`, `.claude/settings.local.json`, and `.codex/hooks.json` stay visible in `git status` (FR-03, PRD clarification). A file without a final newline keeps the inserted break after `remove` (HIL 2, OI-01).

## Conclusion

Most obligations pass on the built CLI in real `git init` folders on Windows, under Git Bash and PowerShell. With every option on, `git status` shows no owned file. The block follows the options and is idempotent. Bytes outside the markers are kept for CRLF, LF, and mixed files. Malformed markers are refused without a write. The opt-out persists, `remove` restores the original, the outside-Git and tracked-files findings behave as specified, and the reports validate. One failure blocks approval: with a Windows junction as the harness folder, the block names only the link target, while Git also sees the hook scripts through the junction path, so they stay untracked (BUG-01, Low). Status: REJECTED.
