import { z } from 'zod/mini';

const typedLineSchema = z.looseObject({ type: z.string() });

export type TypedStreamLine = { readonly type: string; readonly value: unknown };

export class StreamLineError extends Error {
  constructor(readonly reason: string) {
    super(`Harness stream line was not understood: ${reason}.`);
    this.name = 'StreamLineError';
  }
}

export function parseTypedLine(line: string): TypedStreamLine {
  const value = parseJson(line);
  const typed = typedLineSchema.safeParse(value);
  if (!typed.success) throw new StreamLineError('expected a JSON object with a string "type"');
  return { type: typed.data.type, value };
}

export function parseFields<T>(schema: z.ZodMiniType<T>, line: TypedStreamLine): T {
  const parsed = schema.safeParse(line.value);
  if (!parsed.success) throw new StreamLineError(`"${line.type}" is missing a field the launcher reads`);
  return parsed.data;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch (cause) {
    throw new StreamLineError(cause instanceof Error ? cause.message : 'invalid JSON');
  }
}
