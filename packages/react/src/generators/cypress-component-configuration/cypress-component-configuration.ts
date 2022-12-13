import {
  ensurePackage,
  formatFiles,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { nxVersion } from '../../utils/versions';
import { addFiles } from './lib/add-files';
import { updateProjectConfig } from './lib/update-configs';
import { CypressComponentConfigurationSchema } from './schema.d';

/**
 * This is for using cypresses own Component testing, if you want to use test
 * storybook components then use componentCypressGenerator instead.
 *
 */
export async function cypressComponentConfigGenerator(
  tree: Tree,
  options: CypressComponentConfigurationSchema
) {
  await ensurePackage(tree, '@nrwl/cypress', nxVersion);
  const { cypressComponentProject } = await import('@nrwl/cypress');
  const projectConfig = readProjectConfiguration(tree, options.project);
  const installTask = await cypressComponentProject(tree, {
    project: options.project,
    skipFormat: true,
  });

  await updateProjectConfig(tree, options);
  await addFiles(tree, projectConfig, options);
  if (options.skipFormat) {
    await formatFiles(tree);
  }

  return () => {
    installTask();
  };
}

export default cypressComponentConfigGenerator;
