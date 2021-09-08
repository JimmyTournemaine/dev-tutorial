## Deployer

### Usage

```{program-output} ../bin/compose/compose.py deployer --help

```

### Examples

```bash
$DEVTUTO_COMPOSE deployer sh
```
To open a shell or execute a specific command in the deployer container.

```bash
$DEVTUTO_COMPOSE deployer 'ansible dev-tutorial-back -m ping'
```
Run an ansible ad-hoc command to ping de `dev-tutorial-back` host.
