import { execSync } from 'child_process';
import { tmpProjPath } from './paths';
import { getPackageManagerCommand } from '@nrwl/devkit';

/**
 * Run a nx command inside the e2e directory
 * @param command
 * @param opts
 *
 * @see tmpProjPath
 */
export function runNxCommand(
  command?: string,
  opts: { silenceError?: boolean; env?: NodeJS.ProcessEnv } = {
    silenceError: false,
    env: {},
  }
): string {
  try {
    const pmc = getPackageManagerCommand();
    return execSync(`${pmc.exec} nx ${command}`, {
      cwd: tmpProjPath(),
      env: { ...process.env, ...opts.env },
    })
      .toString()
      .replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
      );
  } catch (e) {
    if (opts.silenceError) {
      return e.stdout.toString();
    } else {
      console.log(e.stdout.toString(), e.stderr.toString());
      throw e;
    }
  }
}

export function runCommand(
  command: string,
  opts: { env?: NodeJS.ProcessEnv } = {
    env: {},
  }
): string {
  try {
    return execSync(command, {
      cwd: tmpProjPath(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...opts.env },
    }).toString();
  } catch (e) {
    return e.stdout.toString() + e.stderr.toString();
  }
}
