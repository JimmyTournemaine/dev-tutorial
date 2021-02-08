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


## Troubleshooting

* Error building *image*: no space left on device

Solution: Remove any unnecessary Docker objects from you system.
For instance, you could run `docker system prune -af`

* Error creating container: UnixHTTPConnectionPool(host='localhost', port=None): Read timed out

Solution: Restart docker

## Cheatsheet

Retrieve `node_modules` generated in the docker containers :

```bash
docker cp dev-tutorial-cli:/usr/src/app/gen/node_modules ./dev-tutorial-cli/
docker cp dev-tutorial-api:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-api-test:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/
```
