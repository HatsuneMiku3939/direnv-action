
[![test](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yaml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yaml)
[![CodeQL](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml)


# direnv action

> Privides environment variables via direnv

This action provides environment variables via [direnv](https://direnv.net/),

## Inputs

- `direnvVersion`: The version of direnv to use. Default: `2.32.1`
- `masks`: Comma seprated list of environment variables to mask. Default: `''`
- `path`: The directory for direnv to use. Default: `.`

## Outputs

No outputs

## Example usage

```yaml
uses: HatsuneMiku3939/direnv-action@v1
with:
  direnvVersion: 2.32.1
  masks: SECRET1, SECRET2
```

This will load `.envrc` residing at the top of the repository.

## Supported platforms and architectures

After v1.0.7, the following platforms and architectures are supported.

| Platform | Architecture |
|----------|--------------|
| Linux    | x86_64       |
| Linux    | arm64        |
| Darwin   | x86_64       |
| Darwin   | arm64        |

version below v1.0.7, only `linux-x86_64` is supported.

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
</tr>
</table>
