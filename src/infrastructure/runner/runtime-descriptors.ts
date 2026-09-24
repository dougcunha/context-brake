import type { HarnessId } from '../../core/contracts/harness.js';
import type { RuntimeDescriptor } from '../../core/contracts/runtime.js';
import { antigravityDescriptor } from '../harnesses/antigravity-cli/runtime.js';
import { claudeDescriptor } from '../harnesses/claude-code/runtime.js';
import { codexDescriptor } from '../harnesses/codex-cli/runtime.js';
import { cursorDescriptor } from '../harnesses/cursor/runtime.js';
import { copilotDescriptor } from '../harnesses/github-copilot-cli/runtime.js';
import { ompDescriptor } from '../harnesses/oh-my-pi/runtime.js';
import { openCodeDescriptor } from '../harnesses/opencode/runtime.js';
import { piDescriptor } from '../harnesses/pi/runtime.js';

export const RUNTIME_DESCRIPTORS: Readonly<Record<HarnessId, RuntimeDescriptor>> = {
  'claude-code': claudeDescriptor,
  'codex-cli': codexDescriptor,
  'github-copilot-cli': copilotDescriptor,
  'cursor': cursorDescriptor,
  'opencode': openCodeDescriptor,
  'antigravity-cli': antigravityDescriptor,
  'pi': piDescriptor,
  'oh-my-pi': ompDescriptor,
};

export function hasPostToolTelemetry(descriptor: RuntimeDescriptor): boolean {
  return descriptor.capabilities.some((entry) => entry.id === 'post_tool_telemetry' && entry.state === 'supported');
}
