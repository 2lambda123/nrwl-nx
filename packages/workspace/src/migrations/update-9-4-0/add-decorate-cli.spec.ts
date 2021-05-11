import { Tree } from '@angular-devkit/schematics';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { runMigration } from '../../utils/testing';
import { readJsonInTree, writeJsonInTree } from '../../utils/ast-utils';

function createAngularCLIPoweredWorkspace() {
  const tree = createEmptyWorkspace(Tree.empty());
  tree.delete('workspace.json');
  tree.create('angular.json', '{}');
  return tree;
}

describe('Decorate Angular CLI to ensure computation caching', () => {
  it('should add postinstall script and the file when used with Angular CLI', async () => {
    const tree = createAngularCLIPoweredWorkspace();
    writeJsonInTree(tree, '/package.json', { scripts: { ng: 'ng' } });
    const result = await runMigration('add-decorate-cli', {}, tree);
    const packageJson = readJsonInTree(result, '/package.json');
    expect(packageJson.scripts.postinstall).toEqual(
      'node ./decorate-angular-cli.js'
    );
    expect(packageJson.scripts.ng).toEqual('nx');
    expect(result.exists('decorate-angular-cli.js')).toBeTruthy();
  });

  it('should handle the case when postinstall script is already present', async () => {
    const tree = createAngularCLIPoweredWorkspace();
    writeJsonInTree(tree, '/package.json', {
      scripts: { postinstall: 'echo 1' },
    });
    const result = await runMigration('add-decorate-cli', {}, tree);
    const packageJson = readJsonInTree(result, '/package.json');
    expect(packageJson.scripts.postinstall).toEqual(
      'echo 1 && node ./decorate-angular-cli.js'
    );
  });

  it('should do nothing when used with Nx CLI', async () => {
    const tree = createEmptyWorkspace(Tree.empty());
    const result = await runMigration('add-decorate-cli', {}, tree);
    const packageJson = readJsonInTree(result, '/package.json');
    expect(packageJson.scripts).toBeUndefined();
    expect(result.exists('decorate-angular-cli.js')).toBeFalsy();
  });
});
