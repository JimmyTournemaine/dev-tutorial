## Dockerize

Build and run docker container using the local Docker daemon.

### Usage

```{program-output} ../bin/compose/compose.py dockerize --help

```

### Development

```bash
$DEVTUTO_COMPOSE dockerize dev
```
Run a local development environment :
* `dev-tutorial-app`: The angular application container, watching for changes (<http://localhost:4200>)
* `dev-tutorial-api`: The API, watching for changes

To get more control over the running service, you can run commands like the following to run a container that is just waiting. Then, you can open a shell in the container and run what you want.
For example to run the normal *api* but run the *app* container without starting the application, you can run :
```
$DEVTUTO_COMPOSE dockerize dev -a run_app_command='sleep infinity'
```

### Test

---
```bash
$DEVTUTO_COMPOSE dockerize test
$DEVTUTO_COMPOSE dockerize test -s api # only API tests
$DEVTUTO_COMPOSE dockerize test -s app # only Angular tests
```
Run a local test environment :
* `dev-tutorial-app`: The angular application test container, watching for changes to rerun Karma tests (<http://localhost:9876>).
* `dev-tutorial-api`: The API, watching for changes to rerun Mocha tests

### CI

```bash
$DEVTUTO_COMPOSE dockerize ci
$DEVTUTO_COMPOSE dockerize ci -s api # only API tests
$DEVTUTO_COMPOSE dockerize ci -s app # only Angular tests
```
Run CI/CD-like checks. You should run this command before any pull request to make sure the CI/CD pipeline will not fail.
If all tests passed, you should then check your code quality using  the [lint command](./lint)
