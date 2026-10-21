import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';

const PUBLISHED_SCHEMAS = ['context-brake.config.schema.json', 'doctor-report.schema.json', 'fix-report.schema.json', 'install-report.schema.json'];

describe('published schemas (RF17)', () => {
  it('publishes only the config, doctor report, fix report, and install report schemas, as Draft 2020-12 (prd-12 FR-01, FR-03, TC-02, prd-24 FR-14, TC-22)', async () => {
    expect((await readdir('schemas')).sort()).toEqual(PUBLISHED_SCHEMAS);
    for (const name of PUBLISHED_SCHEMAS) {
      const document = JSON.parse(await readFile(`schemas/${name}`, 'utf8')) as { $schema?: string };
      expect(document.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    }
  });

  it('keeps the report schemas at version 1 (NFR-02)', async () => {
    for (const name of ['install-report.schema.json', 'doctor-report.schema.json', 'fix-report.schema.json']) {
      const document = JSON.parse(await readFile(`schemas/${name}`, 'utf8')) as { properties: { schemaVersion: { const: number } } };
      expect(document.properties.schemaVersion.const).toBe(1);
    }
  });
});

describe('doctor finding fix field (prd-24 FR-15, TC-04)', () => {
  const base = { schemaVersion: 1, command: 'doctor', status: 'warnings', exitCode: 1, detections: [], integrations: [] } as const;
  const finding = { code: 'ASSET_OUTDATED', severity: 'warning', scope: 'harness', harness: 'claude-code', path: 'a.mjs', message: 'm', impact: null, remediation: null } as const;

  it('accepts a finding without the fix field', () => {
    expect(doctorReportSchema.safeParse({ ...base, findings: [finding] }).success).toBe(true);
  });
  it('accepts a known fix group and rejects an unknown one', () => {
    expect(doctorReportSchema.safeParse({ ...base, findings: [{ ...finding, fix: { group: 'automatic' } }] }).success).toBe(true);
    expect(doctorReportSchema.safeParse({ ...base, findings: [{ ...finding, fix: { group: 'later' } }] }).success).toBe(false);
  });
  it('publishes the optional fix field in the doctor schema', async () => {
    const text = await readFile('schemas/doctor-report.schema.json', 'utf8');
    expect(text).toContain('"automatic"');
  });
});
