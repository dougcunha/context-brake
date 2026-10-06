export type TurnSnapshot = { readonly startedAt: number | undefined; readonly toolCalls: number };

let turnStartedAt: number | undefined;
let toolCallsThisTurn = 0;

export function startTurn(now: number): void {
  turnStartedAt = now;
  toolCallsThisTurn = 0;
}

export function countToolCall(): void {
  toolCallsThisTurn += 1;
}

export function turnSnapshot(): TurnSnapshot {
  return { startedAt: turnStartedAt, toolCalls: toolCallsThisTurn };
}
