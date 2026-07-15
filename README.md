
[![test](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yaml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yaml)
[![CodeQL](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml)
[![Dependents](https://dependents.info/HatsuneMiku3939/direnv-action/badge)](https://dependents.info/HatsuneMiku3939/direnv-action)


# direnv action

> Provides environment variables via direnv

This action provides environment variables via [direnv](https://direnv.net/),
evaluates the target `.envrc`, and exports the resulting environment variables
to subsequent workflow steps.

Documentation site: https://hatsunemiku3939.github.io/direnv-action/

## Who uses this action

[![Repositories that depend on direnv-action](https://dependents.info/HatsuneMiku3939/direnv-action/image)](https://dependents.info/HatsuneMiku3939/direnv-action)

## How it works

The action performs the following steps:

1. Installs the requested `direnv` version from the GitHub release assets or a cache.
   Cold installs verify the downloaded binary's SHA-256 digest before execution or caching.
2. Runs `direnv allow` for the configured `path`.
3. Runs `direnv export json` in the configured `path`.
4. Logs the exported environment variable names without printing their values.
5. Optionally verifies that required environment variable names were exported.
6. Exports the resulting variables to the GitHub Actions environment.
7. Appends `PATH` entries through `core.addPath()` when `PATH` is present in the exported values.
8. Masks configured secret values with the GitHub Actions masking API.

## Inputs

- `direnvVersion`: The `direnv` version to use. Default: `2.37.1`.
- `direnvChecksum`: Optional SHA-256 checksum for the downloaded `direnv` binary. Default: `''`.
- `masks`: A comma-separated list of environment variable names to mask. Default: `''`.
- `required`: A newline-delimited list of environment variable names that must be exported. Default: `''`.
- `path`: The directory where `direnv allow` and `direnv export json` are executed. Default: `.`.

## Outputs

No outputs

## Example usage

Examples below pin the current release, `v1.4.1`. If you prefer compatible updates within the current major line, use the moving major tag `@v1`.

```yaml
uses: HatsuneMiku3939/direnv-action@v1.4.1
with:
  direnvVersion: 2.37.1
  masks: SECRET1, SECRET2
```

This loads the `.envrc` file from the repository root.

By default, cold installs verify the downloaded `direnv` binary against the GitHub Release API asset digest. To pin an
expected digest yourself, set `direnvChecksum` to either a plain SHA-256 hex digest or a `sha256:<digest>` value:

```yaml
uses: HatsuneMiku3939/direnv-action@v1.4.1
with:
  direnvVersion: 2.37.1
  direnvChecksum: sha256:1f1b93dd6f38523fde26dfac96151ef9d31a374e3005cd3345fb93555ae0c9b5
```

To evaluate the `.envrc` in a subdirectory, set `path` explicitly:

```yaml
uses: HatsuneMiku3939/direnv-action@v1.4.1
with:
  path: child
  masks: SECRET1, SECRET2
```

To fail early when expected variables are not exported, set `required`:

```yaml
uses: HatsuneMiku3939/direnv-action@v1.4.1
with:
  required: |
    AWS_REGION
    DATABASE_URL
    NODE_AUTH_TOKEN
```

For the most predictable builds, pin an exact version tag such as `@v1.4.1`. Use `@v1` only when you want to receive the latest compatible `v1.x.y` release automatically.

## Behavior notes

- `masks` accepts environment variable names, not raw secret values.
- `required` accepts environment variable names, not raw values, and fails when any listed name is absent from the exported environment.
- When `.envrc` exports `PATH`, the action appends it to the job `PATH` instead of overwriting the entire value.
- Variables exported by `direnv export json` are available to later workflow steps in the same job.
- The action logs exported variable names for debugging, but it does not print environment variable values.
- The action does not define custom outputs; consumers should read exported environment variables directly.
- Cold installs verify the downloaded `direnv` binary before marking it executable or saving it to any cache.
- When `direnvChecksum` is provided, the action cache key includes that checksum so different pins do not share cache entries.

## Security considerations

This action evaluates `.envrc`, which means repository code can influence the shell commands executed by `direnv`. Treat
`.envrc` as executable code, especially in workflows that can access repository secrets, cloud credentials, deployment
tokens, or production infrastructure.

- Only use this action with trusted repositories and trusted `.envrc` contents.
- Avoid evaluating untrusted fork contents from `pull_request_target` workflows. If you use `pull_request_target`, do not
  check out and run a fork-provided `.envrc` in a job that has access to secrets.
- Prefer running secret-bearing jobs only on trusted refs, protected branches, or reviewed tags. For fork PR validation,
  use `pull_request` with minimal permissions and without repository secrets unless the `.envrc` contents are trusted.
- Use the `required` input to fail early when expected exported variables are missing. This helps prevent downstream steps
  from running with incomplete configuration, but it is not a sandbox or a secret-protection boundary.
- Keep workflow `permissions:` as narrow as possible and avoid passing long-lived credentials into jobs that evaluate
  changing `.envrc` files.
- Treat masking as a log redaction aid, not a complete secret protection boundary.
- Keep sensitive logic inside trusted workflow contexts whenever possible.
- Download verification uses the GitHub Release API asset digest by default. This protects against corrupted or swapped
  download bytes relative to GitHub's release metadata. For a stronger independent pin, provide `direnvChecksum`.

## Development

Run the local quality checks before packaging or releasing changes:

```bash
npm run lint
npm test
```

For release preparation, use the full gate so the generated `dist/` artifacts stay in sync:

```bash
npm run all
```

The Vitest unit tests cover binary URL selection, downloaded binary checksum verification, tool installation cache branches, environment export behavior, required variable validation, secret masking, and the main action flow with mocked GitHub Actions APIs.

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
