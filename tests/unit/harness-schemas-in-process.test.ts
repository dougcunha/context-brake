import { readFile } from 'node:fs/promises';
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
    const call = piToolCallPayloadSchema.parse({ toolName: 'edit', toolCallId: 'c1', input: { path: 'a.txt' } });
    expect(call.toolName).toBe('edit');
    const result = piToolResultPayloadSchema.parse({ toolName: 'edit', toolCallId: 'c1', content: 'done' });
    expect(result.content).toBe('done');
  });

  it('parses Oh-My-Pi settings and extension event payloads non-strictly', () => {
    const settings = ompSettingsFileSchema.parse({ extensions: ['omp-ext.js'] });
    expect(settings.extensions).toEqual(['omp-ext.js']);
    const call = ompToolCallPayloadSchema.parse({ toolName: 'run', toolCallId: 'c2', input: { cmd: 'test' } });
    expect(call.toolName).toBe('run');
    const result = ompToolResultPayloadSchema.parse({ toolName: 'run', toolCallId: 'c2', content: 'ok' });
    expect(result.content).toBe('ok');
  });

});

describe('Pi and Oh-My-Pi documented fixtures (FR-06, TC-01)', () => {
  it('parses the documented Pi tool-call fixture with toolName/toolCallId/input', async () => {
    const raw = await readFile('tests/fixtures/harnesses/pi/tool-call.json', 'utf8');
    const payload = piToolCallPayloadSchema.parse(JSON.parse(raw));
    expect(payload.toolName).toBe('edit_file');
    expect(payload.toolCallId).toBe('call_1');
    expect(payload.input).toEqual({ path: 'src/main.ts' });
    expect((payload as Record<string, unknown>).extraField).toBe('ignored');
  });

  it('parses the documented Oh-My-Pi tool-call fixture with toolName/toolCallId/input', async () => {
    const raw = await readFile('tests/fixtures/harnesses/oh-my-pi/tool-call.json', 'utf8');
    const payload = ompToolCallPayloadSchema.parse(JSON.parse(raw));
    expect(payload.toolName).toBe('run_command');
    expect(payload.toolCallId).toBe('call_2');
    expect(payload.input).toEqual({ command: 'vitest' });
    expect((payload as Record<string, unknown>).extraField).toBe('ignored');
  });
});
