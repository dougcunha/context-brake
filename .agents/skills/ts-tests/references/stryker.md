# StrykerJS on the critical level

Mutation testing is the mechanical version of what "The mutant" section does mentally. Run it only on units classified **Critical**: on the whole repo it's too slow to be worth it.

## Setup (once per package)

```
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner   # or @stryker-mutator/jest-runner
npx stryker init   # or write stryker.config.json by hand:
```

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"],
  "thresholds": { "high": 90, "low": 70, "break": 80 },
  "reporters": ["clear-text", "html"]
}
```

For Jest: `"testRunner": "jest"` and, with `ts-jest`, consider `"jest": { "enableFindRelatedTests": true }` to keep runs fast. TypeScript type errors are caught by the `typescript` checker: add `"checkers": ["typescript"]` with `@stryker-mutator/typescript-checker` so mutants that don't compile aren't counted as survivors.

## Run, scoped

```
npx stryker run --mutate "src/domain/pricing/**/*.ts,!src/**/*.test.ts"
```

- `--mutate` limits the scope to the critical folder. Alternative: `--incremental` reuses the previous report and only re-runs what changed.
- Run on demand or in a nightly job, not on every PR.
- In a monorepo, run from the package directory, not the root.

## Reading the result

- **Survived** → new row in the plan (behavior → mutant → test) and a new test. Never `// Stryker disable next-line`.
- **Equivalent mutant** (the mutation doesn't change observable behavior, e.g. `i++` → `++i` where the value is unused) → written justification in the reply, no test.
- **No coverage** → the line is never executed by any test; either it's dead code (production pending item) or a behavior with no test at all.
- **High score with few tests** is the target. If two tests kill exactly the same set of mutants, one is redundant: apply the stopping rule and delete it.

The HTML report (`reports/mutation/mutation.html`) shows which test killed which mutant; tests that killed nothing are direct candidates for deletion when cleaning an inflated suite.
