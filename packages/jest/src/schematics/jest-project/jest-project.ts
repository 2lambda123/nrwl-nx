import init from '../init/init';
import { checkForTestTarget } from './lib/check-for-test-target';
import { createFiles } from './lib/create-files';
import { updateTsConfig } from './lib/update-tsconfig';
import { updateWorkspace } from './lib/update-workspace';
import { updateJestConfig } from './lib/update-jestconfig';
import { JestProjectSchema } from './schema';
import { formatFiles, Tree, convertNxGenerator } from '@nrwl/devkit';

const schemaDefaults = {
  setupFile: 'none',
  babelJest: false,
  supportTsx: false,
  skipSetupFile: false,
  skipSerializers: false,
} as const;

function normalizeOptions(options: JestProjectSchema) {
  if (options.testEnvironment === 'jsdom') {
    options.testEnvironment = '';
  }

  // if we support TSX or babelJest we don't support angular(html templates)
  if (options.supportTsx || options.babelJest) {
    options.skipSerializers = true;
  }

  if (!options.skipSetupFile) {
    return options;
  }

  // setupFile is always 'none'
  options.setupFile = schemaDefaults.setupFile;

  return {
    ...schemaDefaults,
    ...options,
  };
}

export async function jestProjectGenerator(
  tree: Tree,
  schema: JestProjectSchema
) {
  const options = normalizeOptions(schema);
  init(tree, options);
  checkForTestTarget(tree, options);
  createFiles(tree, options);
  updateTsConfig(tree, options);
  updateWorkspace(tree, options);
  updateJestConfig(tree, options);
  if (!schema.skipFormat) {
    await formatFiles(tree);
  }
}

export const jestProjectSchematic = convertNxGenerator(jestProjectGenerator);
