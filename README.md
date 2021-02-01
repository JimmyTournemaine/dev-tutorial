# Getting Started

## Requirements

* Docker Engine API >= 1.40

For MacOS: 
* Uncomment "socat" part in docker-compose.yml and "socat" dependencies in the other services.
* Others: make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".

## Build and run

Using a shell which handle `declare -A`  (zsh, bash>=4, ...) :
```bash
# Build and start
./compose.sh build-up

# Only build or start
./compose.sh build
./compose.sh up

# For testing purpose
./compose.sh build-up test
./compose.sh build test
./compose.sh up test
```

# Cheatsheet

Retrieve `node_modules` generated in the docker containers :

```bash
docker cp dev-tutorial-cli:/usr/src/app/gen/node_modules ./dev-tutorial-cli/
docker cp dev-tutorial-api:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-api-test:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/
```
