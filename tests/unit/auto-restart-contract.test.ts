import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { modLogSchema } from '../../src/core/contracts/auto-restart.js';
import { configurationSchema, DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

const VALID_LOG = { v: 1, modVersion: '1.0.0', claudeVersion: '2.1.289', records: [{ at: '2026-10-04T21:00:00.000Z', code: 'RESTARTED' }] };

function parseWith(autoRestart: unknown) {
  return configurationSchema.safeParse({ ...DEFAULT_CONFIG, autoRestart });
}

describe('autoRestart configuration block (FR-07, DEC-09, TC-08)', () => {
  it('accepts the block and defaults the limit to 2', () => {
    const result = parseWith({});
    expect(result.success).toBe(true);
    expect(result.data?.autoRestart?.maxConsecutiveRestarts).toBe(2);
  });

  it('accepts the documented range 1 to 10', () => {
    expect(parseWith({ maxConsecutiveRestarts: 1 }).success).toBe(true);
    expect(parseWith({ maxConsecutiveRestarts: 10 }).success).toBe(true);
  });

  it.each([0, 11, 1.5, '2'])('rejects the limit %s', (value) => {
    expect(parseWith({ maxConsecutiveRestarts: value }).success).toBe(false);
  });

  it('rejects unknown keys inside the block', () => {
    expect(parseWith({ maxConsecutiveRestarts: 2, enabled: true }).success).toBe(false);
  });
});

describe('compatibility and published schema (NFR-03, TC-24)', () => {
  it('keeps configurations without the block valid at schema version 1', () => {
    const result = configurationSchema.safeParse(DEFAULT_CONFIG);
    expect(result.success).toBe(true);
    expect(result.data?.schemaVersion).toBe(1);
    expect(result.data?.autoRestart).toBeUndefined();
  });

  it('publishes the optional block in the generated schema', async () => {
    const document = JSON.parse(await readFile('schemas/context-brake.config.schema.json', 'utf8')) as { properties: Record<string, unknown>; required?: string[] };
    expect(document.properties.autoRestart).toBeDefined();
    expect(document.required ?? []).not.toContain('autoRestart');
  });
});

describe('mod log shape (DEC-10)', () => {
  it('accepts a log of coded records', () => {
    expect(modLogSchema.safeParse(VALID_LOG).success).toBe(true);
  });

  it('rejects unknown codes and any free-text field', () => {
    expect(modLogSchema.safeParse({ ...VALID_LOG, records: [{ at: 'x', code: 'UNKNOWN' }] }).success).toBe(false);
    expect(modLogSchema.safeParse({ ...VALID_LOG, records: [{ at: 'x', code: 'RESTARTED', text: 'leak' }] }).success).toBe(false);
  });
});
