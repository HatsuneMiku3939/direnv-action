
<a href="https://github.com/HatsuneMiku3939/direnv-action/actions"><img alt="direnv-action status" src="https://github.com/HatsuneMiku3939/direnv-action/workflows/units-test/badge.svg"></a>


# direnv action

> Privides environment variables via direnv

This action provides environment variables via [direnv](https://direnv.net/),

## Inputs

- `direnvVersion`: The version of direnv to use. Default: `2.32.1`

## Outputs

No outputs

## Example usage

```yaml
uses: HatsuneMiku3939/direnv-action@v1
with:
  direnvVersion: 2.32.1
```

This will load `.envrc` residing at the top of the repository.
