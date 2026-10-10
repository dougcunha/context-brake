import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { ompPayloadSchema } from '../../src/infrastructure/harnesses/oh-my-pi/schemas.js';
import { piPayloadSchema } from '../../src/infrastructure/harnesses/pi/schemas.js';

const FIXTURES = [
  { harness: 'pi', schema: piPayloadSchema, toolName: 'bash', toolCallId: 'call_pi_result' },
  { harness: 'oh-my-pi', schema: ompPayloadSchema, toolName: 'run_command', toolCallId: 'call_omp_result' },
] as const;

describe('Pi and Oh-My-Pi documented payload fields (prd-01.1 FR-06, TC-01)', () => {
  it.each(FIXTURES)('parses the $harness tool-result fixture with toolName/toolCallId/input and extra vendor fields (FR-06, TC-01)', async ({ harness, schema, toolName, toolCallId }) => {
    const parsed = schema.parse(await loadHarnessPayload(harness, 'tool-result.json'));
    expect(parsed).toMatchObject({ toolName, toolCallId, input: { command: 'npm test' }, extraField: 'ignored' });
  });
});
