import { spawn } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { resolveSpawnCommand, type CommandPlatform } from '../process/executable-command.js';

export const SIGNALED_EXIT_CODE = 1;

export type PassthroughStreams = { readonly stdout: Writable; readonly stderr: Writable };
export type PassthroughRequest = { readonly argv: readonly string[]; readonly cwd: string; readonly streams: PassthroughStreams; readonly host?: CommandPlatform };
export type PassthroughResult = { readonly exitCode: number; readonly characters: number };

export class WrappedCommandStartError extends Error {
  constructor(readonly command: string, options?: ErrorOptions) {
    super(`Could not start ${JSON.stringify(command)}. Check the command name and that it is on PATH.`, options);
    this.name = 'WrappedCommandStartError';
  }
}

export async function runPassthrough(request: PassthroughRequest): Promise<PassthroughResult> {
  const command = await resolveSpawnCommand(request.argv, request.host);
  const child = spawn(command.executable, [...command.args], { cwd: request.cwd, stdio: ['inherit', 'pipe', 'pipe'], windowsVerbatimArguments: command.verbatim, windowsHide: true });
  const counter = { characters: 0 };
  forward(child.stdout, request.streams.stdout, counter);
  forward(child.stderr, request.streams.stderr, counter);
  return new Promise((resolve, reject) => {
    child.on('error', (error) => reject(new WrappedCommandStartError(request.argv[0] ?? '', { cause: error })));
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? SIGNALED_EXIT_CODE, characters: counter.characters }));
  });
}

function forward(source: Readable | null, target: Writable, counter: { characters: number }): void {
  if (source === null) return;
  const decoder = new StringDecoder('utf8');
  source.on('data', (chunk: Buffer) => {
    counter.characters += decoder.write(chunk).length;
    target.write(chunk);
  });
  source.on('end', () => { counter.characters += decoder.end().length; });
}
