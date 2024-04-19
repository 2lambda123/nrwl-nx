import {
  createProjectGraphAsync,
  formatFiles,
  names,
  type TargetConfiguration,
  type Tree,
} from '@nx/devkit';
import { createNodes, PlaywrightPluginOptions } from '../../plugins/plugin';
import { ExecutorToPluginMigrator } from '@nx/devkit/src/generators/plugin-migrations/executor-to-plugin-migrator';

interface Schema {
  project?: string;
  all?: boolean;
  skipFormat?: boolean;
}

export async function convertToInferred(tree: Tree, options: Schema) {
  const projectGraph = await createProjectGraphAsync();
  const migrator = new ExecutorToPluginMigrator<PlaywrightPluginOptions>(
    tree,
    projectGraph,
    '@nx/playwright:playwright',
    '@nx/playwright/plugin',
    (targetName) => ({ targetName, ciTargetName: 'e2e-ci' }),
    postTargetTransformer,
    createNodes,
    options.project
  );
  await migrator.run();

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

function postTargetTransformer(
  target: TargetConfiguration
): TargetConfiguration {
  if (target.options) {
    if (target.options?.config) {
      delete target.options.config;
    }

    for (const [key, value] of Object.entries(target.options)) {
      const newKeyName = names(key).fileName;
      delete target.options[key];
      target.options[newKeyName] = value;
    }
  }

  return target;
}

export default convertToInferred;
