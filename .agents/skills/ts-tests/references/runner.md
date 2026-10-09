# Runner: Vitest or Jest

Read this before creating or editing any test file. Identify the runner first; the mocking and timer APIs are similar enough to write by habit and different enough to fail silently.

## Identification

Check `package.json` `devDependencies` and the config file:

- `vitest` + `vitest.config.ts` / `vite.config.ts` with a `test` block → **Vitest**. Globals are off by default: import `describe, it, expect, vi` from `vitest` unless `test.globals: true` is set.
- `jest` + `jest.config.*` (or a `jest` key in `package.json`) → **Jest**. Then check the transformer: `ts-jest` (type-checks, slow), `@swc/jest` or `babel-jest` (no type-check, fast). Globals are on by default.
- `"type": "module"` in `package.json` or `.mts` files → ESM. Matters for Jest only (see below).
- Monorepo: each package may differ. Check the package you're editing, not the root.

## Vitest

- Mocks: `vi.fn()`, `vi.spyOn()`, `vi.mock('./module')` (hoisted). Use `vi.hoisted()` for values the mock factory needs.
- Partial mock: `vi.mock('./module', async (importOriginal) => ({ ...(await importOriginal()), fn: vi.fn() }))`.
- Timers: `vi.useFakeTimers()`, `vi.setSystemTime(date)`, `vi.advanceTimersByTimeAsync(ms)` for promises in timers. Restore with `vi.useRealTimers()`.
- Run one file: `npx vitest run src/x.test.ts`; one test: `-t "name"`. Never leave `vitest` in watch mode in an agent session; always `vitest run`.
- Set `test.restoreMocks: true` in config if the project doesn't have it; otherwise `afterEach(() => vi.restoreAllMocks())`.
- Type tests: `expectTypeOf()` in `.test-d.ts` files, run with `vitest --typecheck`.

## Jest

- Mocks: `jest.fn()`, `jest.spyOn()`, `jest.mock('./module')` (hoisted by babel/ts-jest; **not** hoisted under plain ESM).
- ESM projects (`"type": "module"` with `--experimental-vm-modules`): `jest.mock` doesn't work for ESM imports. Use `jest.unstable_mockModule()` before a dynamic `await import()`, or prefer dependency injection and skip module mocks entirely.
- Timers: `jest.useFakeTimers()`, `jest.setSystemTime(date)`, `jest.advanceTimersByTimeAsync(ms)`. Restore with `jest.useRealTimers()`.
- Run one file: `npx jest src/x.test.ts`; one test: `-t "name"`. Add `--ci` in automation so snapshots are never written.
- `restoreMocks: true` in config, or `afterEach(() => jest.restoreAllMocks())`.
- With `ts-jest`, a type error in the test file fails the suite; with `@swc/jest` it doesn't. Run `tsc --noEmit -p tsconfig.test.json` (or the project's equivalent) when the transformer skips type-checking.

## Both

- Test functions return `Promise<void>` when async; never pass a `done` callback together with `async`.
- `it.each` with a table literal or array of tuples for boundaries; name the case in the title: `it.each([...])('rejects %s', ...)`.
- `it.todo` is fine for a planned row not yet written; `it.skip` without a comment explaining why is not.
