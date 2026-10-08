import { describe, expect, it } from 'vitest';
import { endsWithResetSignal, SESSION_RESET_SIGNAL } from '../../src/core/services/reset-notice.js';

describe('runner reset signal (RF3, DEC-05, TC-10)', () => {
  it.each([
    SESSION_RESET_SIGNAL,
    `Done.\n${SESSION_RESET_SIGNAL}`,
    `Done.\n\n${SESSION_RESET_SIGNAL}`,
    `Done. ${SESSION_RESET_SIGNAL}`,
    `Done.\r\n  ${SESSION_RESET_SIGNAL}  \n`,
  ])('recognizes the signal at the end of the final line', (text) => {
    expect(endsWithResetSignal(text)).toBe(true);
  });

  it.each([
    `${SESSION_RESET_SIGNAL}\nMore text`,
    `Quoted ${SESSION_RESET_SIGNAL} before more text`,
    `${SESSION_RESET_SIGNAL} and more`,
    '',
  ])('rejects a signal that does not end the final line', (text) => {
    expect(endsWithResetSignal(text)).toBe(false);
  });
});
