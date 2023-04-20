import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, readProjectConfiguration } from '@nx/devkit';
import update from './add-default-development-configurations';

describe('React default development configuration', () => {
  it('should add development configuration if it does not exist', async () => {
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(
      tree,
      'example',
      {
        root: 'apps/example',
        projectType: 'application',
        targets: {
          build: {
            executor: '@nx/next:build',
            configurations: {},
          },
          serve: {
            executor: '@nx/next:server',
            configurations: {},
          },
        },
      },
      true
    );

    await update(tree);

    const config = readProjectConfiguration(tree, 'example');

    expect(config.targets.build.defaultConfiguration).toEqual('production');
    expect(config.targets.build.configurations.development).toEqual({});

    expect(config.targets.serve.defaultConfiguration).toEqual('development');
    expect(config.targets.serve.configurations.development).toEqual({
      buildTarget: `example:build:development`,
      dev: true,
    });
  });

  it('should add development configuration if no configurations at all', async () => {
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(
      tree,
      'example',
      {
        root: 'apps/example',
        projectType: 'application',
        targets: {
          build: {
            executor: '@nx/next:build',
            defaultConfiguration: 'production',
            configurations: { production: {} },
          },
          serve: {
            executor: '@nx/next:server',
          },
        },
      },
      true
    );

    await update(tree);

    const config = readProjectConfiguration(tree, 'example');

    expect(config.targets.build.defaultConfiguration).toEqual('production');
    expect(config.targets.build.configurations.production).toEqual({});
    expect(config.targets.build.configurations.development).toEqual({});

    expect(config.targets.serve.defaultConfiguration).toEqual('development');
    expect(config.targets.serve.configurations.development).toEqual({
      buildTarget: `example:build:development`,
      dev: true,
    });
  });

  it('should work without targets', async () => {
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(
      tree,
      'example',
      {
        root: 'apps/example',
        projectType: 'application',
      },
      true
    );

    await update(tree);

    const config = readProjectConfiguration(tree, 'example');
    expect(config).toEqual({
      $schema: '../../node_modules/nx/schemas/project-schema.json',
      name: 'example',
      root: 'apps/example',
      projectType: 'application',
    });
  });
});
