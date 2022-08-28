const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');

const direnvVersion = '2.32.1';

// internal functions
async function installTools() {
  // test direnv in cache
  const testInCache = tc.find('direnv', direnvVersion);
  if (!testInCache) {
    core.info('direnv not found in cache, installing...');
    const installPath = await tc.downloadTool(`https://github.com/direnv/direnv/releases/download/v${direnvVersion}/direnv.linux-amd64`);

    // set permissions
    core.info(`direnv installed ${installPath}, setting permissions...`);
    await exec.exec('chmod', ['+x', installPath]);

    // cache direnv
    core.info('direnv installed successfuly, caching...');
    await tc.cacheFile(installPath, `direnv-${direnvVersion}`, 'direnv', direnvVersion);
  } else {
    core.info('direnv found in cache');
  }

  // find direnv from cache
  const direnvPath = tc.find('direnv', direnvVersion);
  core.addPath(direnvPath);
}

async function allowEnvrc() {
  core.info('allowing envrc...');
  await exec.exec(`direnv-${direnvVersion}`, ['allow']);
}

async function exportEnvrc() {
  let outputBuffer = '';
  const options = {};
  options.listeners = {
    stdout: (data) => {
      outputBuffer += data.toString();
    }
  };
  await exec.exec(`direnv-${direnvVersion}`, ['export', 'json'], options);
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
      core.exportVariable(name, value);
    });
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

// run action
main();
