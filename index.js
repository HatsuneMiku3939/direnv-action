const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const cache = require('@actions/cache');

const { platform } = require('node:process');
const { arch } = require('node:process');

function direnvBinaryURL(version, platform, arch) {
  const baseurl = `https://github.com/direnv/direnv/releases/download/v${version}/direnv`

  // supported arch: x64, arm64
  // supported platform: linux, darwin
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
      return `${baseurl}.linux-amd64`;
    case 'linux-arm64':
      return `${baseurl}.linux-arm64`;
    case 'darwin-x64':
      return `${baseurl}.darwin-amd64`;
    case 'darwin-arm64':
      return `${baseurl}.darwin-arm64`;
    default:
      throw new Error(`unsupported platform: ${archPlatform}`);
  }
}

// internal functions
async function installTools() {
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
      const dlUrl = direnvBinaryURL(direnvVersion, platform, arch);
      core.info(`direnv not found in cache, installing ${dlUrl} ...`);
      const installPath = await tc.downloadTool(dlUrl);

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

async function allowEnvrc(path) {
  core.info('allowing envrc...');
  await exec.exec(`direnv`, ['allow', path]);
}

async function exportEnvrc(path) {
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

async function setMasks(envs) {
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

// action entrypoint
async function main() {
  const path = core.getInput('path');
  try {
    // install direnv
    await installTools();

    // allow given envrc
    await allowEnvrc(path);

    // export envrc to json
    const envs = await exportEnvrc(path);

    // set envs
    Object.keys(envs).forEach(function (name) {
      const value = envs[name];

      if (name === 'PATH') {
        core.info(`detected PATH in .envrc, appending to PATH...`);
        core.addPath(value);
      } else {
        core.exportVariable(name, value);
      }
    });

    // set masks
    await setMasks(envs);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

// run action
main();
