import { runProcessHook } from './process-hook.js';

// Antigravity requires `decision` in every PreToolUse response, so staying neutral requires an explicit allow.
const ALLOW_TOOL_CALL = { decision: 'allow' };
const NO_INJECTED_STEPS = { injectSteps: [] };

void runProcessHook({
  PreToolUse: ALLOW_TOOL_CALL,
  PreInvocation: NO_INJECTED_STEPS,
});
