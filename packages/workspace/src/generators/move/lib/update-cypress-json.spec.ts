import {
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  readJson,
  writeJson,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Schema } from '../schema';
import { updateCypressJson } from './update-cypress-json';
import { libraryGenerator } from '../../library/library';

describe('updateCypressJson', () => {
  let tree: Tree;
  let schema: Schema;
  let projectConfig: ProjectConfiguration;

  beforeEach(async () => {
    schema = {
      projectName: 'my-lib',
      destination: 'my-destination',
      importPath: undefined,
      updateImportPath: true,
    };

    tree = createTreeWithEmptyWorkspace();
    await libraryGenerator(tree, { name: 'my-lib', standaloneConfig: false });
    projectConfig = readProjectConfiguration(tree, 'my-lib');
  });

  it('should handle cypress.json not existing', async () => {
    expect(() => {
      updateCypressJson(tree, schema, projectConfig);
    }).not.toThrow();
  });

  it('should update the videos and screenshots folders', async () => {
    const cypressJson = {
      fileServerFolder: '.',
      fixturesFolder: './src/fixtures',
      integrationFolder: './src/integration',
      pluginsFile: './src/plugins/index',
      supportFile: false,
      video: true,
      videosFolder: '../../dist/cypress/libs/my-lib/videos',
      screenshotsFolder: '../../dist/cypress/libs/my-lib/screenshots',
      chromeWebSecurity: false,
    };

    writeJson(tree, '/libs/my-destination/cypress.json', cypressJson);

    updateCypressJson(tree, schema, projectConfig);

    expect(readJson(tree, '/libs/my-destination/cypress.json')).toEqual({
      ...cypressJson,
      videosFolder: '../../dist/cypress/libs/my-destination/videos',
      screenshotsFolder: '../../dist/cypress/libs/my-destination/screenshots',
    });
  });
});
