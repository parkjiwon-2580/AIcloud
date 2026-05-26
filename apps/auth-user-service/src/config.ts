export function readEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function isDevEnv(): boolean {
  return ['dev', 'local', 'test'].includes(readEnv('APP_ENV', 'dev').toLowerCase());
}
