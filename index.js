const core = require('@actions/core');
const cp = require("child_process");

const envrcPath = '.envrc';

// internal functions
function installTools() {
  core.info(`Download direnv ...`)
  cp.execSync('curl -sfL https://direnv.net/install.sh | bash > /dev/null 2>&1', { encoding: "utf-8" });
}

function allowEnvrc() {
  cp.execSync(`direnv allow ${envrcPath}`, { encoding: "utf-8" });
}

function exportEnvrc() {
  const envs = JSON.parse(cp.execSync('direnv export json', { encoding: "utf-8" }));
  return envs;
}

// action entrypoint
async function main() {
  try {
    // install direnv
    installTools();

    // allow given envrc
    allowEnvrc();

    // export envrc to json
    const envs = exportEnvrc();

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
main()
