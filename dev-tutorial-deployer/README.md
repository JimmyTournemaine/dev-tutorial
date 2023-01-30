# Dev'Tutorial Deployer

The Ansible deployer that manage all Dev'Tutorial projects automation.

## Upgrading

When upgrading any component from the Dockerfile, you should :

```bash
# 1. Build the new version of the image.
docker build -t tzimy/dev-tutorial-deployer:latest .

# 2. Scan the image to find vulnerabilities and learn how to fix them.
docker scan -f Dockerfile tzimy/dev-tutorial-deployer:latest

#. 3. Publish the image to the docker hub.
docker push tzimy/dev-tutorial-deployer:latest
```
