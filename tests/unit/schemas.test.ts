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

  it('keeps report schemas at version 1 and lists the ignore_block owner (RF24, NFR-02)', async () => {
    const installText = await readFile('schemas/install-report.schema.json', 'utf8');
    const install = JSON.parse(installText) as { properties: { schemaVersion: { const: number } } };
    const doctor = JSON.parse(await readFile('schemas/doctor-report.schema.json', 'utf8')) as { properties: { schemaVersion: { const: number } } };
    expect(installText).toContain('ignore_block');
    expect(install.properties.schemaVersion.const).toBe(1);
    expect(doctor.properties.schemaVersion.const).toBe(1);
  });

  it('adds tool_coverage and harness-plan limitations additively (NFR-02, TC-15)', async () => {
    const installText = await readFile('schemas/install-report.schema.json', 'utf8');
    const doctorText = await readFile('schemas/doctor-report.schema.json', 'utf8');
    expect(doctorText).toContain('tool_coverage');
    expect(installText).toContain('"limitations"');
    expect(installText).toContain('tool_coverage');
  });
});
