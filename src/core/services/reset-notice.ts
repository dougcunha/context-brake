export const SESSION_RESET_SIGNAL = '[REQUEST_SESSION_RESET]';

export function hasResetSignal(text: string): boolean {
  return text.trim() === SESSION_RESET_SIGNAL;
}
export function renderResetNotice(command: string): string {
  return `ContextBrake: the agent requested a session reset. Run ${command} to start a new session.`;
}
