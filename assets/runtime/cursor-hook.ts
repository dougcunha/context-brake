import { runProcessHook } from './process-hook.js';

const EMPTY_RESPONSE = {};
// Cursor blocks a preToolUse call whose response lacks `permission`, so staying neutral requires an explicit allow.
const ALLOW_TOOL_CALL = { permission: 'allow' };

void runProcessHook({
  preToolUse: ALLOW_TOOL_CALL,
  postToolUse: EMPTY_RESPONSE,
  sessionStart: EMPTY_RESPONSE,
});
