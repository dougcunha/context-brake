# QA report — init keeps ContextBrake's own files out of Git (prd-17)

## Summary

- Status: APPROVED
- Execution: delegated QA runner
- Code state: HEAD `5c97f37` plus the uncommitted worktree. The sha256 of `git diff 5c97f37` over `src`, `schemas`, `scripts`, `README.md`, `AGENTS.md`, `.agents/rules`, and `tests`, plus the untracked `src` and `tests` files, is `e3763f6a…f2a51` (`evidence/00-code-state.txt`). It differs from the qa_01 value `6bd33837…6031c`, which shows that the BUG-01 correction in `gitignore-plan.ts` is the code under test. The sha256 was the same at the start and at the end of QA. The md5 of `git status --porcelain` was `554d3583…` (51 lines) before and after install, build, gates, coverage, and every scenario, so QA changed no tracked or listed file.
- Latest review: `codereview_05/codereview.md` (APPROVED, no findings)
- Previous QA: `qa_01/qa.md` (REJECTED, BUG-01). Its correction: `qa_01/done/task_01.md` (DEC-HIL-06)

## Environment

| Item | Value |
| --- | --- |
| Node.js | v24.20.0. Git 2.56.0.windows.2 |
| Platforms | Windows 11 Pro under Git Bash (S01 to S12, S14) and PowerShell 7 (S13). Linux and macOS were not run. |
| Build command | `npm install --ignore-scripts` (exit 0), `npm run build` (exit 0). See `evidence/01-install.txt` and `evidence/02-build.txt`. |
| Fixtures | `tests/fixtures/` has no Git repository fixture, so each scenario ran in its own new folder under the session scratchpad (`…/scratchpad/qa02-runs/`). These folders are outside the worktree, and no parent folder has a `.git` (checked up to `C:`). Each folder got a real `git init` (S09 excepted), `.claude/settings.json` = `{"hooks": {}}` (or `.agents/settings.json` behind a `.claude` link in S11 and S13), an optional `.codex/` folder, and the `.gitignore` the scenario names. `HOME`, `USERPROFILE`, and `GIT_CONFIG_GLOBAL` pointed to a fake home folder, so no user-level harness or Git configuration was read or written. `NO_COLOR=1` was set. The drivers are in `evidence/scripts/`. They are the qa_01 scripts with the evidence path moved to qa_02, S11 rewritten for DEC-HIL-06, `validate.ts` importing through a `file://` URL, and a new `s13-powershell.ps1`. |

## Acceptance checklist

| Obligation | Test cases | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-01 | TC-02, TC-04, TC-11 | end-to-end + unit/integration | PASSED | `evidence/S01-every-feature-on.log`. The block is exactly the config, the manifest, every manifest asset (both harness hook scripts, the status line hook, the mod files, `.context-brake/.gitignore`), and the runtime state files, all anchored with `/`. |
| FR-02 | TC-05 | end-to-end + integration | PASSED | `evidence/S02-second-run-idempotent.log`, `evidence/S03-options-change.log`. The block follows `--no-auto-restart`, `--exclude-harness codex-cli`, and `--auto-restart`. A second run plans 0 changes, also in both S11 link layouts and in S13. |
| FR-03 | TC-02, TC-04 | end-to-end + unit/integration | PASSED | `evidence/S11-symlinked-harness.log`, `evidence/S13-powershell-run.txt`. With `.claude` as a junction to `.agents` and as an NTFS directory symlink, the block has `/.claude/hooks/context-brake{,-statusline}.mjs` and `/.agents/hooks/context-brake{,-statusline}.mjs`. No `settings` path is in any block (S01, S11). `git check-ignore -v` matches all four junction paths and both `.agents` paths in the dir-symlink layout. |
| FR-04 | TC-01, TC-04, TC-05 | end-to-end + unit/integration | PASSED | S04: `--dry-run --json` has the change with owner `gitignore` (`update`, or `create` when the file is missing) and writes nothing. The `NO_COLOR` text has `[update] .gitignore (gitignore)` / `[create] .gitignore (gitignore)` and `Keep ContextBrake's files out of Git`, with no ANSI codes. S05: bytes outside the block are kept. S06: start-only, end-only, and two-pair markers each give `GITIGNORE_MARKERS_MALFORMED` naming `.gitignore`. The file is untouched, and the config and hook are still written. S07: a missing file is created with only the block. |
| FR-05 | TC-03, TC-05 | end-to-end + unit/integration | PASSED | `evidence/S08-opt-out-opt-in.log`. `--no-gitignore` removes the block and stores `gitIgnore: false`. A plain `init` keeps the opt-out. `--gitignore` restores the block and drops the key. The default stores no key. Both flags together give exit 64 with the message. On a fresh repository, `--no-gitignore` writes no `.gitignore`. |
| FR-06 | TC-01, TC-06, TC-11 | end-to-end + integration | PASSED | S05b (LF), S05c (CRLF), S11 (junction and dir), and S13 (CRLF, plain and junction): after `remove`, `.gitignore` is byte-identical to the original. S07: a file that held only the block is deleted. |
| FR-07 | TC-04 | end-to-end + integration | PASSED | `evidence/S09-outside-git.log`. Without `.git`, no `.gitignore` is written and the report has `GITIGNORE_NO_GIT`. |
| FR-08 | TC-07 | end-to-end (real `git ls-files`) + integration | PASSED | `evidence/S10-tracked-files.log`. A committed `context-brake.config.json` gives `GITIGNORE_TRACKED_FILES` (severity `ok`) with `git rm --cached -- context-brake.config.json`. The exit code equals the untracked baseline. `git ls-files -s` is unchanged and nothing is staged. The text output shows the command. |
| FR-09 | TC-08 | unit/integration (no TTY end-to-end route) | PASSED | `evidence/04-coverage.txt`: `assistant-questions-gitignore.test.ts` and `init-assistant-equivalence.test.ts` pass in this code state's coverage run |
| FR-10 | TC-10 | end-to-end search + unit | PASSED | `evidence/S14-docs-fr10.txt`. A repository-wide search, excluding `node_modules`, `dist`, `coverage`, and the prd-17 folder, finds the old "never edits/does not touch `.gitignore`" statement in only two places: the negative assertion in `readme-gitignore.test.ts:21-22` and `prd-12/techspec.md:145`, which already carries the prd-17 note. `README.md:154` names the link case ("both the link path and the target path"), `:156` and `:312` document `--gitignore`/`--no-gitignore`, `AGENTS.md:39` and `file-changes.md:9,17,20` describe the block, and both prd-12 files carry the prd-17 note. README has 0 CR bytes. `readme-gitignore.test.ts` passes in coverage. |
| NFR-01 | TC-01, TC-05 | end-to-end + unit | PASSED | S02, S05, S05b, S11, and S13: second runs are byte-identical or plan 0 changes. S04: dry-run writes nothing. |
| NFR-02 | TC-09 | suite + schema validation | PASSED | `npm run schemas:check` exit 0 (`evidence/03-schemas:check.txt`). The 8 applied `init`/`remove` `--json` documents and 1 `init --dry-run --json` document all pass `installReportSchema`, the zod source of `schemas/install-report.schema.json` (`evidence/S12-json-schema-validation.txt`). Exit codes are unchanged (S10, S08). |
| NFR-03 | TC-02, TC-04 | end-to-end | PASSED (Windows only) | CRLF, LF, and mixed-ending files (S05, S13). Git Bash and PowerShell 7 (S13: CRLF block, idempotent, byte-equal after `remove`, in the plain and junction layouts). Linux and macOS were not run (see limitations). |
| NFR-04 | — | suite | PASSED | `npm run coverage`: 258 of 258 test files passed, 94.78 % lines, Vitest duration 137.41 s, 139 s wall, under the 180 s budget (`evidence/04-coverage.txt`) |
| OBJ-01 | TC-11 | end-to-end | PASSED | S01: with every option on (two harnesses, `--auto-restart`, `--statusline-bridge`, `--debug`, `--snapshot-command`), `git status --porcelain -uall` lists only the harness files that `init` edits and `.gitignore`. S11 junction: only `.agents/settings{,.local}.json`, `.claude/settings{,.local}.json`, and `.gitignore`. S11 dir symlink: only `.agents/settings{,.local}.json`, the `.claude` link entry, and `.gitignore`. |
| OBJ-02 | TC-05 | end-to-end | PASSED | S03 |
| OBJ-03 | TC-01 | end-to-end | PASSED | S05: a mixed CRLF/LF file with comments, blank lines, and no final newline. The bytes before the block are the original plus the one break HIL 2 (OI-01) accepted, then a blank line. The block is written in CRLF, and a second run is identical. |
| OBJ-04 | TC-05 | end-to-end | PASSED | S08 |
| OBJ-05 | TC-06, TC-11 | end-to-end | PASSED | S05b, S05c, S11 (both layouts), and S13 (both layouts) are byte-identical after `remove`. S05 (no final newline) keeps only the inserted break (HIL 2). |
| US-04 | TC-07 | end-to-end | PASSED | see FR-08 |

## End-to-end runs

| Scenario | Fixture | Command | Exit code | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| S01 (TC-11, OBJ-01, FR-01) | `git init`, `.claude`, `.codex`, `.gitignore`=`node_modules/\n` | `init --yes --auto-restart --statusline-bridge --debug --snapshot-command /qa-snap --harness claude-code --harness codex-cli`; `git status --porcelain -uall` | 0 | PASSED | `evidence/S01-every-feature-on.log` |
| S02 (FR-02, NFR-01) | S01 folder | the same options with `--dry-run --json`, then `--yes` | 0 | PASSED | `evidence/S02-second-run-idempotent.log` |
| S03 (FR-02, OBJ-02) | S01 folder | `init --yes --no-auto-restart`; `--exclude-harness codex-cli`; `--auto-restart` | 0 | PASSED | `evidence/S03-options-change.log` |
| S04 (FR-04) | `.gitignore`=`dist/\n`; and no `.gitignore` | `init --dry-run --json`; `init --dry-run` | 0 | PASSED | `evidence/S04-dry-run-json-text.log` |
| S05 (OBJ-03, OBJ-05) | mixed CRLF/LF without final newline; LF; CRLF | `init --yes --json`; `init --yes`; `remove --yes` | 0 | PASSED | `evidence/S05-bytes-outside-block.log` |
| S06 (FR-04 malformed) | start-only, end-only, two pairs | `init --yes --json` | 2 | PASSED | `evidence/S06-malformed-markers.log` |
| S07 (FR-04, FR-06) | no `.gitignore` | `init --yes`; `remove --yes` | 0 | PASSED | `evidence/S07-missing-gitignore.log` |
| S08 (FR-05, OBJ-04) | `.gitignore`=`node_modules/\n`; and a fresh folder | `init --yes`; `--no-gitignore`; plain; `--gitignore`; `--gitignore --no-gitignore` | 0 / 64 | PASSED | `evidence/S08-opt-out-opt-in.log` |
| S09 (FR-07) | no `.git` | `init --yes --json`; `init --dry-run` | 0 | PASSED | `evidence/S09-outside-git.log` |
| S10 (FR-08, US-04) | committed `context-brake.config.json` | `init --yes --json --gitignore`; baseline `init --yes --json`; `init --dry-run` | 0 | PASSED | `evidence/S10-tracked-files.log` |
| S11 (FR-03, OBJ-01, qa_01/BUG-01) | `.gitignore`=`node_modules/\n`; `.claude` -> `.agents` as a junction and as an NTFS `dir` symlink | `init --yes`; `git status --porcelain -uall`; `git check-ignore -v --no-index <hook paths>`; `init --yes --dry-run --json`; `remove --yes` | 0 | PASSED (26 checks: 14 junction, 12 dir) | `evidence/S11-symlinked-harness.log` |
| S12 (NFR-02) | captured reports | `npx tsx scripts/validate.ts` against `installReportSchema` | 0 | PASSED (9 valid) | `evidence/S12-json-schema-validation.txt`, `evidence/S12-json-docs.json`, `evidence/S12-dry-run-docs.json` |
| S13 (NFR-03, TC-11, FR-03) | PowerShell 7, `.gitignore`=`node_modules/\r\n`; plain `.claude` and a `.claude` junction (`New-Item -ItemType Junction`) | `init --dry-run --json`; `init --yes`; `git status --porcelain -uall`; `init --yes --dry-run --json`; `remove --yes` | 0 | PASSED | `evidence/S13-powershell-run.txt`, `evidence/scripts/s13-powershell.ps1` |
| S14 (FR-10) | repository docs (read only) | `rg` for the old statements, the flags, and the link wording | — | PASSED | `evidence/S14-docs-fr10.txt` |
| Gates | worktree | `npm run schemas:check`, `typecheck`, `lint`, `coverage` | 0 each | PASSED | `evidence/03-*.txt`, `evidence/04-coverage.txt` |

Totals: `scenarios-a.mjs` ran 29 checks and `scenarios-b.mjs` ran 66, with 0 failed (`evidence/run-a.txt`, `evidence/run-b.txt`). The S06 exit code of 2 comes from the conflict status of the report. It is recorded, not judged: the PRD requires only that `init` continues, and it does.

## Manual acceptance

| Script | Executed by | Observed result | Status |
| --- | --- | --- | --- |
| The TechSpec lists no manual script. HIL 3 (the person's own repository) | — | Not run. The contract forbids a real `init` on this repository. | NOT VERIFIABLE (belongs to the person at HIL 3; not an acceptance obligation of the TechSpec) |

## Findings

None.

## Previous findings (re-run only)

| QA/ID | State | Current evidence |
| --- | --- | --- |
| qa_01/BUG-01 (Low, FR-03 and OBJ-01: with a junction, only the target path was listed and `.claude/hooks/*.mjs` stayed untracked) | resolved | `evidence/S11-symlinked-harness.log`: with a junction, the block lists both the `/.claude/hooks/…` and the `/.agents/hooks/…` lines. `git check-ignore -v` matches `.claude/hooks/context-brake.mjs` (`.gitignore:7`) and `.claude/hooks/context-brake-statusline.mjs` (`.gitignore:6`), and `git status --porcelain -uall` lists no owned file. The same holds under PowerShell (`evidence/S13-powershell-run.txt`, junction layout). |

## Limitations and open items

- Linux and macOS were not run, which affects NFR-03 and the POSIX symbolic-link path of FR-03. The TechSpec already records them as unverified.
- HIL 3 (the person's own repository) was not run, as the manual acceptance table explains.
- FR-09 has no end-to-end route without a TTY. Its proof is the in-process suite of the same code state.
- The `--json` documents were validated against the zod source schema, and `schemas:check` confirms that `schemas/install-report.schema.json` matches that source. No standalone draft-2020-12 validator was available.
- In the dir-symlink layout, Git sees `.claude` as one entry, so `git check-ignore` probed only the `.agents` paths. The `/.claude/hooks/…` lines match nothing there, as DEC-HIL-06 expects.
- The snapshot was loaded through the independent-stage filter: the header, the next step brief, `Open threads`, and the on-run entry L-02 were used, and `Decisions` and the other `Learnings` were skipped. The header `git_head` (5c97f37) matches HEAD, and `covers_through` (codereview_05) matches the latest review.
- During the run, ContextBrake telemetry in this delegated session reached the RED and CRITICAL zones and asked for `/sdd-snapshot` and a session reset. The delegation contract forbids snapshot edits and the session pause, so QA finished without them and wrote only to `qa_02/`.
- Accepted, not findings: `.claude/settings.json`, `.claude/settings.local.json`, `.codex/hooks.json`, and the `.agents` settings targets stay visible in `git status`, because they are harness files that `init` only edits (FR-03, DEC-HIL-03). A directory symlink shows its own `.claude` entry. A file without a final newline keeps the inserted break after `remove` (HIL 2, OI-01).

## Conclusion

Every PRD acceptance obligation passes on the built CLI in real `git init` folders on Windows, under Git Bash and PowerShell 7, and the in-process suite of the same code state is green within budget. qa_01/BUG-01 is resolved. With `.claude` as a junction or as a directory symlink to `.agents`, the block lists both the link and the target hook lines, Git ignores the owned files, a second run plans nothing, and `remove` restores the original `.gitignore` byte for byte. No new defect was found. Linux and macOS remain undriven, as the TechSpec already records. Status: APPROVED.
