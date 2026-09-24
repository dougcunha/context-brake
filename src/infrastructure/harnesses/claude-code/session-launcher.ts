import type { SessionCommand, SessionLauncher, SessionRequest, SessionStreamEvent } from '../../../core/contracts/run-ports.js';
import { CLAUDE_EXECUTABLES } from './detector.js';
import { parseClaudeStreamLine } from './session-stream.js';

export const CLAUDE_SESSION_ARGS = ['-p', '--output-format', 'stream-json', '--verbose'] as const;

export class ClaudeSessionLauncher implements SessionLauncher {
  readonly harness = 'claude-code' as const;
  readonly executableNames = CLAUDE_EXECUTABLES;

  buildCommand(request: SessionRequest): SessionCommand {
    return { executable: CLAUDE_EXECUTABLES[0], args: [...CLAUDE_SESSION_ARGS, ...request.harnessArgs], stdin: request.prompt };
  }

  parseLine(line: string): readonly SessionStreamEvent[] {
    return parseClaudeStreamLine(line);
  }
}
