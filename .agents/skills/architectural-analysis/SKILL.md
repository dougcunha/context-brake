---
name: architectural-analysis
description: Read-only architectural audit of a TypeScript/Node.js codebase — dead code, duplication, anti-patterns, type safety, code smells — written to a report, never edited. Use when the whole repository or a large module needs an architecture-level health check; it detects the stack first and offers a derived strategy when that stack is not TypeScript/Node.js. Don't use for style/formatting, performance profiling, security audits, or feature-level code review.
disable-model-invocation: true
metadata:
  author: Pedro Nauck
  github: https://github.com/pedronauck
  repository: https://github.com/pedronauck/skills
  adaptation: Recalibrated for TypeScript/Node.js in ContextBrake from a .NET/C# variant.
---
# Architectural Analysis

Read-only audit of a whole TypeScript/Node.js codebase. Report findings only — make no edits. Classification depth for every dimension lives in `references/detection-catalog.md`; each step below names its section — read that section in full before classifying findings in that dimension.

Commands use `ripgrep` from a POSIX shell (Git Bash on Windows), run from the repository root. Define the exclusion set once per session and use it in every sweep, improvised ones included — without it the sweeps report dependencies, build output, coverage, and declaration files as source.
```bash
RG=(rg -g '!node_modules/**' -g '!dist/**' -g '!coverage/**' -g '!**/*.d.ts')
```

## Steps

### 1. Map the codebase
Start from the manifests: one sweep both names the stack and lists the packages.
```bash
rg --files -g 'package.json' -g 'tsconfig*.json' -g 'pnpm-workspace.yaml' -g '*.sln' -g '*.csproj' -g 'pyproject.toml' -g 'go.mod' -g 'Cargo.toml' -g 'pom.xml' -g 'build.gradle*' -g '!node_modules/**'
```
A `package.json` with a `tsconfig.json` alongside `.ts` sources means **TypeScript/Node.js** — carry on below. Any other stack falls outside this skill's calibration: name the stack you found, name the mismatch, and ask the user whether to continue anyway. On a yes, read `references/foreign-stack-adaptation.md` in full and follow it; it rebuilds the sweeps in steps 1–6 around the detected stack and ends by offering to save that strategy as `architectural-analysis-<stack>`.

On TypeScript/Node.js, count the source files and build a todo with one item per `.ts` file. Note the entry points that anchor usage tracing: `bin`, `main`, and `exports` in `package.json`, CLI command registration, hook and plugin entrypoints named in harness configuration or fixtures, dynamic `import()` targets, the composition root, and test files.
```bash
"${RG[@]}" --files --type ts | wc -l
rg -n '"(bin|main|exports|types|scripts)"' package.json
"${RG[@]}" -n --type ts 'import\(|\.command\(|pi\.on\(|export default'
```
**Done when** the stack is named and either it is TypeScript/Node.js or the user has answered the continue question, every source file has a todo entry, and the entry-point list is recorded.

### 2. Detect dead code
For each file in the todo: list its exports and top-level declarations, then search each name for references elsewhere.
```bash
"${RG[@]}" -n --type ts '\bSymbolName\b'
"${RG[@]}" -n -g '*.json' -g '*.yaml' -g '*.toml' -g '*.md' 'SymbolName'
```
Run both sweeps: symbols and modules are reached from `package.json`, harness configuration, fixtures, and dynamic imports by name, so a `.ts`-only search reports live code as dead.

Before recording anything as dead, clear it against the "Not dead" list in `references/detection-catalog.md → Dead code`. Record each finding as `file:line`, category, and confidence per that section, then mark the todo item complete.
**Done when** every todo file's exports and declarations are usage-checked and categorized.

### 3. Detect duplication
Surface candidates by similar names, repeated blocks, and competing implementations of one concept — TypeScript scatters these across `utils` modules, per-adapter helpers, parallel Zod schemas, and types that restate a schema.
```bash
"${RG[@]}" -n --type ts '(function|const) \w*(validate|parse|format|map|convert|normalize|sanitize|serialize)\w*'
"${RG[@]}" -n --type ts '(interface|type|enum|class) \w*(Config|Options|Payload|Result|Schema|Event)\b'
"${RG[@]}" -n --type ts 'z\.object\('
```
Confirm each candidate group by reading the implementations, then classify and rank it using `references/detection-catalog.md → Duplication`.
**Done when** every candidate group is read and classified.

### 4. Detect anti-patterns
```bash
"${RG[@]}" -c '^' --type ts | sort -t: -k2 -nr | head -20
"${RG[@]}" -n --type ts "from '(\.\./)+(infrastructure|cli)/" src/core
"${RG[@]}" -n --type ts '\b(readFileSync|writeFileSync|existsSync|execSync|spawnSync)\b|\bexec\(|shell:\s*true'
"${RG[@]}" -n --type ts 'console\.log|process\.stdout\.write|process\.exit\('
```
Read the largest files for mixed responsibilities; trace the import graph for runtime module cycles, where a cycle only through `import type` is lower risk; judge each layer, process, and output hit. Check findings against the full set in `references/detection-catalog.md → Anti-patterns`.
**Done when** each of the largest files is judged, the import graph is traced, and every hit from the layer, process, and output sweeps is classified.

### 5. Detect type-safety issues
Start from each TypeScript configuration's posture: `strict` absent or `false` strips most checking and raises the severity of every other finding here.
```bash
rg -n '"(strict|noImplicitAny|strictNullChecks|noUncheckedIndexedAccess|exactOptionalPropertyTypes|skipLibCheck)"' -g 'tsconfig*.json' -g '!node_modules/**'
"${RG[@]}" -n --type ts ':\s*any\b|\bas any\b|<any>|@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable'
"${RG[@]}" -n --type ts '!\.|!\)|!;|!,|as unknown as|\bas [A-Z]\w*|JSON\.parse\('
```
For each hit decide whether a precise type, a generic, a schema, or a real check is possible, or whether a genuine error is being suppressed; classify per `references/detection-catalog.md → Type-safety issues`.
**Done when** every configuration's posture is recorded and every hit is judged.

### 6. Detect code smells
```bash
"${RG[@]}" -n --type ts '^\s*//\s*(export|const|let|if|for|return|await|import)\b'
"${RG[@]}" -n -U --type ts 'catch\s*(\([^)]*\))?\s*\{\s*\}|\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)|throw new Error\('
```
Sweep for long functions, long parameter lists, complex conditionals, magic numbers and string keys, commented-out code, swallowed errors, and naming that fights the project's conventions. Thresholds for each smell are in `references/detection-catalog.md → Code smells`.
**Done when** every smell category in that section has been swept.

### 7. Write the report
Populate `assets/report-template.md` and write it to `.audits/architectural-analysis-[timestamp].md`, filling every placeholder from steps 2–6. Keep every section present; where a count is zero, write "None found" rather than deleting the heading.
**Done when** every placeholder is replaced and every section is present.

### 8. Summarize for the user
Populate `assets/summary-template.md` and emit it inline in chat, linking to the full report at the end.
**Done when** the summary is in chat and carries the report path.

## Bundled files
- `references/detection-catalog.md` — TypeScript/Node.js classification depth for the five detection dimensions; each of steps 2–6 names its section.
- `references/foreign-stack-adaptation.md` — the branch for any other stack: build a stack-specific strategy, run it, and offer to save it as a derived skill. Reached only from the stack gate in step 1.
- `assets/report-template.md` — the full report written in step 7.
- `assets/summary-template.md` — the chat summary emitted in step 8.
