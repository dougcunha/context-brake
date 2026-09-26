import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod/mini';

export const STATUSLINE_STATE_FILE = '.context-brake/runtime/claude-statusline.json';
export const STATUSLINE_SCOPES = ['local', 'project', 'user'] as const;

export type StatuslineScope = (typeof STATUSLINE_SCOPES)[number];

const statuslineStateSchema = z.strictObject({
  v: z.literal(1),
  installedCommand: z.string(),
  previousLocal: z.nullable(z.record(z.string(), z.unknown())),
  previousSource: z.nullable(z.enum(STATUSLINE_SCOPES)),
  previousCommand: z.nullable(z.string()),
  createdLocalFile: z.boolean(),
});

export type StatuslineState = z.infer<typeof statuslineStateSchema>;

export async function readStatuslineState(projectRoot: string): Promise<StatuslineState | null> {
  const content = await readFile(resolve(projectRoot, STATUSLINE_STATE_FILE), 'utf8').catch(() => null);
  return content === null ? null : parseStatuslineState(content);
}

export function parseStatuslineState(content: string): StatuslineState | null {
  try {
    const result = statuslineStateSchema.safeParse(JSON.parse(content));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function serializeStatuslineState(state: StatuslineState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}
