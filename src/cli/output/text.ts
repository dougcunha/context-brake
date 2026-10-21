import type { CliErrorDocument } from '../../core/contracts/diagnostics.js';

export function renderCliErrorText(doc: CliErrorDocument): void {
  process.stderr.write(`[ERROR] ${doc.error.code}: ${doc.error.message}\n`);
}
