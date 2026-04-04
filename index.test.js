import { jest } from '@jest/globals';

const getInput = jest.fn();
const info = jest.fn();
const addPath = jest.fn();
const exportVariable = jest.fn();
const setSecret = jest.fn();
const setFailed = jest.fn();
const find = jest.fn();
const cacheFile = jest.fn();
const downloadTool = jest.fn();
const exec = jest.fn();
const restoreCache = jest.fn();
const saveCache = jest.fn();

jest.unstable_mockModule('@actions/core', () => ({
  getInput,
  info,
  addPath,
  exportVariable,
  setSecret,
  setFailed,
}));

jest.unstable_mockModule('@actions/tool-cache', () => ({
  find,
  cacheFile,
  downloadTool,
}));

jest.unstable_mockModule('@actions/exec', () => ({
  exec,
}));

jest.unstable_mockModule('@actions/cache', () => ({
  restoreCache,
  saveCache,
}));

const {
  applyEnvVars,
  direnvBinaryURL,
  errorMessage,
  installTools,
  main,
  setMasks,
} = await import('./index.js');

beforeEach(() => {
  jest.clearAllMocks();
  getInput.mockImplementation(() => '');
  find.mockReturnValue('');
  cacheFile.mockResolvedValue('/tool-cache/direnv');
  downloadTool.mockResolvedValue('/tmp/direnv');
  restoreCache.mockResolvedValue(undefined);
  saveCache.mockResolvedValue(1);
  exec.mockResolvedValue(0);
  process.env.GITHUB_WORKSPACE = '/workspace';
});

afterEach(() => {
  delete process.env.GITHUB_WORKSPACE;
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
      ['chmod', ['+x', '/tmp/direnv']],
      ['mkdir', ['/workspace/.direnv-action']],
      ['cp', ['/tmp/direnv', '/workspace/.direnv-action/direnv']],
      ['rm', ['-rf', '/workspace/.direnv-action']],
    ]));
    expect(saveCache).toHaveBeenCalledWith(
      ['/workspace/.direnv-action'],
      'hatsunemiku3939-direnv-action-toolcache-2.37.1-linux-x64'
    );
    expect(cacheFile).toHaveBeenCalledWith('/tmp/direnv', 'direnv', 'direnv', '2.37.1');
    expect(addPath).toHaveBeenCalledWith('/tool-cache/direnv');
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
    expect(addPath).toHaveBeenCalledWith('/tool-cache/direnv');
    expect(addPath).toHaveBeenCalledWith('/workspace/bin');
    expect(exportVariable).toHaveBeenCalledWith('SECRET1', 'super-secret');
    expect(exportVariable).toHaveBeenCalledWith('CHILD_ENV', 'defined');
    expect(setSecret).toHaveBeenCalledWith('super-secret');
    expect(setFailed).not.toHaveBeenCalled();
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
