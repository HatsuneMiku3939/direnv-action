import { readFile, writeFile } from 'node:fs/promises';

// ncc preserves trailing whitespace from dependency sources. Removing it does
// not move source-map locations before the end of each line.
const bundle = new URL('../dist/index.js', import.meta.url);
const contents = await readFile(bundle, 'utf8');
await writeFile(bundle, contents.replace(/[\t ]+$/gm, ''));
