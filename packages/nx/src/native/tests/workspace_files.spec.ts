import { getWorkspaceFilesNative } from '../index';
import { TempFs } from '../../utils/testing/temp-fs';
import { NxJsonConfiguration } from '../../config/nx-json';

describe('workspace files', () => {
  it('should gather workspace file information', async () => {
    const fs = new TempFs('workspace-files');
    const nxJson: NxJsonConfiguration = {};
    await fs.createFiles({
      './nx.json': JSON.stringify(nxJson),
      './package.json': JSON.stringify({
        name: 'repo-name',
        version: '0.0.0',
        dependencies: {},
      }),
      './libs/project1/project.json': JSON.stringify({
        name: 'project1',
      }),
      './libs/project1/index.js': '',
      './libs/project2/project.json': JSON.stringify({
        name: 'project2',
      }),
      './libs/project2/index.js': '',
      './libs/project3/project.json': JSON.stringify({
        name: 'project3',
      }),
      './libs/project3/index.js': '',
      './libs/nested/project/project.json': JSON.stringify({
        name: 'nested-project',
      }),
      './libs/nested/project/index.js': '',
      './libs/package-project/package.json': JSON.stringify({
        name: 'package-project',
      }),
      './libs/package-project/index.js': '',
      './nested/non-project/file.txt': '',
    });

    let globs = ['project.json', '**/project.json', 'libs/*/package.json'];
    let { projectFileMap, configFiles, globalFiles } = getWorkspaceFilesNative(
      fs.tempDir,
      globs
    );

    expect(projectFileMap).toMatchInlineSnapshot(`
      {
        "nested-project": [
          {
            "file": "libs/nested/project/index.js",
            "hash": "3244421341483603138",
          },
          {
            "file": "libs/nested/project/project.json",
            "hash": "2709826705451517790",
          },
        ],
        "package-project": [
          {
            "file": "libs/package-project/index.js",
            "hash": "3244421341483603138",
          },
          {
            "file": "libs/package-project/package.json",
            "hash": "1637510190365604632",
          },
        ],
        "project1": [
          {
            "file": "libs/project1/index.js",
            "hash": "3244421341483603138",
          },
          {
            "file": "libs/project1/project.json",
            "hash": "13466615737813422520",
          },
        ],
        "project2": [
          {
            "file": "libs/project2/index.js",
            "hash": "3244421341483603138",
          },
          {
            "file": "libs/project2/project.json",
            "hash": "1088730393343835373",
          },
        ],
        "project3": [
          {
            "file": "libs/project3/index.js",
            "hash": "3244421341483603138",
          },
          {
            "file": "libs/project3/project.json",
            "hash": "4575237344652189098",
          },
        ],
      }
    `);
    expect(configFiles).toMatchInlineSnapshot(`
      [
        "libs/project2/project.json",
        "libs/nested/project/project.json",
        "libs/project3/project.json",
        "libs/project1/project.json",
        "libs/package-project/package.json",
      ]
    `);
    expect(globalFiles).toMatchInlineSnapshot(`
      [
        {
          "file": "nested/non-project/file.txt",
          "hash": "3244421341483603138",
        },
        {
          "file": "nx.json",
          "hash": "1389868326933519382",
        },
        {
          "file": "package.json",
          "hash": "14409636362330144230",
        },
      ]
    `);
  });
});
