import { readFileSync } from 'node:fs';
import { getEncoding } from 'js-tiktoken';

const probe = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let text = probe.stdout;
try {
  const rendered = JSON.parse(probe.stdout);
  text = rendered.additionalContext ?? rendered.first?.message ?? probe.stdout;
} catch {
  text = probe.stdout;
}
const encoder = getEncoding('o200k_base');
const tokens = encoder.encode(text).length;
console.log(JSON.stringify({ bytes: Buffer.byteLength(text, 'utf8'), tokens, preview: text.slice(0, 120) }));
