import { createOmpExtension, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';

export default function contextBrakeOmpExtension(api: OmpApi): void {
  createOmpExtension(api);
}
