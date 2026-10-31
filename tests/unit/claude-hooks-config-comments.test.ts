import { describe, expect, it } from 'vitest';
import { applyHooks, parseHooks } from '../../src/infrastructure/harnesses/claude-code/claude-hooks-config.js';

const WITH_COMMENT = '{\n  // my overrides\n  "hooks": {\n    "PostToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "echo mine" }] }]\n  }\n}\n';

describe('parseHooks reads settings files with comments (HOOKS_IN_VERSIONED_SETTINGS fix)', () => {
  it('returns the hooks object of a file with a line comment and trailing commas', () => {
    const text = '{\n  // note\n  "hooks": { "Stop": [], },\n}\n';
    expect(parseHooks(text)).toEqual({ Stop: [] });
  });

  it('returns an empty object when hooks is missing or is not an object', () => {
    expect([parseHooks('{}'), parseHooks('{ "hooks": [] }'), parseHooks('[]')]).toEqual([{}, {}, {}]);
  });

  it('keeps the user group of the same event when a commented file receives the ContextBrake hooks and drops only its own entries on removal', () => {
    const installed = applyHooks(WITH_COMMENT, true);
    expect(installed).toContain('echo mine');
    expect(installed).toContain('context-brake.mjs');
    const removed = applyHooks(installed, false);
    expect(removed).toContain('// my overrides');
    expect(parseHooks(removed)).toEqual(parseHooks(WITH_COMMENT));
  });
});
