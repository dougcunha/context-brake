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
});
