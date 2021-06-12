import {
  NxJsonProjectConfiguration,
  readJson,
  readProjectConfiguration,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { libraryGenerator } from '../library/library';

import convertToNxProject, {
  PROJECT_OR_ALL_IS_REQUIRED,
  SCHEMA_OPTIONS_ARE_MUTUALLY_EXCLUSIVE,
} from './convert-to-nx-project';
import { getProjectConfigurationPath } from './utils/get-project-configuration-path';

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  readJsonSync: () => ({}),
}));

describe('convert-to-nx-project', () => {
  it('should throw if project && all are both specified', async () => {
    const tree = createTreeWithEmptyWorkspace(2);

    await libraryGenerator(tree, {
      name: 'lib',
      standaloneConfig: false,
    });

    const p = convertToNxProject(tree, { all: true, project: 'lib' });
    await expect(p).rejects.toMatch(SCHEMA_OPTIONS_ARE_MUTUALLY_EXCLUSIVE);
  });

  it('should throw if neither project nor all are specified', async () => {
    const tree = createTreeWithEmptyWorkspace(2);

    await libraryGenerator(tree, {
      name: 'lib',
      standaloneConfig: false,
    });

    const p = convertToNxProject(tree, {});
    await expect(p).rejects.toMatch(PROJECT_OR_ALL_IS_REQUIRED);
  });

  it('should extract single project configuration to project.json', async () => {
    const tree = createTreeWithEmptyWorkspace(2);

    await libraryGenerator(tree, {
      name: 'lib',
      standaloneConfig: false,
    });

    const config = readProjectConfiguration(tree, 'lib');

    await convertToNxProject(tree, { project: 'lib' });
    const newConfigFile = await readJson(
      tree,
      getProjectConfigurationPath(config)
    );

    expect(config).toEqual(newConfigFile);
  });

  it('should extract all project configurations to project.json', async () => {
    const tree = createTreeWithEmptyWorkspace(2);

    await libraryGenerator(tree, {
      name: 'lib',
      standaloneConfig: false,
    });

    await libraryGenerator(tree, {
      name: 'lib2',
      standaloneConfig: false,
    });

    const configs = ['lib', 'lib2'].map((x) =>
      readProjectConfiguration(tree, x)
    );

    await convertToNxProject(tree, { all: true });

    for (const config of configs) {
      const newConfigFile = await readJson(
        tree,
        getProjectConfigurationPath(config)
      );
      expect(config).toEqual(newConfigFile);
    }
  });

  it('should extract tags from nx.json into project.json', async () => {
    const tree = createTreeWithEmptyWorkspace(2);

    await libraryGenerator(tree, {
      name: 'lib',
      tags: 'scope:test',
      standaloneConfig: false,
    });

    const config = readProjectConfiguration(tree, 'lib');

    await convertToNxProject(tree, { all: true });

    const newConfigFile = await readJson<NxJsonProjectConfiguration>(
      tree,
      getProjectConfigurationPath(config)
    );
    expect(newConfigFile.tags).toEqual(['scope:test']);
  });

  it('should set workspace.json to point to the root directory', async () => {
    const tree = createTreeWithEmptyWorkspace(2);
    await libraryGenerator(tree, {
      name: 'lib',
      standaloneConfig: false,
    });

    const config = readProjectConfiguration(tree, 'lib');
    await convertToNxProject(tree, { project: 'lib' });
    const json = readJson(tree, 'workspace.json');
    expect(json.projects.lib).toEqual(config.root);
  });
});
