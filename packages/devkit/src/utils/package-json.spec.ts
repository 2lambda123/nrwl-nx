import type { Tree } from 'nx/src/generators/tree';
import { readJson, writeJson } from 'nx/src/generators/utils/json';
import { addDependenciesToPackageJson, ensurePackage } from './package-json';
import { createTree } from 'nx/src/generators/testing-utils/create-tree';

describe('addDependenciesToPackageJson', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTree();
    writeJson(tree, 'package.json', {
      dependencies: {
        react: 'latest',
      },
      devDependencies: {
        jest: 'latest',
      },
    });
  });

  it('should not add dependency if it is not greater', () => {
    writeJson(tree, 'package.json', {
      dependencies: {
        tslib: '^2.0.0',
      },
      devDependencies: {
        jest: '28.1.3',
      },
    });
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        tslib: '^2.3.0',
      },
      { jest: '28.1.1' }
    );

    expect(readJson(tree, 'package.json')).toEqual({
      dependencies: { tslib: '^2.3.0' },
      devDependencies: { jest: '28.1.3' },
    });
    expect(installTask).toBeDefined();
  });

  it('should add dependencies to the package.json', () => {
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        'react-dom': 'latest',
      },
      {}
    );
    expect(readJson(tree, 'package.json').dependencies).toEqual({
      react: 'latest',
      'react-dom': 'latest',
    });

    expect(installTask).toBeDefined();
  });

  it('should overwrite existing dependencies in the package.json if the version tag is greater', () => {
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        react: 'next',
      },
      {}
    );
    expect(readJson(tree, 'package.json').dependencies).toEqual({
      react: 'next',
    });
    expect(installTask).toBeDefined();
  });

  it('should add devDependencies to the package.json', () => {
    const installTask = addDependenciesToPackageJson(
      tree,
      {},
      {
        '@nrwl/react': 'latest',
      }
    );
    expect(readJson(tree, 'package.json').devDependencies).toEqual({
      jest: 'latest',
      '@nrwl/react': 'latest',
    });
    expect(installTask).toBeDefined();
  });

  it('should overwrite existing devDependencies in the package.json if the version tag is greater', () => {
    const installTask = addDependenciesToPackageJson(
      tree,
      {},
      {
        jest: 'next',
      }
    );
    expect(readJson(tree, 'package.json').devDependencies).toEqual({
      jest: 'next',
    });
    expect(installTask).toBeDefined();
  });

  it('should overwrite dependencies when they exist in devDependencies or vice versa and the version tag is greater', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        '@nrwl/angular': 'latest',
      },
      devDependencies: {
        '@nrwl/next': 'latest',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        '@nrwl/next': 'next',
      },
      {
        '@nrwl/angular': 'next',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      '@nrwl/angular': 'next',
    });
    expect(devDependencies).toEqual({
      '@nrwl/next': 'next',
    });
    expect(installTask).toBeDefined();
  });

  it('should not overwrite dependencies when they exist in devDependencies or vice versa and the version tag is lesser', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        '@nrwl/angular': 'next',
      },
      devDependencies: {
        '@nrwl/next': 'next',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        '@nrwl/next': 'latest',
      },
      {
        '@nrwl/angular': 'latest',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      '@nrwl/angular': 'next',
    });
    expect(devDependencies).toEqual({
      '@nrwl/next': 'next',
    });
    expect(installTask).toBeDefined();
  });

  it('should overwrite dependencies when they exist in devDependencies or vice versa and the version is greater', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        '@nrwl/angular': '14.0.0',
      },
      devDependencies: {
        '@nrwl/next': '14.0.0',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        '@nrwl/next': '14.1.0',
      },
      {
        '@nrwl/angular': '14.1.0',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      '@nrwl/angular': '14.1.0',
    });
    expect(devDependencies).toEqual({
      '@nrwl/next': '14.1.0',
    });
    expect(installTask).toBeDefined();
  });

  it('should not overwrite dependencies when they exist in devDependencies or vice versa and the version is lesser', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        '@nrwl/angular': '14.1.0',
      },
      devDependencies: {
        '@nrwl/next': '14.1.0',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        '@nrwl/next': '14.0.0',
      },
      {
        '@nrwl/angular': '14.0.0',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      '@nrwl/angular': '14.1.0',
    });
    expect(devDependencies).toEqual({
      '@nrwl/next': '14.1.0',
    });
    expect(installTask).toBeDefined();
  });

  it('should only overwrite dependencies when their version is greater', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        '@nrwl/angular': '14.0.0',
      },
      devDependencies: {
        '@nrwl/next': '14.1.0',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        '@nrwl/next': '14.0.0',
      },
      {
        '@nrwl/angular': '14.1.0',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      '@nrwl/angular': '14.1.0',
    });
    expect(devDependencies).toEqual({
      '@nrwl/next': '14.1.0',
    });
    expect(installTask).toBeDefined();
  });

  it('should add additional dependencies when they dont exist in devDependencies or vice versa and not update the ones that do exist', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        '@nrwl/angular': 'latest',
      },
      devDependencies: {
        '@nrwl/next': 'latest',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        '@nrwl/next': 'next',
        '@nrwl/cypress': 'latest',
      },
      {
        '@nrwl/angular': 'next',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      '@nrwl/angular': 'next',
      '@nrwl/cypress': 'latest',
    });
    expect(devDependencies).toEqual({
      '@nrwl/next': 'next',
    });
    expect(installTask).toBeDefined();
  });

  it('should not overwrite dependencies when they exist in devDependencies or vice versa and the new version is tilde', () => {
    // ARRANGE
    writeJson(tree, 'package.json', {
      dependencies: {
        tslib: '2.4.0',
      },
      devDependencies: {
        nx: '15.0.0',
      },
    });

    // ACT
    const installTask = addDependenciesToPackageJson(
      tree,
      {
        tslib: '~2.3.0',
      },
      {
        nx: '15.0.0',
      }
    );

    // ASSERT
    const { dependencies, devDependencies } = readJson(tree, 'package.json');
    expect(dependencies).toEqual({
      tslib: '2.4.0',
    });
    expect(devDependencies).toEqual({
      nx: '15.0.0',
    });
    expect(installTask).toBeDefined();
  });
});

describe('ensurePackage', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTree();
  });

  it('should return without error when dependency is satisfied', async () => {
    writeJson(tree, 'package.json', {
      devDependencies: {
        '@nrwl/vite': '15.0.0',
      },
    });

    await expect(
      ensurePackage(tree, '@nrwl/vite', '>=15.0.0', {
        throwOnMissing: true,
      })
    ).resolves.toBeUndefined();
  });

  it('should throw when dependencies are missing', async () => {
    writeJson(tree, 'package.json', {});

    await expect(() =>
      ensurePackage(tree, '@nrwl/does-not-exist', '>=15.0.0', {
        throwOnMissing: true,
      })
    ).rejects.toThrow(/-D( -W)? @nrwl\/does-not-exist@>=15.0.0/);

    await expect(() =>
      ensurePackage(tree, '@nrwl/does-not-exist', '>=15.0.0', {
        dev: false,
        throwOnMissing: true,
      })
    ).rejects.toThrow('@nrwl/does-not-exist@>=15.0.0');
  });
});
