import { describe, expect, it } from 'vitest';
import { CLAUDE_SESSION_ARGS, ClaudeSessionLauncher } from '../../src/infrastructure/harnesses/claude-code/session-launcher.js';
import { parseStreamFixture, PERMISSION_FLAG_PATTERN } from '../helpers/stream-fixtures.js';

const prompt = 'ContextBrake runner session 1 of at most 20. Work only on step s1: "quoted" & piped | title.';
const launcher = new ClaudeSessionLauncher();

describe('Claude Code session command (TC-14, DEC-01, DEC-04, DEC-18)', () => {
  it('runs claude -p with stream-json and delivers the prompt on stdin only', () => {
    const command = launcher.buildCommand({ prompt, harnessArgs: [] });
    expect(command).toEqual({ executable: 'claude', args: ['-p', '--output-format', 'stream-json', '--verbose'], stdin: prompt });
    expect(command.args.some((arg) => arg.includes('step s1'))).toBe(false);
    expect(command.args.some((arg) => PERMISSION_FLAG_PATTERN.test(arg))).toBe(false);
  });

  it('appends explicit harness arguments verbatim after the constant flags (CA-11)', () => {
    const command = launcher.buildCommand({ prompt, harnessArgs: ['--permission-mode', 'acceptEdits'] });
    expect(command.args).toEqual([...CLAUDE_SESSION_ARGS, '--permission-mode', 'acceptEdits']);
    expect(launcher.executableNames).toEqual(['claude']);
    expect(launcher.harness).toBe('claude-code');
  });
});

describe('Claude Code stream parsing (TC-14, DEC-05)', () => {
  it('emits started, usage, and final text from a successful stream and counts the unparseable line', async () => {
    const parsed = await parseStreamFixture(launcher, 'claude-code', 'stream-success.jsonl');
    expect(parsed.events).toEqual([
      { kind: 'started', sessionId: '5d1c7a52-2f1e-4bb4-9a57-3c1c8e6f0a11' },
      { kind: 'usage', tokens: 45_000 },
      { kind: 'final_text', text: 'Step 2 is validated locally.\n[REQUEST_SESSION_RESET]' },
    ]);
    expect(parsed.unparsedLines).toBe(1);
  });

  it('reports a missing login printed as an error result as a failure', async () => {
    const parsed = await parseStreamFixture(launcher, 'claude-code', 'stream-auth-failure.jsonl');
    expect(parsed.events).toEqual([
      { kind: 'started', sessionId: '0b8e2c55-9d0a-4f5e-8e61-2c7d9a3b4c10' },
      { kind: 'usage', tokens: 0 },
      { kind: 'failed', detail: 'Not logged in. Please run /login.' },
    ]);
    expect(parsed.unparsedLines).toBe(0);
  });

  it('reports an error subtype with its error list as a failure', async () => {
    const parsed = await parseStreamFixture(launcher, 'claude-code', 'stream-error-subtype.jsonl');
    expect(parsed.events.slice(1)).toEqual([
      { kind: 'usage', tokens: 520 },
      { kind: 'failed', detail: 'Tool execution aborted; API overloaded' },
    ]);
  });
});
