# Compose

Compose is the CLI which relies on the *deployer* (the Ansible project named `dev-tutorial-deployer`) to build and run any environment, generate the documentation, etc.

## Setup

If you have Python3 installed set the DEVTUTO_COMPOSE environment variable like the following  `export DEVTUTO_COMPOSE="$(pwd)/bin/compose/compose.py"`.
Otherwise, you should download the bundled script for your OS in the last CI/CD build and set the `DEVTUTO_COMPOSE` variable accordingly.

## Commands reference

* Utils
  * [Help](./commands/help)
  * [`prune`](./commands/prune)
* Development
  * Deployer
    * [`deployer`](./commands/deployer)
  * Applications
    * [`dockerize [dev]`](./commands/dockerize#dev)
  * Documentation
    * [`docs generate`](./commands/documentation)
    * [`docs start`](./commands/documentation)
    * [`docs stop`](./commands/documentation)
  * Tests and analysis
    * [`dockerize test`](./commands/dockerize#test)
    * [`molecule`](./commands/molecule)
    * [`lint`](./commands/lint)
    * [`security`](./commands/security)
* Packaging
  * [`package`](./commands/package)
* Production
  * [`deploy`](./commands/deploy)
* 3rd-party systems
  * [`elastic`](./commands/elastic)
  * [`ara`](./commands/ara)

#### Help

The compose outputs help any time you provide the `-h` option. The help will be more accurate if you provide subcommands.

```bash
$DEVTUTO_COMPOSE -h # general help
$DEVTUTO_COMPOSE dockerize -h # dockerize help
```

## Testing

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
