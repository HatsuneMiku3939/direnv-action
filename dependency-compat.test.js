import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { createRequire, findPackageJSON } from 'node:module';
import { pathToFileURL } from 'node:url';

// Resolve the glob instance used by cache instead of relying on npm hoisting.
const cacheURL = import.meta.resolve('@actions/cache');
const { resolvePaths } = await import(new URL('./internal/cacheUtils.js', cacheURL).href);
const globPackagePath = findPackageJSON('@actions/glob', cacheURL);
const globPackage = JSON.parse(await readFile(globPackagePath, 'utf8'));
const glob = await import(pathToFileURL(join(dirname(globPackagePath), globPackage.main)).href);
const fixtures = [];

// Exercise the CommonJS storage client reached through the cache dependency.
const cacheRequire = createRequire(cacheURL);
const { BlobServiceClient, BlockBlobClient } = cacheRequire('@azure/storage-blob');
const { createHttpHeaders } = cacheRequire('@azure/core-rest-pipeline');
const { toHttpHeadersLike } = cacheRequire('@azure/core-http-compat');

function xmlTransport(status, bodyAsText, requests) {
  return {
    async sendRequest(request) {
      requests.push(request);
      return { request, status, headers: toHttpHeadersLike(createHttpHeaders({ 'content-type': 'application/xml' })), bodyAsText };
    },
  };
}

test('cache storage consumer parses XML attributes, entities, arrays and string values', async () => {
  const requests = [];
  const body = '<?xml version="1.0"?><EnumerationResults ServiceEndpoint="https://account.blob.core.windows.net/">'
    + '<Containers><Container><Name>cache&amp;one</Name><Properties><Etag>&quot;001&quot;</Etag></Properties>'
    + '<Metadata><label> 001 &amp; 한글 </label></Metadata></Container>'
    + '<Container><Name>cache-two</Name><Properties><Etag>&quot;002&quot;</Etag></Properties></Container>'
    + '</Containers><NextMarker /></EnumerationResults>';
  const client = new BlobServiceClient('https://account.blob.core.windows.net', undefined, {
    httpClient: xmlTransport(200, body, requests), retryOptions: { maxTries: 1 },
  });
  const page = await client.listContainers({ includeMetadata: true }).byPage().next();
  expect(page.value.serviceEndpoint).toBe('https://account.blob.core.windows.net/');
  expect(page.value.containerItems.map(({ name }) => name)).toEqual(['cache&one', 'cache-two']);
  expect(page.value.containerItems[0].properties.etag).toBe('"001"');
  expect(page.value.containerItems[0].metadata.label).toBe(' 001 & 한글 ');
  expect(requests).toHaveLength(1);
});

test('cache storage consumer serializes an ordered block list', async () => {
  const requests = [];
  const client = new BlockBlobClient('https://account.blob.core.windows.net/cache/blob', undefined, {
    httpClient: xmlTransport(201, '', requests), retryOptions: { maxTries: 1 },
  });
  await client.commitBlockList(['MDAwMQ==', 'MDAwMg==']);
  expect(requests).toHaveLength(1);
  expect(requests[0].body).toBe('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<BlockList><Latest>MDAwMQ==</Latest><Latest>MDAwMg==</Latest></BlockList>');
});

test('cache storage consumer preserves structured XML service errors', async () => {
  const client = new BlobServiceClient('https://account.blob.core.windows.net', undefined, {
    httpClient: xmlTransport(403, '<Error><Code>AuthorizationFailure</Code>'
      + '<Message>Denied &amp; retained</Message></Error>', []), retryOptions: { maxTries: 1 },
  });
  await expect(client.listContainers().next()).rejects.toMatchObject({
    statusCode: 403, code: 'AuthorizationFailure', message: 'Denied & retained',
  });
});

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
