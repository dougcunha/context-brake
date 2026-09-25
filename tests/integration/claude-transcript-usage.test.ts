import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';
import { readTranscriptUsage, TranscriptUnreadableError } from '../../src/infrastructure/harnesses/claude-code/transcript-usage.js';
import { assistantLine, LARGE_TRANSCRIPT_USAGE, largeTranscript, transcriptTail, userLine } from '../helpers/transcript-fixtures.js';

const FIXTURES = resolve('tests/fixtures/harnesses/claude-code');
const READ_SAMPLES = 50;
const SIZE_RATIO_LIMIT = 2;
const SIZE_SLACK_MS = 10;

async function timedRead(path: string): Promise<number> {
  const start = performance.now();
  expect(await readTranscriptUsage(path)).toEqual(LARGE_TRANSCRIPT_USAGE);
  return performance.now() - start;
}

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-transcript-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Claude Code transcript usage reader main-thread usage (FR-04, TC-13, TC-14)', () => {
  it('sums the three usage fields of the latest main-thread assistant line (TC-13)', async () => {
    expect(await readTranscriptUsage(join(FIXTURES, 'transcript-main.jsonl'))).toEqual({ tokens: 194_431, at: '2026-09-25T10:00:10.500Z' });
  });

  it('skips sidechain assistant lines and returns the earlier main-thread usage (TC-14)', async () => {
    expect(await readTranscriptUsage(join(FIXTURES, 'transcript-sidechain.jsonl'))).toEqual({ tokens: 20_103, at: '2026-09-25T10:00:01.000Z' });
  });

});

describe('Claude Code transcript usage reader fallbacks (FR-05, NFR-02, TC-15)', () => {
  it('returns null for a transcript without an assistant line (TC-15)', async () => {
    expect(await readTranscriptUsage(join(FIXTURES, 'transcript-no-assistant.jsonl'))).toBeNull();
  });

  it.each([
    ['a missing path', undefined],
    ['an empty path', ''],
  ])('returns null for %s (TC-15)', async (_label, path) => {
    expect(await readTranscriptUsage(path)).toBeNull();
  });

  it.each([
    ['a missing file', null],
    ['an empty file', ''],
    ['a torn last line', `${userLine(10)}\n${assistantLine({ at: '2026-09-25T10:00:00.000Z', tokens: [1, 2, 3] }).slice(0, 120)}`],
    ['non-numeric usage', `${assistantLine({ at: '2026-09-25T10:00:00.000Z', tokens: [1, 2, 3] }).replace('"input_tokens":1', '"input_tokens":"1"')}\n`],
    ['negative usage', `${assistantLine({ at: '2026-09-25T10:00:00.000Z', tokens: [-1, 2, 3] })}\n`],
    ['a line without a timestamp', `${assistantLine({ at: '2026-09-25T10:00:00.000Z', tokens: [1, 2, 3] }).replace(/"timestamp":"[^"]+",/, '')}\n`],
  ])('returns null without throwing for %s (TC-15)', async (_label, content) => {
    const path = join(root, 'session.jsonl');
    if (content !== null) await writeFile(path, content, 'utf8');
    await expect(readTranscriptUsage(path)).resolves.toBeNull();
  });

  it('reads the complete line before a torn tail and tolerates CRLF line endings (TC-15)', async () => {
    const path = join(root, 'session.jsonl');
    const torn = assistantLine({ at: '2026-09-25T10:00:09.000Z', tokens: [9, 9, 9] }).slice(0, 80);
    await writeFile(path, `${assistantLine({ at: '2026-09-25T10:00:00.000Z', tokens: [1, 2, 3] })}\r\n${torn}`, 'utf8');
    expect(await readTranscriptUsage(path)).toEqual({ tokens: 6, at: '2026-09-25T10:00:00.000Z' });
  });

});

describe('Claude Code transcript usage reader bounds and failures (NFR-01, NFR-06, DEC-07, TC-16)', () => {
  it('stops reading after 4 MiB from the end of the file (DEC-07)', async () => {
    const path = join(root, 'session.jsonl');
    const filler = Array.from({ length: 30 }, () => userLine(150_000)).join('\n');
    await writeFile(path, `${assistantLine({ at: '2026-09-25T10:00:00.000Z', tokens: [1, 2, 3] })}\n${filler}\n`, 'utf8');
    expect(await readTranscriptUsage(path)).toBeNull();
  });

  it('wraps file I/O failures in TranscriptUnreadableError', async () => {
    await expect(readTranscriptUsage(root)).rejects.toBeInstanceOf(TranscriptUnreadableError);
  });

  it('reads a 20 MB transcript at a path with spaces and accents as fast as its tail alone (TC-16, NFR-01)', async () => {
    const directory = join(root, 'projetos com espaço', 'sessão ação');
    await mkdir(directory, { recursive: true });
    const large = join(directory, 'transcrição da sessão.jsonl');
    const small = join(directory, 'só o final.jsonl');
    await Promise.all([writeFile(large, largeTranscript(), 'utf8'), writeFile(small, transcriptTail(), 'utf8')]);
    const samples = { large: [] as number[], small: [] as number[] };
    for (let index = 0; index < READ_SAMPLES; index += 1) {
      samples.large.push(await timedRead(large));
      samples.small.push(await timedRead(small));
    }
    expect(calculateNearestRankP95(samples.large)).toBeLessThanOrEqual((calculateNearestRankP95(samples.small) ?? 0) * SIZE_RATIO_LIMIT + SIZE_SLACK_MS);
  }, 60_000);
});
