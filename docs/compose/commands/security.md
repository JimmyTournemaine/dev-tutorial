# Security

```bash
$DEVTUTO_COMPOSE security <dev|prod>
```
Run security scan against running servers.
You must have start a development or production environment beforehand.

```bash
# Full run
$DEVTUTO_COMPOSE dockerize <dev|prod>
$DEVTUTO_COMPOSE security <dev|prod>

# Run only API security checks
$DEVTUTO_COMPOSE dockerize -s api
$DEVTUTO_COMPOSE security --api
```