import { stat } from 'node:fs/promises';
import { delimiter, extname, isAbsolute, join } from 'node:path';
import process from 'node:process';

export const FORBIDDEN_SHIM_CHARACTERS = /[%^&|<>"\r\n]/;
const SHIM_EXTENSIONS = new Set(['.cmd', '.bat']);
const DEFAULT_PATH_EXTENSIONS = '.COM;.EXE;.BAT;.CMD';

export type SpawnCommand = { readonly executable: string; readonly args: readonly string[]; readonly verbatim: boolean };
export type CommandPlatform = { readonly platform: NodeJS.Platform; readonly environment: NodeJS.ProcessEnv };

export class ShimArgumentError extends Error {
  readonly code = 'INVALID_ARGUMENTS';
  constructor(readonly executable: string, readonly argument: string) {
    super(`Argument ${JSON.stringify(argument)} cannot be passed to the Windows command shim ${executable}: it contains one of % ^ & | < > " or a line break, which cmd.exe would interpret. Remove the character or call the underlying executable directly.`);
    this.name = 'ShimArgumentError';
  }
}

export async function resolveSpawnCommand(argv: readonly string[], host: CommandPlatform = { platform: process.platform, environment: process.env }): Promise<SpawnCommand> {
  const [name = '', ...args] = argv;
  if (host.platform !== 'win32') return { executable: name, args, verbatim: false };
  const resolved = await resolveWindowsExecutable(name, host.environment);
  if (resolved === null || !SHIM_EXTENSIONS.has(extname(resolved).toLowerCase())) return { executable: resolved ?? name, args, verbatim: false };
  const forbidden = args.find((argument) => FORBIDDEN_SHIM_CHARACTERS.test(argument));
  if (forbidden !== undefined) throw new ShimArgumentError(resolved, forbidden);
  const inner = [resolved, ...args].map((part) => `"${part}"`).join(' ');
  return { executable: host.environment['ComSpec'] ?? 'cmd.exe', args: ['/d', '/s', '/c', `"${inner}"`], verbatim: true };
}

async function resolveWindowsExecutable(name: string, environment: NodeJS.ProcessEnv): Promise<string | null> {
  const extensions = extname(name) === '' ? pathExtensions(environment) : [''];
  const directories = isAbsolute(name) || name.includes('\\') || name.includes('/') ? [''] : ['', ...pathDirectories(environment)];
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = directory === '' ? `${name}${extension}` : join(directory, `${name}${extension}`);
      if (await isFile(candidate)) return candidate;
    }
  }
  return null;
}

function pathDirectories(environment: NodeJS.ProcessEnv): string[] {
  return (environment['Path'] ?? environment['PATH'] ?? '').split(delimiter).filter((entry) => entry !== '');
}

function pathExtensions(environment: NodeJS.ProcessEnv): string[] {
  return (environment['PATHEXT'] ?? DEFAULT_PATH_EXTENSIONS).split(';').filter((entry) => entry !== '').map((entry) => entry.toLowerCase());
}

async function isFile(candidate: string): Promise<boolean> {
  return stat(candidate).then((entry) => entry.isFile(), () => false);
}
