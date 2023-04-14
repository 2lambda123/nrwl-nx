import { readNxJson, Tree, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { setDefaultBaseIfNotSet } from './set-default-base-if-not-set';

describe('add `defaultBase` in nx.json', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should set defaultBase to master if not present', async () => {
    writeJson(tree, 'nx.json', { npmScope: 'unitTests' });
    await setDefaultBaseIfNotSet(tree);

    const config = readNxJson(tree);
    expect(config.affected.defaultBase).toEqual('master');
  });

  it('should not update defaultBase if present', async () => {
    writeJson(tree, 'nx.json', {
      npmScope: 'unitTests',
      affected: { defaultBase: 'main' },
    });
    await setDefaultBaseIfNotSet(tree);

    const config = readNxJson(tree);
    expect(config.affected.defaultBase).toEqual('main');
  });
});
