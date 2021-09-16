# Getting started

## Requirements

* Python >= 3 (or download [the last bundle](https://github.com/JimmyTournemaine/dev-tutorial/actions/workflows/bundle.yml))
* Docker Engine API >= 1.40

```{warning}
* **MacOS:** A socat container will automatically start to expose the Docker daemon on port 2375
* **Windows:** make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".
```

## Build and run

### Compose setup

```{include} ./compose/setup_content.md

```

### Run with compose

```bash
# Development environment (watching for changes)
$DEVTUTO_COMPOSE dockerize dev

# Production environment (pull officially deployed production images)
$DEVTUTO_COMPOSE deploy
```

The compose command will generally open your browser at the deployed application page. You can also use the following links.
* [Development environment](http://localhost:4200)
* [Production environment](http://localhost)
