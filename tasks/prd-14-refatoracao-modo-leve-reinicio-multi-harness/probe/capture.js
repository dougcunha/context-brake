import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const MARKER = '[REQUEST_SESSION_RESET]';
export const SEED = 'PROBE SEED: reply with the single word SEEDED.';
export const LOAD_ID = Math.random().toString(36).slice(2, 10);

export function endsWithMarker(text) {
  return typeof text === 'string' && (text.trimEnd().split(/\r?\n/).at(-1) ?? '').endsWith(MARKER);
}

export function textOf(message) {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.content)) return '';
  return message.content.filter((part) => part && part.type === 'text').map((part) => part.text).join('\n');
}

export function createCapture(harness, root) {
  const dir = join(root, 'probe-captures');
  return async function capture(event, data) {
    const line = JSON.stringify({ at: new Date().toISOString(), harness, loadId: LOAD_ID, event, data }, safeReplacer());
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, `${harness}.jsonl`), `${line}\n`, 'utf8');
  };
}

function safeReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (key === 'signal') return '[AbortSignal]';
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[circular]';
      seen.add(value);
    }
    return value;
  };
}
