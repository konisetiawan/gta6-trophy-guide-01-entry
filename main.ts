import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const requested = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const out = requested.startsWith('/') ? requested : join(root, requested);
mkdirSync(out, { recursive: true });
for (const name of ['app', 'screenshots']) {
  const from = join(root, name);
  if (existsSync(from)) cpSync(from, join(out, name), { recursive: true, force: true });
}
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), JSON.stringify(dossier, null, 2));
