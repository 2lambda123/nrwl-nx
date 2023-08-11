import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  readJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addLinting } from './add-linting';
import { Linter } from '@nx/linter';
import { NormalizedSchema } from './normalize-options';

describe('updateEslint', () => {
  let tree: Tree;
  let schema: NormalizedSchema;

  beforeEach(async () => {
    schema = {
      projectName: 'my-app',
      appProjectRoot: 'apps/my-app',
      linter: Linter.EsLint,
      unitTestRunner: 'jest',
      e2eProjectName: 'my-app-e2e',
      e2eProjectRoot: 'apps/my-app-e2e',
      outputPath: 'dist/apps/my-app',
      name: 'my-app',
      parsedTags: [],
      fileName: 'index',
      e2eTestRunner: 'cypress',
      styledModule: null,
    };
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    const project: ProjectConfiguration = {
      root: schema.appProjectRoot,
      sourceRoot: schema.appProjectRoot,
      projectType: 'application',
      targets: {},
      tags: schema.parsedTags,
    };

    addProjectConfiguration(tree, schema.projectName, {
      ...project,
    });
  });

  it('should update the eslintrc config', async () => {
    tree.write('.eslintrc.json', JSON.stringify({ extends: ['some-config'] }));

    await addLinting(tree, schema);

    expect(readJson(tree, `${schema.appProjectRoot}/.eslintrc.json`))
      .toMatchInlineSnapshot(`
      {
        "extends": [
          "plugin:@nx/react-typescript",
          "next",
          "next/core-web-vitals",
          "../../.eslintrc.json",
        ],
        "ignorePatterns": [
          "!**/*",
          ".next/**/*",
        ],
        "overrides": [
          {
            "files": [
              "*.*",
            ],
            "rules": {
              "@next/next/no-html-link-for-pages": "off",
            },
          },
          {
            "files": [
              "*.ts",
              "*.tsx",
              "*.js",
              "*.jsx",
            ],
            "rules": {
              "@next/next/no-html-link-for-pages": [
                "error",
                "apps/my-app/pages",
              ],
            },
          },
          {
            "files": [
              "*.ts",
              "*.tsx",
            ],
            "rules": {},
          },
          {
            "files": [
              "*.js",
              "*.jsx",
            ],
            "rules": {},
          },
          {
            "env": {
              "jest": true,
            },
            "files": [
              "*.spec.ts",
              "*.spec.tsx",
              "*.spec.js",
              "*.spec.jsx",
            ],
          },
        ],
      }
    `);
  });

  it('should update the flat config', async () => {
    tree.write('eslint.config.js', `module.exports = []`);

    await addLinting(tree, schema);

    expect(tree.read(`${schema.appProjectRoot}/eslint.config.js`, 'utf-8'))
      .toMatchInlineSnapshot(`
      "const FlatCompat = require("@eslint/eslintrc");
      const js = require("@eslint/js");
      const baseConfig = require("../../eslint.config.js");
      const compat = new FlatCompat({
            baseDirectory: __dirname,
            recommendedConfig: js.configs.recommended,
          });
        

      module.exports = [
      {
          files: ["apps/my-app/**/*.*"],
          rules: { "@next/next/no-html-link-for-pages": "off" }
      },
          ...baseConfig,
          {
        "files": [
          "apps/my-app/**/*.ts",
          "apps/my-app/**/*.tsx",
          "apps/my-app/**/*.js",
          "apps/my-app/**/*.jsx"
        ],
        "rules": {
          "@next/next/no-html-link-for-pages": [
            "error",
            "apps/my-app/pages"
          ]
        }
          },
          {
              files: [
                  "apps/my-app/**/*.ts",
                  "apps/my-app/**/*.tsx"
              ],
              rules: {}
          },
          {
              files: [
                  "apps/my-app/**/*.js",
                  "apps/my-app/**/*.jsx"
              ],
              rules: {}
          },
      ...compat.extends("plugin:@nx/react-typescript", "next", "next/core-web-vitals"),
      ...compat.config({ env: { jest: true } }).map(config => ({
          ...config,
          files: [
              "apps/my-app/**/*.spec.ts",
              "apps/my-app/**/*.spec.tsx",
              "apps/my-app/**/*.spec.js",
              "apps/my-app/**/*.spec.jsx"
          ]
      })),
      { ignores: ["apps/my-app/.next/**/*"] }
      ];
      "
    `);
  });
});
