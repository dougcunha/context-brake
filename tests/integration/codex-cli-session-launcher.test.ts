import { describe, expect, it } from 'vitest';
import { CodexSessionLauncher } from '../../src/infrastructure/harnesses/codex-cli/session-launcher.js';
import { parseStreamFixture, PERMISSION_FLAG_PATTERN } from '../helpers/stream-fixtures.js';

const prompt = 'ContextBrake runner session 2 of at most 20. Work only on step s2: add parser.';
const launcher = new CodexSessionLauncher();

describe('Codex CLI session command (TC-14, DEC-01, DEC-04, DEC-18)', () => {
  it('runs codex exec --json reading the prompt from stdin through the - sentinel', () => {
    const command = launcher.buildCommand({ prompt, harnessArgs: [] });
    expect(command).toEqual({ executable: 'codex', args: ['exec', '--json', '-'], stdin: prompt });
    expect(command.args.some((arg) => PERMISSION_FLAG_PATTERN.test(arg))).toBe(false);
  });

  it('places explicit harness arguments before the stdin sentinel (CA-11)', () => {
    const command = launcher.buildCommand({ prompt, harnessArgs: ['--sandbox', 'workspace-write'] });
    expect(command.args).toEqual(['exec', '--json', '--sandbox', 'workspace-write', '-']);
    expect(launcher.executableNames).toEqual(['codex']);
    expect(launcher.harness).toBe('codex-cli');
  });
});

describe('Codex CLI stream parsing (TC-14, DEC-05)', () => {
  it('emits the thread id, the agent message, and the turn usage, and counts the unparseable line', async () => {
    const parsed = await parseStreamFixture(launcher, 'codex-cli', 'exec-success.jsonl');
    expect(parsed.events).toEqual([
      { kind: 'started', sessionId: '0199a213-81c0-7800-8aa1-bbab2a035a53' },
      { kind: 'final_text', text: 'Step 2 is validated locally.\n[REQUEST_SESSION_RESET]' },
      { kind: 'usage', tokens: 24_885 },
    ]);
    expect(parsed.unparsedLines).toBe(1);
  });

  it('reports error and turn.failed events as failures', async () => {
    const parsed = await parseStreamFixture(launcher, 'codex-cli', 'exec-failed.jsonl');
    expect(parsed.events).toEqual([
      { kind: 'started', sessionId: '0199a213-9f00-7aa0-8bb1-ccbc3b046b64' },
      { kind: 'failed', detail: 'stream disconnected before completion' },
      { kind: 'failed', detail: 'unexpected status 401 Unauthorized' },
    ]);
    expect(parsed.unparsedLines).toBe(0);
  });
});
