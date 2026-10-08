import { createOmpRestartExtension, type OmpRestartApi } from '../../src/infrastructure/harnesses/oh-my-pi/restart.js';

export default function contextBrakeOmpRestart(api: OmpRestartApi): void {
  createOmpRestartExtension(api);
}
