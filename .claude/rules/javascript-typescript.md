---
paths:
  - "src/**/*.{ts,js,mjs,cjs}"
  - "tests/**/*.{ts,js,mjs,cjs}"
  - "*.{ts,js,mjs,cjs}"
---

# JavaScript and TypeScript Rules

These rules apply to all ContextBrake JavaScript and TypeScript code. When rules conflict, follow the most specific one, as long as it does not reduce safety or clarity.

## Variables and Comparisons

- Use `const` by default and `let` only for values that are reassigned. Never use `var`.
- Always compare with `===` and `!==`.
- Use `??` when only `null` and `undefined` should fall back, and `||` only when empty strings and zero are also invalid.

## Types

- `tsconfig.json` uses `"strict": true`. Never use `any`: accept `unknown` and narrow it before use.
- Exported functions and methods declare their return type; asynchronous functions return `Promise<T>`.
- Name object shapes with `type` or `interface` declarations instead of repeating anonymous object types.
- Model closed sets, such as zones, step statuses, and support levels, as literal unions derived from one constant, and handle them with exhaustive `switch` statements, so adding a value fails to compile until every case handles it.

```ts
export const ZONES = ['GREEN', 'YELLOW', 'RED', 'CRITICAL'] as const;
export type Zone = (typeof ZONES)[number];

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
```

## Validate External Data With Zod

Everything that enters the process arrives as `unknown` and is parsed with a Zod schema before use: `context-brake.config.json`, `task_plan.json`, `state_checkpoint.json`, harness payloads, harness configuration files, and parsed command output.

```ts
const checkpointFileSchema = z.object({
  schemaVersion: z.literal(1),
  activeStepId: z.number().int().positive(),
});

export function parseCheckpointFile(value: unknown): CheckpointFile {
  return checkpointFileSchema.parse(value);
}
```

Files that ContextBrake owns (configuration, plan, and checkpoint) carry a schema version. An incompatible change bumps the version and ships a migration or an error that explains how to migrate. Harness payload schemas follow `harness-adapters.md`.

## Functions

- Declare module-level functions, services, and handlers with `function`; use arrow functions for callbacks.
- Use a ternary only for one short decision. Never nest ternaries or use them for side effects.

## Immutability

Do not mutate parameters, shared state, or collections received as arguments. Return new objects and arrays, and copy an array before calling `sort`.

## Errors

- Throw `Error` instances or subclasses with useful messages, and pass the original error as `cause`.
- Type `catch` parameters as `unknown`, and never catch an error only to ignore it.
- Model failures the user can fix, such as invalid configuration or an unsupported harness version, as dedicated error classes that carry the file or harness involved; `cli/` turns them into messages and exit codes, following `cli-output.md`.

```ts
export class InvalidConfigError extends Error {
  constructor(readonly filePath: string, readonly issue: string, options?: ErrorOptions) {
    super(`Invalid configuration in ${filePath}: ${issue}`, options);
  }
}
```

## Modules and Names

- Use ES modules with `import` and `export`, remove unused imports, and export only the module's contract.
- Use complete names, and prefix boolean functions with `is`, `has`, or `can`.
