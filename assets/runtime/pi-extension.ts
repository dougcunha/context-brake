import { createPiExtension, type PiApi } from '../../src/infrastructure/harnesses/pi/runtime.js';

export default function contextBrakePiExtension(api: PiApi): void {
  createPiExtension(api);
}
