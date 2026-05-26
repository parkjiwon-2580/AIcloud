export function readEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? Number(value) : fallback;
}
