export function renderJsonOutput(document: unknown): void {
  process.stdout.write(`${JSON.stringify(document, null, 2)}\n`);
}
