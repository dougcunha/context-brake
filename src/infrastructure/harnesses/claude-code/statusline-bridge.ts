import type { Clock } from '../../../core/contracts/session-ledger.js';
import { failureDetail, failureErrorCode, recordRuntimeFailure, runWithinDeadline } from '../../../core/services/failure-policy.js';
import { NodeRuntimeErrorLog } from '../../runtime/node-runtime-logs.js';
import { NodeSessionLedger } from '../../runtime/node-session-ledger.js';
import { assetProjectRoot } from '../common/runtime-support.js';
import { mapStatuslinePayload, type StatuslineRecord } from './statusline-payload.js';

export const STATUSLINE_PIPE_FLAG = '--pipe';
export const STATUSLINE_PARSE_LIMIT_BYTES = 1024 * 1024;
const RECORD_DEADLINE_MILLISECONDS = 1500;
const STATUSLINE_EVENT = 'StatusLine';
const systemClock: Clock = { now: () => new Date() };

export type StatuslineBridgeContext = {
  readonly argv: readonly string[];
  readonly stdin: NodeJS.ReadableStream;
  readonly stdout: NodeJS.WritableStream;
  readonly resolveProjectRoot: () => Promise<string>;
};
type ChunkWriter = (chunk: Buffer) => void;

function processContext(): StatuslineBridgeContext {
  return { argv: process.argv, stdin: process.stdin, stdout: process.stdout, resolveProjectRoot: assetProjectRoot };
}

export async function runClaudeStatuslineBridge(context: StatuslineBridgeContext = processContext()): Promise<number> {
  const writer = context.argv.includes(STATUSLINE_PIPE_FLAG) ? tolerantWriter(context.stdout) : null;
  const buffered = await passThrough(context.stdin, writer);
  const record = buffered === null ? null : mapStatuslinePayload(parseJson(buffered));
  if (record !== null) await recordStatusline(record, await context.resolveProjectRoot());
  return 0;
}

function tolerantWriter(stream: NodeJS.WritableStream): ChunkWriter {
  let isBroken = false;
  stream.on('error', () => { isBroken = true; });
  return (chunk) => { if (!isBroken) stream.write(chunk); };
}

async function passThrough(stdin: NodeJS.ReadableStream, writer: ChunkWriter | null): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stdin) {
      const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      writer?.(data);
      size += data.length;
      if (size <= STATUSLINE_PARSE_LIMIT_BYTES) chunks.push(data);
    }
  } catch {
    return null;
  }
  return size > STATUSLINE_PARSE_LIMIT_BYTES ? null : Buffer.concat(chunks);
}

function parseJson(buffered: Buffer): unknown {
  try {
    return JSON.parse(buffered.toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

async function recordStatusline(record: StatuslineRecord, projectRoot: string): Promise<void> {
  try {
    await runWithinDeadline(new NodeSessionLedger(projectRoot, systemClock).appendStatuslineLine(record.session, record.line), RECORD_DEADLINE_MILLISECONDS);
  } catch (error) {
    await recordRuntimeFailure(new NodeRuntimeErrorLog(projectRoot, systemClock), { harness: record.session.harness, event: STATUSLINE_EVENT, code: failureErrorCode(error), detail: failureDetail(error) });
  }
}
