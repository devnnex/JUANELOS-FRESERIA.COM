import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'dist');
if (existsSync(output)) rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of ['config.js', 'performance.js', 'index.html', 'styles.css', 'app.js', 'order-services.js', 'order-extras.js', 'order-extras.css', 'admin.html', 'admin.css', 'admin.js', 'admin-extras.js', 'admin-extras.css', 'enlaces.html', 'enlaces.css', 'enlaces.js', 'ubicacion.html', 'ubicacion.css', 'ubicacion.js', 'manifest.webmanifest', 'admin.webmanifest', 'service-worker.js']) copyFileSync(join(root, file), join(output, file));
cpSync(join(root, 'vendor'), join(output, 'vendor'), { recursive: true });
cpSync(join(root, 'images'), join(output, 'images'), { recursive: true });
cpSync(join(root, 'sounds'), join(output, 'sounds'), { recursive: true });
mkdirSync(join(output, 'public'), { recursive: true });
copyFileSync(join(root, 'public', 'favicon.svg'), join(output, 'public', 'favicon.svg'));
console.log('Static site ready in dist/');
