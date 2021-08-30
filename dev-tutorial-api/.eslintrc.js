module.exports = {
  root: true,
  extends: [
    'airbnb-typescript/base',
    'plugin:jsdoc/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["tsconfig.json"],
  },
  ignorePatterns: ['.eslintrc.js', '.scannerwork/**/*'],
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
    "no-plusplus": "off", // cause of semi
    "no-void": ["error", { "allowAsStatement": true }], // cause of @typescript-eslint/no-floating-promises
    // resolve if node_modules are installed
    "import/no-unresolved": require("fs").existsSync(`${__dirname}/node_modules`) ? "error" : "off",
    // all files are .ts
    "import/extensions": "off",
    // others
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],
    "@typescript-eslint/no-unused-vars": ["error"],
    "no-restricted-syntax": "off",
    "jsdoc/check-tag-names": ["warn", { "definedTags": ["openapi"] }],
    "import/no-extraneous-dependencies": ["error", { "devDependencies": ["**/src/**/*.spec.ts","**/src/**/*.test.ts"] }],
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
  },
  overrides: [
    {
      files: "*.spec.ts",
      files: "*.test.ts",
      rules: {
        // mocha limitations
        "@typescript-eslint/no-unused-expressions": "off",
        "func-names": "off",
      }
    }
  ]
};
