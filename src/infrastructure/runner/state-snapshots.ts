import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { STATE_FILES, type StateFile } from '../../core/contracts/run-ports.js';
import { writeFileAtomically } from '../storage/atomic-writer.js';
import { resolveWriteTarget } from '../storage/plan-store.js';
import { invalidCopyFileName, snapshotFileName } from './run-paths.js';
import { readOptionalFile } from './runner-files.js';

export type StateFilePaths = Readonly<Record<StateFile, string>>;

export class StateSnapshots {
  constructor(private readonly paths: StateFilePaths, private readonly now: () => Date = () => new Date()) {}

  async take(runDirectory: string): Promise<void> {
    for (const file of STATE_FILES) {
      const snapshotPath = join(runDirectory, snapshotFileName(file));
      const content = await readOptionalFile(this.paths[file]);
      if (content === null) await rm(snapshotPath, { force: true });
      else await writeFileAtomically(snapshotPath, content);
    }
  }

  async restore(runDirectory: string, files: readonly StateFile[]): Promise<void> {
    for (const file of files) {
      const snapshot = await readOptionalFile(join(runDirectory, snapshotFileName(file)));
      if (snapshot === null) continue;
      const current = await readOptionalFile(this.paths[file]);
      if (current !== null) await writeFileAtomically(join(runDirectory, invalidCopyFileName(file, this.now())), current);
      await writeFileAtomically(await resolveWriteTarget(this.paths[file]), snapshot);
    }
  }
}
