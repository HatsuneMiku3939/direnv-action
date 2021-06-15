const core = require('@actions/core');
const cp = require("child_process");

async function download() {
  try {
    cp.execSync(`command -v direnv`, { encoding: "utf-8"} )
  }
  catch (error) {
    core.info(`Download direnv via apt-get...`);
    try {
      cp.execSync('sudo apt-get install direnv', { encoding: "utf-8" });
      core.info(`  Success!`);
    }
    catch (error2) {
      core.info(`  Failure... `)
      core.info(`Download direnv via curl...`)
      cp.execSync('curl -sfL https://direnv.net/install.sh | bash > /dev/null 2>&1', { encoding: "utf-8" });
      core.info(`  Success!`);
    }
  }
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    download();
    cp.execSync('direnv allow', { encoding: "utf-8" });
    const envs = JSON.parse(cp.execSync('direnv export json', { encoding: "utf-8" }));

    Object.keys(envs).forEach(function (name) {
      const value = envs[name];
      core.exportVariable(name, value);
    });
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
