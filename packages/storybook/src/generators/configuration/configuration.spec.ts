import {
  addProjectConfiguration,
  NxJsonConfiguration,
  readJson,
  readProjectConfiguration,
  Tree,
  updateJson,
  writeJson,
} from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

import { Linter } from '@nrwl/linter';
import { libraryGenerator } from '@nrwl/workspace/generators';
import { TsConfig } from '../../utils/utilities';
import configurationGenerator from './configuration';
import * as workspaceConfiguration from './test-configs/workspace-conifiguration.json';

describe('@nrwl/storybook:configuration', () => {
  describe('basic functionalities', () => {
    let tree: Tree;

    beforeEach(async () => {
      tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
      updateJson<NxJsonConfiguration>(tree, 'nx.json', (json) => {
        json.namedInputs = {
          production: ['default'],
        };
        return json;
      });
      await libraryGenerator(tree, {
        name: 'test-ui-lib',
      });
      writeJson(tree, 'package.json', {
        devDependencies: {
          '@storybook/addon-essentials': '~6.2.9',
          '@storybook/react': '~6.2.9',
        },
      });
    });

    it('should generate files', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/angular',
      });

      expect(
        tree.exists('libs/test-ui-lib/.storybook/tsconfig.json')
      ).toBeTruthy();
      expect(tree.exists('libs/test-ui-lib/.storybook/main.js')).toBeTruthy();
      expect(
        tree.exists('libs/test-ui-lib/.storybook/preview.js')
      ).toBeTruthy();

      const storybookTsconfigJson = readJson<{ exclude: string[] }>(
        tree,
        'libs/test-ui-lib/.storybook/tsconfig.json'
      );

      expect(
        storybookTsconfigJson.exclude.includes('../**/*.spec.ts')
      ).toBeTruthy();
      expect(
        storybookTsconfigJson.exclude.includes('../**/*.spec.tsx')
      ).toBeFalsy();
      expect(
        storybookTsconfigJson.exclude.includes('../**/*.spec.js')
      ).toBeFalsy();
      expect(
        storybookTsconfigJson.exclude.includes('../**/*.spec.jsx')
      ).toBeFalsy();
      expect(readJson(tree, 'nx.json')).toMatchSnapshot();
    });

    it('should generate TypeScript Configuration files', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/angular',
        tsConfiguration: true,
      });

      expect(
        tree.exists('libs/test-ui-lib/.storybook/tsconfig.json')
      ).toBeTruthy();
      expect(tree.exists('libs/test-ui-lib/.storybook/main.ts')).toBeTruthy();
      expect(
        tree.exists('libs/test-ui-lib/.storybook/preview.ts')
      ).toBeTruthy();
    });

    it('should generate a webpackFinal into the main.js and reference a potential global webpackFinal definition', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/angular',
      });

      expect(
        tree.read('libs/test-ui-lib/.storybook/main.js', 'utf-8')
      ).toMatchSnapshot();
    });

    it('should update workspace file for react libs', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/react',
      });
      const project = readProjectConfiguration(tree, 'test-ui-lib');

      expect(project.targets.storybook).toEqual({
        executor: '@nrwl/storybook:storybook',
        configurations: {
          ci: {
            quiet: true,
          },
        },
        options: {
          port: 4400,
          uiFramework: '@storybook/react',
          configDir: 'libs/test-ui-lib/.storybook',
        },
      });

      expect(project.targets.lint).toEqual({
        executor: '@nrwl/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: ['libs/test-ui-lib/**/*.ts'],
        },
      });
    });

    it('should update workspace file for angular libs', async () => {
      // Setup a new lib
      await libraryGenerator(tree, {
        name: 'test-ui-lib-2',
      });
      await configurationGenerator(tree, {
        name: 'test-ui-lib-2',
        uiFramework: '@storybook/angular',
      });
      const project = readProjectConfiguration(tree, 'test-ui-lib-2');

      expect(project.targets.storybook).toEqual({
        executor: '@storybook/angular:start-storybook',
        configurations: {
          ci: {
            quiet: true,
          },
        },
        options: {
          port: 4400,
          browserTarget: 'test-ui-lib-2:build-storybook',
          compodoc: false,
          configDir: 'libs/test-ui-lib-2/.storybook',
        },
      });

      expect(project.targets.lint).toEqual({
        executor: '@nrwl/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: ['libs/test-ui-lib-2/**/*.ts'],
        },
      });
    });

    it('should update workspace file for angular buildable libs', async () => {
      // Setup a new lib
      await libraryGenerator(tree, {
        name: 'test-ui-lib-5',

        buildable: true,
      });
      await configurationGenerator(tree, {
        name: 'test-ui-lib-5',
        uiFramework: '@storybook/angular',
      });
      const project = readProjectConfiguration(tree, 'test-ui-lib-5');

      expect(project.targets.storybook).toEqual({
        executor: '@storybook/angular:start-storybook',
        configurations: {
          ci: {
            quiet: true,
          },
        },
        options: {
          port: 4400,
          browserTarget: 'test-ui-lib-5:build-storybook',
          compodoc: false,
          configDir: 'libs/test-ui-lib-5/.storybook',
        },
      });

      expect(project.targets.lint).toEqual({
        executor: '@nrwl/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: ['libs/test-ui-lib-5/**/*.ts'],
        },
      });
    });

    it('should update `tsconfig.lib.json` file', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/react',
      });
      const tsconfigJson = readJson<TsConfig>(
        tree,
        'libs/test-ui-lib/tsconfig.lib.json'
      ) as Required<TsConfig>;

      expect(tsconfigJson.exclude).toContain('**/*.stories.ts');
      expect(tsconfigJson.exclude).toContain('**/*.stories.js');
      expect(tsconfigJson.exclude).toContain('**/*.stories.jsx');
      expect(tsconfigJson.exclude).toContain('**/*.stories.tsx');
    });

    it('should update `tsconfig.json` file', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/react',
      });
      const tsconfigJson = readJson<TsConfig>(
        tree,
        'libs/test-ui-lib/tsconfig.json'
      );

      expect(tsconfigJson.references).toMatchInlineSnapshot(`
      Array [
        Object {
          "path": "./tsconfig.lib.json",
        },
        Object {
          "path": "./tsconfig.spec.json",
        },
        Object {
          "path": "./.storybook/tsconfig.json",
        },
      ]
    `);
    });

    it("should update the project's .eslintrc.json if config exists", async () => {
      await libraryGenerator(tree, {
        name: 'test-ui-lib2',
        linter: Linter.EsLint,
      });

      updateJson(tree, 'libs/test-ui-lib2/.eslintrc.json', (json) => {
        json.parserOptions = {
          project: [],
        };
        return json;
      });

      await configurationGenerator(tree, {
        name: 'test-ui-lib2',
        uiFramework: '@storybook/react',
      });

      expect(readJson(tree, 'libs/test-ui-lib2/.eslintrc.json').parserOptions)
        .toMatchInlineSnapshot(`
      Object {
        "project": Array [
          "libs/test-ui-lib2/.storybook/tsconfig.json",
        ],
      }
    `);
    });

    it('should have the proper typings', async () => {
      await libraryGenerator(tree, {
        name: 'test-ui-lib2',
        linter: Linter.EsLint,
      });

      await configurationGenerator(tree, {
        name: 'test-ui-lib2',
        uiFramework: '@storybook/react',
      });

      expect(
        readJson(tree, 'libs/test-ui-lib2/.storybook/tsconfig.json').files
      ).toMatchSnapshot();
    });

    it('should generate TS config for project if tsConfiguration is true', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/angular',
        tsConfiguration: true,
      });
      expect(tree.exists('libs/test-ui-lib/.storybook/main.ts')).toBeTruthy();
      expect(
        tree.exists('libs/test-ui-lib/.storybook/preview.ts')
      ).toBeTruthy();
      expect(tree.exists('libs/test-ui-lib/.storybook/main.js')).toBeFalsy();
      expect(tree.exists('libs/test-ui-lib/.storybook/preview.js')).toBeFalsy();
    });

    it('should add test-storybook target', async () => {
      await configurationGenerator(tree, {
        name: 'test-ui-lib',
        uiFramework: '@storybook/react',
        configureTestRunner: true,
      });

      expect(
        readJson(tree, 'package.json').devDependencies['@storybook/test-runner']
      ).toBeTruthy();

      const project = readProjectConfiguration(tree, 'test-ui-lib');
      expect(project.targets['test-storybook']).toEqual({
        executor: 'nx:run-commands',
        options: {
          command:
            'test-storybook -c libs/test-ui-lib/.storybook --url=http://localhost:4400',
        },
      });
    });
  });

  describe('for other types of projects - Next.js and the swc compiler', () => {
    describe('for js Storybook configurations', () => {
      let tree: Tree;
      beforeAll(async () => {
        tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
        writeConfig(tree, workspaceConfiguration);
        writeJson(tree, 'apps/nxapp/tsconfig.json', {});
        writeJson(tree, 'apps/reapp/tsconfig.json', {});
        writeJson(tree, 'libs/nxlib/tsconfig.json', {});
        writeJson(tree, 'libs/nxlib-buildable/tsconfig.json', {});
        writeJson(tree, 'libs/relib-buildable/tsconfig.json', {});
        writeJson(tree, 'apps/reapp-swc/tsconfig.json', {});
        await configurationGenerator(tree, {
          name: 'nxapp',
          uiFramework: '@storybook/react',
        });
        await configurationGenerator(tree, {
          name: 'reapp',
          uiFramework: '@storybook/react',
        });
        await configurationGenerator(tree, {
          name: 'nxlib',
          uiFramework: '@storybook/react',
        });
        await configurationGenerator(tree, {
          name: 'nxlib-buildable',
          uiFramework: '@storybook/react',
        });
        await configurationGenerator(tree, {
          name: 'relib-buildable',
          uiFramework: '@storybook/react',
        });
        await configurationGenerator(tree, {
          name: 'reapp-swc',
          uiFramework: '@storybook/react',
        });
      });

      it(`should create correct main.js and tsconfig.json for NextJs apps`, async () => {
        expect(
          tree.read('apps/nxapp/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/nxapp/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for React apps`, async () => {
        expect(
          tree.read('apps/reapp/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/reapp/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for NextJS libs`, async () => {
        expect(
          tree.read('libs/nxlib/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/nxlib/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for NextJS buildable libs`, async () => {
        expect(
          tree.read('libs/nxlib-buildable/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/nxlib-buildable/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for React buildable libs`, async () => {
        expect(
          tree.read('libs/relib-buildable/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/relib-buildable/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for React apps using the swc compiler`, async () => {
        expect(
          tree.read('apps/reapp-swc/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/reapp-swc/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });
    });

    describe('for TypeScript Storybook configurations', () => {
      let tree: Tree;
      beforeAll(async () => {
        tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
        writeConfig(tree, workspaceConfiguration);
        writeJson(tree, 'apps/nxapp/tsconfig.json', {});
        writeJson(tree, 'apps/reapp/tsconfig.json', {});
        writeJson(tree, 'libs/nxlib/tsconfig.json', {});
        writeJson(tree, 'libs/nxlib-buildable/tsconfig.json', {});
        writeJson(tree, 'libs/relib-buildable/tsconfig.json', {});
        writeJson(tree, 'apps/reapp-swc/tsconfig.json', {});
        await configurationGenerator(tree, {
          name: 'nxapp',
          uiFramework: '@storybook/react',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'reapp',
          uiFramework: '@storybook/react',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'nxlib',
          uiFramework: '@storybook/react',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'nxlib-buildable',
          uiFramework: '@storybook/react',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'relib-buildable',
          uiFramework: '@storybook/react',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'reapp-swc',
          uiFramework: '@storybook/react',
          tsConfiguration: true,
        });
      });

      it(`should create correct main.ts and tsconfig.json for NextJs apps`, async () => {
        expect(
          tree.read('apps/nxapp/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/nxapp/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for React apps`, async () => {
        expect(
          tree.read('apps/reapp/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/reapp/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for NextJS libs`, async () => {
        expect(
          tree.read('libs/nxlib/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/nxlib/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for NextJS buildable libs`, async () => {
        expect(
          tree.read('libs/nxlib-buildable/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/nxlib-buildable/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for React buildable libs`, async () => {
        expect(
          tree.read('libs/relib-buildable/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/relib-buildable/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for React apps using the swc compiler`, async () => {
        expect(
          tree.read('apps/reapp-swc/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/reapp-swc/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });
    });

    describe('for Storybook configurations with Vite', () => {
      let tree: Tree;
      beforeAll(async () => {
        tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
        writeConfig(tree, workspaceConfiguration);
        writeJson(tree, 'apps/nxapp/tsconfig.json', {});
        writeJson(tree, 'apps/reapp/tsconfig.json', {});
        writeJson(tree, 'libs/nxlib/tsconfig.json', {});
        writeJson(tree, 'libs/nxlib-buildable/tsconfig.json', {});
        writeJson(tree, 'libs/relib-buildable/tsconfig.json', {});
        writeJson(tree, 'apps/reapp-swc/tsconfig.json', {});
        await configurationGenerator(tree, {
          name: 'nxapp',
          uiFramework: '@storybook/react',
          bundler: 'vite',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'reapp',
          uiFramework: '@storybook/react',
          bundler: 'vite',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'nxlib',
          uiFramework: '@storybook/react',
          bundler: 'vite',
          tsConfiguration: true,
        });
        await configurationGenerator(tree, {
          name: 'nxlib-buildable',
          uiFramework: '@storybook/react',
          bundler: 'vite',
        });
        await configurationGenerator(tree, {
          name: 'relib-buildable',
          uiFramework: '@storybook/react',
          bundler: 'vite',
        });
        await configurationGenerator(tree, {
          name: 'reapp-swc',
          uiFramework: '@storybook/react',
          bundler: 'vite',
        });
      });

      it(`should create correct main.ts and tsconfig.json for NextJs apps`, async () => {
        expect(
          tree.read('apps/nxapp/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/nxapp/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for React apps`, async () => {
        expect(
          tree.read('apps/reapp/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/reapp/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.ts and tsconfig.json for NextJS libs`, async () => {
        expect(
          tree.read('libs/nxlib/.storybook/main.ts', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/nxlib/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for NextJS buildable libs`, async () => {
        expect(
          tree.read('libs/nxlib-buildable/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/nxlib-buildable/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for React buildable libs`, async () => {
        expect(
          tree.read('libs/relib-buildable/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('libs/relib-buildable/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });

      it(`should create correct main.js and tsconfig.json for React apps using the swc compiler`, async () => {
        expect(
          tree.read('apps/reapp-swc/.storybook/main.js', 'utf-8')
        ).toMatchSnapshot();

        expect(
          tree.read('apps/reapp-swc/.storybook/tsconfig.json', 'utf-8')
        ).toMatchSnapshot();
      });
    });
  });
});

function writeConfig(tree: Tree, config: any) {
  Object.keys(config.projects).forEach((project) => {
    addProjectConfiguration(tree, project, config.projects[project]);
  });
}
