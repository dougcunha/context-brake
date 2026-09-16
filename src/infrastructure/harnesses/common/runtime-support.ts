import { realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod/mini';
import { PayloadInvalidError } from '../../../core/services/failure-policy.js';

export function parsePayload<T>(schema: z.ZodMiniType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) throw new PayloadInvalidError({ cause: result.error });
  return result.data;
}

export function requireIdentifier(value: string | undefined): string {
  if (value === undefined || value === '') throw new PayloadInvalidError();
  return value;
}

export function projectRootFromEnvironment(names: readonly string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value !== '') return value;
  }
  return null;
}

export async function assetProjectRoot(): Promise<string> {
  const assetDirectory = dirname(fileURLToPath(import.meta.url));
  const root = resolve(assetDirectory, '../..');
  return realpath(root).catch(() => root);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function textValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function characterLength(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (value === undefined || value === null) return 0;
  return JSON.stringify(value)?.length ?? 0;
}
