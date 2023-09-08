import { installedCypressVersion } from '@nx/cypress/src/utils/cypress-version';
import {
  getProjects,
  readJson,
  readProjectConfiguration,
  Tree,
  updateJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Linter } from '@nx/linter';
import { nxVersion } from '../../utils/versions';
// import applicationGenerator from '../application/application';
import libraryGenerator from './library';
import { Schema } from './schema';
// need to mock cypress otherwise it'll use the nx installed version from package.json
//  which is v9 while we are testing for the new v10 version
jest.mock('@nx/cypress/src/utils/cypress-version');
describe('lib', () => {
  let tree: Tree;
  let mockedInstalledCypressVersion: jest.Mock<
    ReturnType<typeof installedCypressVersion>
  > = installedCypressVersion as never;
  let defaultSchema: Schema = {
    name: 'myLib',
    linter: Linter.EsLint,
    skipFormat: false,
    skipTsConfig: false,
    unitTestRunner: 'vitest',
    component: true,
    strict: true,
    simpleName: false,
  };

  beforeEach(() => {
    mockedInstalledCypressVersion.mockReturnValue(10);
    tree = createTreeWithEmptyWorkspace();
    updateJson(tree, '/package.json', (json) => {
      json.devDependencies = {
        '@nx/cypress': nxVersion,
        '@nx/rollup': nxVersion,
        '@nx/vite': nxVersion,
      };
      return json;
    });
  });

  it('should update project configuration', async () => {
    await libraryGenerator(tree, defaultSchema);
    const project = readProjectConfiguration(tree, 'my-lib');
    expect(project.root).toEqual('my-lib');
    expect(project.targets.build).toBeUndefined();
    expect(project.targets.lint).toEqual({
      executor: '@nx/linter:eslint',
      outputs: ['{options.outputFile}'],
      options: {
        lintFilePatterns: ['my-lib/**/*.{ts,tsx,js,jsx,vue}'],
      },
    });
  });

  it('should add vite types to tsconfigs and generate correct vite.config.ts file', async () => {
    await libraryGenerator(tree, {
      ...defaultSchema,
      bundler: 'vite',
      unitTestRunner: 'vitest',
    });
    const tsconfigApp = readJson(tree, 'my-lib/tsconfig.lib.json');
    expect(tsconfigApp.compilerOptions.types).toEqual(['vite/client']);
    const tsconfigSpec = readJson(tree, 'my-lib/tsconfig.spec.json');
    expect(tsconfigSpec.compilerOptions.types).toEqual([
      'vitest/globals',
      'vitest/importMeta',
      'vite/client',
      'node',
      'vitest',
    ]);
    expect(tree.read('my-lib/vite.config.ts', 'utf-8')).toMatchSnapshot();
  });

  it('should update tags', async () => {
    await libraryGenerator(tree, { ...defaultSchema, tags: 'one,two' });
    const project = readProjectConfiguration(tree, 'my-lib');
    expect(project).toEqual(
      expect.objectContaining({
        tags: ['one', 'two'],
      })
    );
  });

  it('should add vue, vite and vitest to package.json', async () => {
    await libraryGenerator(tree, defaultSchema);
    const packageJson = readJson(tree, '/package.json');
    expect(packageJson).toMatchSnapshot();
  });

  it('should update root tsconfig.base.json', async () => {
    await libraryGenerator(tree, defaultSchema);
    const tsconfigJson = readJson(tree, '/tsconfig.base.json');
    expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
      'my-lib/src/index.ts',
    ]);
  });

  it('should create tsconfig.base.json out of tsconfig.json', async () => {
    tree.rename('tsconfig.base.json', 'tsconfig.json');

    await libraryGenerator(tree, defaultSchema);

    expect(tree.exists('tsconfig.base.json')).toEqual(true);
    const tsconfigJson = readJson(tree, 'tsconfig.base.json');
    expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
      'my-lib/src/index.ts',
    ]);
  });

  it('should update root tsconfig.base.json (no existing path mappings)', async () => {
    updateJson(tree, 'tsconfig.base.json', (json) => {
      json.compilerOptions.paths = undefined;
      return json;
    });

    await libraryGenerator(tree, defaultSchema);
    const tsconfigJson = readJson(tree, '/tsconfig.base.json');
    expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
      'my-lib/src/index.ts',
    ]);
  });

  it('should create a local tsconfig.json', async () => {
    await libraryGenerator(tree, defaultSchema);

    const tsconfigJson = readJson(tree, 'my-lib/tsconfig.json');
    expect(tsconfigJson.extends).toBe('../tsconfig.base.json');
    expect(tsconfigJson.references).toEqual([
      {
        path: './tsconfig.lib.json',
      },
      {
        path: './tsconfig.spec.json',
      },
    ]);
  });

  it('should extend the tsconfig.lib.json with tsconfig.spec.json', async () => {
    await libraryGenerator(tree, defaultSchema);
    const tsconfigJson = readJson(tree, 'my-lib/tsconfig.spec.json');
    expect(tsconfigJson.extends).toEqual('./tsconfig.json');
  });

  it('should extend ./tsconfig.json with tsconfig.lib.json', async () => {
    await libraryGenerator(tree, defaultSchema);
    const tsconfigJson = readJson(tree, 'my-lib/tsconfig.lib.json');
    expect(tsconfigJson.extends).toEqual('./tsconfig.json');
  });

  it('should ignore test files in tsconfig.lib.json', async () => {
    await libraryGenerator(tree, defaultSchema);
    const tsconfigJson = readJson(tree, 'my-lib/tsconfig.lib.json');
    expect(tsconfigJson.exclude).toMatchSnapshot();
  });

  it('should generate files', async () => {
    await libraryGenerator(tree, defaultSchema);
    expect(tree.exists('my-lib/package.json')).toBeFalsy();
    expect(tree.exists('my-lib/src/index.ts')).toBeTruthy();
    expect(tree.exists('my-lib/src/lib/my-lib.vue')).toBeTruthy();
    expect(tree.exists('my-lib/src/lib/__tests__/my-lib.spec.ts')).toBeTruthy();
    const eslintJson = readJson(tree, 'my-lib/.eslintrc.json');
    expect(eslintJson).toMatchSnapshot();
  });

  describe('nested', () => {
    it('should update tags and implicitDependencies', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        directory: 'myDir',
        tags: 'one',
      });
      const myLib = readProjectConfiguration(tree, 'my-dir-my-lib');
      expect(myLib).toEqual(
        expect.objectContaining({
          tags: ['one'],
        })
      );

      await libraryGenerator(tree, {
        ...defaultSchema,
        name: 'myLib2',
        directory: 'myDir',
        tags: 'one,two',
      });

      const myLib2 = readProjectConfiguration(tree, 'my-dir-my-lib2');
      expect(myLib2).toEqual(
        expect.objectContaining({
          tags: ['one', 'two'],
        })
      );
    });

    it('should generate files', async () => {
      await libraryGenerator(tree, { ...defaultSchema, directory: 'myDir' });
      expect(tree.exists('my-dir/my-lib/src/index.ts')).toBeTruthy();
      expect(
        tree.exists('my-dir/my-lib/src/lib/my-dir-my-lib.vue')
      ).toBeTruthy();
      expect(
        tree.exists('my-dir/my-lib/src/lib/__tests__/my-dir-my-lib.spec.ts')
      ).toBeTruthy();
    });

    it('should update project configurations', async () => {
      await libraryGenerator(tree, { ...defaultSchema, directory: 'myDir' });
      const config = readProjectConfiguration(tree, 'my-dir-my-lib');

      expect(config.root).toEqual('my-dir/my-lib');
      expect(config.targets.lint).toEqual({
        executor: '@nx/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: ['my-dir/my-lib/**/*.{ts,tsx,js,jsx,vue}'],
        },
      });
    });

    it('should update root tsconfig.base.json', async () => {
      await libraryGenerator(tree, { ...defaultSchema, directory: 'myDir' });
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');
      expect(tsconfigJson.compilerOptions.paths['@proj/my-dir/my-lib']).toEqual(
        ['my-dir/my-lib/src/index.ts']
      );
      expect(
        tsconfigJson.compilerOptions.paths['my-dir-my-lib/*']
      ).toBeUndefined();
    });

    it('should create a local tsconfig.json', async () => {
      await libraryGenerator(tree, { ...defaultSchema, directory: 'myDir' });

      const tsconfigJson = readJson(tree, 'my-dir/my-lib/tsconfig.json');
      expect(tsconfigJson).toMatchSnapshot();
    });
  });

  describe('--no-component', () => {
    it('should not generate components or styles', async () => {
      await libraryGenerator(tree, { ...defaultSchema, component: false });

      expect(tree.exists('my-lib/src/lib')).toBeFalsy();
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        unitTestRunner: 'none',
      });

      expect(tree.exists('my-lib/tsconfig.spec.json')).toBeFalsy();
      const config = readProjectConfiguration(tree, 'my-lib');
      expect(config.targets.test).toBeUndefined();
      expect(config.targets.lint).toMatchInlineSnapshot(`
        {
          "executor": "@nx/linter:eslint",
          "options": {
            "lintFilePatterns": [
              "my-lib/**/*.{ts,tsx,js,jsx,vue}",
            ],
          },
          "outputs": [
            "{options.outputFile}",
          ],
        }
      `);
    });
  });

  // no app generator yet
  xdescribe('--appProject', () => {
    it('should add new route to existing routing code', async () => {
      // await applicationGenerator(tree, {
      //   compiler: 'babel',
      //   e2eTestRunner: 'none',
      //   linter: Linter.EsLint,
      //   skipFormat: true,
      //   unitTestRunner: 'jest',
      //   name: 'myApp',
      //   routing: true,
      //   style: 'css',
      //   bundler: 'webpack',
      //   projectNameAndRootFormat: 'as-provided',
      // });

      await libraryGenerator(tree, {
        ...defaultSchema,
        appProject: 'my-app',
        projectNameAndRootFormat: 'as-provided',
      });

      const appSource = tree.read('my-app/src/app/app.tsx', 'utf-8');
      const mainSource = tree.read('my-app/src/main.tsx', 'utf-8');

      expect(mainSource).toContain('react-router-dom');
      expect(mainSource).toContain('<BrowserRouter>');
      expect(appSource).toContain('@proj/my-lib');
      expect(appSource).toContain('react-router-dom');
      expect(appSource).toMatch(/<Route\s*path="\/my-lib"/);
    });

    it('should initialize routes if none were set up then add new route', async () => {
      // await applicationGenerator(tree, {
      //   e2eTestRunner: 'none',
      //   linter: Linter.EsLint,
      //   skipFormat: true,
      //   unitTestRunner: 'jest',
      //   name: 'myApp',
      //   style: 'css',
      //   bundler: 'webpack',
      //   projectNameAndRootFormat: 'as-provided',
      // });

      await libraryGenerator(tree, {
        ...defaultSchema,
        appProject: 'my-app',
        projectNameAndRootFormat: 'as-provided',
      });

      const appSource = tree.read('my-app/src/app/app.tsx', 'utf-8');
      const mainSource = tree.read('my-app/src/main.tsx', 'utf-8');

      expect(mainSource).toContain('react-router-dom');
      expect(mainSource).toContain('<BrowserRouter>');
      expect(appSource).toContain('@proj/my-lib');
      expect(appSource).toContain('react-router-dom');
      expect(appSource).toMatch(/<Route\s*path="\/my-lib"/);
    });
  });

  describe('--publishable', () => {
    // TODO(katerina): Fix the targets
    xit('should add build targets', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        publishable: true,
        importPath: '@proj/my-lib',
      });

      const projectsConfigurations = getProjects(tree);

      expect(projectsConfigurations.get('my-lib').targets.build).toMatchObject({
        executor: '@nx/vite:build',
        outputs: ['{options.outputPath}'],
        options: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          entryFile: 'my-lib/src/index.ts',
          outputPath: 'dist/my-lib',
          project: 'my-lib/package.json',
          tsConfig: 'my-lib/tsconfig.lib.json',
          rollupConfig: '@nx/react/plugins/bundle-rollup',
        },
      });
    });

    it('should fail if no importPath is provided with publishable', async () => {
      expect.assertions(1);

      try {
        await libraryGenerator(tree, {
          ...defaultSchema,
          directory: 'myDir',
          publishable: true,
        });
      } catch (e) {
        expect(e.message).toContain(
          'For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)'
        );
      }
    });

    it('should add package.json and .babelrc', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        publishable: true,
        importPath: '@proj/my-lib',
      });

      const packageJson = readJson(tree, '/my-lib/package.json');
      expect(packageJson.name).toEqual('@proj/my-lib');
      expect(tree.exists('/my-lib/.babelrc'));
    });
  });

  describe('--js', () => {
    it('should generate JS files', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        js: true,
      });

      expect(tree.exists('/my-lib/src/index.js')).toBe(true);
    });
  });

  describe('--importPath', () => {
    it('should update the package.json & tsconfig with the given import path', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        publishable: true,
        directory: 'myDir',
        importPath: '@myorg/lib',
      });
      const packageJson = readJson(tree, 'my-dir/my-lib/package.json');
      const tsconfigJson = readJson(tree, '/tsconfig.base.json');

      expect(packageJson.name).toBe('@myorg/lib');
      expect(
        tsconfigJson.compilerOptions.paths[packageJson.name]
      ).toBeDefined();
    });

    it('should fail if the same importPath has already been used', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        name: 'myLib1',
        publishable: true,
        importPath: '@myorg/lib',
      });

      try {
        await libraryGenerator(tree, {
          ...defaultSchema,
          name: 'myLib2',
          publishable: true,
          importPath: '@myorg/lib',
        });
      } catch (e) {
        expect(e.message).toContain(
          'You already have a library using the import path'
        );
      }

      expect.assertions(1);
    });
  });

  // TBD
  xdescribe('--no-strict', () => {
    it('should not add options for strict mode', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        strict: false,
      });
      const tsconfigJson = readJson(tree, '/my-lib/tsconfig.json');

      expect(tsconfigJson.compilerOptions.strict).toEqual(false);
    });
  });

  // Vite generator does not have this option
  xdescribe('--skipPackageJson', () => {
    it('should not add dependencies to package.json when true', async () => {
      const packageJsonBeforeGenerator = tree.read('package.json', 'utf-8');
      await libraryGenerator(tree, {
        ...defaultSchema,
        skipPackageJson: true,
      });
      expect(tree.read('package.json', 'utf-8')).toEqual(
        packageJsonBeforeGenerator
      );
    });
  });

  describe('--setParserOptionsProject', () => {
    it('should set the parserOptions.project in the eslintrc.json file', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        setParserOptionsProject: true,
      });

      const eslintConfig = readJson(tree, 'my-lib/.eslintrc.json');

      expect(eslintConfig.overrides[0].parserOptions.project).toEqual([
        'my-lib/tsconfig.*?.json',
      ]);
    });
  });

  describe('--simpleName', () => {
    it('should generate a library with a simple name', async () => {
      await libraryGenerator(tree, {
        ...defaultSchema,
        simpleName: true,
        directory: 'myDir',
      });

      const indexFile = tree.read('my-dir/my-lib/src/index.ts', 'utf-8');

      expect(indexFile).toContain(
        `export { default as MyLib } from './lib/my-lib.vue';`
      );

      expect(
        tree.exists('my-dir/my-lib/src/lib/__tests__/my-lib.spec.ts')
      ).toBeTruthy();

      expect(tree.exists('my-dir/my-lib/src/lib/my-lib.vue')).toBeTruthy();
    });
  });
});
