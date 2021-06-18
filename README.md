# Dev' Tutorial

## Getting started

### Requirements

* Python >= 2 (or download [the latest artifact generated from the GitHub action](https://github.com/JimmyTournemaine))
* Docker Engine API >= 1.40

#### OS Specific requirements

* MacOS: None, a socat container will automatically start to expose the Docker daemon on port 2375
* Windows: make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".

### Build and run

You can compose you environment easily using the provided script.
For more information, run `./bin/compose/compose.py -h`

```bash
# Development environement (watching for changes)
./bin/compose/compose.py dockerize dev

# Production environment (pull officially deployed production images)
./bin/compose/compose.py deploy

# Documentation server
./bin/compose/compose.py docs generate
./bin/compose/compose.py docs start
```

When your environment setup is completed, your browser will open the application frontend.
Here is the list of endpoints :
* Application: [http://localhost:4200]
* API Documentation: [http://localhost:8000/]

The development environment allow you to use direct links but any other environment could close the backend access.

## Development

### Dependencies

* Use `yarn` instead of `npm` to manage NodeJS dependencies.
* When a dependency is added, you shall rebuild at least the docker image.

When running the dockerize command, the deployer will force the image rebuild if changes are detected in `package.json`:

```bash
./bin/compose/compose.py dockerize <env>
```

### API

Any modification of the API has an impact on the front. Thus, these changes must be considered:
* Update the *OpenAPI Specification* documentation in *JSDocs*.
* Update the model used from the frontend if needed.
* Increment the API version if needed.

To get the current API documentation, run `./bin/compose/compose.py docs <generate|start>`

### Commands Cheatsheet

**Retrieve node_modules from containers to local host for IDE support**

```bash
# Clean 
rm -rf ./dev-tutorial-api/node_modules
rm -rf ./dev-tutorial-app/node_modules

# Fetch dependencies
docker cp dev-tutorial-api:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/
```

_Note : the `dockerize` script already retrieve dependencies after a successful `dev` environment startup._

**Deployer development**

To open a shell in a deployer instance, you should run `./bin/compose/compose.py deployer sh`

To run a molecule test on a deployer role:
```bash
cd <path to the role to test>
python3 -m molecule test

## Quality Assurance

Before creating a pull request (will also be CI-checked):
* ./compose.py dockerize test
* ./compose.py lint [--fix]

## Troubleshooting

* Error building *image*: no space left on device

Solution: Remove any unnecessary Docker objects from you system.
You can run the following command :

```bash
./compose.py prune -f
```

* Error creating container: UnixHTTPConnectionPool(host='localhost', port=None): Read timed out

Solution: Retry one more time. If the trouble persists, restart the docker daemon and try again.
