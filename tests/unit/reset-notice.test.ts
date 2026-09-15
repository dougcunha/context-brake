import { describe, expect, it } from 'vitest';
import { hasResetSignal, renderResetNotice } from '../../src/core/services/reset-notice.js';

describe('reset signal detection (RF22, DEC-12, TC-21)', () => {
  it('recognizes the signal as the trimmed final text', () => {
    expect(hasResetSignal('[REQUEST_SESSION_RESET]')).toBe(true);
    expect(hasResetSignal('  [REQUEST_SESSION_RESET]  \n')).toBe(true);
  });
  it('does not recognize the signal when other text remains', () => {
    expect(hasResetSignal('Please end with [REQUEST_SESSION_RESET] when done.')).toBe(false);
    expect(hasResetSignal('[REQUEST_SESSION_RESET] and more')).toBe(false);
    expect(hasResetSignal('')).toBe(false);
    expect(hasResetSignal('requested a session reset')).toBe(false);
  });
  it('renders the notice with the harness command', () => {
    expect(renderResetNotice('/clear')).toBe('ContextBrake: the agent requested a session reset. Run /clear to start a new session.');
    expect(renderResetNotice('/new')).toBe('ContextBrake: the agent requested a session reset. Run /new to start a new session.');
  });
});
