import {
  addDependenciesToPackageJson,
  GeneratorCallback,
  joinPathFragments,
  readProjectConfiguration,
  runTasksInSerial,
  Tree,
  updateJson,
} from '@nx/devkit';
import { Linter, lintProjectGenerator } from '@nx/linter';
import { javaScriptOverride } from '@nx/linter/src/generators/init/global-eslint-config';
import { eslintPluginPlaywrightVersion } from './versions';
import {
  addExtendsToLintConfig,
  addOverrideToLintConfig,
} from '@nx/linter/src/generators/utils/eslint-file';

export interface PlaywrightLinterOptions {
  project: string;
  linter: Linter;
  setParserOptionsProject: boolean;
  skipPackageJson: boolean;
  rootProject: boolean;
  js?: boolean;
  /**
   * Directory from the project root, where the playwright files will be located.
   **/
  directory: string;
}

export async function addLinterToPlaywrightProject(
  tree: Tree,
  options: PlaywrightLinterOptions
): Promise<GeneratorCallback> {
  if (options.linter === Linter.None) {
    return () => {};
  }

  const tasks: GeneratorCallback[] = [];
  const projectConfig = readProjectConfiguration(tree, options.project);

  if (!tree.exists(joinPathFragments(projectConfig.root, '.eslintrc.json'))) {
    tasks.push(
      await lintProjectGenerator(tree, {
        project: options.project,
        linter: options.linter,
        skipFormat: true,
        tsConfigPaths: [joinPathFragments(projectConfig.root, 'tsconfig.json')],
        eslintFilePatterns: [
          `${projectConfig.root}/**/*.${options.js ? 'js' : '{js,ts}'}`,
        ],
        setParserOptionsProject: options.setParserOptionsProject,
        skipPackageJson: options.skipPackageJson,
        rootProject: options.rootProject,
      })
    );
  }

  if (!options.linter || options.linter !== Linter.EsLint) {
    return runTasksInSerial(...tasks);
  }

  tasks.push(
    !options.skipPackageJson
      ? addDependenciesToPackageJson(
          tree,
          {},
          { 'eslint-plugin-playwright': eslintPluginPlaywrightVersion }
        )
      : () => {}
  );

  addExtendsToLintConfig(
    tree,
    projectConfig.root,
    'plugin:playwright/recommended'
  );
  if (options.rootProject) {
    addOverrideToLintConfig(tree, projectConfig.root, javaScriptOverride);
  }
  addOverrideToLintConfig(tree, projectConfig.root, {
    files: [`${options.directory}/**/*.{ts,js,tsx,jsx}`],
    parserOptions: !options.setParserOptionsProject
      ? undefined
      : {
          project: `${projectConfig.root}/tsconfig.*?.json`,
        },
    rules: {},
  });

  return runTasksInSerial(...tasks);
}
