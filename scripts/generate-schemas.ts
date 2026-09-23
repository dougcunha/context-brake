import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { configurationSchema } from '../src/core/contracts/configuration.js';
import { doctorReportSchema, installReportSchema } from '../src/core/contracts/diagnostics.js';
import { stateCheckpointSchema } from '../src/core/contracts/state-checkpoint.js';
import { taskPlanSchema } from '../src/core/contracts/task-plan.js';

const outputs = {
  'context-brake.config.schema.json': configurationSchema,
  'doctor-report.schema.json': doctorReportSchema,
  'install-report.schema.json': installReportSchema,
  'state-checkpoint.schema.json': stateCheckpointSchema,
  'task-plan.schema.json': taskPlanSchema,
} as const;
async function generate(): Promise<void> {
  await mkdir('schemas', { recursive: true });
  for (const [name, schema] of Object.entries(outputs)) {
    const document = z.toJSONSchema(schema, { target: 'draft-2020-12' });
    await writeFile(`schemas/${name}`, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  }
}
await generate();
