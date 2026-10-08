import { createPiRestartExtension, type PiRestartApi } from '../../src/infrastructure/harnesses/pi/restart.js';

export default function contextBrakePiRestart(api: PiRestartApi): void {
  createPiRestartExtension(api);
}
