import * as yargs from 'yargs';
import { MessageKey, messages } from '../utils/nx/ab-testing';
import { output } from '../utils/output';
import { deduceDefaultBase } from '../utils/git/default-base';
import {
  detectInvokedPackageManager,
  PackageManager,
  packageManagerList,
} from '../utils/package-manager';
import { stringifyCollection } from '../utils/string-utils';
import enquirer = require('enquirer');
import { NxCloud } from '../utils/nx/nx-cloud';
import chalk = require('chalk');

export async function determineNxCloud(
  parsedArgs: yargs.Arguments<{ nxCloud: NxCloud }>
): Promise<NxCloud> {
  if (parsedArgs.nxCloud === undefined) {
    return nxCloudPrompt('setupCI');
  } else {
    return parsedArgs.nxCloud;
  }
}

async function nxCloudPrompt(key: MessageKey): Promise<NxCloud> {
  const { message, choices, initial, fallback } = messages.getPrompt(key);

  return enquirer
    .prompt<{ NxCloud: NxCloud }>([
      {
        name: 'NxCloud',
        message,
        type: 'autocomplete',
        choices,
        initial,
        footer() {
          return chalk.dim`\nRead more about remote cache at https://nx.dev/ci/features/remote-cache`;
        },
        hint() {
          return chalk.dim`\n(it's free and can be disabled any time)`;
        },
      } as any, // types in enquirer are not up to date,
    ])
    .then((a) => {
      if (fallback && a.NxCloud === fallback.value) {
        return nxCloudPrompt(fallback.key);
      }
      return a.NxCloud;
    });
}

export async function determineDefaultBase(
  parsedArgs: yargs.Arguments<{ defaultBase?: string }>
): Promise<string> {
  if (parsedArgs.defaultBase) {
    return Promise.resolve(parsedArgs.defaultBase);
  }
  if (parsedArgs.allPrompts) {
    return enquirer
      .prompt<{ DefaultBase: string }>([
        {
          name: 'DefaultBase',
          message: `Main branch name`,
          initial: `main`,
          type: 'input',
        },
      ])
      .then((a) => {
        if (!a.DefaultBase) {
          output.error({
            title: 'Invalid branch name',
            bodyLines: [`Branch name cannot be empty`],
          });
          process.exit(1);
        }
        return a.DefaultBase;
      });
  }
  return Promise.resolve(deduceDefaultBase());
}

export async function determinePackageManager(
  parsedArgs: yargs.Arguments<{ packageManager: string }>
): Promise<PackageManager> {
  const packageManager: string = parsedArgs.packageManager;

  if (packageManager) {
    if (packageManagerList.includes(packageManager as PackageManager)) {
      return Promise.resolve(packageManager as PackageManager);
    }
    output.error({
      title: 'Invalid package manager',
      bodyLines: [
        `Package manager must be one of ${stringifyCollection([
          ...packageManagerList,
        ])}`,
      ],
    });
    process.exit(1);
  }

  if (parsedArgs.allPrompts) {
    return enquirer
      .prompt<{ packageManager: PackageManager }>([
        {
          name: 'packageManager',
          message: `Which package manager to use`,
          initial: 'npm' as any,
          type: 'autocomplete',
          choices: [
            { name: 'npm', message: 'NPM' },
            { name: 'yarn', message: 'Yarn' },
            { name: 'pnpm', message: 'PNPM' },
          ],
        },
      ])
      .then((a) => a.packageManager);
  }

  return Promise.resolve(detectInvokedPackageManager());
}
