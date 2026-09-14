import { describe, expect, it } from 'vitest';
import { appendJsonArrayItem, removeJsonArrayItem, removeJsonProperty, setJsonProperty, validateJsonDocument } from '../../src/infrastructure/storage/json-document-editor.js';

describe('JSON/JSONC validation and isolated conflict detection (RF7, CA-06)', () => {
  it('detects syntax errors as invalid document (UT-05, CA-06)', () => {
    const invalidSyntax = '{\n  "name": "test",\n  "broken": \n}';
    const result = validateJsonDocument(invalidSyntax);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects duplicate keys as invalid document (UT-05, CA-06)', () => {
    const duplicateKeys = '{\n  "key": 1,\n  "key": 2\n}';
    const result = validateJsonDocument(duplicateKeys);
    expect(result.valid).toBe(false);
    expect(result.duplicateKeys).toContain('key');
  });
});

describe('JSONC trivia and comment preservation (UT-19, CA-05)', () => {
  it('preserves comments, key order, indentation, and final newline', () => {
    const input = '{\n  // User setting\n  "theme": "dark", // inline comment\n  "fontSize": 14\n}\n';
    const output = setJsonProperty(input, ['autoSave'], true);
    expect(output).toContain('// User setting');
    expect(output).toContain('"theme": "dark", // inline comment');
    expect(output).toContain('"fontSize": 14');
    expect(output).toContain('"autoSave": true');
    expect(output.endsWith('\n')).toBe(true);
  });

  it('preserves CRLF line endings through surgical edits', () => {
    const input = '{\r\n  "alpha": 1\r\n}\r\n';
    const output = setJsonProperty(input, ['beta'], 2);
    expect(output).toContain('\r\n');
    expect(output.includes('\r\n  "beta": 2')).toBe(true);
  });
});

describe('JSONC structural property and array edits (UT-19, CA-05)', () => {
  it('inserts into empty object and creates nested parent path', () => {
    const res1 = setJsonProperty('{}', ['nested', 'key'], 42);
    expect(JSON.parse(res1)).toEqual({ nested: { key: 42 } });
  });

  it('appends array items to empty and populated arrays', () => {
    const emptyArray = '{\n  "items": []\n}';
    const res1 = appendJsonArrayItem(emptyArray, ['items'], 'first');
    expect(res1).toContain('"first"');
    const populated = '{\n  "hooks": [\n    // existing hook\n    "hookA"\n  ]\n}';
    const output = appendJsonArrayItem(populated, ['hooks'], 'hookB');
    expect(output).toContain('// existing hook');
    expect(output).toContain('"hookA",');
    expect(output).toContain('"hookB"');
  });

  it('removes properties and array items cleanly', () => {
    const input = '{\n  "keepA": 1,\n  "toRemove": 2,\n  "arr": ["a", "b"]\n}';
    const propRemoved = removeJsonProperty(input, ['toRemove']);
    expect(propRemoved).not.toContain('"toRemove"');
    expect(propRemoved).toContain('"keepA": 1');
    const itemRemoved = removeJsonArrayItem(propRemoved, ['arr'], (v) => v === 'b');
    expect(itemRemoved).not.toContain('"b"');
    expect(itemRemoved).toContain('"a"');
  });
});

describe('single-line document edits (CR-01, RF6)', () => {
  it('inserts into a minified object without emitting bytes after the root', () => {
    const input = '{"hooks":{"UserHook":"node custom.js"}}';
    const once = setJsonProperty(input, ['hooks', 'PreToolUse'], [{ matcher: '*', hooks: [] }]);
    const twice = setJsonProperty(once, ['hooks', 'PostToolUse'], [{ matcher: '*', hooks: [] }]);
    const parsed = JSON.parse(twice) as { hooks: Record<string, unknown> };
    expect(parsed.hooks.UserHook).toBe('node custom.js');
    expect(parsed.hooks.PreToolUse).toBeDefined();
    expect(parsed.hooks.PostToolUse).toBeDefined();
  });

  it('appends to a minified array without corrupting the document', () => {
    const output = appendJsonArrayItem('{"items":[1,2]}', ['items'], 3);
    const parsed = JSON.parse(output) as { items: number[] };
    expect(parsed.items).toEqual([1, 2, 3]);
  });
});
