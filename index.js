import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { platform, arch } from 'node:process';
import { pathToFileURL } from 'node:url';

const ENV_VAR_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DIRENV_RELEASE_API_BASE = 'https://api.github.com/repos/direnv/direnv/releases/tags';

export function direnvBinaryAssetName(platform, arch) {
  const supportedArch = ['x64', 'arm64'];
  const supportedPlatform = ['linux', 'darwin'];

  if (!supportedArch.includes(arch)) {
    throw new Error(`unsupported arch: ${arch}`);
  }

  if (!supportedPlatform.includes(platform)) {
    throw new Error(`unsupported platform: ${platform}`);
  }

  const archPlatform = `${platform}-${arch}`;

  switch (archPlatform) {
    case 'linux-x64':
      return 'direnv.linux-amd64';
    case 'linux-arm64':
      return 'direnv.linux-arm64';
    case 'darwin-x64':
      return 'direnv.darwin-amd64';
    case 'darwin-arm64':
      return 'direnv.darwin-arm64';
    default:
      throw new Error(`unsupported platform: ${archPlatform}`);
  }
}

export function direnvBinaryURL(version, platform, arch) {
  const baseurl = `https://github.com/direnv/direnv/releases/download/v${version}/direnv`;
  return `${baseurl}.${direnvBinaryAssetName(platform, arch).replace('direnv.', '')}`;
}

export function normalizeSha256Digest(rawDigest) {
  const digest = rawDigest.trim().toLowerCase().replace(/^sha256:/, '');

  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error(`Invalid SHA-256 digest: ${rawDigest}`);
  }

  return digest;
}

export async function sha256File(filePath) {
  const contents = await readFile(filePath);
  return createHash('sha256').update(contents).digest('hex');
}

export async function fetchDirenvReleaseAssetDigest(version, assetName) {
  const response = await fetch(`${DIRENV_RELEASE_API_BASE}/v${version}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'direnv-action',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch direnv release metadata for v${version}: HTTP ${response.status}`);
  }

  const release = await response.json();
  const asset = release.assets?.find((candidate) => candidate.name === assetName);

  if (!asset) {
    throw new Error(`direnv release v${version} does not include asset ${assetName}`);
  }

  if (!asset.digest) {
    throw new Error(`direnv release asset ${assetName} does not include a digest`);
  }

  return normalizeSha256Digest(asset.digest);
}

export async function verifyFileSha256(filePath, expectedDigest, assetName) {
  const normalizedExpected = normalizeSha256Digest(expectedDigest);
  const actualDigest = await sha256File(filePath);

  if (actualDigest !== normalizedExpected) {
    throw new Error(
      `Downloaded ${assetName} checksum mismatch: expected sha256:${normalizedExpected}, got sha256:${actualDigest}`
    );
  }

  return actualDigest;
}

// internal functions
export async function installTools() {
  const direnvVersion = core.getInput('direnvVersion');
  core.info(`installing direnv-${direnvVersion} on ${platform}-${arch}`);

  // test direnv in cache
  const foundToolCache = tc.find('direnv', direnvVersion);
  if (foundToolCache) {
    core.info('direnv found in tool-cache');
    core.addPath(foundToolCache);
  } else {
    const workspace = process.env['GITHUB_WORKSPACE'];
    const key = `hatsunemiku3939-direnv-action-toolcache-${direnvVersion}-${platform}-${arch}`;
    const paths = [`${workspace}/.direnv-action`];
    const restoreKeys = [key];

    // restore from cache
    core.info('direnv not found in tool-cache, restoring from cache...');
    const cacheKey = await cache.restoreCache(paths.slice(), key, restoreKeys);
    if (cacheKey) {
      core.info(`direnv restored from cache, key: ${cacheKey}`);

      // save tool-cache
      core.info(`saving to tool-cache...`);
      const cachedPath = await tc.cacheFile(`${workspace}/.direnv-action/direnv`, 'direnv', 'direnv', direnvVersion);

      // add to path
      core.addPath(cachedPath);

      // clear
      await exec.exec('rm', [`-rf`, `${workspace}/.direnv-action`]);
    } else {
      const assetName = direnvBinaryAssetName(platform, arch);
      const dlUrl = direnvBinaryURL(direnvVersion, platform, arch);
      core.info(`direnv not found in cache, installing ${dlUrl} ...`);
      const configuredChecksum = core.getInput('direnvChecksum');
      const expectedDigest = configuredChecksum || await fetchDirenvReleaseAssetDigest(direnvVersion, assetName);
      const installPath = await tc.downloadTool(dlUrl);

      // Verify the binary before making it executable or saving it to any cache.
      await verifyFileSha256(installPath, expectedDigest, assetName);
      core.info(`verified ${assetName} sha256 checksum`);

      // set permissions
      core.info(`direnv installed ${installPath}, setting permissions...`);
      await exec.exec('chmod', ['+x', installPath]);

      // rename to direnv
      core.info(`renaming executable to direnv...`);
      await exec.exec('mkdir', [`${workspace}/.direnv-action`]);
      await exec.exec('cp', [installPath, `${workspace}/.direnv-action/direnv`]);

      // save to cache
      core.info(`saving to cache...`);
      await cache.saveCache(paths, key);

      // save tool-cache
      core.info(`saving to tool-cache...`);
      const cachedPath = await tc.cacheFile(installPath, 'direnv', 'direnv', direnvVersion);

      // add to path
      core.addPath(cachedPath);

      // clear
      await exec.exec('rm', [`-rf`, `${workspace}/.direnv-action`]);
    }
  }
}

export async function allowEnvrc(path) {
  core.info('allowing envrc...');
  await exec.exec(`direnv`, ['allow', path]);
}

export async function exportEnvrc(path) {
  let outputBuffer = '';
  const options = {};
  options.listeners = {
    stdout: (data) => {
      outputBuffer += data.toString();
    }
  };
  options.cwd = path;
  options.silent = true;

  core.info('exporting envrc...');
  await exec.exec(`direnv`, ['export', 'json'], options);
  return JSON.parse(outputBuffer);
}

export async function setMasks(envs) {
  const rawMaskList = core.getInput('masks');
  const maskList = rawMaskList.split(',').map(function (mask) {
    return mask.trim();
  });
  core.info(`setting masks: ${maskList.join(', ')}`);

  maskList.forEach(function (mask) {
    const value = envs[mask];
    if (value) {
      core.setSecret(value);
    }
  });
}

export function logExportedEnvVars(envs) {
  const names = Object.keys(envs).sort();

  if (names.length === 0) {
    core.info('no environment variables exported from .envrc');
    return;
  }

  core.info(`exported environment variables: ${names.join(', ')}`);
}

export function parseRequiredEnvVarNames(rawRequiredList) {
  const requiredNames = rawRequiredList
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  const invalidNames = requiredNames.filter((name) => !ENV_VAR_NAME_PATTERN.test(name));

  if (invalidNames.length > 0) {
    throw new Error(`Invalid required environment variable names: ${invalidNames.join(', ')}`);
  }

  return [...new Set(requiredNames)];
}

export function validateRequiredEnvVars(envs, requiredNames) {
  const missingNames = requiredNames.filter((name) => !Object.prototype.hasOwnProperty.call(envs, name));

  if (missingNames.length > 0) {
    throw new Error(`Missing required environment variables: ${missingNames.join(', ')}`);
  }
}

export function applyEnvVars(envs) {
  Object.keys(envs).forEach(function (name) {
    const value = envs[name];

    if (name === 'PATH') {
      core.info('detected PATH in .envrc, appending to PATH...');
      core.addPath(value);
    } else {
      core.exportVariable(name, value);
    }
  });
}

export function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// action entrypoint
export async function main() {
  const path = core.getInput('path');
  try {
    // install direnv
    await installTools();

    // allow given envrc
    await allowEnvrc(path);

    // export envrc to json
    const envs = await exportEnvrc(path);

    // log exported variable names without printing values
    logExportedEnvVars(envs);

    // fail early when required exported variables are missing
    const requiredNames = parseRequiredEnvVarNames(core.getInput('required'));
    validateRequiredEnvVars(envs, requiredNames);

    // set envs
    applyEnvVars(envs);

    // set masks
    await setMasks(envs);
  }
  catch (error) {
    core.setFailed(errorMessage(error));
  }
}

// run action
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
