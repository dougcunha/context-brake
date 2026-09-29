import type { Clock, LedgerLine } from '../../../core/contracts/session-ledger.js';
import { failureDetail, failureErrorCode, recordRuntimeFailure, runWithinDeadline } from '../../../core/services/failure-policy.js';
import { NodeRuntimeErrorLog } from '../../runtime/node-runtime-logs.js';
import { NodeSessionLedger } from '../../runtime/node-session-ledger.js';
import { assetProjectRoot } from '../common/runtime-support.js';
import { renderFallbackLine } from './statusline-output.js';
import { mapStatuslinePayload, type StatuslineRecord } from './statusline-payload.js';
import { runPreviousStatusline } from './statusline-previous.js';
import { processShellHost, resolveStatuslineShell, type ShellHost } from './statusline-shell.js';
import { readStatuslineState } from './statusline-state.js';

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
  readonly shellHost?: ShellHost | undefined;
  readonly previousTimeoutMilliseconds?: number | undefined;
};
type ChunkWriter = (chunk: Buffer) => void;

function processContext(): StatuslineBridgeContext {
  return { argv: process.argv, stdin: process.stdin, stdout: process.stdout, resolveProjectRoot: assetProjectRoot };
}

export async function runClaudeStatuslineBridge(context: StatuslineBridgeContext = processContext()): Promise<number> {
  const isPipe = context.argv.includes(STATUSLINE_PIPE_FLAG);
  const input = await readInput(context.stdin, isPipe ? tolerantWriter(context.stdout) : null);
  const record = input === null || input.length > STATUSLINE_PARSE_LIMIT_BYTES ? null : mapStatuslinePayload(parseJson(input));
  const projectRoot = await context.resolveProjectRoot();
  const previousCommand = isPipe ? null : (await readStatuslineState(projectRoot))?.previousCommand ?? null;
  if (previousCommand === null || input === null) {
    if (record !== null) await recordStatusline(record, projectRoot);
    return 0;
  }
  const shell = await resolveStatuslineShell(previousCommand, context.shellHost ?? processShellHost);
  const [result] = await Promise.all([
    runPreviousStatusline({ shell, stdin: input, timeoutMilliseconds: context.previousTimeoutMilliseconds }),
    record === null ? undefined : recordStatusline({ ...record, line: { ...record.line, shell: shell.label } }, projectRoot),
  ]);
  const output = result.kind === 'output' ? result.stdout : Buffer.from(renderFallbackLine({ reason: result.reason, ledger: await readLedger(record, projectRoot), payload: record?.line ?? null }));
  tolerantWriter(context.stdout)(output);
  return 0;
}

function tolerantWriter(stream: NodeJS.WritableStream): ChunkWriter {
  let isBroken = false;
  stream.on('error', () => { isBroken = true; });
  return (chunk) => { if (!isBroken) stream.write(chunk); };
}

async function readInput(stdin: NodeJS.ReadableStream, writer: ChunkWriter | null): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of stdin) {
      const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      writer?.(data);
      chunks.push(data);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks);
}

function parseJson(buffered: Buffer): unknown {
  try {
    return JSON.parse(buffered.toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

async function readLedger(record: StatuslineRecord | null, projectRoot: string): Promise<readonly LedgerLine[]> {
  if (record === null) return [];
  return new NodeSessionLedger(projectRoot, systemClock).readLines(record.session).catch(() => []);
}

async function recordStatusline(record: StatuslineRecord, projectRoot: string): Promise<void> {
  try {
    await runWithinDeadline(new NodeSessionLedger(projectRoot, systemClock).appendStatuslineLine(record.session, record.line), RECORD_DEADLINE_MILLISECONDS);
  } catch (error) {
    await recordRuntimeFailure(new NodeRuntimeErrorLog(projectRoot, systemClock), { harness: record.session.harness, event: STATUSLINE_EVENT, code: failureErrorCode(error), detail: failureDetail(error) });
  }
}
