import {
  addProjectConfiguration,
  readJson,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { createTreeWithEmptyV1Workspace } from '@nrwl/devkit/testing';
import { Linter } from 'packages/linter/src/generators/utils/linter';

import detoxApplicationGenerator from './application';

describe('detox application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyV1Workspace();
    tree.write('.gitignore', '');
  });

  describe('app at root', () => {
    beforeEach(async () => {
      addProjectConfiguration(tree, 'my-app', {
        root: 'my-app',
      });

      await detoxApplicationGenerator(tree, {
        name: 'my-app-e2e',
        project: 'my-app',
        appClassName: 'MyApp',
        linter: Linter.None,
        framework: 'react-native',
      });
    });

    it('should generate files', () => {
      expect(tree.exists('apps/my-app-e2e/.detoxrc.json')).toBeTruthy();
      expect(tree.exists('apps/my-app-e2e/src/app.spec.ts')).toBeTruthy();
    });

    it('should add update `workspace.json` file', async () => {
      const project = readProjectConfiguration(tree, 'my-app-e2e');

      expect(project.root).toEqual('apps/my-app-e2e');
    });

    it('should update nx.json', async () => {
      const project = readProjectConfiguration(tree, 'my-app-e2e');
      expect(project.tags).toEqual([]);
      expect(project.implicitDependencies).toEqual(['my-app']);
    });
  });

  describe('with directory specified', () => {
    beforeEach(async () => {
      addProjectConfiguration(tree, 'my-dir-my-app', {
        root: 'my-dir/my-app',
      });

      await detoxApplicationGenerator(tree, {
        name: 'my-app-e2e',
        directory: 'my-dir',
        project: 'my-dir-my-app',
        appClassName: 'MyApp',
        linter: Linter.None,
        framework: 'react-native',
      });
    });

    it('should generate files', () => {
      expect(tree.exists('apps/my-dir/my-app-e2e/.detoxrc.json')).toBeTruthy();
      expect(
        tree.exists('apps/my-dir/my-app-e2e/src/app.spec.ts')
      ).toBeTruthy();
    });

    it('should have correct path to app', async () => {
      expect(tree.exists('apps/my-dir/my-app-e2e/.detoxrc.json')).toBeTruthy();
      const detoxrc = tree.read(
        'apps/my-dir/my-app-e2e/.detoxrc.json',
        'utf-8'
      );
      // Strip trailing commas
      const detoxrcJson = JSON.parse(
        detoxrc.replace(/(?<=(true|false|null|["\d}\]])\s*),(?=\s*[}\]])/g, '')
      );
      expect(detoxrcJson.apps['ios.debug'].build).toEqual(
        `cd ../../../my-dir/my-app/ios && xcodebuild -workspace MyApp.xcworkspace -scheme MyApp -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 13' -derivedDataPath ./build -quiet`
      );
    });

    it('should add update `workspace.json` file', async () => {
      const project = readProjectConfiguration(tree, 'my-dir-my-app-e2e');

      expect(project.root).toEqual('apps/my-dir/my-app-e2e');
    });

    it('should update nx.json', async () => {
      const project = readProjectConfiguration(tree, 'my-dir-my-app-e2e');
      expect(project.tags).toEqual([]);
      expect(project.implicitDependencies).toEqual(['my-dir-my-app']);
    });
  });

  describe('with directory in name', () => {
    beforeEach(async () => {
      addProjectConfiguration(tree, 'my-dir-my-app', {
        root: 'my-dir/my-app',
      });

      await detoxApplicationGenerator(tree, {
        name: 'my-dir/my-app-e2e',
        project: 'my-dir-my-app',
        appClassName: 'MyApp',
        linter: Linter.None,
        framework: 'react-native',
      });
    });

    it('should generate files', () => {
      expect(tree.exists('apps/my-dir/my-app-e2e/.detoxrc.json')).toBeTruthy();
      expect(
        tree.exists('apps/my-dir/my-app-e2e/src/app.spec.ts')
      ).toBeTruthy();
    });

    it('should add update `workspace.json` file', async () => {
      const project = readProjectConfiguration(tree, 'my-dir-my-app-e2e');

      expect(project.root).toEqual('apps/my-dir/my-app-e2e');
    });

    it('should update nx.json', async () => {
      const project = readProjectConfiguration(tree, 'my-dir-my-app-e2e');
      expect(project.tags).toEqual([]);
      expect(project.implicitDependencies).toEqual(['my-dir-my-app']);
    });
  });

  describe('tsconfig', () => {
    beforeEach(async () => {
      addProjectConfiguration(tree, 'my-app', { root: 'my-app' });
    });

    it('should extend from tsconfig.base.json', async () => {
      await detoxApplicationGenerator(tree, {
        name: 'my-app-e2e',
        project: 'my-app',
        appClassName: 'MyApp',
        linter: Linter.None,
        framework: 'react-native',
      });

      const tsConfig = readJson(tree, 'apps/my-app-e2e/tsconfig.json');
      expect(tsConfig.extends).toEqual('../../tsconfig.base.json');
    });

    it('should support a root tsconfig.json instead of tsconfig.base.json', async () => {
      tree.rename('tsconfig.base.json', 'tsconfig.json');

      await detoxApplicationGenerator(tree, {
        name: 'my-app-e2e',
        project: 'my-app',
        appClassName: 'MyApp',
        linter: Linter.None,
        framework: 'react-native',
      });

      const tsConfig = readJson(tree, 'apps/my-app-e2e/tsconfig.json');
      expect(tsConfig.extends).toEqual('../../tsconfig.json');
    });
  });
});
