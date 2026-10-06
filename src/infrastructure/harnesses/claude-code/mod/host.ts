export type ModHost = {
  readonly fs: {
    read(path: string): Promise<unknown>;
    write(path: string, text: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    stat(path: string): Promise<{ readonly mtimeMs: number }>;
  };
  readonly store: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  readonly env: { get(name: string): Promise<string | undefined> };
  readonly session: {
    id(): Promise<string>;
    root(): Promise<string>;
    surfaces(): Promise<readonly string[]>;
    version(): Promise<{ readonly version: string }>;
  };
  readonly command: { run(input: { readonly command: string }): Promise<unknown> };
  readonly prompt: { submit(input: { readonly text: string }): Promise<unknown> };
  readonly ui: { log(text: string): void };
  readonly clock: { now(): Promise<number> };
};

export type HookNext<E> = (event: E) => Promise<unknown>;
export type HookHandler<E> = (host: ModHost, event: E, next: HookNext<E>) => Promise<unknown>;
export type HookRegistrar = <E>(event: string, handler: HookHandler<E>) => unknown;

export type TurnCompleteEvent = {
  readonly answer?: string;
  readonly reason?: string;
  readonly isAborted?: boolean;
  readonly agentId?: string;
};
export type PromptSubmitEvent = { readonly origin?: { readonly kind?: string } };
