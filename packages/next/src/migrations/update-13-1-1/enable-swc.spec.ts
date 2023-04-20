import {
  readProjectConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { applicationGenerator } from '../../generators/application/application';
import { update } from './enable-swc';

describe('Migration: enable SWC', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should remove .babelrc file and fix jest config', async () => {
    await applicationGenerator(tree, {
      style: 'none',
      name: 'demo',
      skipFormat: false,
      swc: false,
    });

    updateJson(tree, 'apps/demo/.babelrc', (json) => {
      json.presets[0] = '@nx/next/babel';

      return json;
    });

    // rename jest config to js as that was standard at this version of nx
    tree.delete('apps/demo/jest.config.ts');
    updateProjectConfiguration(tree, 'demo', {
      ...readProjectConfiguration(tree, 'demo'),
      targets: {
        test: {
          executor: '@nx/jest:jest',
          options: {
            jestConfig: 'apps/demo/jest.config.js',
            passWithNoTests: true,
          },
        },
      },
    });

    // Config that isn't configured properly
    tree.write(
      'apps/demo/jest.config.js',
      `
module.exports = {
  displayName: 'napp4',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/demo',
};

`
    );

    await update(tree);

    const result = tree.read('apps/demo/jest.config.js').toString();

    expect(result).toMatch(`['babel-jest', { presets: ['@nx/next/babel'] }]`);

    expect(tree.exists('apps/demo/.babelrc')).toBe(false);
  });

  it('should still fix jest config when babelrc is missing', async () => {
    await applicationGenerator(tree, {
      style: 'none',
      name: 'demo',
      skipFormat: false,
      swc: true,
    });
    // rename jest config to js as that was standard at this version of nx
    tree.delete('apps/demo/jest.config.ts');
    updateProjectConfiguration(tree, 'demo', {
      ...readProjectConfiguration(tree, 'demo'),
      targets: {
        test: {
          executor: '@nx/jest:jest',
          options: {
            jestConfig: 'apps/demo/jest.config.js',
            passWithNoTests: true,
          },
        },
      },
    });
    // Config that isn't configured properly
    tree.write(
      'apps/demo/jest.config.js',
      `
module.exports = {
  displayName: 'napp4',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/demo',
};

`
    );

    await update(tree);

    const result = tree.read('apps/demo/jest.config.js').toString();

    expect(result).toMatch(`['babel-jest', { presets: ['@nx/next/babel'] }]`);
  });
  it('should skip migration if the babelrc has been customized', async () => {
    await applicationGenerator(tree, {
      style: 'none',
      name: 'demo',
      skipFormat: false,
      swc: false,
    });
    // rename jest config to js as that was standard at this version of nx
    tree.rename('apps/demo/jest.config.ts', 'apps/demo/jest.config.js');
    updateProjectConfiguration(tree, 'demo', {
      ...readProjectConfiguration(tree, 'demo'),
      targets: {
        test: {
          executor: '@nx/jest:jest',
          options: {
            jestConfig: 'apps/demo/jest.config.js',
            passWithNoTests: true,
          },
        },
      },
    });
    tree.write(
      'apps/demo/.babelrc',
      `{
        "presets": ["@nx/next/babel", "something-else"],
        "plugins": []
      }`
    );

    await update(tree);

    expect(tree.exists('apps/demo/.babelrc')).toBe(true);

    tree.write(
      'apps/demo/.babelrc',
      `{
        "presets": ["@nx/next/babel"],
        "plugins": ["some-plugin"]
      }`
    );

    await update(tree);

    expect(tree.exists('apps/demo/.babelrc')).toBe(true);

    // No custom plugins, can migrate.
    tree.write(
      'apps/demo/.babelrc',
      `{
        "presets": ["@nx/next/babel"]
      }`
    );

    await update(tree);

    expect(tree.exists('apps/demo/.babelrc')).toBe(false);
  });

  it('should skip migration if storybook configuration is detected', async () => {
    await applicationGenerator(tree, {
      style: 'none',
      name: 'demo',
      skipFormat: false,
      swc: false,
    });

    tree.write(
      'apps/demo/.babelrc',
      `{
        "presets": ["@nx/next/babel"]
      }`
    );
    tree.write(
      'apps/demo/.storybook/main.js',
      `module.exports = {
        stories: []
      }`
    );

    await update(tree);

    expect(tree.exists('apps/demo/.babelrc')).toBe(true);
  });
});
