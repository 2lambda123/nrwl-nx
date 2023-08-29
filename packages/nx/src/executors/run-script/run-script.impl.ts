import { execSync } from 'child_process';
import { getPackageManagerCommandAsync } from '../../utils/package-manager';
import type { ExecutorContext } from '../../config/misc-interfaces';
import * as path from 'path';
import { env as appendLocalEnv } from 'npm-run-path';

export interface RunScriptOptions {
  script: string;
  __unparsed__: string[];
}

export default async function (
  options: RunScriptOptions,
  context: ExecutorContext
) {
  const pm = await getPackageManagerCommandAsync();
  try {
    execSync(pm.run(options.script, options.__unparsed__.join(' ')), {
      stdio: ['inherit', 'inherit', 'inherit'],
      cwd: path.join(
        context.root,
        context.projectsConfigurations.projects[context.projectName].root
      ),
      env: {
        ...process.env,
        ...appendLocalEnv(),
      },
    });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
