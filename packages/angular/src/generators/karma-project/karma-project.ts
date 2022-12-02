import type { GeneratorCallback, Tree } from '@nrwl/devkit';
import { formatFiles } from '@nrwl/devkit';
import { checkProjectTestTarget } from './lib/check-test-target';
import { generateKarmaProjectFiles } from './lib/generate-karma-project-files';
import { updateTsConfigs } from './lib/update-tsconfig';
import { updateWorkspaceConfig } from './lib/update-workspace-config';
import type { KarmaProjectOptions } from './schema';
import { karmaGenerator } from '../karma/karma';
import { getGeneratorDirectoryForInstalledAngularVersion } from '../../utils/get-generator-directory-for-ng-version';
import { join } from 'path';

export async function karmaProjectGenerator(
  tree: Tree,
  options: KarmaProjectOptions
): Promise<GeneratorCallback> {
  const generatorDirectory =
    getGeneratorDirectoryForInstalledAngularVersion(tree);
  if (generatorDirectory) {
    let previousGenerator = await import(
      join(__dirname, generatorDirectory, 'karma-project')
    );
    await previousGenerator.default(tree, options);
    return;
  }

  const installTask = await karmaGenerator(tree, options);
  checkProjectTestTarget(tree, options.project);
  generateKarmaProjectFiles(tree, options.project);
  updateTsConfigs(tree, options.project);
  updateWorkspaceConfig(tree, options.project);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return installTask;
}

export default karmaProjectGenerator;
