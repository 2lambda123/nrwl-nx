import { cypressInitGenerator } from '@nrwl/cypress';
import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  logger,
  readWorkspaceConfiguration,
  Tree,
  updateWorkspaceConfiguration,
} from '@nrwl/devkit';
import { jestInitGenerator } from '@nrwl/jest';
import { Linter } from '@nrwl/linter';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { E2eTestRunner, UnitTestRunner } from '../../utils/test-runners';
import {
  angularDevkitVersion,
  angularVersion,
  jasmineCoreVersion,
  jasmineSpecReporterVersion,
  jestPresetAngularVersion,
  protractorVersion,
  rxjsVersion,
  tsLibVersion,
  tsNodeVersion,
  typesJasmineVersion,
  typesJasminewd2Version,
  zoneJsVersion,
} from '../../utils/versions';
import { karmaGenerator } from '../karma/karma';
import { Schema } from './schema';
import { getGeneratorDirectoryForInstalledAngularVersion } from '../../utils/get-generator-directory-for-ng-version';
import { join } from 'path';

export async function angularInitGenerator(
  tree: Tree,
  rawOptions: Schema
): Promise<GeneratorCallback> {
  const generatorDirectory =
    getGeneratorDirectoryForInstalledAngularVersion(tree);
  if (generatorDirectory) {
    let previousGenerator = await import(
      join(__dirname, generatorDirectory, 'init')
    );
    await previousGenerator.default(tree, rawOptions);
    return;
  }

  const options = normalizeOptions(rawOptions);
  setDefaults(tree, options);

  const depsTask = !options.skipPackageJson
    ? updateDependencies(tree)
    : () => {};
  const unitTestTask = addUnitTestRunner(tree, options);
  const e2eTask = addE2ETestRunner(tree, options);
  addGitIgnoreEntry(tree, '.angular');

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(depsTask, unitTestTask, e2eTask);
}

function normalizeOptions(options: Schema): Required<Schema> {
  return {
    e2eTestRunner: options.e2eTestRunner ?? E2eTestRunner.Cypress,
    linter: options.linter ?? Linter.EsLint,
    skipFormat: options.skipFormat ?? false,
    skipInstall: options.skipInstall ?? false,
    skipPackageJson: options.skipPackageJson ?? false,
    style: options.style ?? 'css',
    unitTestRunner: options.unitTestRunner ?? UnitTestRunner.Jest,
  };
}

function setDefaults(host: Tree, options: Schema) {
  const workspace = readWorkspaceConfiguration(host);

  workspace.generators = workspace.generators || {};
  workspace.generators['@nrwl/angular:application'] = {
    style: options.style,
    linter: options.linter,
    unitTestRunner: options.unitTestRunner,
    e2eTestRunner: options.e2eTestRunner,
    ...(workspace.generators['@nrwl/angular:application'] || {}),
  };
  workspace.generators['@nrwl/angular:library'] = {
    linter: options.linter,
    unitTestRunner: options.unitTestRunner,
    ...(workspace.generators['@nrwl/angular:library'] || {}),
  };
  workspace.generators['@nrwl/angular:component'] = {
    style: options.style,
    ...(workspace.generators['@nrwl/angular:component'] || {}),
  };

  updateWorkspaceConfiguration(host, workspace);
}

function updateDependencies(host: Tree): GeneratorCallback {
  return addDependenciesToPackageJson(
    host,
    {
      '@angular/animations': angularVersion,
      '@angular/common': angularVersion,
      '@angular/compiler': angularVersion,
      '@angular/core': angularVersion,
      '@angular/forms': angularVersion,
      '@angular/platform-browser': angularVersion,
      '@angular/platform-browser-dynamic': angularVersion,
      '@angular/router': angularVersion,
      rxjs: rxjsVersion,
      tslib: tsLibVersion,
      'zone.js': zoneJsVersion,
    },
    {
      '@angular/cli': angularDevkitVersion,
      '@angular/compiler-cli': angularVersion,
      '@angular/language-service': angularVersion,
      '@angular-devkit/build-angular': angularDevkitVersion,
    }
  );
}

function addUnitTestRunner(host: Tree, options: Schema): GeneratorCallback {
  switch (options.unitTestRunner) {
    case UnitTestRunner.Karma:
      return karmaGenerator(host, { skipPackageJson: options.skipPackageJson });
    case UnitTestRunner.Jest:
      if (!options.skipPackageJson) {
        addDependenciesToPackageJson(
          host,
          {},
          {
            'jest-preset-angular': jestPresetAngularVersion,
          }
        );
      }

      return jestInitGenerator(host, {
        skipPackageJson: options.skipPackageJson,
      });
    default:
      return () => {};
  }
}

function addE2ETestRunner(host: Tree, options: Schema): GeneratorCallback {
  switch (options.e2eTestRunner) {
    case E2eTestRunner.Protractor:
      return !options.skipPackageJson
        ? addDependenciesToPackageJson(
            host,
            {},
            {
              protractor: protractorVersion,
              'jasmine-core': jasmineCoreVersion,
              'jasmine-spec-reporter': jasmineSpecReporterVersion,
              'ts-node': tsNodeVersion,
              '@types/jasmine': typesJasmineVersion,
              '@types/jasminewd2': typesJasminewd2Version,
            }
          )
        : () => {};
    case E2eTestRunner.Cypress:
      return cypressInitGenerator(host, {
        skipPackageJson: options.skipPackageJson,
      });
    default:
      return () => {};
  }
}

function addGitIgnoreEntry(host: Tree, entry: string) {
  if (host.exists('.gitignore')) {
    let content = host.read('.gitignore', 'utf-8');
    if (/^\.angular$/gm.test(content)) {
      return;
    }

    content = `${content}\n${entry}\n`;
    host.write('.gitignore', content);
  } else {
    logger.warn(`Couldn't find .gitignore file to update`);
  }
}

export default angularInitGenerator;
