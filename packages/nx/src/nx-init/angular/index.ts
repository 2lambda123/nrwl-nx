import { prompt } from 'enquirer';
import { join } from 'path';
import { readJsonFile, writeJsonFile } from '../../utils/fileutils';
import { sortObjectByKeys } from '../../utils/object-sort';
import { output } from '../../utils/output';
import type { PackageJson } from '../../utils/package-json';
import {
  addDepsToPackageJson,
  askAboutNxCloud,
  initCloud,
  runInstall,
} from '../utils';
import { setupIntegratedWorkspace } from './integrated-workspace';
import { getLegacyMigrationFunctionIfApplicable } from './legacy-angular-versions';
import { setupStandaloneWorkspace } from './standalone-workspace';
import type { AngularJsonConfig } from './types';
import yargsParser = require('yargs-parser');

const defaultCacheableOperations: string[] = [
  'build',
  'server',
  'test',
  'lint',
];
const parsedArgs = yargsParser(process.argv, {
  boolean: ['yes'],
  string: ['cacheable'], // only used for testing
  alias: {
    yes: ['y'],
  },
});

let repoRoot: string;
let workspaceTargets: string[];

export async function addNxToAngularCliRepo(integrated: boolean) {
  repoRoot = process.cwd();

  output.log({ title: '🧐 Checking versions compatibility' });
  const legacyMigrationFn = await getLegacyMigrationFunctionIfApplicable(
    repoRoot,
    integrated,
    parsedArgs.yes !== true
  );
  if (legacyMigrationFn) {
    output.log({ title: '💽 Running migration for a legacy Angular version' });
    await legacyMigrationFn();
    process.exit(0);
  }

  output.success({
    title:
      '✅ The Angular version is compatible with the latest version of Nx!',
  });

  output.log({ title: '🐳 Nx initialization' });
  const cacheableOperations = !integrated
    ? await collectCacheableOperations()
    : [];
  const useNxCloud = parsedArgs.yes !== true ? await askAboutNxCloud() : false;

  output.log({ title: '📦 Installing dependencies' });
  installDependencies(useNxCloud);

  output.log({ title: '📝 Setting up workspace' });
  await setupWorkspace(cacheableOperations, integrated);

  if (useNxCloud) {
    output.log({ title: '🛠️ Setting up Nx Cloud' });
    initCloud(repoRoot, 'nx-init-angular');
  }

  output.success({
    title: '🎉 Nx is now enabled in your workspace!',
    bodyLines: [
      `Execute 'npx nx build' twice to see the computation caching in action.`,
      'Learn more about the changes done to your workspace at https://nx.dev/recipes/adopting-nx/migration-angular.',
    ],
  });
}

async function collectCacheableOperations(): Promise<string[]> {
  let cacheableOperations: string[];

  workspaceTargets = getWorkspaceTargets();
  const defaultCacheableTargetsInWorkspace = defaultCacheableOperations.filter(
    (t) => workspaceTargets.includes(t)
  );

  if (parsedArgs.yes !== true) {
    output.log({
      title: `🧑‍🔧 Please answer the following questions about the targets found in your angular.json in order to generate task runner configuration`,
    });

    cacheableOperations = (
      (await prompt([
        {
          type: 'multiselect',
          name: 'cacheableOperations',
          initial: defaultCacheableTargetsInWorkspace as any,
          message:
            'Which of the following targets are cacheable? (Produce the same output given the same input, e.g. build, test and lint usually are, serve and start are not)',
          // enquirer mutates the array below, create a new one to avoid it
          choices: [...workspaceTargets],
        },
      ])) as any
    ).cacheableOperations;
  } else {
    cacheableOperations = parsedArgs.cacheable
      ? parsedArgs.cacheable.split(',')
      : defaultCacheableTargetsInWorkspace;
  }

  return cacheableOperations;
}

function installDependencies(useNxCloud: boolean): void {
  addDepsToPackageJson(repoRoot, useNxCloud);
  addPluginDependencies();
  runInstall(repoRoot);
}

function addPluginDependencies(): void {
  const packageJsonPath = join(repoRoot, 'package.json');
  const packageJson = readJsonFile<PackageJson>(packageJsonPath);
  const nxVersion = require('../../../package.json').version;

  packageJson.devDependencies ??= {};
  packageJson.devDependencies['@nrwl/angular'] = nxVersion;
  packageJson.devDependencies['@nrwl/workspace'] = nxVersion;

  const peerDepsToInstall = [
    '@angular-devkit/core',
    '@angular-devkit/schematics',
    '@schematics/angular',
  ];
  const angularCliVersion =
    packageJson.devDependencies['@angular/cli'] ??
    packageJson.dependencies?.['@angular/cli'] ??
    packageJson.devDependencies['@angular-devkit/build-angular'] ??
    packageJson.dependencies?.['@angular-devkit/build-angular'];

  for (const dep of peerDepsToInstall) {
    if (!packageJson.devDependencies[dep] && !packageJson.dependencies?.[dep]) {
      packageJson.devDependencies[dep] = angularCliVersion;
    }
  }

  packageJson.devDependencies = sortObjectByKeys(packageJson.devDependencies);

  writeJsonFile(packageJsonPath, packageJson);
}

async function setupWorkspace(
  cacheableOperations: string[],
  isIntegratedMigration: boolean
): Promise<void> {
  if (isIntegratedMigration) {
    setupIntegratedWorkspace();
  } else {
    await setupStandaloneWorkspace(
      repoRoot,
      cacheableOperations,
      workspaceTargets
    );
  }
}

function getWorkspaceTargets(): string[] {
  const { projects } = readJsonFile<AngularJsonConfig>(
    join(repoRoot, 'angular.json')
  );
  const targets = new Set<string>();
  for (const project of Object.values(projects ?? {})) {
    for (const target of Object.keys(project.architect ?? {})) {
      targets.add(target);
    }
  }

  return Array.from(targets);
}
