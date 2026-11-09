// Secrets in the login Keychain (service "CORTEX"), via the `security` tool.
// Values are stored base64-encoded: `security -w` prints non-ASCII values as hex.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SERVICE = 'CORTEX';

export async function setSecret(key: string, value: string) {
  await run('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', key, '-w', `b64:${Buffer.from(value, 'utf8').toString('base64')}`]);
}

export async function getSecret(key: string): Promise<string | null> {
  try {
    const { stdout } = await run('security', ['find-generic-password', '-s', SERVICE, '-a', key, '-w']);
    const raw = stdout.trim();
    if (!raw) return null;
    return raw.startsWith('b64:') ? Buffer.from(raw.slice(4), 'base64').toString('utf8') : raw;
  } catch {
    return null;
  }
}

export async function deleteSecret(key: string) {
  await run('security', ['delete-generic-password', '-s', SERVICE, '-a', key]).catch(() => {});
}
