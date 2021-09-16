# Project
project = "Dev'Tutorial"
copyright = '2021, Jimmy Tournemaine'
author = 'Jimmy Tournemaine'

# General
extensions = [
  'myst_parser',
  'sphinxcontrib.programoutput',
  'sphinxcontrib.openapi',
  'sphinxcontrib.spelling',
  'sphinxcontrib.redoc',
]
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# HTML
html_theme = 'sphinx_rtd_theme'

# Markdown MyST
myst_enable_extensions = [
  "replacements",
  "substitution",
]

# Figures
figures = {
  "deployer":     "https://lh3.google.com/u/0/d/1w9TNm8XvqXOBs_PWsY-Fr1xrxV9GT_d_",
  "elastic_dev":  "https://lh3.google.com/u/0/d/1zQGQ-jgjblaTeFCRN6rxdj2x6BYBOH6U",
  "elastic_prod": "https://lh3.google.com/u/0/d/14N5qmg-38vF2G7ltpJV7zYhWI6k6ANvT",
}

# Redoc (OpenAPI)
redoc_uri = 'https://cdn.jsdelivr.net/npm/redoc-asyncapi/bundles/redoc.standalone.js'
redoc = [
  {
    'name': f"{project} REST API",
    'page': 'dev-tutorial-api/rest-specs',
    'spec': '../dev-tutorial-api/openapi-generated.yml',
    'embed': True,
    'opts': {
      'lazy-rendering': True
    }
  },
  {
    'name': f"{project} Websocket API",
    'page': 'dev-tutorial-api/websocket-specs',
    'spec': '../dev-tutorial-api/asyncapi.yml',
    'embed': True,
    'opts': {
      'lazy-rendering': True
    }
  }
]

# Automation code
figure_layout = """
```{{figure}} {url}
  :align: center

```"""

myst_substitutions = {}
for label, url in figures.items():
  myst_substitutions[f"figure_{label}"] = figure_layout.format(url=url)
