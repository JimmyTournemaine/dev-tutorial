# Getting Started

## Requirements

* Python >= 2
* Docker Engine API >= 1.40

* MacOS: Uncomment "socat" part in docker-compose.yml and "socat" dependencies in the other services.
* Others: make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".

## Build and run

You can compose you environment easily using the provided script.
For more information, run `./compose.py -h`

```bash
# Build and start
./compose.py --build --up

# Only build or start
./compose.sh --build
./compose.sh --up

# For testing purpose
./compose.sh --up -e test
```

# Cheatsheet

Retrieve `node_modules` generated in the docker containers :

```bash
docker cp dev-tutorial-cli:/usr/src/app/gen/node_modules ./dev-tutorial-cli/
docker cp dev-tutorial-api:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-api-test:/usr/src/app/api/node_modules ./dev-tutorial-api/
docker cp dev-tutorial-app:/usr/src/app/app-ui/node_modules ./dev-tutorial-app/
```
