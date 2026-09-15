import { describe, expect, it } from 'vitest';
import { appendJsonArrayItem, removeJsonArrayItem, removeJsonProperty, setJsonProperty, validateJsonDocument } from '../../src/infrastructure/storage/json-document-editor.js';

const GROUP = [{ matcher: '*', hooks: [] }];

describe('JSONC comment safety (CR-01, F2)', () => {
  it('does not treat a comma inside a block comment as a separator', () => {
    const output = setJsonProperty('{"hooks":{"UserHook":"node custom.js" /*, keep */}}', ['hooks', 'PreToolUse'], GROUP);
    expect(validateJsonDocument(output).valid).toBe(true);
    expect(output).toContain('"PreToolUse"');
  });

  it('does not treat a comma inside a line comment as a separator', () => {
    const output = setJsonProperty('{"hooks":{"UserHook":"node custom.js" //, keep\n}}', ['hooks', 'PreToolUse'], GROUP);
    expect(validateJsonDocument(output).valid).toBe(true);
    expect(output).toContain('"PreToolUse"');
  });
});

describe('minified removal safety (CR-01)', () => {
  it('removes object properties from a single-line document', () => {
    expect(JSON.parse(removeJsonProperty('{"a":1,"b":2}', ['a']))).toEqual({ b: 2 });
    expect(JSON.parse(removeJsonProperty('{"a":1,"b":2}', ['b']))).toEqual({ a: 1 });
  });

  it('removes array items from a single-line document', () => {
    expect(JSON.parse(removeJsonArrayItem('[1,2,3]', [], (v) => v === 2))).toEqual([1, 3]);
    expect(JSON.parse(removeJsonArrayItem('[1,2,3]', [], (v) => v === 1))).toEqual([2, 3]);
    expect(JSON.parse(removeJsonArrayItem('[1,2,3]', [], (v) => v === 3))).toEqual([1, 2]);
  });
});

describe('minified idempotency (CR-01, CA-05)', () => {
  it('re-applies the same property byte-identically on a minified document', () => {
    const input = '{"hooks":{"UserHook":"node custom.js"}}';
    const once = setJsonProperty(input, ['hooks', 'PreToolUse'], GROUP);
    expect(setJsonProperty(once, ['hooks', 'PreToolUse'], GROUP)).toBe(once);
  });

  it('re-applies the same property byte-identically on an unindented multi-line document', () => {
    const input = '{\r\n"hooks":{\r\n"UserHook":"node custom.js"\r\n}\r\n}';
    const once = setJsonProperty(input, ['hooks', 'PreToolUse'], GROUP);
    expect(setJsonProperty(once, ['hooks', 'PreToolUse'], GROUP)).toBe(once);
  });

  it('appends to a minified array without corrupting prior items', () => {
    const once = appendJsonArrayItem('{"items":[1]}', ['items'], 2);
    expect(JSON.parse(appendJsonArrayItem(once, ['items'], 3))).toEqual({ items: [1, 2, 3] });
  });
});

function expectArrayRoundTrip(input: string, installed: string): void {
  expect(appendJsonArrayItem(input, ['items'], 2)).toBe(installed);
  expect(removeJsonArrayItem(installed, ['items'], (v) => v === 2)).toBe(input);
}

describe('trailing comment ownership round trips (CR-01, T29.1)', () => {
  it('keeps a final line comment attached to the previous item (LF)', () => {
    expectArrayRoundTrip('{\n  "items": [\n    1 // keep\n  ]\n}\n', '{\n  "items": [\n    1, // keep\n    2\n  ]\n}\n');
  });

  it('keeps a final block comment attached to the previous item (compact)', () => {
    expectArrayRoundTrip('{"items":[1 /* keep */]}', '{"items":[1, /* keep */2]}');
  });

  it('keeps a final line comment attached to the previous item (CRLF)', () => {
    expectArrayRoundTrip('{\r\n  "items": [\r\n    1 // keep\r\n  ]\r\n}\r\n', '{\r\n  "items": [\r\n    1, // keep\r\n    2\r\n  ]\r\n}\r\n');
  });

  it('keeps a final block comment attached without a final newline', () => {
    expectArrayRoundTrip('{"items":[\n  1 /* keep */\n]}', '{"items":[\n  1, /* keep */\n    2\n]}');
  });

  it('round-trips an array whose final item has no trailing comment', () => {
    expectArrayRoundTrip('{\n  "items": [\n    1\n  ]\n}\n', '{\n  "items": [\n    1,\n    2\n  ]\n}\n');
  });
});
