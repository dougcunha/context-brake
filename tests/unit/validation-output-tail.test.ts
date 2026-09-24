import { describe, expect, it } from 'vitest';
import { appendTail, decodeTail, OUTPUT_TAIL_BYTES } from '../../src/infrastructure/runner/shell-validation-executor.js';

describe('validation output tail (TC-11, DEC-11)', () => {
  it('keeps everything while under the limit', () => {
    const tail = appendTail(Buffer.from('abc'), Buffer.from('def'), 10);
    expect(tail.toString()).toBe('abcdef');
  });

  it('keeps only the newest bytes once the limit is crossed', () => {
    const tail = appendTail(Buffer.from('abcdef'), Buffer.from('ghij'), 4);
    expect(tail.toString()).toBe('ghij');
  });

  it('defaults to a 16 KiB limit', () => {
    const tail = appendTail(Buffer.alloc(0), Buffer.alloc(OUTPUT_TAIL_BYTES + 100, 'x'));
    expect(tail.length).toBe(OUTPUT_TAIL_BYTES);
  });

  it('drops a multi-byte character cut in half at the start', () => {
    const cut = appendTail(Buffer.alloc(0), Buffer.from('€ok'), 4);
    expect(decodeTail(cut)).toBe('ok');
  });

  it('decodes a whole multi-byte character unchanged', () => {
    expect(decodeTail(Buffer.from('€ok'))).toBe('€ok');
  });
});
