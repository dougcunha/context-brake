# Format of `tests-refactor-plan.md` and the per-module report

The file lives at the repo root and is committed with each module. It is the memory of the refactoring: another session (or another agent) reads it and resumes at the first `pending` module.

## Header

```markdown
# Test refactoring plan

Repo: `acme-platform`
Generated: 2026-10-09
Packages: api (Vitest, ESM), web (Vitest), workers (Jest, CJS)
Order confirmed by user: 2026-10-09

| # | Module | Test location | Source folder | Level | Tests | Status |
|---|--------|---------------|---------------|-------|-------|--------|
| 1 | api/orders-routes | packages/api/src/orders/__tests__ | packages/api/src/orders | Glue | 48 | done |
| 2 | api/customers | packages/api/src/customers/*.test.ts | packages/api/src/customers | Common | 31 | in progress |
| 3 | api/pricing | packages/api/src/pricing/*.test.ts | packages/api/src/pricing | Critical | 57 | pending |
```

Statuses: `pending`, `in progress`, `done`, `blocked` (with the reason in the module's section).

## Section per module

Fill it in when closing the module; the per-file plan table can be summarized when the module has many files, but every deletion needs the test that justified it.

```markdown
## 1. api/orders-routes — done 2026-10-09

**Baseline:** 48 tests, green. Stryker: n/a (Glue).
**Result:** 11 tests, green. Commit `a1b2c3d`.

### orders.router.ts → Glue
Unit tests with `vi.mock` of `./orders.service`, `./logger` and `./mapper` deleted; behavior covered by `orders.integration.test.ts` (supertest against the app with a test DB).

| Behavior | Mutant | Test |
|---|---|---|
| valid POST returns 201 with Location | `res.status(201)` → `res.status(200)` | `creates an order and returns 201 with Location` |
| invalid POST returns 400 with errors | `if (!parsed.success)` → `if (false)` | `returns 400 with validation errors for an invalid body` |

### Actions
- **Deleted (34):** `orders.router.test.ts` (32) — glue unit tests; `order.dto.test.ts` (2) — Trivial.
- **Merged (3 → 1):** `rejects quantity 0`, `rejects negative quantity`, `accepts quantity 1` → `it.each` on the quantity boundary (0, -1, 1).
- **Rewritten (2):** `does not throw for an existing order` → `returns the order for an existing id` (value assertion).
- **Created (1):** `returns 403 without the orders:write scope` — mutant "remove `requireScope`" had no test.
- **Kept (7).**
- **Moved:** `packages/api/test/orders/*` → `packages/api/src/orders/__tests__/`.
- **Removed:** `__snapshots__/orders.router.test.ts.snap` (orphaned).

### Production pending items
- `orders.router.ts` line 42 holds the discount rule inline; it should live in the domain to be unit-testable.

### Questions `[?]`
- `returns empty for X-Legacy header` kept: nothing in the source handles `X-Legacy`. Confirm whether it can go.
```

## Commit message

```
test(api/orders-routes): clean up and reorganize tests (48 → 11)
test(api/pricing): clean up and reorganize tests (57 → 19, Stryker 71% → 84%)
```
