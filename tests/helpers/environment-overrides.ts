export type EnvironmentOverrides = Readonly<Record<string, string | undefined>>;

export function applyEnvironment(env: EnvironmentOverrides): () => void {
  const previous = Object.keys(env).map((key) => [key, process.env[key]] as const);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
