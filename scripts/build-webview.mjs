import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = resolve(root, 'android-card-agent/.work');
const output = resolve(work, 'bundled-assets/web');
if (!output.startsWith(work + '/') && !output.startsWith(work + '\\')) throw new Error('Unexpected asset output path');
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.webview.config.js'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const files = {};
async function copyTree(source, isPublic = false) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const src = resolve(source, entry.name);
    if (entry.isDirectory()) { await copyTree(src, isPublic); continue; }
    const base = isPublic ? resolve(root, 'public') : resolve(work, 'web-dist');
    const name = relative(base, src).replaceAll('\\', '/');
    if (!mime[extname(name).toLowerCase()]) continue;
    const destination = resolve(output, name);
    if (!destination.startsWith(output + '/') && !destination.startsWith(output + '\\')) throw new Error('Asset escaped output directory');
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(src, destination);
    files['/' + name] = { mime: mime[extname(name).toLowerCase()], sha256: createHash('sha256').update(await readFile(src)).digest('hex') };
  }
}
await copyTree(resolve(work, 'web-dist'));
await copyTree(resolve(root, 'public'), true);
if (!files['/index.html']) throw new Error('Bundled index.html is missing');
await writeFile(resolve(output, 'asset-manifest.json'), JSON.stringify({ version: '1.6.25', files }, null, 2));
console.log(`Bundled ${Object.keys(files).length} web assets; API requests still use the clinic server.`);
