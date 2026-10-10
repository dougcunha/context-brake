import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PUBLISHED_SCHEMAS = ['context-brake.config.schema.json', 'doctor-report.schema.json', 'install-report.schema.json'];

describe('published schemas (RF17)', () => {
  it('publishes only the config, doctor report, and install report schemas, as Draft 2020-12 (prd-12 FR-01, FR-03, TC-02)', async () => {
    expect((await readdir('schemas')).sort()).toEqual(PUBLISHED_SCHEMAS);
    for (const name of PUBLISHED_SCHEMAS) {
      const document = JSON.parse(await readFile(`schemas/${name}`, 'utf8')) as { $schema?: string };
      expect(document.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    }
  });

  it('keeps both report schemas at version 1 (NFR-02)', async () => {
    for (const name of ['install-report.schema.json', 'doctor-report.schema.json']) {
      const document = JSON.parse(await readFile(`schemas/${name}`, 'utf8')) as { properties: { schemaVersion: { const: number } } };
      expect(document.properties.schemaVersion.const).toBe(1);
    }
  });
});
