# Dev' Tutorial

## Getting started

### Requirements

* Python >= 2 (or using the compose bundle)
* Docker Engine API >= 1.40

* MacOS: a socat container will automatically start to expose the Docker daemon on port 2375
* Windows: make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".

### Build and run

You can compose you environment easily using the provided script.
For more information, run `compose.sh -h` or `compose.ps1 -h`

```bash
./compose.py dockerize dev
```

When your environment setup is completed, your browser will open the application frontend.
Here is the list of endpoints :
* Application: [http://localhost:4200]
* API Documentation: [http://localhost:4200/api-docs] (proxy) or [http://localhost:3000/api-docs] (direct link)

The `dev` environment allow you to use direct links but any other environment could close the backend access.

## Development

### Dependencies

* Use `yarn` instead of `npm` to manage NodeJS dependencies.
* When a dependecy is added, you shall rebuild at least the docker image.

To force image rebuild, you can use the following command :

```bash
./compose.py dockerize <dev|test> -a dockerize_force=yes
```

Many options are available to force some rebuilding or restarting. See `docker_force` variables in the deployer at `dev-tutorial-deployer/roles/dockerize/defaults/main.yml`.

### API

Any modification of the API has an impact on the front. Thus, these changes must be considered:
* Update the *OpenAPI Specification* documentation in *JSDocs*.
* Update the model use from the frontend if needed.
* Increment the API version if needed.

To get the current API documentation, run `compose.py docs`


### Commands Cheatsheet

**Retrieve node_modules from containers to local host**

```bash
# Clean 
rm -rf ./dev-tutorial-api/node_modules
rm -rf ./dev-tutorial-app/node_modules

# Dev containers
docker cp dev-tutorial-api-dev:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app-dev:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/

# Test containers
docker cp dev-tutorial-api-test:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app-test:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/
```

_Note : the `dockerize` script already retrieve dependencies after a successful `dev` environment startup._

## Troubleshooting

* Error building *image*: no space left on device

Solution: Remove any unnecessary Docker objects from you system.
You can run the following command :

```bash
./compose.py prune
```

* Error creating container: UnixHTTPConnectionPool(host='localhost', port=None): Read timed out

Solution: Restart docker
