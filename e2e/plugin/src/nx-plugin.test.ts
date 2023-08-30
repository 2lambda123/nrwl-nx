import { ProjectConfiguration } from '@nx/devkit';
import {
  checkFilesExist,
  cleanupProject,
  createFile,
  expectTestsPass,
  getPackageManagerCommand,
  newProject,
  readJson,
  runCLI,
  runCLIAsync,
  runCommand,
  uniq,
  updateFile,
  updateJson,
} from '@nx/e2e/utils';
import type { PackageJson } from 'nx/src/utils/package-json';

import { ASYNC_GENERATOR_EXECUTOR_CONTENTS } from './nx-plugin.fixtures';
import { join } from 'path';

describe('Nx Plugin', () => {
  let npmScope: string;

  beforeAll(() => {
    npmScope = newProject({
      unsetProjectNameAndRootFormat: false,
    });
  });

  afterAll(() => cleanupProject());

  it('should be able to generate a Nx Plugin ', async () => {
    const plugin = uniq('plugin');

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint --e2eTestRunner=jest --publishable`
    );
    const lintResults = runCLI(`lint ${plugin}`);
    expect(lintResults).toContain('All files pass linting.');

    const buildResults = runCLI(`build ${plugin}`);
    expect(buildResults).toContain('Done compiling TypeScript files');
    checkFilesExist(
      `dist/packages/${plugin}/package.json`,
      `dist/packages/${plugin}/src/index.js`
    );
    const project = readJson(`packages/${plugin}/project.json`);
    expect(project).toMatchObject({
      tags: [],
    });
    runCLI(`e2e ${plugin}-e2e`);
  }, 90000);

  it('should be able to generate a migration', async () => {
    const plugin = uniq('plugin');
    const version = '1.0.0';

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint`
    );
    runCLI(
      `generate @nx/plugin:migration --project=${plugin} --packageVersion=${version} --packageJsonUpdates=false`
    );

    const lintResults = runCLI(`lint ${plugin}`);
    expect(lintResults).toContain('All files pass linting.');

    expectTestsPass(await runCLIAsync(`test ${plugin}`));

    const buildResults = runCLI(`build ${plugin}`);
    expect(buildResults).toContain('Done compiling TypeScript files');
    checkFilesExist(
      `dist/packages/${plugin}/src/migrations/update-${version}/update-${version}.js`,
      `packages/${plugin}/src/migrations/update-${version}/update-${version}.ts`
    );
    const migrationsJson = readJson(`packages/${plugin}/migrations.json`);
    expect(migrationsJson).toMatchObject({
      generators: expect.objectContaining({
        [`update-${version}`]: {
          version,
          description: `update-${version}`,
          implementation: `./src/migrations/update-${version}/update-${version}`,
        },
      }),
    });
  }, 90000);

  it('should be able to generate a generator', async () => {
    const plugin = uniq('plugin');
    const generator = uniq('generator');

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint`
    );
    runCLI(`generate @nx/plugin:generator ${generator} --project=${plugin}`);

    const lintResults = runCLI(`lint ${plugin}`);
    expect(lintResults).toContain('All files pass linting.');

    expectTestsPass(await runCLIAsync(`test ${plugin}`));

    const buildResults = runCLI(`build ${plugin}`);
    expect(buildResults).toContain('Done compiling TypeScript files');
    checkFilesExist(
      `packages/${plugin}/src/generators/${generator}/schema.d.ts`,
      `packages/${plugin}/src/generators/${generator}/schema.json`,
      `packages/${plugin}/src/generators/${generator}/generator.ts`,
      `packages/${plugin}/src/generators/${generator}/generator.spec.ts`,
      `dist/packages/${plugin}/src/generators/${generator}/schema.d.ts`,
      `dist/packages/${plugin}/src/generators/${generator}/schema.json`,
      `dist/packages/${plugin}/src/generators/${generator}/generator.js`
    );
    const generatorJson = readJson(`packages/${plugin}/generators.json`);
    expect(generatorJson).toMatchObject({
      generators: expect.objectContaining({
        [generator]: {
          factory: `./src/generators/${generator}/generator`,
          schema: `./src/generators/${generator}/schema.json`,
          description: `${generator} generator`,
        },
      }),
    });
  }, 90000);

  it('should be able to generate an executor', async () => {
    const plugin = uniq('plugin');
    const executor = uniq('executor');

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint`
    );
    runCLI(
      `generate @nx/plugin:executor ${executor} --project=${plugin} --includeHasher`
    );

    const lintResults = runCLI(`lint ${plugin}`);
    expect(lintResults).toContain('All files pass linting.');

    expectTestsPass(await runCLIAsync(`test ${plugin}`));

    const buildResults = runCLI(`build ${plugin}`);
    expect(buildResults).toContain('Done compiling TypeScript files');
    checkFilesExist(
      `packages/${plugin}/src/executors/${executor}/schema.d.ts`,
      `packages/${plugin}/src/executors/${executor}/schema.json`,
      `packages/${plugin}/src/executors/${executor}/executor.ts`,
      `packages/${plugin}/src/executors/${executor}/hasher.ts`,
      `packages/${plugin}/src/executors/${executor}/executor.spec.ts`,
      `dist/packages/${plugin}/src/executors/${executor}/schema.d.ts`,
      `dist/packages/${plugin}/src/executors/${executor}/schema.json`,
      `dist/packages/${plugin}/src/executors/${executor}/executor.js`,
      `dist/packages/${plugin}/src/executors/${executor}/hasher.js`
    );
    const executorsJson = readJson(`packages/${plugin}/executors.json`);
    expect(executorsJson).toMatchObject({
      executors: expect.objectContaining({
        [executor]: {
          implementation: `./src/executors/${executor}/executor`,
          hasher: `./src/executors/${executor}/hasher`,
          schema: `./src/executors/${executor}/schema.json`,
          description: `${executor} executor`,
        },
      }),
    });
  }, 90000);

  it('should catch invalid implementations, schemas, and version in lint', async () => {
    const plugin = uniq('plugin');
    const goodGenerator = uniq('good-generator');
    const goodExecutor = uniq('good-executor');
    const badExecutorBadImplPath = uniq('bad-executor');
    const goodMigration = uniq('good-migration');
    const badFactoryPath = uniq('bad-generator');
    const badMigrationVersion = uniq('bad-version');
    const missingMigrationVersion = uniq('missing-version');

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint`
    );

    runCLI(
      `generate @nx/plugin:generator ${goodGenerator} --project=${plugin}`
    );

    runCLI(
      `generate @nx/plugin:generator ${badFactoryPath} --project=${plugin}`
    );

    runCLI(`generate @nx/plugin:executor ${goodExecutor} --project=${plugin}`);

    runCLI(
      `generate @nx/plugin:executor ${badExecutorBadImplPath} --project=${plugin}`
    );

    runCLI(
      `generate @nx/plugin:migration ${badMigrationVersion} --project=${plugin} --packageVersion="invalid"`
    );

    runCLI(
      `generate @nx/plugin:migration ${missingMigrationVersion} --project=${plugin} --packageVersion="0.1.0"`
    );

    runCLI(
      `generate @nx/plugin:migration ${goodMigration} --project=${plugin} --packageVersion="0.1.0"`
    );

    updateFile(`packages/${plugin}/generators.json`, (f) => {
      const json = JSON.parse(f);
      // @proj/plugin:plugin has an invalid implementation path
      json.generators[
        badFactoryPath
      ].factory = `./generators/${plugin}/bad-path`;
      // @proj/plugin:non-existant has a missing implementation path amd schema
      json.generators['non-existant-generator'] = {};
      return JSON.stringify(json);
    });

    updateFile(`packages/${plugin}/executors.json`, (f) => {
      const json = JSON.parse(f);
      // @proj/plugin:badExecutorBadImplPath has an invalid implementation path
      json.executors[badExecutorBadImplPath].implementation =
        './executors/bad-path';
      // @proj/plugin:non-existant has a missing implementation path amd schema
      json.executors['non-existant-executor'] = {};
      return JSON.stringify(json);
    });

    updateFile(`packages/${plugin}/migrations.json`, (f) => {
      const json = JSON.parse(f);
      delete json.generators[missingMigrationVersion].version;
      return JSON.stringify(json);
    });

    const results = runCLI(`lint ${plugin}`, { silenceError: true });
    expect(results).toContain(
      `${badFactoryPath}: Implementation path should point to a valid file`
    );
    expect(results).toContain(
      `non-existant-generator: Missing required property - \`schema\``
    );
    expect(results).toContain(
      `non-existant-generator: Missing required property - \`implementation\``
    );
    expect(results).not.toContain(goodGenerator);

    expect(results).toContain(
      `${badExecutorBadImplPath}: Implementation path should point to a valid file`
    );
    expect(results).toContain(
      `non-existant-executor: Missing required property - \`schema\``
    );
    expect(results).toContain(
      `non-existant-executor: Missing required property - \`implementation\``
    );
    expect(results).not.toContain(goodExecutor);

    expect(results).toContain(
      `${missingMigrationVersion}: Missing required property - \`version\``
    );
    expect(results).toContain(
      `${badMigrationVersion}: Version should be a valid semver`
    );
    expect(results).not.toContain(goodMigration);
  });

  it('should be able to add nodes and dependencies to the project graph', () => {
    const plugin = uniq('plugin');

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint`
    );
    updateFile(
      `packages/${plugin}/src/index.ts`,
      `
      import { ProjectConfiguration, CreateNodes, CreateDependencies } from '@nx/devkit';
      import { dirname, basename } from 'path';
      import { readFileSync } from 'fs';
      export const createNodes: CreateNodes = ['**/project.nx', (file) => {
        const name = basename(dirname(file));
        const project: ProjectConfiguration = {
          root: dirname(file),
          name: name
        };
        return {
          projects: {
            [name]: project,
          },
        };
      }];
      export const createDependencies: CreateDependencies = () => {
        return [
          {
            source: 'lib1',
            target: 'lib2',
            type: 'implicit',
          }
        ]
      };
    `
    );

    const nxJson = readJson('nx.json');
    nxJson.plugins = [`@${npmScope}/${plugin}`];
    updateFile('nx.json', JSON.stringify(nxJson));

    createFile('projects/lib1/project.nx', '');
    createFile('projects/lib2/project.nx', '');

    runCLI('graph --file project-graph.json');
    const projectGraphJson = readJson('project-graph.json');
    expect(projectGraphJson.graph.nodes['lib1']).toBeDefined();
    expect(projectGraphJson.graph.nodes['lib2']).toBeDefined();
    expect(projectGraphJson.graph.dependencies['lib1']).toContainEqual({
      type: 'implicit',
      source: 'lib1',
      target: 'lib2',
    });
  });

  describe('local plugins', () => {
    let plugin: string;
    beforeEach(() => {
      plugin = uniq('plugin');
      runCLI(
        `generate @nx/plugin:plugin ${plugin} --directory tools/plugins/${plugin} --linter=eslint`
      );
    });

    it('should be able to infer projects and targets', async () => {
      // Setup project inference + target inference
      updateFile(
        `tools/plugins/${plugin}/src/index.ts`,
        `import {basename} from 'path'

  export function registerProjectTargets(f) {
    if (basename(f) === 'my-project-file') {
      return {
        build: {
          executor: "nx:run-commands",
          options: {
            command: "echo 'custom registered target'"
          }
        }
      }
    }
  }

  export const projectFilePatterns = ['my-project-file'];
  `
      );

      // Register plugin in nx.json (required for inference)
      updateFile(`nx.json`, (nxJson) => {
        const nx = JSON.parse(nxJson);
        nx.plugins = [`@${npmScope}/${plugin}`];
        return JSON.stringify(nx, null, 2);
      });

      // Create project that should be inferred by Nx
      const inferredProject = uniq('inferred');
      createFile(`tools/plugins/${inferredProject}/my-project-file`);

      // Attempt to use inferred project w/ Nx
      expect(runCLI(`build ${inferredProject}`)).toContain(
        'custom registered target'
      );
    });

    it('should be able to use local generators and executors', async () => {
      const generator = uniq('generator');
      const executor = uniq('executor');
      const generatedProject = uniq('project');

      runCLI(`generate @nx/plugin:generator ${generator} --project=${plugin}`);

      runCLI(`generate @nx/plugin:executor ${executor} --project=${plugin}`);

      updateFile(
        `tools/plugins/${plugin}/src/executors/${executor}/executor.ts`,
        ASYNC_GENERATOR_EXECUTOR_CONTENTS
      );

      runCLI(
        `generate @${npmScope}/${plugin}:${generator} --name ${generatedProject}`
      );

      checkFilesExist(`libs/${generatedProject}`);

      updateFile(`libs/${generatedProject}/project.json`, (f) => {
        const project: ProjectConfiguration = JSON.parse(f);
        project.targets['execute'] = {
          executor: `@${npmScope}/${plugin}:${executor}`,
        };
        return JSON.stringify(project, null, 2);
      });

      expect(() => runCLI(`execute ${generatedProject}`)).not.toThrow();
    });

    it('should work with ts-node only', async () => {
      const oldPackageJson: PackageJson = readJson('package.json');
      updateJson<PackageJson>('package.json', (j) => {
        delete j.dependencies['@swc-node/register'];
        delete j.devDependencies['@swc-node/register'];
        return j;
      });
      runCommand(getPackageManagerCommand().install);

      const generator = uniq('generator');

      expect(() => {
        runCLI(
          `generate @nx/plugin:generator ${generator} --project=${plugin}`
        );

        runCLI(
          `generate @${npmScope}/${plugin}:${generator} --name ${uniq('test')}`
        );
      }).not.toThrow();
      updateFile('package.json', JSON.stringify(oldPackageJson, null, 2));
      runCommand(getPackageManagerCommand().install);
    });
  });

  describe('workspace-generator', () => {
    let custom: string;

    it('should work with generate wrapper', () => {
      custom = uniq('custom');
      const project = uniq('generated-project');
      runCLI(
        `g @nx/plugin:plugin workspace-plugin --directory tools/workspace-plugin --no-interactive`
      );
      runCLI(
        `g @nx/plugin:generator ${custom} --project workspace-plugin --no-interactive`
      );
      runCLI(
        `workspace-generator ${custom} --name ${project} --no-interactive`
      );
      expect(() => {
        checkFilesExist(
          `libs/${project}/src/index.ts`,
          `libs/${project}/project.json`
        );
      });
    });
  });

  describe('--directory', () => {
    it('should create a plugin in the specified directory', async () => {
      const plugin = uniq('plugin');
      runCLI(
        `generate @nx/plugin:plugin ${plugin} --directory packages/subdir/${plugin} --linter=eslint --e2eTestRunner=jest`
      );
      checkFilesExist(`packages/subdir/${plugin}/package.json`);
      const pluginProject = readJson(
        join('packages/subdir', plugin, 'project.json')
      );
      const pluginE2EProject = readJson(
        join('packages/subdir', `${plugin}-e2e`, 'project.json')
      );
      expect(pluginProject.targets).toBeDefined();
      expect(pluginE2EProject).toBeTruthy();
    }, 90000);
  });
  describe('--tags', () => {
    it('should add tags to project configuration', () => {
      const plugin = uniq('plugin');
      runCLI(
        `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --linter=eslint --tags=e2etag,e2ePackage `
      );
      const pluginProject = readJson(join('packages', plugin, 'project.json'));
      expect(pluginProject.tags).toEqual(['e2etag', 'e2ePackage']);
    }, 90000);
  });

  it('should be able to generate a create-package plugin ', async () => {
    const plugin = uniq('plugin');
    const createAppName = `create-${plugin}-app`;
    runCLI(
      `generate @nx/plugin:plugin ${plugin} --directory packages/${plugin} --e2eTestRunner jest --publishable`
    );
    runCLI(
      `generate @nx/plugin:create-package ${createAppName} --directory packages/${createAppName} --project=${plugin} --e2eProject=${plugin}-e2e`
    );

    const buildResults = runCLI(`build ${createAppName}`);
    expect(buildResults).toContain('Done compiling TypeScript files');

    checkFilesExist(
      `packages/${plugin}/src/generators/preset`,
      `packages/${createAppName}`,
      `dist/packages/${createAppName}/bin/index.js`
    );

    runCLI(`e2e ${plugin}-e2e`);
  });

  it('should throw an error when run create-package for an invalid plugin ', async () => {
    const plugin = uniq('plugin');
    const createAppName = `create-${plugin}-app`;
    expect(() =>
      runCLI(
        `generate @nx/plugin:create-package ${createAppName} --project=invalid-plugin`
      )
    ).toThrow();
  });

  it('should support the old name and root format', async () => {
    const plugin = uniq('plugin');
    const createAppName = `create-${plugin}-app`;

    runCLI(
      `generate @nx/plugin:plugin ${plugin} --projectNameAndRootFormat derived --e2eTestRunner jest --publishable`
    );

    // check files are generated without the layout directory ("libs/") and
    // using the project name as the directory when no directory is provided
    checkFilesExist(`libs/${plugin}/src/index.ts`);
    // check build works
    expect(runCLI(`build ${plugin}`)).toContain(
      `Successfully ran target build for project ${plugin}`
    );
    // check tests pass
    const appTestResult = runCLI(`test ${plugin}`);
    expect(appTestResult).toContain(
      `Successfully ran target test for project ${plugin}`
    );

    runCLI(
      `generate @nx/plugin:create-package ${createAppName} --project=${plugin} --e2eProject=${plugin}-e2e`
    );

    // check files are generated without the layout directory ("libs/") and
    // using the project name as the directory when no directory is provided
    checkFilesExist(`libs/${plugin}/src/generators/preset`, `${createAppName}`);
    // check build works
    expect(runCLI(`build ${createAppName}`)).toContain(
      `Successfully ran target build for project ${createAppName}`
    );
    // check tests pass
    const libTestResult = runCLI(`test ${createAppName}`);
    expect(libTestResult).toContain(
      `Successfully ran target test for project ${createAppName}`
    );
  });
});
