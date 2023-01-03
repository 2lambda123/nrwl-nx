import { createTreeWithEmptyWorkspace } from '../../generators/testing-utils/create-tree-with-empty-workspace';
import type { Tree } from '../../generators/tree';
import {
  readNxJson,
  updateNxJson,
} from '../../generators/utils/project-configuration';
import createTargetDefaults from './create-target-defaults';

describe('createTargetDefaults', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should work', async () => {
    const nxJson = readNxJson(tree);
    nxJson.targetDependencies = {
      a: [],
      b: [
        'bb',
        { target: 'bbb', projects: 'self' },
        { target: 'c', projects: 'dependencies' },
      ],
    };
    updateNxJson(tree, nxJson);
    await createTargetDefaults(tree);

    const updated = readNxJson(tree);
    expect(updated.targetDefaults).toEqual({
      a: { dependsOn: [] },
      b: {
        dependsOn: ['bb', 'bbb', '^c'],
      },
    });
    expect(updated.targetDependencies).toBeUndefined();
  });
});
