# Architectural Analysis Complete

**Repository**: [name — N packages, Node.js and TypeScript versions]

## Dead Code Found
- **X completely dead files** — can be deleted
- **Y unreferenced exports** — can be removed
- **~Z lines** of dead code identified

## Top Dead Files
1. `src/infrastructure/storage/legacy-plan-reader.ts` — imported nowhere, not an entry point
2. `src/core/services/unused-formatter.ts` — exported but never imported
3. `src/infrastructure/harnesses/cursor/legacy-hook.ts` — referenced only by a fixture path

## Duplication Found
- **X duplication groups** identified
- **Most duplicated**: marker block detection (3 copies)
- **Y contract duplications** — the same shape declared as a type and as unrelated schemas
- **~Z lines** of duplicated code

## Architectural Issues
- **X god modules** doing too much
- **Y layer violations** (`core` importing infrastructure or Node.js APIs)
- **Z dependency cycles**
- **W process issues** (blocking inside harness processes, shell strings, missing timeouts)
- **V stdout pollution hits** on hook response paths

## Type-Safety Issues
- **X configurations without `strict`** — most compiler checks disabled
- **Y `any` usages** — type checking turned off where data enters
- **Z unsafe casts and unvalidated inputs**
- **W suppressions** (`@ts-ignore`, `eslint-disable`)

## Code Smells
- **X long functions** (>30 lines)
- **Y complex conditionals** (3+ nesting or nested ternaries)
- **Z magic numbers and repeated string keys**
- **W swallowed errors** (empty `catch`)

## Cleanup Potential
Removing dead code and consolidating duplication could eliminate **~X lines** (Y% of the codebase)

**Full Report**: `.audits/architectural-analysis-[timestamp].md`
