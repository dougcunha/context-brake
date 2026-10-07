import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';
import { doctorReportSchema, installReportSchema } from '../../src/core/contracts/diagnostics.js';

describe('published schemas (RF17)', () => {
  it('publishes deterministic Draft 2020-12 schemas', async () => {
    for (const name of ['context-brake.config.schema.json', 'doctor-report.schema.json', 'install-report.schema.json']) {
      const document = JSON.parse(await readFile(`schemas/${name}`, 'utf8')) as { $schema?: string };
      expect(document.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    }
    expect(configurationSchema).toBeDefined();
    expect(doctorReportSchema).toBeDefined();
    expect(installReportSchema).toBeDefined();
  });

  it('keeps report schemas at version 1 without the support-file owners (RF24, NFR-02, prd-12 FR-08)', async () => {
    const installText = await readFile('schemas/install-report.schema.json', 'utf8');
    const install = JSON.parse(installText) as { properties: { schemaVersion: { const: number } } };
    const doctor = JSON.parse(await readFile('schemas/doctor-report.schema.json', 'utf8')) as { properties: { schemaVersion: { const: number } } };
    expect(installText).toContain('runtime_state');
    expect(installText).not.toMatch(/ignore_block|instruction_block|"protocol"/);
    expect(install.properties.schemaVersion.const).toBe(1);
    expect(doctor.properties.schemaVersion.const).toBe(1);
  });

  it('publishes two support levels and the four capability IDs in both reports (prd-12 DEC-08, TC-11)', async () => {
    for (const path of ['schemas/install-report.schema.json', 'schemas/doctor-report.schema.json']) {
      const text = await readFile(path, 'utf8');
      expect(text).toContain('"limitations"');
      expect(text).toContain('post_tool_telemetry');
      expect(text).not.toMatch(/pre_tool_block|tool_coverage|timeout_fail_closed|cooperative/);
    }
  });
});

describe('no plan, checkpoint, or run summary schema (prd-12 FR-01, FR-03, TC-02)', () => {
  it('publishes only the config, doctor report, and install report schemas', async () => {
    const { readdir } = await import('node:fs/promises');
    expect((await readdir('schemas')).sort()).toEqual(['context-brake.config.schema.json', 'doctor-report.schema.json', 'install-report.schema.json']);
  });
});
