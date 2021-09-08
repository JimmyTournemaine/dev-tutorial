# Elastic

```{program-output} /usr/src/bin/compose/compose.py security --help

```

```bash
$DEVTUTO_COMPOSE elastic # default: dev
$DEVTUTO_COMPOSE elastic dev
$DEVTUTO_COMPOSE elastic prod
```

Run the Elastic stack that is collecting :
* Logs using Filebeat
* Metrics using Metricbeat
* Healthcheck using Heartbeat

```bash
$DEVTUTO_COMPOSE elastic --tags=cleanup # default: dev
$DEVTUTO_COMPOSE elastic --tags=cleanup dev
$DEVTUTO_COMPOSE elastic --tags=cleanup prod
```
