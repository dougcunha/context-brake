export const SESSION_RESET_SIGNAL = '[REQUEST_SESSION_RESET]';

export function endsWithResetSignal(text: string): boolean {
  return text.trimEnd().split(/\r?\n/).at(-1)?.endsWith(SESSION_RESET_SIGNAL) ?? false;
}

export function renderResetNotice(command: string, resumes = false): string {
  const suffix = resumes ? '; it resumes by itself.' : '.';
  return `ContextBrake: the agent requested a session reset. Run ${command} to start a new session${suffix}`;
}
