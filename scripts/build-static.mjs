import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'dist');
if (existsSync(output)) rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'service-worker.js']) copyFileSync(join(root, file), join(output, file));
cpSync(join(root, 'images'), join(output, 'images'), { recursive: true });
mkdirSync(join(output, 'public'), { recursive: true });
copyFileSync(join(root, 'public', 'favicon.svg'), join(output, 'public', 'favicon.svg'));
console.log('Static site ready in dist/');
