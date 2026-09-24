import type { SessionCommand, SessionLauncher, SessionRequest, SessionStreamEvent } from '../../../core/contracts/run-ports.js';
import { CODEX_EXECUTABLES } from './detector.js';
import { parseCodexStreamLine } from './session-stream.js';

export const CODEX_SESSION_ARGS = ['exec', '--json'] as const;
export const CODEX_STDIN_PROMPT = '-';

export class CodexSessionLauncher implements SessionLauncher {
  readonly harness = 'codex-cli' as const;
  readonly executableNames = CODEX_EXECUTABLES;

  buildCommand(request: SessionRequest): SessionCommand {
    return { executable: CODEX_EXECUTABLES[0], args: [...CODEX_SESSION_ARGS, ...request.harnessArgs, CODEX_STDIN_PROMPT], stdin: request.prompt };
  }

  parseLine(line: string): readonly SessionStreamEvent[] {
    return parseCodexStreamLine(line);
  }
}
