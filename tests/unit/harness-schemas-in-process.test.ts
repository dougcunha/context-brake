import { describe, expect, it } from 'vitest';
import {
  ompSettingsFileSchema,
  ompToolCallPayloadSchema,
  ompToolResultPayloadSchema,
} from '../../src/infrastructure/harnesses/oh-my-pi/schemas.js';
import {
  opencodeConfigFileSchema,
  opencodeToolExecuteAfterPayloadSchema,
  opencodeToolExecuteBeforePayloadSchema,
} from '../../src/infrastructure/harnesses/opencode/schemas.js';
import {
  piSettingsFileSchema,
  piToolCallPayloadSchema,
  piToolResultPayloadSchema,
} from '../../src/infrastructure/harnesses/pi/schemas.js';

describe('in-process plugin and extension schemas (RF5, RF6)', () => {
  it('parses OpenCode config and tool payloads non-strictly', () => {
    const config = opencodeConfigFileSchema.parse({ plugin: ['pkg'] });
    expect(config.plugin).toEqual(['pkg']);
    const before = opencodeToolExecuteBeforePayloadSchema.parse({ tool: 'bash', input: { command: 'pwd' } });
    expect(before.tool).toBe('bash');
    const after = opencodeToolExecuteAfterPayloadSchema.parse({ tool: 'bash', output: { output: 'res', title: 't' } });
    expect(after.output?.output).toBe('res');
  });

  it('parses Pi settings and extension event payloads non-strictly', () => {
    const settings = piSettingsFileSchema.parse({ extensions: ['ext.js'] });
    expect(settings.extensions).toEqual(['ext.js']);
    const call = piToolCallPayloadSchema.parse({ name: 'edit', input: { path: 'a.txt' } });
    expect(call.name).toBe('edit');
    const result = piToolResultPayloadSchema.parse({ name: 'edit', content: 'done' });
    expect(result.content).toBe('done');
  });

  it('parses Oh-My-Pi settings and extension event payloads non-strictly', () => {
    const settings = ompSettingsFileSchema.parse({ extensions: ['omp-ext.js'] });
    expect(settings.extensions).toEqual(['omp-ext.js']);
    const call = ompToolCallPayloadSchema.parse({ name: 'run', input: { cmd: 'test' } });
    expect(call.name).toBe('run');
    const result = ompToolResultPayloadSchema.parse({ name: 'run', content: 'ok' });
    expect(result.content).toBe('ok');
  });
});
