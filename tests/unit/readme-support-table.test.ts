import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HARNESS_IDS, type HarnessId } from '../../src/core/contracts/harness.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

type SupportRow = { readonly level: string; readonly limitation: string };
type SupportTable = { readonly rows: ReadonlyMap<HarnessId, readonly SupportRow[]>; readonly source: string };

const ROW_PATTERN = /^\|\s*[^|]+\(`([a-z-]+)`\)\s*\|/;

function parseSupportTable(source: string): SupportTable {
  const rows = new Map<HarnessId, SupportRow[]>();
  for (const line of source.split(/\r?\n/)) {
    const id = line.match(ROW_PATTERN)?.[1] as HarnessId | undefined;
    if (!id || !HARNESS_IDS.includes(id)) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    rows.set(id, [...(rows.get(id) ?? []), { level: (cells[3] ?? '').toLowerCase(), limitation: cells[4] ?? '' }]);
  }
  return { rows, source };
}

function pointerLine(source: string): string | undefined {
  return source.split(/\r?\n/).find((line) => line.includes('<!-- CONTEXTBRAKE:START -->'));
}

const table = parseSupportTable(readFileSync(join(__dirname, '../../README.md'), 'utf8'));

describe('README support table rows (T34, TC-13, DEC-12)', () => {
  it('lists exactly one support row per harness', () => {
    expect(table.rows.size).toBe(HARNESS_IDS.length);
    for (const id of HARNESS_IDS) {
      expect(table.rows.get(id)?.length, `support rows for ${id}`).toBe(1);
    }
  });

  it('matches every listed level to the adapter capability profile', () => {
    for (const id of HARNESS_IDS) {
      const expected = getAdapter(id).capabilityProfile().supportLevel;
      expect(table.rows.get(id)?.[0]?.level, `support level for ${id}`).toBe(expected);
    }
  });
});

describe('README installation claims (T34, CR-05)', () => {
  it('names the real Oh-My-Pi extension path', () => {
    expect(table.source).toContain('.omp/extensions/');
    expect(table.source).not.toContain('.omp/hooks/');
    expect(table.rows.get('oh-my-pi')?.[0]?.level).toBe('full');
  });

  it('describes the canonical three-line instruction pointer', () => {
    const pointer = pointerLine(table.source);
    expect(pointer).toBeDefined();
    expect(pointer).toContain('three-line');
    expect(pointer).toContain('<!-- CONTEXTBRAKE:END -->');
    expect(table.source).not.toMatch(/four[- ]line|4-line/i);
  });

  it('reports the Antigravity pre-tool limitation without promising blocking', () => {
    const row = table.rows.get('antigravity-cli')?.[0];
    expect(row?.level).toBe('cooperative');
    expect(row?.limitation).toContain('PreInvocation');
  });
});
