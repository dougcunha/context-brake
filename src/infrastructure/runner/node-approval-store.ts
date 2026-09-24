import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { ApprovalStore } from '../../core/contracts/run-ports.js';
import { APPROVALS_FILE_VERSION, approvalsFileSchema, type ApprovalsFile } from '../../core/contracts/run-records.js';
import { writeFileAtomically } from '../storage/atomic-writer.js';
import { approvalsPath, ensureRunnerDirectory, invalidCopyFileName, runnerDirectory } from './run-paths.js';
import { parseJsonOrNull, readOptionalFile } from './runner-files.js';

const APPROVALS_NAME = 'approvals';

export function emptyApprovals(): ApprovalsFile {
  return { v: APPROVALS_FILE_VERSION, approved: [] };
}

export class NodeApprovalStore implements ApprovalStore {
  constructor(private readonly projectRoot: string, private readonly now: () => Date = () => new Date()) {}

  async read(): Promise<ApprovalsFile> {
    const filePath = approvalsPath(this.projectRoot);
    const source = await readOptionalFile(filePath);
    if (source === null) return emptyApprovals();
    const parsed = approvalsFileSchema.safeParse(parseJsonOrNull(source));
    if (parsed.success) return parsed.data;
    await rename(filePath, join(runnerDirectory(this.projectRoot), invalidCopyFileName(APPROVALS_NAME, this.now())));
    return emptyApprovals();
  }

  async write(file: ApprovalsFile): Promise<void> {
    const valid = approvalsFileSchema.parse(file);
    await ensureRunnerDirectory(this.projectRoot);
    await writeFileAtomically(approvalsPath(this.projectRoot), `${JSON.stringify(valid, null, 2)}\n`);
  }
}
