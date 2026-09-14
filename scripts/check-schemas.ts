import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { configurationSchema } from '../src/core/contracts/configuration.js';
import { doctorReportSchema, installReportSchema } from '../src/core/contracts/diagnostics.js';

const outputs = { 'context-brake.config.schema.json': configurationSchema, 'doctor-report.schema.json': doctorReportSchema, 'install-report.schema.json': installReportSchema } as const;
for (const [name, schema] of Object.entries(outputs)) {
  const expected = `${JSON.stringify(z.toJSONSchema(schema, { target: 'draft-2020-12' }), null, 2)}\n`;
  const actual = await readFile(`schemas/${name}`, 'utf8');
  if (actual !== expected) throw new Error(`Generated schema is stale: schemas/${name}. Run npm run schemas:generate.`);
}
