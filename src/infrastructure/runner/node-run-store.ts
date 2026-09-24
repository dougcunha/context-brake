import { appendFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { RunStore, StateFile } from '../../core/contracts/run-ports.js';
import { runRecordSchema, runSessionLineSchema, type RunRecord, type RunSessionLine } from '../../core/contracts/run-records.js';
import { isMissingFileError } from '../runtime/runtime-paths.js';
import { writeFileAtomically } from '../storage/atomic-writer.js';
import { StateSnapshots, type StateFilePaths } from './state-snapshots.js';
import { ensureRunnerDirectory, isSafeRunId, runDirectory, RUN_RECORD_FILE, runsDirectory, SESSIONS_LOG_FILE } from './run-paths.js';
import { parseJsonOrNull, readOptionalFile } from './runner-files.js';

export const RUN_RETENTION = 20;

export type RunStoreOptions = { readonly projectRoot: string; readonly stateFiles: StateFilePaths; readonly retention?: number };
type RunEntry = { readonly runId: string; readonly order: number };

export async function readRunRecord(projectRoot: string, runId: string): Promise<RunRecord | null> {
  if (!isSafeRunId(runId)) return null;
  const source = await readOptionalFile(join(runDirectory(projectRoot, runId), RUN_RECORD_FILE));
  if (source === null) return null;
  const parsed = runRecordSchema.safeParse(parseJsonOrNull(source));
  return parsed.success ? parsed.data : null;
}

export class NodeRunStore implements RunStore {
  private readonly snapshots: StateSnapshots;
  private readonly retention: number;

  constructor(private readonly options: RunStoreOptions) {
    this.snapshots = new StateSnapshots(options.stateFiles);
    this.retention = options.retention ?? RUN_RETENTION;
  }

  async writeRecord(record: RunRecord): Promise<void> {
    const valid = runRecordSchema.parse(record);
    await ensureRunnerDirectory(this.options.projectRoot);
    await writeFileAtomically(join(this.directory(valid.runId), RUN_RECORD_FILE), `${JSON.stringify(valid, null, 2)}\n`);
  }

  readRecord(runId: string): Promise<RunRecord | null> {
    return readRunRecord(this.options.projectRoot, runId);
  }

  async appendSession(runId: string, line: RunSessionLine): Promise<void> {
    const valid = runSessionLineSchema.parse(line);
    const directory = this.directory(runId);
    await ensureRunnerDirectory(this.options.projectRoot);
    await mkdir(directory, { recursive: true });
    await appendFile(join(directory, SESSIONS_LOG_FILE), `${JSON.stringify(valid)}\n`, 'utf8');
  }

  async latestRunId(): Promise<string | null> {
    const runs = await this.listRuns();
    return runs[0]?.runId ?? null;
  }

  async snapshotState(runId: string): Promise<void> {
    await ensureRunnerDirectory(this.options.projectRoot);
    await this.snapshots.take(this.directory(runId));
  }

  async restoreState(runId: string, files: readonly StateFile[]): Promise<void> {
    await this.snapshots.restore(this.directory(runId), files);
  }

  async pruneRuns(): Promise<number> {
    const stale = (await this.listRuns()).slice(Math.max(this.retention - 1, 0));
    for (const run of stale) {
      await rm(this.directory(run.runId), { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    }
    return stale.length;
  }

  private directory(runId: string): string {
    return runDirectory(this.options.projectRoot, runId);
  }

  private async listRuns(): Promise<readonly RunEntry[]> {
    const entries = await readdir(runsDirectory(this.options.projectRoot), { withFileTypes: true }).catch(emptyWhenMissing);
    const runIds = entries.filter((entry) => entry.isDirectory() && isSafeRunId(entry.name)).map((entry) => entry.name);
    const runs = await Promise.all(runIds.map(async (runId) => ({ runId, order: await this.orderOf(runId) })));
    return runs.sort((left, right) => right.order - left.order || right.runId.localeCompare(left.runId));
  }

  private async orderOf(runId: string): Promise<number> {
    const record = await this.readRecord(runId);
    const started = record === null ? Number.NaN : Date.parse(record.startedAt);
    if (Number.isFinite(started)) return started;
    return (await stat(this.directory(runId))).mtimeMs;
  }
}

function emptyWhenMissing(error: unknown): [] {
  if (isMissingFileError(error)) return [];
  throw error;
}
