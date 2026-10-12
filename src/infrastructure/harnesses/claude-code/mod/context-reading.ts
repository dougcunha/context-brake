import { contextReadingRelativePath, contextReadingSchema, isReadingSessionId, RUNTIME_IGNORE_CONTENT, RUNTIME_IGNORE_RELATIVE_PATH, type ContextReading } from '../../../../core/contracts/context-reading.js';
import type { ModHost, ModUsageContext } from './host.js';
import { lastRecordedCode } from './mod-log.js';
import { reportSafely } from './restart-flow.js';

const READING_HARNESS = 'claude-code';
const READING_VERSION = 1;
const PERCENTAGE_MAXIMUM = 100;
const UNREADABLE_CODE = 'ERROR_INTERNAL';

function positiveIntegerOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function countOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function percentageOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && value >= 0 && value <= PERCENTAGE_MAXIMUM ? value : null;
}

function readingOf(context: ModUsageContext, at: string): ContextReading {
  return { v: READING_VERSION, at, windowTokens: positiveIntegerOrNull(context.window), inputTokens: countOrNull(context.tokens), usedPercentage: percentageOrNull(context.percent) };
}

async function isAlreadyPublished($: ModHost, path: string, reading: ContextReading): Promise<boolean> {
  if (!(await $.fs.exists(path))) return false;
  try {
    const previous = contextReadingSchema.safeParse(JSON.parse(String(await $.fs.read(path))));
    return previous.success && previous.data.windowTokens === reading.windowTokens && previous.data.inputTokens === reading.inputTokens;
  } catch {
    return false;
  }
}

async function ensureRuntimeIgnore($: ModHost, root: string): Promise<void> {
  const path = `${root}/${RUNTIME_IGNORE_RELATIVE_PATH}`;
  if (!(await $.fs.exists(path))) await $.fs.write(path, RUNTIME_IGNORE_CONTENT);
}

async function reportOnce($: ModHost): Promise<void> {
  try {
    if ((await lastRecordedCode($)) === UNREADABLE_CODE) return;
  } catch {
    return;
  }
  await reportSafely($, UNREADABLE_CODE);
}

async function publishChanged($: ModHost): Promise<void> {
  const sessionId = await $.session.id();
  if (!isReadingSessionId(sessionId)) return;
  const reading = readingOf((await $.session.usage()).context, new Date(await $.clock.now()).toISOString());
  if (reading.windowTokens === null) return reportOnce($);
  const root = await $.session.root();
  const path = `${root}/${contextReadingRelativePath(READING_HARNESS, sessionId)}`;
  if (await isAlreadyPublished($, path, reading)) return;
  await ensureRuntimeIgnore($, root);
  await $.fs.write(path, `${JSON.stringify(reading)}\n`);
}

export async function publishContextReading($: ModHost): Promise<void> {
  try {
    await publishChanged($);
  } catch {
    await reportOnce($);
  }
}
