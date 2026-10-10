// Optional: npm install --no-save sharp, or point JUANELOS_SHARP_MODULE at an existing install.
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const { default: sharp } = await import(process.env.JUANELOS_SHARP_MODULE || 'sharp');
mkdirSync('images/optimized', { recursive:true });
let before = 0, after = 0;
for (const name of readdirSync('images').filter(name => /^juanelos-.*\.png$/.test(name) && !name.includes('app-icon'))) {
  const source = join('images',name), output = join('images/optimized',name.replace(/\.png$/,'.webp'));
  const metadata = await sharp(source).metadata();
  await sharp(source).resize({width:1100,height:1100,fit:'inside',withoutEnlargement:true}).webp({quality:92,alphaQuality:100,effort:6,lossless:name.includes('logo')}).toFile(output);
  before += statSync(source).size; after += statSync(output).size;
  console.log(`${name}: ${metadata.width}×${metadata.height}, ${statSync(source).size} → ${statSync(output).size} bytes`);
}
console.log(JSON.stringify({before,after,reductionPercent:Math.round((1-after/before)*100)}));
