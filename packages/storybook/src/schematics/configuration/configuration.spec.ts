import { Tree } from '@angular-devkit/schematics';
import { readJsonInTree, getProjectConfig } from '@nrwl/workspace';

import { createTestUILib, runSchematic } from '../../utils/testing';
import { getTsConfigContent, TsConfig } from '../../utils/utils';
import * as fileUtils from '@nrwl/workspace/src/core/file-utils';

describe('schematic:configuration', () => {
  let appTree: Tree;

  beforeEach(async () => {
    appTree = await createTestUILib('test-ui-lib', '@nrwl/angular');
    jest.spyOn(fileUtils, 'readPackageJson').mockReturnValue({
      devDependencies: {
        '@storybook/addon-essentials': '^6.0.21',
        '@storybook/angular': '^6.0.21',
      },
    });
  });

  it('should generate files', async () => {
    const tree = await runSchematic(
      'configuration',
      { name: 'test-ui-lib' },
      appTree
    );

    // Root
    expect(tree.exists('.storybook/tsconfig.json')).toBeTruthy();
    expect(tree.exists('.storybook/main.js')).toBeTruthy();
    const rootStorybookTsconfigJson = readJsonInTree<TsConfig>(
      tree,
      '.storybook/tsconfig.json'
    );
    expect(rootStorybookTsconfigJson.exclude).toEqual([
      '../**/*.spec.js',
      '../**/*.spec.ts',
      '../**/*.spec.tsx',
      '../**/*.spec.jsx',
    ]);

    // Local
    expect(
      tree.exists('libs/test-ui-lib/.storybook/webpack.config.js')
    ).toBeTruthy();
    expect(tree.exists('libs/test-ui-lib/.storybook/main.js')).toBeTruthy();
  });

  it('should update workspace file', async () => {
    const tree = await runSchematic(
      'configuration',
      { name: 'test-ui-lib' },
      appTree
    );
    const project = getProjectConfig(tree, 'test-ui-lib');

    expect(project.architect.storybook).toEqual({
      builder: '@nrwl/storybook:storybook',
      configurations: {
        ci: {
          quiet: true,
        },
      },
      options: {
        port: 4400,
        config: {
          configFolder: 'libs/test-ui-lib/.storybook',
        },
      },
    });

    expect(project.architect.lint).toEqual({
      builder: '@angular-devkit/build-angular:tslint',
      options: {
        exclude: ['**/node_modules/**', '!libs/test-ui-lib/**/*'],
        tsConfig: [
          'libs/test-ui-lib/tsconfig.lib.json',
          'libs/test-ui-lib/tsconfig.spec.json',

        ],
      },
    });
  });

  it('should update `tsconfig.lib.json` file', async () => {
    const tree = await runSchematic(
      'configuration',
      { name: 'test-ui-lib' },
      appTree
    );
    const tsconfigJson = getTsConfigContent(
      tree,
      'libs/test-ui-lib/tsconfig.lib.json'
    ) as Required<TsConfig>;

    expect(tsconfigJson.exclude.includes('**/*.stories.ts')).toBeTruthy();
    expect(tsconfigJson.exclude.includes('**/*.stories.js')).toBeTruthy();
    expect(tsconfigJson.exclude.includes('**/*.stories.jsx')).toBeFalsy();
    expect(tsconfigJson.exclude.includes('**/*.stories.tsx')).toBeFalsy();
  });

  it('should update `tsconfig.json` file', async () => {
    const tree = await runSchematic(
      'configuration',
      { name: 'test-ui-lib' },
      appTree
    );
    const tsconfigJson = getTsConfigContent(
      tree,
      'libs/test-ui-lib/tsconfig.json'
    );

    expect(tsconfigJson.references).toMatchInlineSnapshot(`
      Array [
        Object {
          "path": "./tsconfig.lib.json",
        },
        Object {
          "path": "./tsconfig.spec.json",
        },
        Object {
          "path": "./.storybook/tsconfig.json",
        },
      ]
    `);
  });
});
