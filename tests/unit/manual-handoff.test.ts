import { describe, expect, it } from 'vitest';
import type { SnapshotConfig } from '../../src/core/contracts/configuration.js';
import { decideManualHandoff, manualHandoffPrompt, MANUAL_HANDOFF_FOCUS_LIMIT, normalizeFocus, type ManualHandoffDecision, type ManualHandoffFacts } from '../../src/core/services/manual-handoff.js';
import { slashInvocation } from '../../src/core/services/skill-invocation.js';
import { zoneAction } from '../../src/core/services/zone-guidance.js';

const WITH_COMMAND: SnapshotConfig = { triggerZone: 'RED', command: 'sdd-snapshot' };
const WITHOUT_COMMAND: SnapshotConfig = { triggerZone: 'RED' };
const LEAD = 'ContextBrake: the user typed /handoff to continue this work in a new session. Do this now:';
const CLEAR = { disabledByEnv: false, interactive: true };

describe('manual handoff prompt (FR-04, NFR-03, TC-01)', () => {
  it('asks for the snapshot skill with the trigger-zone text in snapshot mode', () => {
    const prompt = manualHandoffPrompt({ snapshot: WITH_COMMAND, invoke: slashInvocation });
    expect(prompt).toBe(`${LEAD} run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].`);
    expect(prompt).toContain(zoneAction('RED', WITH_COMMAND, { invoke: slashInvocation }));
  });
  it('asks for the markdown handoff with the trigger-zone text in handoff mode', () => {
    const prompt = manualHandoffPrompt({ snapshot: WITHOUT_COMMAND, invoke: slashInvocation });
    expect(prompt).toBe(`${LEAD} save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET].`);
    expect(prompt).toContain(zoneAction('RED', WITHOUT_COMMAND, { mode: 'handoff', invoke: slashInvocation }));
  });
  it('keeps the non-urgent wording that the CRITICAL zone changes to "now"', () => {
    const prompt = manualHandoffPrompt({ snapshot: { ...WITH_COMMAND, triggerZone: 'YELLOW' }, invoke: slashInvocation });
    expect(zoneAction('CRITICAL', WITH_COMMAND, { invoke: slashInvocation })).toContain(' now,');
    expect(prompt).not.toContain(' now,');
    expect(prompt.startsWith('/')).toBe(false);
  });
  it.each([
    [WITH_COMMAND, 'snapshot'],
    [WITHOUT_COMMAND, 'handoff'],
  ] as const)('adds one focus sentence for the %s target', (snapshot, target) => {
    const prompt = manualHandoffPrompt({ snapshot, invoke: slashInvocation, focus: 'the parser bug' });
    expect(prompt).toMatch(new RegExp(`\\. In the ${target}, stress this focus for the next session: "the parser bug"\\.$`));
  });
});

describe('focus normalization (FR-07, TC-02)', () => {
  it('turns newlines into spaces and trims', () => {
    expect(normalizeFocus('  a\nb  ')).toBe('a b');
    expect(normalizeFocus('a\r\n\r\n  b')).toBe('a b');
  });
  it.each(['', '   ', '\n'])('treats %j as no focus', (raw) => {
    expect(normalizeFocus(raw)).toBeUndefined();
  });
  it('cuts a 600-character focus to 500 characters', () => {
    expect(normalizeFocus('x'.repeat(600))).toHaveLength(MANUAL_HANDOFF_FOCUS_LIMIT);
  });
});

describe('manual handoff decision (FR-05, FR-06, A-04, TC-03)', () => {
  it.each<[string, ManualHandoffFacts, ManualHandoffDecision]>([
    ['restart off', { mode: 'off', standDown: CLEAR }, { kind: 'refuse-off' }],
    ['the env kill switch', { mode: 'snapshot', standDown: { disabledByEnv: true, interactive: true } }, { kind: 'refuse', code: 'SKIP_DISABLED_ENV' }],
    ['a surface that is not interactive', { mode: 'handoff', standDown: { disabledByEnv: false, interactive: false } }, { kind: 'refuse', code: 'SKIP_NON_INTERACTIVE' }],
    ['every check passed', { mode: 'snapshot', standDown: CLEAR }, { kind: 'submit' }],
  ])('decides with %s', (_, facts, expected) => {
    expect(decideManualHandoff(facts)).toEqual(expected);
  });
});
