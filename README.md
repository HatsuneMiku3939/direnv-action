
[![test](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yaml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yaml)
[![CodeQL](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml)


# direnv action

> Provides environment variables via direnv

This action provides environment variables via [direnv](https://direnv.net/),
evaluates the target `.envrc`, and exports the resulting environment variables
to subsequent workflow steps.

## How it works

The action performs the following steps:

1. Installs the requested `direnv` version from the GitHub release assets or a cache.
2. Runs `direnv allow` for the configured `path`.
3. Runs `direnv export json` in the configured `path`.
4. Exports the resulting variables to the GitHub Actions environment.
5. Appends `PATH` entries through `core.addPath()` when `PATH` is present in the exported values.
6. Masks configured secret values with the GitHub Actions masking API.

## Inputs

- `direnvVersion`: The `direnv` version to use. Default: `2.37.1`.
- `masks`: A comma-separated list of environment variable names to mask. Default: `''`.
- `path`: The directory where `direnv allow` and `direnv export json` are executed. Default: `.`.

## Outputs

No outputs

## Example usage

Examples below pin the current release, `v1.1.2`. If you prefer the moving major tag, use `@v1`.

```yaml
uses: HatsuneMiku3939/direnv-action@v1.1.2
with:
  direnvVersion: 2.37.1
  masks: SECRET1, SECRET2
```

This loads the `.envrc` file from the repository root.

To evaluate the `.envrc` in a subdirectory, set `path` explicitly:

```yaml
uses: HatsuneMiku3939/direnv-action@v1.1.2
with:
  path: child
  masks: SECRET1, SECRET2
```

## Behavior notes

- `masks` accepts environment variable names, not raw secret values.
- When `.envrc` exports `PATH`, the action appends it to the job `PATH` instead of overwriting the entire value.
- Variables exported by `direnv export json` are available to later workflow steps in the same job.
- The action does not define custom outputs; consumers should read exported environment variables directly.

## Security considerations

This action evaluates `.envrc`, which means repository code can influence the shell commands executed by `direnv`.

- Only use this action with trusted repositories and trusted `.envrc` contents.
- Review fork-based pull request workflows carefully before allowing this action to run with secrets.
- Treat masking as a log redaction aid, not a complete secret protection boundary.
- Keep sensitive logic inside trusted workflow contexts whenever possible.

## Development

Run the local quality checks before packaging or releasing changes:

```bash
npm run lint
npm test
```

The unit tests cover binary URL selection, tool installation cache branches, environment export behavior, secret masking, and the main action flow with mocked GitHub Actions APIs.

## Supported platforms and architectures

Since v1.0.7, the following platform and architecture combinations are supported.

| Platform | Architecture |
|----------|--------------|
| Linux    | x86_64       |
| Linux    | arm64        |
| Darwin   | x86_64       |
| Darwin   | arm64        |

Versions earlier than v1.0.7 support only `linux-x86_64`.

## Contributors

<table>
<tr>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/HatsuneMiku3939>
            <img src=https://avatars.githubusercontent.com/u/580053?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Kim SeungSu/>
            <br />
            <sub style="font-size:14px"><b>Kim SeungSu</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/hopisaurus>
            <img src=https://avatars.githubusercontent.com/u/24846639?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=hopisaurus/>
            <br />
            <sub style="font-size:14px"><b>hopisaurus</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/mdial89f>
            <img src=https://avatars.githubusercontent.com/u/48921055?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Mike Dial/>
            <br />
            <sub style="font-size:14px"><b>Mike Dial</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/gidoichi>
            <img src=https://avatars.githubusercontent.com/u/32694823?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=gidoichi/>
            <br />
            <sub style="font-size:14px"><b>gidoichi</b></sub>
        </a>
    </td>
    <td align="center" style="word-wrap: break-word; width: 150.0; height: 150.0">
        <a href=https://github.com/aklinkert>
            <img src=https://avatars.githubusercontent.com/u/1313774?v=4 width="100;"  style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;padding-top:10px" alt=Alex Klinkert/>
            <br />
            <sub style="font-size:14px"><b>Alex Klinkert</b></sub>
        </a>
    </td>
</tr>
</table>
