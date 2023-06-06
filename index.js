const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const cache = require('@actions/cache');

const direnvVersion = '2.32.1';

// internal functions
async function installTools() {
  const runner_tmp = process.env['RUNNER_TEMP'];
  const cacheKey = `hatsunemiku3939-direnv-action-${direnvVersion}`;
  const paths = [`${runner_tmp}/direnv/bin`];
  const restoreKeys = [`hatsunemiku3939-direnv-action-`];

  // test direnv in cache
  const foundInCache = await cache.restoreCache(paths, cacheKey, restoreKeys);
  if (!foundInCache) {
    core.info('direnv not found in cache, installing...');
    const installPath = await tc.downloadTool(`https://github.com/direnv/direnv/releases/download/v${direnvVersion}/direnv.linux-amd64`);

    // set permissions
    core.info(`direnv installed ${installPath}, setting permissions...`);
    await exec.exec('chmod', ['+x', installPath]);

    // move to /opt/direnv/bin
    await exec.exec('mkdir', ['-p', `${runner_tmp}/direnv/bin`]);
    await exec.exec('mv', [installPath, `${runner_tmp}/direnv/bin/direnv`]);

    // save to cache
    await cache.saveCache(paths, cacheKey);
  } else {
    core.info('direnv found in cache');
  }

  // add to path
  core.addPath(`${runner_tmp}/direnv/bin`);
}

async function allowEnvrc() {
  core.info('allowing envrc...');
  await exec.exec(`direnv`, ['allow']);
}

async function exportEnvrc() {
  let outputBuffer = '';
  const options = {};
  options.listeners = {
    stdout: (data) => {
      outputBuffer += data.toString();
    }
  };
  core.info('exporting envrc...');
  await exec.exec(`direnv`, ['export', 'json'], options);
  return JSON.parse(outputBuffer);
}

// action entrypoint
async function main() {
  try {
    // install direnv
    await installTools();

    // allow given envrc
    await allowEnvrc();

    // export envrc to json
    const envs = await exportEnvrc();

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
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

// run action
main();
