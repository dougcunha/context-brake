import { z } from 'zod/mini';
import type { ModHost } from './host.js';

const guardSchema = z.strictObject({ consecutive: z.int().check(z.minimum(0)), toolCallsSinceSeed: z.nullable(z.int().check(z.minimum(0))) });
export type GuardState = z.infer<typeof guardSchema>;

const IDLE: GuardState = { consecutive: 0, toolCallsSinceSeed: null };

function guardKey(root: string): string {
  return `contextbrake:autorestart:${root}`;
}

export async function readGuards($: ModHost, root: string): Promise<GuardState> {
  const parsed = guardSchema.safeParse(await $.store.get(guardKey(root)));
  return parsed.success ? parsed.data : IDLE;
}

async function writeGuards($: ModHost, root: string, state: GuardState): Promise<void> {
  await $.store.set(guardKey(root), state);
}

export async function bumpConsecutive($: ModHost, root: string): Promise<void> {
  const state = await readGuards($, root);
  await writeGuards($, root, { ...state, consecutive: state.consecutive + 1 });
}

export async function rollbackConsecutive($: ModHost, root: string): Promise<void> {
  const state = await readGuards($, root);
  await writeGuards($, root, { ...state, consecutive: Math.max(0, state.consecutive - 1) });
}

export async function markSeeded($: ModHost, root: string): Promise<void> {
  const state = await readGuards($, root);
  await writeGuards($, root, { ...state, toolCallsSinceSeed: 0 });
}

export async function foldToolCalls($: ModHost, root: string, calls: number): Promise<void> {
  const state = await readGuards($, root);
  if (state.toolCallsSinceSeed === null || calls === 0) return;
  await writeGuards($, root, { ...state, toolCallsSinceSeed: state.toolCallsSinceSeed + calls });
}

export async function resetConsecutive($: ModHost, root: string): Promise<void> {
  const state = await readGuards($, root);
  if (state.consecutive === 0 && state.toolCallsSinceSeed === null) return;
  await writeGuards($, root, IDLE);
}
