import { execSync } from 'child_process';
import { prompt } from 'enquirer';
import { existsSync } from 'fs';
import { prerelease } from 'semver';
import * as parser from 'yargs-parser';
import { addNxToMonorepo } from '../nx-init/add-nx-to-monorepo';
import { addNxToNest } from '../nx-init/add-nx-to-nest';
import { addNxToNpmRepo } from '../nx-init/add-nx-to-npm-repo';
import { addNxToAngularCliRepo } from '../nx-init/angular';
import { generateDotNxSetup } from '../nx-init/dot-nx/add-nx-scripts';
import { addNxToCraRepo } from '../nx-init/react';
import { runNxSync } from '../utils/child-process';
import { directoryExists, readJsonFile } from '../utils/fileutils';
import { PackageJson } from '../utils/package-json';

export interface InitArgs {
  integrated: boolean;
}

export async function initHandler(options: InitArgs) {
  const args = process.argv.slice(2).join(' ');
  const flags = parser(args, {
    boolean: ['useDotNxInstallation'],
    alias: {
      useDotNxInstallation: ['encapsulated'],
    },
    default: {
      useDotNxInstallation: false,
    },
  }) as any as { useDotNxInstallation: boolean };

  const version =
    process.env.NX_VERSION ??
    (prerelease(require('../../package.json').version) ? 'next' : 'latest');
  if (process.env.NX_VERSION) {
    console.log(`Using version ${process.env.NX_VERSION}`);
  }
  if (flags.useDotNxInstallation === true) {
    setupDotNxInstallation(version);
  } else if (existsSync('package.json')) {
    const packageJson: PackageJson = readJsonFile('package.json');
    if (existsSync('angular.json')) {
      await addNxToAngularCliRepo(options.integrated);
    } else if (isCRA(packageJson)) {
      await addNxToCraRepo(options.integrated);
    } else if (isNestCLI(packageJson)) {
      await addNxToNest(packageJson);
    } else if (isMonorepo(packageJson)) {
      await addNxToMonorepo();
    } else {
      await addNxToNpmRepo();
    }
  } else {
    const useDotNxFolder = await prompt<{ useDotNxFolder: string }>([
      {
        name: 'useDotNxFolder',
        type: 'autocomplete',
        message: 'Where should your workspace be created?',
        choices: [
          {
            name: 'In a new folder under this directory',
            value: 'false',
          },
          {
            name: 'In this directory',
            value: 'true',
          },
        ],
      },
    ]).then((r) => r.useDotNxFolder === 'true');
    if (useDotNxFolder) {
      setupDotNxInstallation(version);
    } else {
      execSync(`npx --yes create-nx-workspace@${version} ${args}`, {
        stdio: [0, 1, 2],
      });
    }
  }
}

function isCRA(packageJson: PackageJson) {
  const combinedDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  return (
    // Required dependencies for CRA projects
    combinedDependencies['react'] &&
    combinedDependencies['react-dom'] &&
    combinedDependencies['react-scripts'] &&
    // // Don't convert customized CRA projects
    !combinedDependencies['react-app-rewired'] &&
    !combinedDependencies['@craco/craco'] &&
    directoryExists('src') &&
    directoryExists('public')
  );
}

function isNestCLI(packageJson: PackageJson) {
  const combinedDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  return (
    existsSync('nest-cli.json') &&
    combinedDependencies['@nestjs/core'] &&
    combinedDependencies['@nestjs/cli']
  );
}

function isMonorepo(packageJson: PackageJson) {
  if (!!packageJson.workspaces) return true;

  if (existsSync('pnpm-workspace.yaml') || existsSync('pnpm-workspace.yml'))
    return true;

  if (existsSync('lerna.json')) return true;

  return false;
}

function setupDotNxInstallation(version: string) {
  if (process.platform !== 'win32') {
    console.log(
      'Setting Nx up installation in `.nx`. You can run nx commands like: `./nx --help`'
    );
  } else {
    console.log(
      'Setting Nx up installation in `.nx`. You can run nx commands like: `./nx.bat --help`'
    );
  }
  generateDotNxSetup(version);
  // invokes the wrapper, thus invoking the initial installation process
  runNxSync('');
}
