import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { ompSettingsFileSchema, ompToolCallPayloadSchema, ompToolResultPayloadSchema } from '../../src/infrastructure/harnesses/oh-my-pi/schemas.js';
import { opencodeConfigFileSchema, opencodeEventPayloadSchema, opencodeToolExecuteBeforePayloadSchema } from '../../src/infrastructure/harnesses/opencode/schemas.js';
import { piMessageEndPayloadSchema, piSettingsFileSchema, piToolCallPayloadSchema, piToolResultPayloadSchema } from '../../src/infrastructure/harnesses/pi/schemas.js';

describe('in-process plugin and extension schemas (RF5, RF6)', () => {
  it('parses OpenCode config and tool hook payloads non-strictly', () => {
    expect(opencodeConfigFileSchema.parse({ plugin: ['pkg'] }).plugin).toEqual(['pkg']);
    const before = opencodeToolExecuteBeforePayloadSchema.parse({ input: { tool: 'bash', sessionID: 's' }, output: { args: { command: 'pwd' } } });
    expect(before.input?.tool).toBe('bash');
    expect(before.output?.args).toEqual({ command: 'pwd' });
  });

  it('parses Pi settings and event payloads non-strictly', () => {
    expect(piSettingsFileSchema.parse({ extensions: ['ext.js'] }).extensions).toEqual(['ext.js']);
    const call = piToolCallPayloadSchema.parse({ toolName: 'edit', toolCallId: 'c1', input: { path: 'a.txt' } });
    expect(call.toolName).toBe('edit');
    const result = piToolResultPayloadSchema.parse({ toolName: 'edit', toolCallId: 'c1', content: 'done' });
    expect(result.content).toBe('done');
    const end = piMessageEndPayloadSchema.parse({ message: { role: 'assistant', content: [] }, extra: true });
    expect((end as Record<string, unknown>).extra).toBe(true);
  });

  it('parses Oh-My-Pi settings and event payloads non-strictly', () => {
    expect(ompSettingsFileSchema.parse({ extensions: ['omp-ext.js'] }).extensions).toEqual(['omp-ext.js']);
    expect(ompToolCallPayloadSchema.parse({ toolName: 'run_command', input: { command: 'test' } }).toolName).toBe('run_command');
    expect(ompToolResultPayloadSchema.parse({ toolName: 'run_command', content: 'ok' }).content).toBe('ok');
  });
});

describe('Pi and Oh-My-Pi documented fixtures (RF5, RF6, TC-33)', () => {
  it('parses the Pi tool-call and tool-result fixtures with their documented fields', async () => {
    const call = piToolCallPayloadSchema.parse(await loadHarnessPayload('pi', 'tool-call.json'));
    expect(call.toolName).toBe('edit_file');
    expect(call.input).toEqual({ path: 'src/main.ts' });
    const result = piToolResultPayloadSchema.parse(await loadHarnessPayload('pi', 'tool-result.json'));
    expect(result.toolCallId).toBe('call_pi_result');
    expect(result.content).toEqual([{ type: 'text', text: 'tests passed' }]);
  });

  it('parses the Pi message-end and Oh-My-Pi session-stop fixtures', async () => {
    const message = piMessageEndPayloadSchema.parse(await loadHarnessPayload('pi', 'message-end.json'));
    expect(message.message).toMatchObject({ role: 'assistant' });
    const stop = ompToolResultPayloadSchema.parse(await loadHarnessPayload('oh-my-pi', 'session-stop.json'));
    expect(stop.last_assistant_message).toContain('[REQUEST_SESSION_RESET]');
  });
});

describe('OpenCode session event fixtures (RF3, DEC-13, TC-09)', () => {
  it('parses the documented session.created and session.compacted event shapes', async () => {
    const created = opencodeEventPayloadSchema.parse(await loadHarnessPayload('opencode', 'session-created.json'));
    expect(created.event?.type).toBe('session.created');
    expect(created.event?.properties?.info?.id).toBe('opencode-session-1');
    const compacted = opencodeEventPayloadSchema.parse(await loadHarnessPayload('opencode', 'session-compacted.json'));
    expect(compacted.event?.type).toBe('session.compacted');
    expect(compacted.event?.properties?.sessionID).toBe('opencode-session-1');
  });
});
