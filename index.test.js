import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mocks = vi.hoisted(() => ({
  getInput: vi.fn(),
  info: vi.fn(),
  addPath: vi.fn(),
  exportVariable: vi.fn(),
  setSecret: vi.fn(),
  setFailed: vi.fn(),
  find: vi.fn(),
  cacheFile: vi.fn(),
  downloadTool: vi.fn(),
  exec: vi.fn(),
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
  fetch: vi.fn(),
}));

const {
  getInput,
  info,
  addPath,
  exportVariable,
  setSecret,
  setFailed,
  find,
  cacheFile,
  downloadTool,
  exec,
  restoreCache,
  saveCache,
  fetch,
} = mocks;

vi.mock('@actions/core', () => ({
  getInput,
  info,
  addPath,
  exportVariable,
  setSecret,
  setFailed,
}));

vi.mock('@actions/tool-cache', () => ({
  find,
  cacheFile,
  downloadTool,
}));

vi.mock('@actions/exec', () => ({
  exec,
}));

vi.mock('@actions/cache', () => ({
  restoreCache,
  saveCache,
}));

const {
  applyEnvVars,
  direnvBinaryAssetName,
  direnvBinaryURL,
  errorMessage,
  fetchDirenvReleaseAssetDigest,
  installTools,
  logExportedEnvVars,
  normalizeSha256Digest,
  main,
  parseRequiredEnvVarNames,
  setMasks,
  sha256File,
  validateRequiredEnvVars,
  verifyFileSha256,
} = await import('./index.js');

const testBinaryContent = 'test direnv binary';
const testBinaryDigest = createHash('sha256').update(testBinaryContent).digest('hex');
let tempDir;
let downloadedDirenvPath;

beforeEach(() => {
  vi.clearAllMocks();
  tempDir = mkdtempSync(join(tmpdir(), 'direnv-action-test-'));
  downloadedDirenvPath = join(tempDir, 'direnv');
  writeFileSync(downloadedDirenvPath, testBinaryContent);
  vi.stubGlobal('fetch', fetch);
  getInput.mockImplementation(() => '');
  find.mockReturnValue('');
  cacheFile.mockResolvedValue('/tool-cache/direnv');
  downloadTool.mockResolvedValue(downloadedDirenvPath);
  restoreCache.mockResolvedValue(undefined);
  saveCache.mockResolvedValue(1);
  exec.mockResolvedValue(0);
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      assets: [
        {
          name: 'direnv.linux-amd64',
          digest: `sha256:${testBinaryDigest}`,
        },
      ],
    }),
  });
  process.env.GITHUB_WORKSPACE = '/workspace';
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.GITHUB_WORKSPACE;
});

describe('direnvBinaryAssetName', () => {
  test.each([
    ['linux', 'x64', 'direnv.linux-amd64'],
    ['linux', 'arm64', 'direnv.linux-arm64'],
    ['darwin', 'x64', 'direnv.darwin-amd64'],
    ['darwin', 'arm64', 'direnv.darwin-arm64'],
  ])('returns the correct asset name for %s/%s', (targetPlatform, targetArch, expected) => {
    expect(direnvBinaryAssetName(targetPlatform, targetArch)).toBe(expected);
  });
});

describe('direnvBinaryURL', () => {
  test.each([
    ['2.37.1', 'linux', 'x64', 'https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.linux-amd64'],
    ['2.37.1', 'linux', 'arm64', 'https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.linux-arm64'],
    ['2.37.1', 'darwin', 'x64', 'https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.darwin-amd64'],
    ['2.37.1', 'darwin', 'arm64', 'https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.darwin-arm64'],
  ])('returns the correct binary URL for %s on %s/%s', (version, targetPlatform, targetArch, expected) => {
    expect(direnvBinaryURL(version, targetPlatform, targetArch)).toBe(expected);
  });

  test.each([
    ['2.37.1', 'win32', 'x64', 'unsupported platform: win32'],
    ['2.37.1', 'linux', 'arm', 'unsupported arch: arm'],
  ])('throws for unsupported targets: %s on %s/%s', (version, targetPlatform, targetArch, expectedMessage) => {
    expect(() => direnvBinaryURL(version, targetPlatform, targetArch)).toThrow(expectedMessage);
  });
});

describe('checksum verification', () => {
  test.each([
    [`sha256:${testBinaryDigest}`, testBinaryDigest],
    [testBinaryDigest.toUpperCase(), testBinaryDigest],
  ])('normalizes SHA-256 digest %p', (rawDigest, expected) => {
    expect(normalizeSha256Digest(rawDigest)).toBe(expected);
  });

  test('rejects malformed SHA-256 digests', () => {
    expect(() => normalizeSha256Digest('sha256:not-a-digest')).toThrow('Invalid SHA-256 digest: sha256:not-a-digest');
  });

  test('hashes files with SHA-256', async () => {
    await expect(sha256File(downloadedDirenvPath)).resolves.toBe(testBinaryDigest);
  });

  test('verifies a matching file digest', async () => {
    await expect(verifyFileSha256(downloadedDirenvPath, testBinaryDigest, 'direnv.linux-amd64')).resolves.toBe(testBinaryDigest);
  });

  test('fails when the file digest does not match', async () => {
    await expect(verifyFileSha256(downloadedDirenvPath, '0'.repeat(64), 'direnv.linux-amd64')).rejects.toThrow(
      `Downloaded direnv.linux-amd64 checksum mismatch: expected sha256:${'0'.repeat(64)}, got sha256:${testBinaryDigest}`
    );
  });

  test('fetches the GitHub release asset digest', async () => {
    await expect(fetchDirenvReleaseAssetDigest('2.37.1', 'direnv.linux-amd64')).resolves.toBe(testBinaryDigest);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/direnv/direnv/releases/tags/v2.37.1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          'User-Agent': 'direnv-action',
        }),
      })
    );
  });

  test('fails when release metadata cannot be fetched', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchDirenvReleaseAssetDigest('2.37.1', 'direnv.linux-amd64')).rejects.toThrow(
      'Failed to fetch direnv release metadata for v2.37.1: HTTP 404'
    );
  });

  test('fails when the release asset is missing', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ assets: [] }),
    });

    await expect(fetchDirenvReleaseAssetDigest('2.37.1', 'direnv.linux-amd64')).rejects.toThrow(
      'direnv release v2.37.1 does not include asset direnv.linux-amd64'
    );
  });

  test('fails when the release asset digest is missing', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        assets: [{ name: 'direnv.linux-amd64' }],
      }),
    });

    await expect(fetchDirenvReleaseAssetDigest('2.37.1', 'direnv.linux-amd64')).rejects.toThrow(
      'direnv release asset direnv.linux-amd64 does not include a digest'
    );
  });
});

describe('applyEnvVars', () => {
  test('exports variables and adds PATH separately', () => {
    applyEnvVars({
      FOO: 'bar',
      PATH: '/tmp/bin',
      BAR: 'baz',
    });

    expect(exportVariable).toHaveBeenCalledWith('FOO', 'bar');
    expect(exportVariable).toHaveBeenCalledWith('BAR', 'baz');
    expect(addPath).toHaveBeenCalledWith('/tmp/bin');
    expect(info).toHaveBeenCalledWith('detected PATH in .envrc, appending to PATH...');
  });
});

describe('logExportedEnvVars', () => {
  test('logs exported variable names in sorted order', () => {
    logExportedEnvVars({
      SECRET1: 'super-secret',
      PATH: '/tmp/bin',
      CHILD_ENV: 'defined',
    });

    expect(info).toHaveBeenCalledWith('exported environment variables: CHILD_ENV, PATH, SECRET1');
  });

  test('logs when direnv exports no variables', () => {
    logExportedEnvVars({});

    expect(info).toHaveBeenCalledWith('no environment variables exported from .envrc');
  });
});

describe('setMasks', () => {
  test.each([
    ['SECRET1, SECRET2', { SECRET1: 'alpha', SECRET2: 'beta' }, ['alpha', 'beta']],
    ['SECRET1, MISSING', { SECRET1: 'alpha' }, ['alpha']],
    ['', { SECRET1: 'alpha' }, []],
  ])('masks only configured secrets for "%s"', async (masks, envs, expectedSecrets) => {
    getInput.mockImplementation((name) => (name === 'masks' ? masks : ''));

    await setMasks(envs);

    expect(setSecret.mock.calls.map(([value]) => value)).toEqual(expectedSecrets);
  });
});

describe('parseRequiredEnvVarNames', () => {
  test.each([
    ['', []],
    ['\n\n', []],
    ['AWS_REGION\nDATABASE_URL\nNODE_AUTH_TOKEN', ['AWS_REGION', 'DATABASE_URL', 'NODE_AUTH_TOKEN']],
    [' AWS_REGION \r\n DATABASE_URL \nAWS_REGION', ['AWS_REGION', 'DATABASE_URL']],
  ])('parses required input %p', (rawRequiredList, expectedNames) => {
    expect(parseRequiredEnvVarNames(rawRequiredList)).toEqual(expectedNames);
  });

  test.each([
    ['1INVALID', 'Invalid required environment variable names: 1INVALID'],
    ['VALID\nINVALID-NAME\nALSO.INVALID', 'Invalid required environment variable names: INVALID-NAME, ALSO.INVALID'],
  ])('rejects malformed required input %p', (rawRequiredList, expectedMessage) => {
    expect(() => parseRequiredEnvVarNames(rawRequiredList)).toThrow(expectedMessage);
  });
});

describe('validateRequiredEnvVars', () => {
  test('succeeds when all required names are present', () => {
    expect(() => validateRequiredEnvVars({
      AWS_REGION: 'ap-northeast-1',
      DATABASE_URL: '',
      NODE_AUTH_TOKEN: 'secret',
    }, ['AWS_REGION', 'DATABASE_URL'])).not.toThrow();
  });

  test.each([
    [['DATABASE_URL'], 'Missing required environment variables: DATABASE_URL'],
    [['DATABASE_URL', 'NODE_AUTH_TOKEN'], 'Missing required environment variables: DATABASE_URL, NODE_AUTH_TOKEN'],
  ])('fails when required names are missing: %p', (requiredNames, expectedMessage) => {
    expect(() => validateRequiredEnvVars({ AWS_REGION: 'ap-northeast-1' }, requiredNames)).toThrow(expectedMessage);
  });
});

describe('installTools', () => {
  test('uses the GitHub tool-cache when direnv is already present', async () => {
    getInput.mockImplementation((name) => (name === 'direnvVersion' ? '2.37.1' : ''));
    find.mockReturnValue('/tool-cache/direnv');

    await installTools();

    expect(find).toHaveBeenCalledWith('direnv', '2.37.1');
    expect(addPath).toHaveBeenCalledWith('/tool-cache/direnv');
    expect(restoreCache).not.toHaveBeenCalled();
    expect(downloadTool).not.toHaveBeenCalled();
    expect(cacheFile).not.toHaveBeenCalled();
    expect(saveCache).not.toHaveBeenCalled();
  });

  test('restores direnv from actions/cache and rehydrates the tool-cache', async () => {
    getInput.mockImplementation((name) => (name === 'direnvVersion' ? '2.37.1' : ''));
    restoreCache.mockResolvedValue('cache-hit-key');

    await installTools();

    expect(restoreCache).toHaveBeenCalledWith(
      ['/workspace/.direnv-action'],
      'hatsunemiku3939-direnv-action-toolcache-2.37.1-linux-x64',
      ['hatsunemiku3939-direnv-action-toolcache-2.37.1-linux-x64']
    );
    expect(cacheFile).toHaveBeenCalledWith(
      '/workspace/.direnv-action/direnv',
      'direnv',
      'direnv',
      '2.37.1'
    );
    expect(addPath).toHaveBeenCalledWith('/tool-cache/direnv');
    expect(exec).toHaveBeenCalledWith('rm', ['-rf', '/workspace/.direnv-action']);
    expect(downloadTool).not.toHaveBeenCalled();
    expect(saveCache).not.toHaveBeenCalled();
  });

  test('downloads direnv, saves both caches, and cleans temporary files on a cold install', async () => {
    getInput.mockImplementation((name) => (name === 'direnvVersion' ? '2.37.1' : ''));

    await installTools();

    expect(downloadTool).toHaveBeenCalledWith(
      'https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.linux-amd64'
    );
    expect(exec.mock.calls).toEqual(expect.arrayContaining([
      ['chmod', ['+x', downloadedDirenvPath]],
      ['mkdir', ['/workspace/.direnv-action']],
      ['cp', [downloadedDirenvPath, '/workspace/.direnv-action/direnv']],
      ['rm', ['-rf', '/workspace/.direnv-action']],
    ]));
    expect(saveCache).toHaveBeenCalledWith(
      ['/workspace/.direnv-action'],
      'hatsunemiku3939-direnv-action-toolcache-2.37.1-linux-x64'
    );
    expect(cacheFile).toHaveBeenCalledWith(downloadedDirenvPath, 'direnv', 'direnv', '2.37.1');
    expect(addPath).toHaveBeenCalledWith('/tool-cache/direnv');
  });

  test('uses a configured checksum without fetching release metadata', async () => {
    getInput.mockImplementation((name) => {
      switch (name) {
        case 'direnvVersion':
          return '2.37.1';
        case 'direnvChecksum':
          return testBinaryDigest;
        default:
          return '';
      }
    });

    await installTools();

    expect(fetch).not.toHaveBeenCalled();
    expect(downloadTool).toHaveBeenCalledWith(
      'https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.linux-amd64'
    );
    expect(exec).toHaveBeenCalledWith('chmod', ['+x', downloadedDirenvPath]);
    expect(cacheFile).toHaveBeenCalledWith(downloadedDirenvPath, 'direnv', 'direnv', '2.37.1');
  });

  test('fails before chmod or caching when checksum verification fails', async () => {
    getInput.mockImplementation((name) => (name === 'direnvVersion' ? '2.37.1' : ''));
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        assets: [
          {
            name: 'direnv.linux-amd64',
            digest: `sha256:${'0'.repeat(64)}`,
          },
        ],
      }),
    });

    await expect(installTools()).rejects.toThrow(
      `Downloaded direnv.linux-amd64 checksum mismatch: expected sha256:${'0'.repeat(64)}, got sha256:${testBinaryDigest}`
    );
    expect(downloadTool).toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalledWith('chmod', ['+x', downloadedDirenvPath]);
    expect(saveCache).not.toHaveBeenCalled();
    expect(cacheFile).not.toHaveBeenCalled();
    expect(addPath).not.toHaveBeenCalled();
  });
});

describe('main', () => {
  test('installs direnv, exports env vars, and masks configured values', async () => {
    getInput.mockImplementation((name) => {
      switch (name) {
        case 'path':
          return 'child';
        case 'direnvVersion':
          return '2.37.1';
        case 'masks':
          return 'SECRET1';
        case 'required':
          return 'CHILD_ENV\nSECRET1';
        default:
          return '';
      }
    });

    find.mockReturnValue('/tool-cache/direnv');
    exec.mockImplementation(async (command, args, options = {}) => {
      if (command === 'direnv' && args[0] === 'export' && options.listeners?.stdout) {
        options.listeners.stdout(Buffer.from(JSON.stringify({
          PATH: '/workspace/bin',
          SECRET1: 'super-secret',
          CHILD_ENV: 'defined',
        })));
      }

      return 0;
    });

    await main();

    expect(exec).toHaveBeenCalledWith('direnv', ['allow', 'child']);
    expect(exec).toHaveBeenCalledWith('direnv', ['export', 'json'], expect.objectContaining({
      cwd: 'child',
      silent: true,
      listeners: expect.objectContaining({
        stdout: expect.any(Function),
      }),
    }));
    expect(info).toHaveBeenCalledWith('exported environment variables: CHILD_ENV, PATH, SECRET1');
    expect(addPath).toHaveBeenCalledWith('/tool-cache/direnv');
    expect(addPath).toHaveBeenCalledWith('/workspace/bin');
    expect(exportVariable).toHaveBeenCalledWith('SECRET1', 'super-secret');
    expect(exportVariable).toHaveBeenCalledWith('CHILD_ENV', 'defined');
    expect(setSecret).toHaveBeenCalledWith('super-secret');
    expect(setFailed).not.toHaveBeenCalled();
  });

  test('fails before applying env vars when required names are missing', async () => {
    getInput.mockImplementation((name) => {
      switch (name) {
        case 'path':
          return 'child';
        case 'direnvVersion':
          return '2.37.1';
        case 'required':
          return 'DATABASE_URL\nNODE_AUTH_TOKEN';
        default:
          return '';
      }
    });

    find.mockReturnValue('/tool-cache/direnv');
    exec.mockImplementation(async (command, args, options = {}) => {
      if (command === 'direnv' && args[0] === 'export' && options.listeners?.stdout) {
        options.listeners.stdout(Buffer.from(JSON.stringify({
          AWS_REGION: 'ap-northeast-1',
        })));
      }

      return 0;
    });

    await main();

    expect(setFailed).toHaveBeenCalledWith('Missing required environment variables: DATABASE_URL, NODE_AUTH_TOKEN');
    expect(exportVariable).not.toHaveBeenCalled();
    expect(setSecret).not.toHaveBeenCalled();
  });

  test('fails the action with a normalized message when execution throws', async () => {
    getInput.mockImplementation((name) => {
      switch (name) {
        case 'path':
          return 'child';
        case 'direnvVersion':
          return '2.37.1';
        default:
          return '';
      }
    });

    find.mockReturnValue('/tool-cache/direnv');
    exec.mockRejectedValueOnce('boom');

    await main();

    expect(setFailed).toHaveBeenCalledWith('boom');
  });
});

describe('errorMessage', () => {
  test.each([
    [new Error('failure'), 'failure'],
    ['plain failure', 'plain failure'],
    [42, '42'],
  ])('normalizes %p into a string', (input, expected) => {
    expect(errorMessage(input)).toBe(expected);
  });
});
