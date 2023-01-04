import { joinPathFragments } from '../utils/path';
import { parsePnpmLockFile } from './pnpm-v2';
import { vol } from 'memfs';

jest.mock('fs', () => require('memfs').fs);

jest.mock('@nrwl/devkit', () => ({
  ...jest.requireActual<any>('@nrwl/devkit'),
  workspaceRoot: '/root',
}));

jest.mock('nx/src/utils/workspace-root', () => ({
  workspaceRoot: '/root',
}));

/**
 * Utility to generate the fileSys report of the versions in the node_modules folder
 */
// const readFileSync = require('fs').readFileSync;
// const readdirSync = require('fs').readdirSync;
// const existsSync = require('fs').existsSync;

// let report = '';

// const packageNames = [];
// readdirSync('node_modules').forEach(folder => {
//   if (folder.startsWith('@')) {
//     readdirSync(`node_modules/${folder}`).forEach(subfolder => {
//       packageNames.push(`${folder}/${subfolder}`);
//     });
//   } else {
//     packageNames.push(folder);
//   }
// });

// packageNames.forEach(packageName => {
//   const path = `node_modules/${packageName}/package.json`;
//   if (existsSync(path)) {
//     const content = readFileSync(path, 'utf-8');
//     const version = JSON.parse(content).version;
//     report += `'${path}': '{"version": "${version}"}',\n`;
//   }
// });

// console.log(report);

describe('pnpm LockFile utility', () => {
  afterEach(() => {
    vol.reset();
  });

  describe('next.js generated', () => {
    beforeEach(() => {
      const fileSys = {
        'node_modules/@babel/preset-react/package.json':
          '{"version": "7.18.6"}',
        'node_modules/@eslint/eslintrc/package.json': '{"version": "1.3.3"}',
        'node_modules/@next/eslint-plugin-next/package.json':
          '{"version": "13.0.0"}',
        'node_modules/@nrwl/cypress/package.json': '{"version": "15.3.3"}',
        'node_modules/@nrwl/eslint-plugin-nx/package.json':
          '{"version": "15.3.3"}',
        'node_modules/@nrwl/jest/package.json': '{"version": "15.3.3"}',
        'node_modules/@nrwl/linter/package.json': '{"version": "15.3.3"}',
        'node_modules/@nrwl/next/package.json': '{"version": "15.3.3"}',
        'node_modules/@nrwl/react/package.json': '{"version": "15.3.3"}',
        'node_modules/@nrwl/web/package.json': '{"version": "15.3.3"}',
        'node_modules/@nrwl/workspace/package.json': '{"version": "15.3.3"}',
        'node_modules/@rushstack/eslint-patch/package.json':
          '{"version": "1.2.0"}',
        'node_modules/@testing-library/react/package.json':
          '{"version": "13.4.0"}',
        'node_modules/@types/eslint/package.json': '{"version": "8.4.10"}',
        'node_modules/@types/eslint-scope/package.json': '{"version": "3.7.4"}',
        'node_modules/@types/jest/package.json': '{"version": "28.1.1"}',
        'node_modules/@types/node/package.json': '{"version": "18.11.9"}',
        'node_modules/@types/prettier/package.json': '{"version": "2.7.1"}',
        'node_modules/@types/react/package.json': '{"version": "18.0.25"}',
        'node_modules/@types/react-dom/package.json': '{"version": "18.0.9"}',
        'node_modules/@typescript-eslint/eslint-plugin/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/parser/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/scope-manager/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/type-utils/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/types/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/typescript-estree/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/utils/package.json':
          '{"version": "5.46.1"}',
        'node_modules/@typescript-eslint/visitor-keys/package.json':
          '{"version": "5.46.1"}',
        'node_modules/babel-jest/package.json': '{"version": "28.1.1"}',
        'node_modules/core-js/package.json': '{"version": "3.26.1"}',
        'node_modules/cypress/package.json': '{"version": "11.2.0"}',
        'node_modules/eslint/package.json': '{"version": "8.15.0"}',
        'node_modules/eslint-config-next/package.json': '{"version": "13.0.0"}',
        'node_modules/eslint-config-prettier/package.json':
          '{"version": "8.1.0"}',
        'node_modules/eslint-import-resolver-node/package.json':
          '{"version": "0.3.6"}',
        'node_modules/eslint-import-resolver-typescript/package.json':
          '{"version": "2.7.1"}',
        'node_modules/eslint-module-utils/package.json': '{"version": "2.7.4"}',
        'node_modules/eslint-plugin-cypress/package.json':
          '{"version": "2.12.1"}',
        'node_modules/eslint-plugin-import/package.json':
          '{"version": "2.26.0"}',
        'node_modules/eslint-plugin-jsx-a11y/package.json':
          '{"version": "6.6.1"}',
        'node_modules/eslint-plugin-react/package.json':
          '{"version": "7.31.11"}',
        'node_modules/eslint-plugin-react-hooks/package.json':
          '{"version": "4.6.0"}',
        'node_modules/eslint-scope/package.json': '{"version": "7.1.1"}',
        'node_modules/eslint-utils/package.json': '{"version": "3.0.0"}',
        'node_modules/eslint-visitor-keys/package.json': '{"version": "3.3.0"}',
        'node_modules/jest/package.json': '{"version": "28.1.1"}',
        'node_modules/jest-environment-jsdom/package.json':
          '{"version": "28.1.1"}',
        'node_modules/next/package.json': '{"version": "13.0.0"}',
        'node_modules/nx/package.json': '{"version": "15.3.3"}',
        'node_modules/prettier/package.json': '{"version": "2.8.1"}',
        'node_modules/react/package.json': '{"version": "18.2.0"}',
        'node_modules/react-dom/package.json': '{"version": "18.2.0"}',
        'node_modules/react-test-renderer/package.json':
          '{"version": "18.2.0"}',
        'node_modules/regenerator-runtime/package.json':
          '{"version": "0.13.7"}',
        'node_modules/ts-jest/package.json': '{"version": "28.0.5"}',
        'node_modules/ts-node/package.json': '{"version": "10.9.1"}',
        'node_modules/tslib/package.json': '{"version": "2.4.1"}',
        'node_modules/typescript/package.json': '{"version": "4.8.4"}',
        'node_modules/.modules.yaml': require(joinPathFragments(
          __dirname,
          '__fixtures__/nextjs/.modules.yaml'
        )).default,
      };
      vol.fromJSON(fileSys, '/root');
    });

    it('should parse root lock file', async () => {
      const lockFile = require(joinPathFragments(
        __dirname,
        '__fixtures__/nextjs/pnpm-lock.yaml'
      )).default;
      const packageJson = require(joinPathFragments(
        __dirname,
        '__fixtures__/nextjs/package.json'
      ));
      const result = parsePnpmLockFile(lockFile, packageJson);
      expect(result.root.children.size).toEqual(1143);
      expect(result.isValid).toBeTruthy();
    });
  });

  describe('auxiliary packages', () => {
    beforeEach(() => {
      const fileSys = {
        'node_modules/@eslint/eslintrc/package.json': '{"version": "1.3.3"}',
        'node_modules/@nrwl/devkit/package.json': '{"version": "15.0.13"}',
        'node_modules/eslint/package.json': '{"version": "8.29.0"}',
        'node_modules/eslint-plugin-disable-autofix/package.json':
          '{"version": "3.0.0"}',
        'node_modules/eslint-rule-composer/package.json':
          '{"version": "0.3.0"}',
        'node_modules/eslint-scope/package.json': '{"version": "7.1.1"}',
        'node_modules/eslint-utils/package.json': '{"version": "3.0.0"}',
        'node_modules/eslint-visitor-keys/package.json': '{"version": "3.3.0"}',
        'node_modules/postgres/package.json': '{"version": "3.2.4"}',
        'node_modules/react/package.json': '{"version": "18.2.0"}',
        'node_modules/typescript/package.json': '{"version": "4.8.4"}',
        'node_modules/yargs/package.json': '{"version": "17.6.2"}',
        'node_modules/.modules.yaml': require(joinPathFragments(
          __dirname,
          '__fixtures__/auxiliary-packages/.modules.yaml'
        )).default,
      };
      vol.fromJSON(fileSys, '/root');
    });

    it('should parse root lock file', async () => {
      const packageJson = require(joinPathFragments(
        __dirname,
        '__fixtures__/auxiliary-packages/package.json'
      ));

      const lockFile = require(joinPathFragments(
        __dirname,
        '__fixtures__/auxiliary-packages/pnpm-lock.yaml'
      )).default;
      const result = parsePnpmLockFile(lockFile, packageJson);
      expect(result.root.children.size).toEqual(202);
      expect(result.isValid).toBeTruthy();

      const postgres = result.nodes.get('node_modules/postgres');
      expect(postgres.name).toEqual('postgres');
      expect(postgres.packageName).toBeUndefined();
      expect(postgres.version).toMatch(
        '3b1a01b2da3e2fafb1a79006f838eff11a8de3cb'
      );
      expect(postgres.edgesIn.values().next().value.versionSpec).toEqual(
        'github.com/charsleysa/postgres/3b1a01b2da3e2fafb1a79006f838eff11a8de3cb'
      );

      const alias = result.nodes.get(
        'node_modules/eslint-plugin-disable-autofix'
      );
      expect(alias.name).toEqual('eslint-plugin-disable-autofix');
      expect(alias.packageName).toEqual(
        '@mattlewis92/eslint-plugin-disable-autofix'
      );
      expect(alias.version).toEqual('3.0.0');
      expect(alias.edgesIn.values().next().value.versionSpec).toEqual(
        '/@mattlewis92/eslint-plugin-disable-autofix/3.0.0'
      );
    });
  });

  describe('duplicate packages', () => {
    beforeEach(() => {
      const fileSys = {
        'node_modules/@nrwl/devkit/package.json': '{"version": "14.8.6"}',
        'node_modules/@nrwl/workspace/package.json': '{"version": "14.8.6"}',
        'node_modules/@types/prettier/package.json': '{"version": "2.7.2"}',
        'node_modules/nx/package.json': '{"version": "15.4.0"}',
        'node_modules/.modules.yaml': require(joinPathFragments(
          __dirname,
          '__fixtures__/duplicate-package/.modules.yaml'
        )).default,
      };
      vol.fromJSON(fileSys, '/root');
    });

    it('should parse root lock file', async () => {
      const lockFile = require(joinPathFragments(
        __dirname,
        '__fixtures__/duplicate-package/pnpm-lock.yaml'
      )).default;
      const packageJson = require(joinPathFragments(
        __dirname,
        '__fixtures__/duplicate-package/package.json'
      ));
      const result = parsePnpmLockFile(lockFile, packageJson);
      expect(result.root.children.size).toEqual(337);
      expect(result.isValid).toBeTruthy();
    });
  });
});
