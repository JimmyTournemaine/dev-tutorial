
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
