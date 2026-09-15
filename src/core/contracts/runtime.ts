import type { CapabilityDefinition, HarnessId } from './harness.js';

export type SessionKey = {
  readonly harness: HarnessId;
  readonly sessionId: string;
  readonly agentId: string | null;
};

export type ToolCategory = 'file_read' | 'file_write' | 'shell' | 'other';

export type ToolCall = {
  readonly name: string;
  readonly category: ToolCategory;
  readonly paths: readonly string[];
  readonly command: string | null;
};

export type RuntimeEvent =
  | { readonly kind: 'pre_tool'; readonly session: SessionKey; readonly tool: ToolCall }
  | { readonly kind: 'post_tool'; readonly session: SessionKey; readonly tool: ToolCall; readonly toolUseId: string | null }
  | { readonly kind: 'pre_invocation'; readonly session: SessionKey }
  | { readonly kind: 'session_reset'; readonly session: SessionKey; readonly reason: 'new' | 'clear' | 'compact' }
  | { readonly kind: 'response_end'; readonly session: SessionKey; readonly text: string };

export type RuntimeDecision =
  | { readonly kind: 'neutral' }
  | { readonly kind: 'deny'; readonly tool: string; readonly reason: 'critical_ceiling' | 'integration_failure'; readonly message: string }
  | { readonly kind: 'context'; readonly block: string }
  | { readonly kind: 'notify_user'; readonly text: string };

export type BrakeMode = 'enforced' | 'cooperative';

export type EstimationConstants = {
  readonly baselineTokens: number;
  readonly tokensPerTurn: number;
};

export type RuntimeDescriptor = {
  readonly harness: HarnessId;
  readonly capabilities: readonly CapabilityDefinition[];
  readonly estimation: EstimationConstants;
  readonly newSessionCommand: string | null;
};
