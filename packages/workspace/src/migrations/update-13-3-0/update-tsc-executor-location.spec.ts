import {
  Tree,
  addProjectConfiguration,
  getProjects,
  readJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { updateTscExecutorLocation } from './update-tsc-executor-location';

describe('add `defaultBase` in nx.json', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should update @nrwl/workspace:tsc -> @nx/js:tsc', async () => {
    addProjectConfiguration(tree, 'tsc-project', {
      root: 'projects/tsc-project',
      targets: {
        build: {
          executor: '@nrwl/workspace:tsc',
        },
        test: {
          executor: '@nx/jest:jest',
        },
      },
    });
    addProjectConfiguration(tree, 'other-project', {
      root: 'projects/other-project',
      targets: {
        build: {
          executor: '@nx/react:build',
        },
        test: {
          executor: '@nx/jest:jest',
        },
      },
    });
    await updateTscExecutorLocation(tree);
    const projects = Object.fromEntries(getProjects(tree).entries());
    expect(projects).toEqual({
      'tsc-project': {
        $schema: '../../node_modules/nx/schemas/project-schema.json',
        name: 'tsc-project',
        root: 'projects/tsc-project',
        targets: {
          build: {
            executor: '@nx/js:tsc',
          },
          test: {
            executor: '@nx/jest:jest',
          },
        },
      },
      'other-project': {
        $schema: '../../node_modules/nx/schemas/project-schema.json',
        name: 'other-project',
        root: 'projects/other-project',
        targets: {
          build: {
            executor: '@nx/react:build',
          },
          test: {
            executor: '@nx/jest:jest',
          },
        },
      },
    });
  });

  it('should add @nx/js dependency', async () => {
    addProjectConfiguration(tree, 'tsc-project', {
      root: 'projects/tsc-project',
      targets: {
        build: {
          executor: '@nrwl/workspace:tsc',
        },
      },
    });
    await updateTscExecutorLocation(tree);
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies).toMatchObject({
      '@nx/js': expect.anything(),
    });
  });
});
