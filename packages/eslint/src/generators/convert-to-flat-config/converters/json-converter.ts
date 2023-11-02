import { Tree, addDependenciesToPackageJson, readJson } from '@nx/devkit';
import { join } from 'path';
import { ESLint } from 'eslint';
import { eslintrcVersion } from '../../../utils/versions';
import { convertJsonConfigToFlatConfig } from './config-converter';

/**
 * Converts an ESLint JSON config to a flat config.
 * Deletes the original file along with .eslintignore if it exists.
 */
export function convertEslintJsonToFlatConfig(
  tree: Tree,
  root: string,
  sourceFile: string,
  destinationFile: string,
  ignorePaths: string[]
) {
  // read original config
  const config: ESLint.ConfigData = readJson(tree, `${root}/${sourceFile}`);

  // convert to flat config
  const { content, addESLintRC } = convertJsonConfigToFlatConfig(
    tree,
    root,
    config,
    ignorePaths
  );

  // handle file deletion and creation
  tree.delete(join(root, sourceFile));
  tree.write(join(root, destinationFile), content);

  if (addESLintRC) {
    addDependenciesToPackageJson(
      tree,
      {},
      {
        '@eslint/eslintrc': eslintrcVersion,
      }
    );
  }
}
