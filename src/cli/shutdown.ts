import process from 'node:process';
import type { InterruptSignal } from '../core/contracts/run-control.js';
import { EXIT_CODES } from './exit-codes.js';

export const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;
export type ShutdownSignal = (typeof SHUTDOWN_SIGNALS)[number];

export interface ShutdownController {
  shutdown(signal: ShutdownSignal): void;
}

export type SignalExit = (code: number) => void;

export class SignalRouter {
  private controller: ShutdownController | null = null;
  private delivered = false;

  constructor(private readonly exit: SignalExit) {}

  register(controller: ShutdownController): () => void {
    this.controller = controller;
    return () => {
      if (this.controller === controller) this.controller = null;
    };
  }

  handle(signal: ShutdownSignal): void {
    if (this.delivered) return;
    const controller = this.controller;
    if (controller === null) {
      this.exit(EXIT_CODES.interrupted);
      return;
    }
    this.delivered = true;
    controller.shutdown(signal);
  }
}

export class InterruptFlag implements ShutdownController, InterruptSignal {
  private requested: ShutdownSignal | null = null;

  constructor(private readonly onRequest: (signal: ShutdownSignal) => void = () => undefined) {}

  shutdown(signal: ShutdownSignal): void {
    if (this.requested !== null) return;
    this.requested = signal;
    this.onRequest(signal);
  }

  isRequested(): boolean {
    return this.requested !== null;
  }
}

export const signalRouter = new SignalRouter((code) => process.exit(code));
