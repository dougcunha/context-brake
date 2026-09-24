import { describe, expect, it } from 'vitest';
import { parseClaudeStreamLine } from '../../src/infrastructure/harnesses/claude-code/session-stream.js';
import { parseCodexStreamLine } from '../../src/infrastructure/harnesses/codex-cli/session-stream.js';
import { StreamLineError } from '../../src/infrastructure/harnesses/common/stream-line.js';

function line(value: unknown): string {
  return JSON.stringify(value);
}

describe('stream line edge cases shared by both launchers (TC-14)', () => {
  it.each(['', '{', '42', '"text"', 'null', '[]', line({}), line({ type: 7 })])('rejects %j as unparseable', (input) => {
    expect(() => parseClaudeStreamLine(input)).toThrow(StreamLineError);
    expect(() => parseCodexStreamLine(input)).toThrow(StreamLineError);
  });

  it('ignores event types the launchers do not read', () => {
    expect(parseClaudeStreamLine(line({ type: 'stream_event', event: {} }))).toEqual([]);
    expect(parseCodexStreamLine(line({ type: 'item.updated', item: {} }))).toEqual([]);
  });
});

describe('Claude Code stream edge cases (TC-14)', () => {
  it('ignores system events other than init and rejects an init without a session id', () => {
    expect(parseClaudeStreamLine(line({ type: 'system', subtype: 'api_retry', attempt: 1 }))).toEqual([]);
    expect(() => parseClaudeStreamLine(line({ type: 'system', subtype: 'init' }))).toThrow(StreamLineError);
    expect(() => parseClaudeStreamLine(line({ type: 'system' }))).toThrow(StreamLineError);
  });

  it('emits only the final text when a result carries no usage', () => {
    expect(parseClaudeStreamLine(line({ type: 'result', subtype: 'success', result: 'done' }))).toEqual([{ kind: 'final_text', text: 'done' }]);
  });

  it('falls back to the subtype when a failed result has no text or errors', () => {
    expect(parseClaudeStreamLine(line({ type: 'result', subtype: 'error_max_turns', is_error: true, result: '', errors: [] }))).toEqual([{ kind: 'failed', detail: 'error_max_turns' }]);
    expect(parseClaudeStreamLine(line({ type: 'result', subtype: 'success' }))).toEqual([{ kind: 'failed', detail: 'success' }]);
  });

  it('rejects a result whose usage lacks the token fields it sums', () => {
    expect(() => parseClaudeStreamLine(line({ type: 'result', subtype: 'success', result: 'x', usage: { input_tokens: 1 } }))).toThrow(StreamLineError);
  });
});

describe('Codex CLI stream edge cases (TC-14)', () => {
  it('ignores completed items that are not agent messages or carry no text', () => {
    expect(parseCodexStreamLine(line({ type: 'item.completed', item: { id: 'i', type: 'reasoning', text: 'x' } }))).toEqual([]);
    expect(parseCodexStreamLine(line({ type: 'item.completed', item: { id: 'i', type: 'agent_message' } }))).toEqual([]);
  });

  it.each([
    { type: 'thread.started' },
    { type: 'item.completed' },
    { type: 'turn.completed' },
    { type: 'turn.failed', error: {} },
    { type: 'error' },
  ])('rejects %j because a read field is missing', (event) => {
    expect(() => parseCodexStreamLine(line(event))).toThrow(StreamLineError);
  });
});
