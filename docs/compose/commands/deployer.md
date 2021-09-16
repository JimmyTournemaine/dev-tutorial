# Deployer

## Usage

```{program-output} ../bin/compose/compose.py deployer --help

```

## Usefull executions

### ARA: ARA Records Ansible

```bash
$DEVTUTO_COMPOSE deployer 'ansible-playbook ara.yml'
```
The ARA (ARA Records Ansible) can be enable any time using the `ara` playbook to record all the future Ansible plays (<http://localhost:12000>)

To deactivate and clean ARA, just run the previous command with `--tags=cleanup`.

{{ figure_deployer }}

### Get a shell

```bash
$DEVTUTO_COMPOSE deployer sh
```
To open a shell or execute a specific command in the deployer container.

### Ansible ad-hoc

```bash
$DEVTUTO_COMPOSE deployer 'ansible dev-tutorial-back -m ping'
```
Run an ansible ad-hoc command to ping de `dev-tutorial-back` host.
