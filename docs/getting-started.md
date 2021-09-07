## Getting started

### Requirements

* Python >= 2 (or download [the latest artifact generated from the GitHub action](https://github.com/JimmyTournemaine))
* Docker Engine API >= 1.40

#### OS Specific requirements

* **MacOS:** None, a socat container will automatically start to expose the Docker daemon on port 2375

* **Windows:** make sure that the Docker Engine API is authorized using the setting: "Exposing Daemon on tcp://localhost:2375 without TLS".

### Build and run

#### Compose setup

To setup your compose path, follow the [Compose setup instructions](./compose/index#setup)

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
