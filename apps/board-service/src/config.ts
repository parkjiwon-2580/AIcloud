export function readEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function readNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export function isDevEnv(): boolean {
  return ['dev', 'local', 'test'].includes(readEnv('APP_ENV', 'dev').toLowerCase());
}
