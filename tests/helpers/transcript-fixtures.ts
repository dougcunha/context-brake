const TWENTY_MEGABYTES = 20 * 1024 * 1024;

export type AssistantLineInput = { readonly at: string; readonly tokens: readonly [number, number, number]; readonly sidechain?: boolean };
export const LARGE_TRANSCRIPT_USAGE = { tokens: 194_431, at: '2026-09-25T10:00:00.000Z' };

export function assistantLine(input: AssistantLineInput): string {
  const usage = { input_tokens: input.tokens[0], cache_creation_input_tokens: input.tokens[1], cache_read_input_tokens: input.tokens[2], output_tokens: 10 };
  return JSON.stringify({ type: 'assistant', isSidechain: input.sidechain ?? false, timestamp: input.at, message: { role: 'assistant', content: [{ type: 'text', text: 'Synthetic.' }], usage } });
}

export function userLine(characters: number): string {
  return JSON.stringify({ type: 'user', isSidechain: false, timestamp: '2026-09-25T09:00:00.000Z', message: { role: 'user', content: 'x'.repeat(characters) } });
}

export function largeTranscript(): string {
  const lines: string[] = [];
  let size = 0;
  for (let index = 0; size < TWENTY_MEGABYTES; index += 1) {
    const line = index % 20 === 0 ? assistantLine({ at: '2026-09-25T09:00:00.000Z', tokens: [1, 1, index] }) : userLine(150_000);
    lines.push(line);
    size += line.length + 1;
  }
  return `${lines.join('\n')}\n${transcriptTail()}`;
}

export function transcriptTail(): string {
  return `${assistantLine({ at: LARGE_TRANSCRIPT_USAGE.at, tokens: [2, 784, 193_645] })}\n${userLine(300_000)}\n`;
}
