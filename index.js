const core = require('@actions/core');
const cp = require("child_process");
const fs = require("fs");

// most @actions toolkit packages have async methods
async function run() {
  try {
    // If there's no .envrc, skip all this
    if(fs.existsSync(".envrc")) {
      cp.execSync('./direnv.linux-amd64 allow', { encoding: "utf-8" });
      const envs = JSON.parse(cp.execSync('direnv export json', { encoding: "utf-8" }));

      Object.keys(envs).forEach(function (name) {
        const value = envs[name];
        core.exportVariable(name, value);
      });
    } else {
      core.info(`.envrc not found, skipping direnv allow`);
    }
  }
  // We still want all other errors to fail the action.
  catch (error) {
    core.setFailed(error.message);
  }

}

run()
