# TypeScript quality profile

Record the profile in the TechSpec so execution, orchestration, and review apply the same rules without rediscovering them. The profile is the feature's quality contract: the executor applies it while writing, and every downstream gate verifies it with the commands recorded here.

Select **only the rules the feature can violate**, typically five to eight. A feature that spawns no processes does not carry the process rule; one that adds no in-process adapter does not carry the synchronous I/O rule. A profile that turns into a catalog is ignored from excess context; a short, relevant profile is followed.

## Classes

Two classes, with different destinations in review:

- **Blocking** — defect with a concrete failure path. A hit not justified in the TechSpec prevents task completion and rejects the review.
- **Reservation** — maintenance cost without a demonstrated failure. A hit goes to the report as an optional improvement and counts toward the escalation trigger; it never rejects on its own.

A rule may have a prior justification recorded in the TechSpec (`DEC-NN`): in that case the corresponding hit is expected and is not a finding. A justification applies to the specific spot, not to the whole file.

A hit already listed in the **Terrain baseline** is debt that predates the feature and is not a task finding: charging it to the executor punishes whoever touched the file last and turns the profile into noise. Only a hit the task introduced is a finding, or a pre-existing hit it aggravated — one more case in the saturated `switch`, one more parameter in a function already at the limit. A target file absent from the baseline counts as unmeasured, and every hit in it is treated as new.

## Greppable set

Scoped to the files the task touched, never to the repository. Run the commands from a POSIX shell (Git Bash on Windows) and define the scope once:

```bash
RG=(rg -n --type ts -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')
files=()             # every TypeScript file in the task diff
core_files=()        # the subset under src/core/
in_process_files=()  # the subset loaded inside a harness process (OpenCode, Pi, and Oh-My-Pi adapters)
hook_files=()        # the subset on a hook response path, excluding the response writer and the logger
```

Skip any command whose file list is empty: `rg` without paths searches the whole repository.

**Blocking**

```bash
"${RG[@]}" ':\s*any\b|\bas any\b|<any>' "${files[@]}"
"${RG[@]}" '@ts-ignore|@ts-nocheck|eslint-disable' "${files[@]}"
"${RG[@]}" -U 'catch\s*(\([^)]*\))?\s*\{\s*\}|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "${files[@]}"
"${RG[@]}" '\bexecSync\(|\bexec\(|shell:\s*true' "${files[@]}"
"${RG[@]}" "from '(\.\./)+(infrastructure|cli)/" "${core_files[@]}"
"${RG[@]}" '\b(readFileSync|writeFileSync|appendFileSync|existsSync|spawnSync)\b' "${in_process_files[@]}"
"${RG[@]}" 'console\.log|process\.stdout\.write' "${hook_files[@]}"
```

| Rule | Scope | Why it blocks |
| --- | --- | --- |
| `any` in any form | `files` | turns off type checking exactly where external data and contracts pass through |
| `@ts-ignore`, `@ts-nocheck`, `eslint-disable` | `files` | silences a diagnostic the build would report; requires a `DEC-NN` naming the diagnostic |
| empty `catch` or `.catch(() => {})` | `files` | the failure disappears, and the adapter failure policy cannot run |
| `exec`, `execSync`, or `shell: true` | `files` | runs a shell command that input can alter; only the runner's validation-command module may hold a `DEC-NN` for it |
| `core` importing `infrastructure` or `cli` | `core_files` | breaks the hexagonal boundary in `AGENTS.md` |
| synchronous file or process API | `in_process_files` | blocks the harness process that loaded the plugin or extension |
| `console.log` or `process.stdout.write` | `hook_files` | corrupts the response the harness reads from stdout |

**Reservations**

```bash
"${RG[@]}" 'throw new Error\(' "${files[@]}"
"${RG[@]}" 'Date\.now\(\)|new Date\(\)|Math\.random\(\)' "${core_files[@]}"
"${RG[@]}" '\((?:[^(),]+,){3,}[^()]*\)\s*(?::\s*[^={]+)?\s*(?:\{|=>)' "${files[@]}"
rg -c -H '^' "${files[@]}" | awk -F: '$2 > 100'
```

| Rule | Threshold |
| --- | --- |
| `throw new Error(` | a generic error where a dedicated class expresses a failure the user can fix |
| clock or randomness in `core` | an uninjected clock or random source prevents deterministic tests |
| parameter list | 4+ parameters in one declaration call for a parameter object; confirm each hit is a declaration, not a call |
| file size | above 100 lines, the limit in `.agents/rules/code-standards.md` |

The gate is asymmetric: a clean file returns empty output and consumes no context. Cost tracks the problems found, not the size of the code.

## Escalation

The profile never triggers a heavy audit inside the cycle. It accumulates counts so the review **suggests** one, with a concrete number, and the decision stays at the HIL. Objective triggers:

- eight or more reservation hits in the feature, or
- a touched file that crossed 200 lines, or
- the same symbol or block duplicated in three or more places in the diff.

Name the skill matching the signal: dead code, duplication, and coupling go to `architectural-analysis`, whose report `sdd-plan-audit` turns into planned workstreams; when installed, focused duplication analysis goes to `refactoring-analysis` and full diff review goes to `deep-review`. With no trigger fired, suggest none.

## Recording in the TechSpec

Fill in the template's **Quality profile** section with the selected rules, each one's class, the command that verifies it, the file list it runs on, and the prior justifications. A rule absent from the profile is verified by no gate — the selection is the decision that matters. The `architectural-analysis` catalog is the source of classification and severity; this file carries only the executable subset, so the TechSpec remains sufficient without it.
