import { readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const E2E_DIRECTORY = 'tests/e2e';
const SMOKE_SET = ['e2e-doctor.test.ts', 'e2e-hook-round-trips.test.ts', 'e2e-init.test.ts', 'e2e-remove.test.ts'];

describe('the e2e folder holds only the smoke set (prd-13 FR-04, DEC-03, TC-05)', () => {
  it('lists one built-CLI file per command and the hook round trips', async () => {
    const tests = (await readdir(E2E_DIRECTORY)).filter((file) => file.endsWith('.test.ts')).sort();
    expect(tests).toEqual(SMOKE_SET);
  });
});
