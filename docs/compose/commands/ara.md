# ARA

```bash
$DEVTUTO_COMPOSE deployer 'ansible-playbook ara.yml'
```
The ARA (ARA Records Ansible) can be enable any time using the `ara` playbook to record all the future Ansible plays (<http://localhost:12000>)

To deactivate and clean ARA, just run the previous command with `--tags=cleanup`.
