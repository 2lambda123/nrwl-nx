import type { ProjectConfiguration, Tree } from '@nrwl/devkit';
import {
  formatFiles,
  offsetFromRoot,
  readProjectConfiguration,
  updateProjectConfiguration,
  writeJson,
} from '@nrwl/devkit';

import { Linter } from '../utils/linter';
import { findEslintFile } from '../utils/eslint-file';
import { join } from 'path';
import { lintInitGenerator } from '../init/init';
import { migrateConfigToMonorepoStyle } from '../init/init-migration';
import { readWorkspace } from 'nx/src/generators/utils/project-configuration';

interface LintProjectOptions {
  project: string;
  linter?: Linter;
  eslintFilePatterns?: string[];
  tsConfigPaths?: string[];
  skipFormat: boolean;
  setParserOptionsProject?: boolean;
  skipPackageJson?: boolean;
  unitTestRunner?: string;
  rootProject?: boolean;
}

function createEsLintConfiguration(
  tree: Tree,
  projectConfig: ProjectConfiguration,
  setParserOptionsProject: boolean
) {
  const eslintConfig = findEslintFile(tree);
  writeJson(tree, join(projectConfig.root, `.eslintrc.json`), {
    extends: eslintConfig
      ? [`${offsetFromRoot(projectConfig.root)}${eslintConfig}`]
      : undefined,
    // Include project files to be linted since the global one excludes all files.
    ignorePatterns: ['!**/*'],
    overrides: [
      {
        files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
        /**
         * NOTE: We no longer set parserOptions.project by default when creating new projects.
         *
         * We have observed that users rarely add rules requiring type-checking to their Nx workspaces, and therefore
         * do not actually need the capabilites which parserOptions.project provides. When specifying parserOptions.project,
         * typescript-eslint needs to create full TypeScript Programs for you. When omitting it, it can perform a simple
         * parse (and AST tranformation) of the source files it encounters during a lint run, which is much faster and much
         * less memory intensive.
         *
         * In the rare case that users attempt to add rules requiring type-checking to their setup later on (and haven't set
         * parserOptions.project), the executor will attempt to look for the particular error typescript-eslint gives you
         * and provide feedback to the user.
         */
        parserOptions: !setParserOptionsProject
          ? undefined
          : {
              project: [`${projectConfig.root}/tsconfig.*?.json`],
            },
        /**
         * Having an empty rules object present makes it more obvious to the user where they would
         * extend things from if they needed to
         */
        rules: {},
      },
      {
        files: ['*.ts', '*.tsx'],
        rules: {},
      },
      {
        files: ['*.js', '*.jsx'],
        rules: {},
      },
    ],
  });
}

export function mapLintPattern(
  projectRoot: string,
  extension: string,
  rootProject?: boolean
) {
  const infix = rootProject ? 'src/' : '';
  return `${projectRoot}/${infix}**/*.${extension}`;
}

export async function lintProjectGenerator(
  tree: Tree,
  options: LintProjectOptions
) {
  const installTask = lintInitGenerator(tree, {
    linter: options.linter,
    unitTestRunner: options.unitTestRunner,
    skipPackageJson: options.skipPackageJson,
    rootProject: options.rootProject,
  });
  const projectConfig = readProjectConfiguration(tree, options.project);

  projectConfig.targets['lint'] = {
    executor: '@nrwl/linter:eslint',
    outputs: ['{options.outputFile}'],
    options: {
      lintFilePatterns: options.eslintFilePatterns,
    },
  };

  // we are adding new project which is not the root project or
  // companion e2e app so we should check if migration to
  // monorepo style is needed
  if (!options.rootProject && isMigrationToMonorepoNeeded(tree)) {
    migrateConfigToMonorepoStyle(tree, options.project);
  }

  // our root `.eslintrc` is already the project config, so we should not override it
  // additionally, the companion e2e app would have `rootProject: true`
  // so we need to check for the root path as well
  if (!options.rootProject || projectConfig.root !== '.') {
    createEsLintConfiguration(
      tree,
      projectConfig,
      options.setParserOptionsProject
    );
  }

  updateProjectConfiguration(tree, options.project, projectConfig);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return installTask;
}

/**
 * Detect based on the state of lint target configuration of the root project
 * if we should migrate eslint configs to monorepo style
 *
 * @param tree
 * @returns
 */
function isMigrationToMonorepoNeeded(tree: Tree): boolean {
  const workspace = readWorkspace(tree);
  const projects = Object.values(workspace.projects);
  if (projects.length === 1) {
    return false;
  }
  // get root project
  const rootProject = Object.values(workspace.projects).find(
    (p) => p.root === '.'
  );
  if (!rootProject || !rootProject.targets) {
    return false;
  }
  // find if root project has lint target
  const lintTarget = Object.entries(rootProject.targets).find(
    ([name, target]) =>
      name === 'lint' || target.executor === '@nrwl/linter:eslint'
  )?.[1];
  if (!lintTarget) {
    return false;
  }
  // check if target has `eslintConfig` override and if it's not pointing to the source .eslintrc
  const rootEslintrc = findEslintFile(tree);
  if (
    lintTarget.options.eslintConfig &&
    lintTarget.options.eslintConfig !== rootEslintrc &&
    lintTarget.options.eslintConfig !== `./${rootEslintrc}`
  ) {
    return false;
  }
  return true;
}
