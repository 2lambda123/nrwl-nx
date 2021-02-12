import { Tree } from '@nrwl/tao/src/shared/tree';
import { GeneratorCallback } from '@nrwl/tao/src/shared/workspace';
import { Linter, lintProjectGenerator } from '@nrwl/linter';
import {
  addDependenciesToPackageJson,
  joinPathFragments,
  updateJson,
} from '@nrwl/devkit';
import { extraEslintDependencies, createReactEslintJson } from '@nrwl/react';
import type { Linter as ESLintLinter } from 'eslint';
import { NormalizedSchema } from './normalize-options';

export async function addLinting(host: Tree, options: NormalizedSchema) {
  let installTask: GeneratorCallback;

  installTask = await lintProjectGenerator(host, {
    linter: Linter.EsLint,
    project: options.projectName,
    tsConfigPaths: [
      joinPathFragments(options.projectRoot, 'tsconfig.app.json'),
    ],
    eslintFilePatterns: [`${options.projectRoot}/**/*.{ts,tsx,js,jsx}`],
    skipFormat: true,
  });

  const reactEslintJson = createReactEslintJson(options.projectRoot);

  updateJson(
    host,
    joinPathFragments(options.projectRoot, '.eslintrc.json'),
    (json: ESLintLinter.Config) => {
      json = reactEslintJson;
      json.ignorePatterns = ['!**/*', 'public', '.cache'];

      for (const override of json.overrides) {
        if (!override.files || override.files.length !== 2) {
          continue;
        }
        if (
          !(override.files.includes('*.ts') && override.files.includes('*.tsx'))
        ) {
          continue;
        }
        override.rules = override.rules || {};
        override.rules['@typescript-eslint/camelcase'] = 'off';
      }

      return json;
    }
  );

  installTask =
    (await addDependenciesToPackageJson(
      host,
      extraEslintDependencies.dependencies,
      extraEslintDependencies.devDependencies
    )) || installTask;

  return installTask;
}
