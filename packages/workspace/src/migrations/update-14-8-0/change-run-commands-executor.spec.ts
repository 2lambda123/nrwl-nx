import {
  addProjectConfiguration,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import changeRunCommandsExecutor from './change-run-commands-executor';

describe('changeRunCommandsExecutor', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    addProjectConfiguration(tree, 'proj1', {
      root: 'proj1',
      targets: {
        scriptTarget: {
          executor: '@nrwl/workspace:run-commands',
          options: {},
        },
        notScriptTarget: {
          executor: '@nrwl/workspace:something',
          options: {},
        },
      },
    });
  });

  it('should change the npm script executor to nx:npm-script', async () => {
    await changeRunCommandsExecutor(tree);

    expect(readProjectConfiguration(tree, 'proj1')).toMatchInlineSnapshot(`
      {
        "$schema": "../node_modules/nx/schemas/project-schema.json",
        "name": "proj1",
        "root": "proj1",
        "targets": {
          "notScriptTarget": {
            "executor": "@nrwl/workspace:something",
            "options": {},
          },
          "scriptTarget": {
            "executor": "nx:run-commands",
            "options": {},
          },
        },
      }
    `);
  });
});
