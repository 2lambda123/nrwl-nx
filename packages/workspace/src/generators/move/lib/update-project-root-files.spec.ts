import {
  ensurePackage,
  NX_VERSION,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { NormalizedSchema } from '../schema';
import { updateProjectRootFiles } from './update-project-root-files';

// avoid circular deps
const { libraryGenerator } = ensurePackage('@nrwl/js', NX_VERSION);

describe('updateProjectRootFiles', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should update the relative root in files at the root of the project', async () => {
    const testFile = `module.exports = {
      name: 'my-source',
      preset: '../../jest.config.js',
      coverageDirectory: '../../coverage/libs/my-source',
      snapshotSerializers: [
        'jest-preset-angular/AngularSnapshotSerializer.js',
        'jest-preset-angular/HTMLCommentSerializer.js'
      ]
    };`;
    const testFilePath = '/libs/subfolder/my-destination/jest.config.js';
    await libraryGenerator(tree, {
      name: 'my-source',
    });
    const projectConfig = readProjectConfiguration(tree, 'my-source');
    tree.write(testFilePath, testFile);
    const schema: NormalizedSchema = {
      projectName: 'my-source',
      destination: 'subfolder/my-destination',
      importPath: '@proj/subfolder-my-destination',
      updateImportPath: true,
      newProjectName: 'subfolder-my-destination',
      relativeToRootDestination: 'libs/subfolder/my-destination',
    };

    updateProjectRootFiles(tree, schema, projectConfig);

    const testFileAfter = tree.read(testFilePath, 'utf-8');
    expect(testFileAfter).toContain(`preset: '../../../jest.config.js'`);
    expect(testFileAfter).toContain(
      `coverageDirectory: '../../../coverage/libs/my-source'`
    );
  });
});
