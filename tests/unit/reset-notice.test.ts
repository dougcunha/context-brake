import { describe, expect, it } from 'vitest';
import { endsWithResetSignal, renderResetNotice } from '../../src/core/services/reset-notice.js';

describe('reset signal detection (RF22, prd-14 FR-12, TC-11)', () => {
  it('recognizes the marker alone and the marker ending the last line after other text', () => {
    expect(endsWithResetSignal('[REQUEST_SESSION_RESET]')).toBe(true);
    expect(endsWithResetSignal('  [REQUEST_SESSION_RESET]  \n')).toBe(true);
    expect(endsWithResetSignal('Saved the handoff.\n[REQUEST_SESSION_RESET]')).toBe(true);
    expect(endsWithResetSignal('Saved the handoff. [REQUEST_SESSION_RESET]')).toBe(true);
  });
  it('does not recognize the marker in the middle of the reply', () => {
    expect(endsWithResetSignal('Please end with [REQUEST_SESSION_RESET] when done.')).toBe(false);
    expect(endsWithResetSignal('[REQUEST_SESSION_RESET] and more')).toBe(false);
    expect(endsWithResetSignal('')).toBe(false);
    expect(endsWithResetSignal('requested a session reset')).toBe(false);
  });
  it('renders the notice with the harness command and says it resumes by itself when restart is on (prd-14 DEC-18)', () => {
    expect(renderResetNotice('/clear')).toBe('ContextBrake: the agent requested a session reset. Run /clear to start a new session.');
    expect(renderResetNotice('/new')).toBe('ContextBrake: the agent requested a session reset. Run /new to start a new session.');
    expect(renderResetNotice('/new', true)).toBe('ContextBrake: the agent requested a session reset. Run /new to start a new session; it resumes by itself.');
  });
});
