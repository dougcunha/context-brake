import { describe, expect, it } from 'vitest';
import { appendJsonArrayItem, removeJsonArrayItem, removeJsonProperty, setJsonProperty } from '../../src/infrastructure/storage/json-document-editor.js';

const GROUP = [{ matcher: '*', hooks: [] }];
const INSTALLED_GROUP = '"PreToolUse": [{"matcher":"*","hooks":[]}]';
const INLINE_ARRAY = '{\n  "items": [\n    1, 2\n  ]\n}\n';

describe('JSONC comment safety (CR-01, F2)', () => {
  it.each([
    { label: 'block', input: '{"hooks":{"UserHook":"node custom.js" /* keep, this */}}', expected: `{"hooks":{"UserHook":"node custom.js", /* keep, this */${INSTALLED_GROUP}}}` },
    { label: 'line', input: '{"hooks":{"UserHook":"node custom.js" // keep, this\n}}', expected: `{"hooks":{"UserHook":"node custom.js", // keep, this\n${INSTALLED_GROUP}\n}}` },
  ])('does not treat a comma inside a $label comment as a separator', ({ input, expected }) => {
    expect(setJsonProperty(input, ['hooks', 'PreToolUse'], GROUP)).toBe(expected);
  });

  it('removes a middle property whose comment precedes its comma', () => {
    expect(removeJsonProperty('{"a":1, "b":2 /* note */, "c":3}', ['b'])).toBe('{"a":1 /* note */, "c":3}');
  });
});

describe('minified removal safety (CR-01)', () => {
  it('removes object properties from a single-line document', () => {
    expect(removeJsonProperty('{"a":1,"b":2}', ['a'])).toBe('{"b":2}');
    expect(removeJsonProperty('{"a":1,"b":2}', ['b'])).toBe('{"a":1}');
    expect(removeJsonProperty('{"a":1}', ['a'])).toBe('{}');
  });

  it('removes array items from a single-line document', () => {
    expect(removeJsonArrayItem('[1,2,3]', [], (v) => v === 2)).toBe('[1,3]');
    expect(removeJsonArrayItem('[1,2,3]', [], (v) => v === 1)).toBe('[2,3]');
    expect(removeJsonArrayItem('[1,2,3]', [], (v) => v === 3)).toBe('[1,2]');
  });

  it('removes one item of a line holding two without touching the other item', () => {
    expect(removeJsonArrayItem(INLINE_ARRAY, ['items'], (v) => v === 1)).toBe('{\n  "items": [\n     2\n  ]\n}\n');
    expect(removeJsonArrayItem(INLINE_ARRAY, ['items'], (v) => v === 2)).toBe('{\n  "items": [\n    1 \n  ]\n}\n');
  });

  it('returns the document unchanged when there is nothing left to remove', () => {
    const input = '{"a":[1]}';
    expect(removeJsonProperty(input, ['z'])).toBe(input);
    expect(removeJsonArrayItem(input, ['a'], (v) => v === 9)).toBe(input);
    expect(removeJsonArrayItem(input, ['z'], () => true)).toBe(input);
  });
});

describe('trailing comment ownership round trips (CR-01, T29.1)', () => {
  it.each([
    { label: 'a final line comment (LF)', input: '{\n  "items": [\n    1 // keep\n  ]\n}\n', installed: '{\n  "items": [\n    1, // keep\n    2\n  ]\n}\n' },
    { label: 'a final block comment (compact)', input: '{"items":[1 /* keep */]}', installed: '{"items":[1, /* keep */2]}' },
    { label: 'a final line comment (CRLF)', input: '{\r\n  "items": [\r\n    1 // keep\r\n  ]\r\n}\r\n', installed: '{\r\n  "items": [\r\n    1, // keep\r\n    2\r\n  ]\r\n}\r\n' },
    { label: 'a final block comment without a final newline', input: '{"items":[\n  1 /* keep */\n]}', installed: '{"items":[\n  1, /* keep */\n    2\n]}' },
  ])('round-trips an appended item after $label', ({ input, installed }) => {
    expect(appendJsonArrayItem(input, ['items'], 2)).toBe(installed);
    expect(removeJsonArrayItem(installed, ['items'], (v) => v === 2)).toBe(input);
  });
});
