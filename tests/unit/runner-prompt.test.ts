import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { RUNNER_PROMPT_VERSION, renderRunnerPrompt, type RunnerPromptInput } from '../../src/core/services/runner-prompt.js';

const encoding = getEncoding('o200k_base');
const reference: RunnerPromptInput = {
  session: { index: 3, maxSessions: 20 },
  step: { id: 2, title: 'Add parser' },
  previousFailure: null,
  files: { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', protocolFile: 'docs/context-brake-protocol.md' },
};
const closing = 'Follow the session boot and the protocol in docs/context-brake-protocol.md. Run commands through "context-brake wrap -- <command>" to see context telemetry. Before ending, update task_plan.json and state_checkpoint.json, then end your final message with [REQUEST_SESSION_RESET].';
const testOutputTail = Array.from({ length: 40 }, (_, index) => `FAIL tests/unit/parser-${index}.test.ts > parses case ${index}: expected 1 to be 2`).join('\n');

describe('runner prompt text (DEC-03, RUNNER_PROMPT_VERSION 1)', () => {
  it('is version 1', () => expect(RUNNER_PROMPT_VERSION).toBe(1));
  it('matches the TechSpec template without a previous failure', () => {
    expect(renderRunnerPrompt(reference)).toBe(`ContextBrake runner session 3 of at most 20. Work only on step 2: Add parser. ${closing}`);
  });
  it('adds the failure clause with the exit code and tail after a failed validation (CA-02, TC-02)', () => {
    const prompt = renderRunnerPrompt({ ...reference, previousFailure: { status: 'failed', exitCode: 1, outputTail: '1 test failed' } });
    expect(prompt).toBe(`ContextBrake runner session 3 of at most 20. Work only on step 2: Add parser. The last validation of this step failed (exit 1). Output tail:\n1 test failed\n${closing}`);
  });
  it('names a timeout instead of an exit code', () => {
    const prompt = renderRunnerPrompt({ ...reference, previousFailure: { status: 'timed_out', exitCode: null, outputTail: 'waiting' } });
    expect(prompt).toContain('The last validation of this step failed (timed out). Output tail:\nwaiting\n');
  });
  it('names an unknown exit code when the command ended without one', () => {
    const prompt = renderRunnerPrompt({ ...reference, previousFailure: { status: 'failed', exitCode: null, outputTail: 'killed' } });
    expect(prompt).toContain('failed (exit unknown).');
  });
  it('keeps a string step identifier as written', () => {
    expect(renderRunnerPrompt({ ...reference, step: { id: 'parser', title: 'Add parser' } })).toContain('Work only on step parser: Add parser.');
  });
});

describe('runner prompt budget (DEC-03)', () => {
  it('keeps only the last 2,000 characters of the output tail', () => {
    const outputTail = `${'#'.repeat(500)}${'y'.repeat(2_000)}`;
    const prompt = renderRunnerPrompt({ ...reference, previousFailure: { status: 'failed', exitCode: 1, outputTail } });
    expect(prompt).toContain(`Output tail:\n${'y'.repeat(2_000)}\nFollow`);
    expect(prompt).not.toContain('#');
  });
  it('stays within 800 tokens with a full 2,000-character test-output tail', () => {
    const prompt = renderRunnerPrompt({ ...reference, previousFailure: { status: 'failed', exitCode: 1, outputTail: testOutputTail } });
    expect(testOutputTail.length).toBeGreaterThan(2_000);
    expect(encoding.encode(prompt).length).toBeLessThanOrEqual(800);
  });
});
