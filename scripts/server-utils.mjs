import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const PROBE_PREFIX = '.lanternmoss-stop-';
export const PROBE_PATTERN = /^\.lanternmoss-stop-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function serverPort(raw = process.argv[2] ?? process.env.PORT ?? '8080', allowZero = false) {
  if (!/^\d+$/.test(String(raw)) || Number(raw) < (allowZero ? 0 : 1) || Number(raw) > 65535) {
    throw new Error(`Invalid port: ${raw}. Use an integer from ${allowZero ? 0 : 1} to 65535.`);
  }
  return Number(raw);
}
