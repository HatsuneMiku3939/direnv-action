import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { findPackageJSON } from 'node:module';
import { pathToFileURL } from 'node:url';

// Resolve the glob instance used by cache instead of relying on npm hoisting.
const cacheURL = import.meta.resolve('@actions/cache');
const { resolvePaths } = await import(new URL('./internal/cacheUtils.js', cacheURL).href);
const globPackagePath = findPackageJSON('@actions/glob', cacheURL);
const globPackage = JSON.parse(await readFile(globPackagePath, 'utf8'));
const glob = await import(pathToFileURL(join(dirname(globPackagePath), globPackage.main)).href);
const fixtures = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })));
});

test.each(['workspace', 'workspace with spaces', '작업 공간'])('cache traversal in %s', async (name) => {
  const root = await mkdtemp(join(tmpdir(), 'direnv-glob-'));
  fixtures.push(root);
  const workspace = join(root, name);
  const cache = join(workspace, '.direnv-action');
  await mkdir(join(cache, 'nested'), { recursive: true });
  await mkdir(join(workspace, '.direnv-action-other'), { recursive: true });
  await writeFile(join(cache, 'direnv'), 'fixture binary');
  await writeFile(join(cache, 'nested', 'metadata'), 'fixture metadata');
  await writeFile(join(workspace, '.direnv-action-other', 'unrelated'), 'exclude');

  // Cache archives the matched directory itself, not implicit descendants.
  const archivePath = relative(process.env.GITHUB_WORKSPACE ?? process.cwd(), cache).split(sep).join('/');
  expect(await resolvePaths([cache])).toEqual([archivePath]);

  const globber = await glob.create(cache);
  expect((await globber.glob()).map((file) => relative(workspace, file)).sort()).toEqual([
    '.direnv-action',
    join('.direnv-action', 'direnv'),
    join('.direnv-action', 'nested'),
    join('.direnv-action', 'nested', 'metadata'),
  ].sort());

  const missing = await glob.create(join(workspace, 'missing'));
  expect(await missing.glob()).toEqual([]);
});

test('cache glob keeps nested traversal and exclusion patterns', async () => {
  const root = await mkdtemp(join(tmpdir(), 'direnv-glob-'));
  fixtures.push(root);
  await mkdir(join(root, 'nested', 'deep'), { recursive: true });
  for (const file of ['keep.txt', 'skip.txt', 'nested/keep.txt', 'nested/deep/keep.txt']) {
    await writeFile(join(root, file), 'fixture');
  }
  const globber = await glob.create(`${root}/**/*.txt\n!${root}/**/skip.txt`);
  expect((await globber.glob()).map((file) => relative(root, file)).sort()).toEqual([
    'keep.txt', join('nested', 'deep', 'keep.txt'), join('nested', 'keep.txt'),
  ].sort());
});
