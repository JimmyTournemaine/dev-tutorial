# Others usefull commands

The Compose CLI does not necessarily contain a command for each possible component deployment.
A lot of feature are managed by the deployer and some others are easily usable by using a shell.

## Pytest (Compose CLI testing)

Pytest tests can be run to check that the compose CLI has not been broken.

**Warning!** System calls are mocked, so "tests passed" does not means that the script will work as expected. This testing is focusing on statements coverage to make sure the code has no error in its logic and purposes.

```bash
docker run -it --rm -v "$(pwd)/bin:/usr/src" --workdir=/usr/src/compose python:3 bash
pip install -U pytest pytest-mock pytest-cov
python -m pytest --cov --no-cov-on-fail --cov-report=term-missing
```

Or using a one-shot command :
```bash
docker run --rm -t -v "$(pwd)/bin:/usr/src" --workdir=/usr/src/compose python:3 bash -c "
pip install -U pytest pytest-mock pytest-cov
python -m pytest --cov --no-cov-on-fail --cov-report=term-missing"
```

## Sphinx: generate documentation

Sphinx is the tool used by <readthedocs.io> to build the documentation website.
You can update and test the documentation locally using the following commands.

```bash
docker run --rm -it -v "$(pwd):/usr/src" --workdir=/usr/src/docs python:3 bash
apt-get update -y && apt-get install enchant-2 -y \
  && pip install -U --exists-action=w --no-cache-dir \
      sphinx sphinx-rtd-theme sphinxcontrib-programoutput myst-parser sphinxcontrib-openapi \
      sphinxcontrib-spelling
  && pip freeze > requirements.txt
```

Then, run `sphinx-build . _build` to regenerate the documentation after changes.
You also can run `sphinx-build -b spelling . _build` to check spelling.

In case you add extensions or any `pip` dependency. You must update the `requirements.txt`.

```bash
pip install my-new-dep
pip freeze > requirements.txt
```
