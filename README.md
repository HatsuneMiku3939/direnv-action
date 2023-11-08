
[![units-test](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/test.yml)
[![CodeQL](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml/badge.svg)](https://github.com/HatsuneMiku3939/direnv-action/actions/workflows/codeql.yml)


# direnv action

> Privides environment variables via direnv

This action provides environment variables via [direnv](https://direnv.net/),

## Inputs

- `direnvVersion`: The version of direnv to use. Default: `2.32.1`
- `masks`: Comma seprated list of environment variables to mask. Default: `''`

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
