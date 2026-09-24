import type { ProcessRunner } from '../../core/contracts/processes.js';
import { resolveSpawnCommand, type CommandPlatform } from '../process/executable-command.js';

export const EXECUTABLE_DISCOVERY_TIMEOUT_MILLISECONDS = 5_000;

export type HarnessExecutable = { readonly executable: string; readonly shim: boolean };
export type ExecutableLookup = { readonly processes: ProcessRunner; readonly host?: CommandPlatform };

export async function resolveHarnessExecutable(names: readonly string[], lookup: ExecutableLookup): Promise<HarnessExecutable | null> {
  const results = await lookup.processes.discover({ names, timeoutMilliseconds: EXECUTABLE_DISCOVERY_TIMEOUT_MILLISECONDS });
  const found = results.find((result) => result.path !== null);
  if (found === undefined) return null;
  const command = await resolveSpawnCommand([found.name], lookup.host);
  return { executable: found.name, shim: command.verbatim };
}

export async function assertHarnessArguments(executable: string, args: readonly string[], host?: CommandPlatform): Promise<void> {
  await resolveSpawnCommand([executable, ...args], host);
}
