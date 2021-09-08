# Lint

```{program-output} /usr/src/bin/compose/compose.py lint --help

```

```bash
$DEVTUTO_COMPOSE lint
```
Run linters and quality checks over all the project.
You can provide the `--fix` option to fix auto-fixable lint issues.
A full iteration takes about 50 minutes to complete. To run specific linters, you should therefore pass some options.

```bash
$DEVTUTO_COMPOSE lint --languages PYTHON,TYPESCRIPT
$DEVTUTO_COMPOSE lint --linters ANSIBLE_ANSIBLE_LINT,YAML_YAMLLINT
```

The full linters and languages list if available from the [Megalinter documentation](https://nvuillam.github.io/mega-linter/supported-linters/#languages)
