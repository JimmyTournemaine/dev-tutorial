## Other usefull CLI

### Pytest (compose testing)

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

### Sphinx generate documentation

```bash
docker run --rm -it -v "$(pwd)/docs:/usr/src/docs" -v "$(pwd)/bin:/usr/src/bin" --workdir=/usr/src/docs python:3 bash
pip install -U sphinx myst-parser sphinx-rtd-theme sphinxcontrib-programoutput
```

Then, run `sphinx-build [-a] . _build` to regenerate the documentation after changes.
