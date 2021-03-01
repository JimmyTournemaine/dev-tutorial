module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
  },
  overrides: [
    {
      files: [
        "*.ts"
      ],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [
          "./tsconfig.app.json",
          "./tsconfig.spec.json",
          "./e2e/tsconfig.json"
        ],
        createDefaultProgram: true,
      },
      extends: [
        'airbnb-typescript/base',
        'plugin:jsdoc/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        "plugin:@angular-eslint/ng-cli-compat",
        "plugin:@angular-eslint/ng-cli-compat--formatting-add-on",
        "plugin:@angular-eslint/template/process-inline-templates",
      ],
      rules: {
        // to progressively activate
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/no-use-before-define": "warn",
        "@typescript-eslint/no-unsafe-call": "warn",
        "@typescript-eslint/no-empty-interface": "warn",
        "class-methods-use-this": "off",
        // not concerned
        "jsdoc/require-param-type": "off", // types required in signature
        "jsdoc/require-returns-type": "off", // types required in signature
        "no-plusplus": "off", // semi always
        "no-void": ["error", { "allowAsStatement": true }], // @typescript-eslint/no-floating-promises
        // resolve if node_modules are installed
        "import/no-unresolved": require("fs").existsSync(`${__dirname}/node_modules`) ? "error" : "off",
        // all files are .ts
        "import/extensions": "off",
        // others
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],
        "no-restricted-syntax": "off",
        "no-shadow": "off",
        // prettier
        "consistent-return": [
          "error",
          {
            "treatUndefinedAsUnspecified": true
          }
        ],
        "import/prefer-default-export": "off",
        "object-curly-newline": ["error", { "consistent": true }],
        "max-len": ["warn", 140],
        "@typescript-eslint/comma-dangle": ["error", "only-multiline"],
        "jsdoc/require-returns": ["warn", {'exemptedBy': ['inheritdoc', 'unknown', 'never', 'void', 'Promise<void>']}],
        // Angular rules
        "import/no-extraneous-dependencies": ["error", { "devDependencies": ["**/src/**/*.spec.ts", "**/e2e/**/*.ts"] }],
        "@angular-eslint/component-selector": [
          "error",
          {
            "type": "element",
            "prefix": "app",
            "style": "kebab-case"
          }
        ],
        "@angular-eslint/directive-selector": [
          "error",
          {
            "type": "attribute",
            "prefix": "app",
            "style": "camelCase"
          }
        ]
      }
    },
    {
      files: [
        "*.html"
      ],
      extends: [
        "plugin:@angular-eslint/template/recommended"
      ],
      rules: {}
    }
  ]
};
