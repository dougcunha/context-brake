import { describe, expect, it } from 'vitest';
import { removeOwnedFromEvent, removeOwnedFromOtherEvents } from '../../src/infrastructure/harnesses/common/hook-event-cleanup.js';

function isOwned(handler: unknown): boolean {
  return typeof handler === 'object' && handler !== null && String((handler as { command?: unknown }).command).includes('mine.mjs');
}

function render(hooks: unknown): string {
  return `${JSON.stringify({ hooks }, null, 2)}\n`;
}

describe('hook event cleanup (prd-15 FR-03, FR-04, TC-06)', () => {
  it('removes owned flat entries and the event when it was the last entry (FR-03, TC-06)', () => {
    const text = render({ preToolUse: [{ command: 'node mine.mjs' }], keep: [{ command: 'echo x' }] });
    expect(removeOwnedFromOtherEvents(text, ['keep'], isOwned)).toBe(render({ keep: [{ command: 'echo x' }] }));
  });
  it('keeps the event when a foreign flat entry remains (FR-03, TC-06)', () => {
    const text = render({ old: [{ command: 'node mine.mjs' }, { command: 'echo x' }] });
    expect(removeOwnedFromOtherEvents(text, [], isOwned)).toBe(render({ old: [{ command: 'echo x' }] }));
  });
  it('removes only owned handlers inside a mixed group (FR-03, TC-06)', () => {
    const text = render({ old: [{ matcher: '*', hooks: [{ command: 'node mine.mjs' }, { command: 'echo x' }] }] });
    expect(removeOwnedFromOtherEvents(text, [], isOwned)).toBe(render({ old: [{ matcher: '*', hooks: [{ command: 'echo x' }] }] }));
  });
  it('leaves events without an owned entry, including user empty arrays, untouched (FR-03, NFR-01, TC-06)', () => {
    const text = render({ empty: [], foreign: [{ command: 'echo x' }] });
    expect(removeOwnedFromOtherEvents(text, [], isOwned)).toBe(text);
  });
  it('never touches the current events (FR-03, TC-06)', () => {
    const text = render({ current: [{ command: 'node mine.mjs' }] });
    expect(removeOwnedFromOtherEvents(text, ['current'], isOwned)).toBe(text);
  });
  it('removes every owned entry of one event on request (FR-04, TC-06)', () => {
    const text = render({ a: [{ command: 'node mine.mjs' }, { command: 'node mine.mjs' }] });
    expect(JSON.parse(removeOwnedFromEvent(text, 'a', isOwned))).toEqual({ hooks: {} });
  });
  it('returns a document without hooks unchanged (FR-03, TC-06)', () => {
    expect(removeOwnedFromOtherEvents('{\n  "a": 1\n}\n', [], isOwned)).toBe('{\n  "a": 1\n}\n');
  });
});
