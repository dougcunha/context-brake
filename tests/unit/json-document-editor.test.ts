import { describe, expect, it } from 'vitest';
import { appendJsonArrayItem, removeJsonArrayItem, removeJsonProperty, setJsonProperty, validateJsonDocument } from '../../src/infrastructure/storage/json-document-editor.js';

const SYNTAX_ERROR = '{\n  "name": "test",\n  "broken": \n}';
const NESTED_DUPLICATE = '{\n  "hooks": {\n    "Stop": 1,\n    "Stop": 2\n  }\n}';
const USER_SETTINGS = '{\n  // User setting\n  "theme": "dark", // inline comment\n  "fontSize": 14\n}\n';
const GROUP = [{ matcher: '*', hooks: [] }];

describe('JSON/JSONC validation and isolated conflict detection (RF7, CA-06)', () => {
  it.each([
    { label: 'a syntax error (UT-05, CA-06)', text: SYNTAX_ERROR, errors: ['ValueExpected at offset 33'], duplicateKeys: [], issue: 'ValueExpected at offset 33' },
    { label: 'a duplicate key in a nested object (UT-05, CA-06)', text: NESTED_DUPLICATE, errors: [], duplicateKeys: ['Stop'], issue: 'Duplicate key: Stop' },
    { label: 'an empty file', text: '', errors: ['ValueExpected at offset 0'], duplicateKeys: [], issue: 'ValueExpected at offset 0' },
  ])('reports $label as invalid and refuses to edit it', ({ text, errors, duplicateKeys, issue }) => {
    expect(validateJsonDocument(text)).toEqual({ valid: false, errors, duplicateKeys });
    expect(() => setJsonProperty(text, ['x'], 1)).toThrow(`Invalid JSON document: ${issue}`);
  });
});

describe('JSONC trivia and comment preservation (UT-19, CA-05)', () => {
  it('preserves comments, key order, indentation, and final newline, and a second run changes nothing', () => {
    const output = setJsonProperty(USER_SETTINGS, ['hooks'], { Stop: [1] });
    expect(output).toBe('{\n  // User setting\n  "theme": "dark", // inline comment\n  "fontSize": 14,\n  "hooks": {\n    "Stop": [\n      1\n    ]\n  }\n}\n');
    expect(setJsonProperty(output, ['hooks'], { Stop: [1] })).toBe(output);
  });

  it('preserves CRLF line endings through surgical edits', () => {
    const output = setJsonProperty('{\r\n  "alpha": 1\r\n}\r\n', ['beta'], { b: 2 });
    expect(output).toBe('{\r\n  "alpha": 1,\r\n  "beta": {\r\n    "b": 2\r\n  }\r\n}\r\n');
  });
});

describe('JSONC structural property and array edits (UT-19, CA-05)', () => {
  it('inserts into empty object and creates nested parent path', () => {
    expect(setJsonProperty('{}', ['nested', 'key'], 42)).toBe('{"nested": {"key":42}}');
  });

  it('appends array items to empty, populated, and missing arrays', () => {
    const populated = '{\n  "hooks": [\n    // existing hook\n    "hookA"\n  ]\n}';
    expect(appendJsonArrayItem('{\n  "items": []\n}', ['items'], 'first')).toBe('{\n  "items": [\n    "first"\n  ]\n}');
    expect(appendJsonArrayItem(populated, ['hooks'], { command: 'b' })).toBe('{\n  "hooks": [\n    // existing hook\n    "hookA",\n    {\n      "command": "b"\n    }\n  ]\n}');
    expect(appendJsonArrayItem('{\n  "a": 1\n}', ['items'], 1)).toBe('{\n  "a": 1,\n  "items": [\n    1\n  ]\n}');
  });

  it('removes properties and array items cleanly', () => {
    const propRemoved = removeJsonProperty('{\n  "keepA": 1,\n  "toRemove": 2,\n  "arr": ["a", "b"]\n}', ['toRemove']);
    expect(propRemoved).toBe('{\n  "keepA": 1,\n  "arr": ["a", "b"]\n}');
    expect(removeJsonArrayItem(propRemoved, ['arr'], (v) => v === 'b')).toBe('{\n  "keepA": 1,\n  "arr": ["a" ]\n}');
  });
});

describe('single-line document edits (CR-01, RF6)', () => {
  it('inserts into a minified object without emitting bytes after the root, and a second run changes nothing (CA-05)', () => {
    const once = setJsonProperty('{"hooks":{"UserHook":"node custom.js"}}', ['hooks', 'PreToolUse'], GROUP);
    const twice = setJsonProperty(once, ['hooks', 'PostToolUse'], GROUP);
    expect(twice).toBe('{"hooks":{"UserHook":"node custom.js","PreToolUse": [{"matcher":"*","hooks":[]}],"PostToolUse": [{"matcher":"*","hooks":[]}]}}');
    expect(setJsonProperty(twice, ['hooks', 'PostToolUse'], GROUP)).toBe(twice);
  });
});

describe('property trailing comment ownership (CR-01, T29.1)', () => {
  it('keeps a final property comment attached when adding a property', () => {
    const input = '{\n  "a": 1 // keep\n}\n';
    const output = setJsonProperty(input, ['b'], 2);
    expect(output).toBe('{\n  "a": 1, // keep\n  "b": 2\n}\n');
    expect(removeJsonProperty(output, ['b'])).toBe(input);
  });
});
