import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { RESTART_REASON_CODES } from '../../src/core/contracts/auto-restart.js';
import { RESTART_LOG_MAX_RECORDS as MOD_LOG_MAX_RECORDS } from '../../src/core/contracts/restart-log.js';
import { appendLogRecord, buildLogRecord, renderRestartNotice, seedText } from '../../src/core/services/auto-restart-notices.js';

const encoding = getEncoding('o200k_base');
const SEED_TOKEN_BUDGET = 60;
const LIGHT_SEED = 'ContextBrake: this session was restarted automatically. Continue the previous work from the state it recorded.';

function recordsFilledToTheLimit() {
  return Array.from({ length: MOD_LOG_MAX_RECORDS }, (_, index) => buildLogRecord('RESTARTED', `2026-10-04T21:00:${String(index).padStart(2, '0')}.000Z`));
}

describe('notices (FR-10, TC-07)', () => {
  it('has a one-line notice for every code except the silent one', () => {
    for (const code of RESTART_REASON_CODES) {
      const notice = renderRestartNotice(code);
      if (code === 'SKIP_NO_SIGNAL') expect(notice).toBeUndefined();
      else expect(notice).toMatch(/^ContextBrake: [^\n]+$/);
    }
  });

  it('names the cause and the way out in the skip notices', () => {
    expect(renderRestartNotice('PAUSED_LOOP_GUARD')).toContain('Send a message to resume');
    expect(renderRestartNotice('SKIP_DISABLED_ENV')).toContain('CONTEXT_BRAKE_AUTO_RESTART=0');
  });
});

describe('seed text (FR-02, prd-12 FR-10)', () => {
  it('builds the exact generic seed without mentioning the boot', () => {
    expect(seedText()).toBe(LIGHT_SEED);
    expect(seedText().toLowerCase()).not.toContain('boot');
  });

  it('keeps the seed inside the token budget', () => {
    expect(encoding.encode(seedText()).length).toBeLessThan(SEED_TOKEN_BUDGET);
  });
});

describe('log records (FR-10, NFR-02, TC-07)', () => {
  it('builds records with only a timestamp and a code', () => {
    const record = buildLogRecord('RESTARTED', '2026-10-04T21:00:00.000Z');
    expect(Object.keys(record).sort()).toEqual(['at', 'code']);
  });

  it('keeps the newest 50 records without mutating the input', () => {
    const records = recordsFilledToTheLimit();
    const next = appendLogRecord(records, buildLogRecord('PAUSED_LOOP_GUARD', '2026-10-04T22:00:00.000Z'));
    expect(next).toHaveLength(MOD_LOG_MAX_RECORDS);
    expect(next.at(-1)?.code).toBe('PAUSED_LOOP_GUARD');
    expect(next[0]?.at).toBe(records[1]?.at);
    expect(records).toHaveLength(MOD_LOG_MAX_RECORDS);
  });
});
