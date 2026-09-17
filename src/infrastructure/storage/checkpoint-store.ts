import { readFile, stat } from 'node:fs/promises';
import type { CheckpointStore, StateCheckpoint } from '../../core/contracts/state-checkpoint.js';
import { invalidCheckpointSyntaxError, parseStateCheckpoint } from '../../core/validation/checkpoint-validator.js';
import { writeFileAtomically } from './atomic-writer.js';
import { resolveWriteTarget, serializeStateDocument } from './plan-store.js';

export class NodeCheckpointStore implements CheckpointStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<StateCheckpoint> {
    const source = await readFile(this.filePath, 'utf8');
    let value: unknown;
    try {
      value = JSON.parse(source) as unknown;
    } catch (error) {
      throw invalidCheckpointSyntaxError(this.filePath, source, error);
    }
    return parseStateCheckpoint(value, this.filePath);
  }

  async write(checkpoint: StateCheckpoint): Promise<void> {
    const target = await resolveWriteTarget(this.filePath);
    await writeFileAtomically(target, serializeStateDocument(checkpoint));
  }

  async exists(): Promise<boolean> {
    return stat(this.filePath).then((entry) => entry.isFile()).catch(() => false);
  }
}
