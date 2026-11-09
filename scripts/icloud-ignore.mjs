// Desktop is synced to iCloud. Generated folders (node_modules, dist) are
// excluded from sync with the file-provider ignore attribute.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

for (const dir of ['node_modules', 'dist', 'data/live', 'logs']) {
  if (!existsSync(dir)) continue;
  execFileSync('xattr', ['-w', 'com.apple.fileprovider.ignore#P', '1', dir]);
}
