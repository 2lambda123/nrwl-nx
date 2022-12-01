import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  GeneratorCallback,
  Tree,
} from '@nrwl/devkit';
import { Schema } from './schema';
import { swcCoreVersion, swcHelpersVersion } from '@nrwl/js/src/utils/versions';
import { swcLoaderVersion, tsLibVersion } from '../../utils/versions';
import { addBabelInputs } from '@nrwl/js/src/utils/add-babel-inputs';

export async function rollupInitGenerator(tree: Tree, schema: Schema) {
  let task: GeneratorCallback;

  if (schema.compiler === 'babel') {
    addBabelInputs(tree);
  }

  if (schema.compiler === 'swc') {
    task = addDependenciesToPackageJson(
      tree,
      {},
      {
        '@swc/helpers': swcHelpersVersion,
        '@swc/core': swcCoreVersion,
        'swc-loader': swcLoaderVersion,
      }
    );
  }

  if (schema.compiler === 'tsc') {
    task = addDependenciesToPackageJson(tree, {}, { tslib: tsLibVersion });
  }

  if (!schema.skipFormat) {
    await formatFiles(tree);
  }

  return task;
}

export default rollupInitGenerator;

export const rollupInitSchematic = convertNxGenerator(rollupInitGenerator);
