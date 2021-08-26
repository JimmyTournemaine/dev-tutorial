# Dev' Tutorial

## Getting started

### Requirements

* Python >= 2 (or download [the latest artifact generated from the GitHub action](https://github.com/JimmyTournemaine))
* Docker Engine API >= 1.40

#### OS Specific requirements

* **MacOS:** None, a socat container will automatically start to expose the Docker daemon on port 2375

* **Windows:** make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".

### Build and run

If you have Python3 installed set the DEVTUTO_COMPOSE environment variable like the following  `export DEVTUTO_COMPOSE="$(pwd)/bin/compose/compose.py"`.
Otherwise, you should download the bundled script for your OS in the last CI/CD build and set the `DEVTUTO_COMPOSE` variable accordingly.

#### Run with compose

```bash
# Development environment (watching for changes)
$DEVTUTO_COMPOSE dockerize dev 

# Production environment (pull officially deployed production images)
$DEVTUTO_COMPOSE deploy
```

The compose command will generally open your browser at the deployed application page. You can also use the following links.
* [Development environment](http://localhost:4200)
* [Production environment](http://localhost)
* [Documentation server](http://localhost:8000)
* [Deployer ARA supervisor](http://localhost:12000)
  

## Documentation reference

### Compose Tool

Compose is the project CLI which relies on the *deployer* (the Ansible project named `dev-tutorial-deployer`) to build and run any environment, generate the documentation, etc.

To setup your compose path, follow the [Getting started instructions](#build-and-run)

#### Help

The compose outputs help any time you provide the `-h` option. The help will be more accurate if you provide subcommands.

```bash
$DEVTUTO_COMPOSE -h # general help
$DEVTUTO_COMPOSE dockerize -h # dockerize help
```

#### Dockerize

Build and run docker container using the local Docker daemon.

---
```bash
$DEVTUTO_COMPOSE dockerize -h
```
Show the help message for the command

---
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

---
```bash
$DEVTUTO_COMPOSE dockerize test
$DEVTUTO_COMPOSE dockerize test -s api # only API tests
$DEVTUTO_COMPOSE dockerize test -s app # only Angular tests
```
Run a local test environment :
* `dev-tutorial-app`: The angular application test container, watching for changes to rerun Karma tests (<http://localhost:9876>).
* `dev-tutorial-api`: The API, watching for changes to rerun Mocha tests

---
```bash
$DEVTUTO_COMPOSE dockerize ci
$DEVTUTO_COMPOSE dockerize ci -s api # only API tests
$DEVTUTO_COMPOSE dockerize ci -s app # only Angular tests
```
Run CI/CD-like checks. You should run this command before any pull request to make sure the CI/CD pipeline will not fail.
If all tests passed, you should then check your code quality using  the [lint command](#lint)

#### Documentation

```bash
$DEVTUTO_COMPOSE docs generate
$DEVTUTO_COMPOSE docs start
```
Generate the complete project documentation from some documentation files, code documentation and specification, to expose a global project documentation at <http://localhost:8000>.

#### Deployer

##### Get a shell

```bash
$DEVTUTO_COMPOSE deployer sh
```
To open a shell or execute a specific command in the deployer container.

##### ARA

```bash
$DEVTUTO_COMPOSE deployer 'ansible-playbook ara.yml'
```
The ARA (ARA Records Ansible) can be enable any time using the `ara` playbook to record all the future Ansible plays (<http://localhost:12000>)

To deactivate and clean ARA, just run the previous command with `--tags=cleanup`.

##### Unit tests (molecule)

```bash
# Run tests from the compose script
$DEVTUTO_COMPOSE test-deployer <role_name>
$DEVTUTO_COMPOSE test-deployer --all

# Run tests from shell (to get more control)
$DEVTUTO_COMPOSE deployer sh
../tests/unit-tests.py
```

#### Lint

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

#### Package

```bash
$DEVTUTO_COMPOSE package
```
Package the production images and push them to the Docker repository to be usable by the `deploy` command.


#### Deploy

```bash
$DEVTUTO_COMPOSE deploy
```
Deploy the production environment, on the local Docker daemon yet.

#### Compose testing

Pytest tests can be run to check that the compose CLI has not been broken.

**Warning!** System calls are mocked, so "tests passed" does not means that the script will work as expected. This testing is focusing on statements coverage to make sure the code has no error in its logic and purposes.

```bash
docker run -it --rm -v "$(pwd)/bin:/usr/src" --workdir=/usr/src/compose python:3 bash
pip install -U pytest pytest-mock pytest-cov
python -m pytest --cov --no-cov-on-fail --cov-report=term-missing
```

Or using a one-shot command :
```bash
docker run --rm -t -v "$(pwd)/bin:/usr/src" --workdir=/usr/src/compose python:3 bash -c "
pip install -U pytest pytest-mock pytest-cov
python -m pytest --cov --no-cov-on-fail --cov-report=term-missing"
```

## Development

### Dependencies

* Use `yarn` instead of `npm` to manage NodeJS dependencies.

* When you add a node dependency, you shall rebuild your environment (to update the docker image and recreating your container). The *deployer* is able to detect any change in dependencies when mounting an environment.

```plain
your-host$ docker exec -it dev-tutorial-api bash
container# yarn add <my-deps>
container# ^D
your-host$ $DEVTUTO_COMPOSE dockerize dev
```

### Security update

The `yarn audit` command do not provide the `fix` option like `npm` do.
To automatically fix issues, run the following commands.

```bash
npm i --package-lock-only
npm audit fix
rm yarn.lock
yarn import
rm package-lock.json
yarn audit
```

### API

Any modification of the API has an impact on the front. Thus, these changes must be considered:
* Update the *OpenAPI Specification* documentation in *JSDocs*.
* Update the model used from the frontend if needed.
* Increment the API version if needed.

To get the current API documentation, run the following commands.
```bash
$DEVTUTO_COMPOSE docs generate
$DEVTUTO_COMPOSE docs start
```

### Commands Cheatsheet

#### Retrieve node_modules from containers to local host for IDE support

```bash
# Clean
rm -rf ./dev-tutorial-api/node_modules
rm -rf ./dev-tutorial-app/node_modules

# Fetch dependencies
docker cp dev-tutorial-api:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/
```

_Note : the `dockerize` script already retrieve dependencies after a successful `dev` environment startup._

## Quality Assurance

Before creating a pull request, you should run the following commands (there will also be CI-checked):
* `$DEVTUTO_COMPOSE dockerize test`
* `$DEVTUTO_COMPOSE lint [--fix]`

## Troubleshooting

### Docker

* **Issue:** Error building *image*: no space left on device
* **Solution:** Remove any unnecessary Docker objects from you system.

You can run the following command  :
```bash
$DEVTUTO_COMPOSE prune -f
```
---
* **Issue:** Error creating container: UnixHTTPConnectionPool(host='localhost', port=None): Read timed out
* **Solution:** Retry one more time. If the trouble persists, restart the docker daemon and try again.
