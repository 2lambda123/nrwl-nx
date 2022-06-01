import {
  addDependenciesToPackageJson,
  logger,
  ProjectConfiguration,
  readJson,
  readProjectConfiguration,
  TargetConfiguration,
  Tree,
  updateJson,
  updateProjectConfiguration,
  writeJson,
} from '@nrwl/devkit';

import type { Linter as ESLint } from 'eslint';

import { Schema as EsLintExecutorOptions } from '@nrwl/linter/src/executors/eslint/schema';

import { jsoncEslintParserVersion } from '../../utils/versions';
import { PluginLintChecksGeneratorSchema } from './schema';
import { NX_PREFIX } from 'nx/src/utils/logger';

export default async function pluginLintCheckGenerator(
  host: Tree,
  options: PluginLintChecksGeneratorSchema
) {
  const project = readProjectConfiguration(host, options.projectName);

  // This rule is eslint **only**
  if (projectIsEsLintEnabled(project)) {
    updateRootEslintConfig(host);
    updateProjectEslintConfig(host, project);
    updateProjectTarget(host, options);

    // Project is setup for vscode
    if (host.exists('.vscode')) {
      setupVsCodeLintingForJsonFiles(host);
    }

    // Project contains migrations.json
    if (host.exists('migrations.json')) {
      addMigrationJsonChecks(host, options);
    }
  } else {
    logger.error(
      `${NX_PREFIX} plugin lint checks can only be added to plugins which use eslint for linting`
    );
  }
}

export function addMigrationJsonChecks(
  host: Tree,
  options: PluginLintChecksGeneratorSchema
) {
  const projectConfiguration = readProjectConfiguration(
    host,
    options.projectName
  );
  const [eslintTarget, eslintTargetConfiguration] =
    getEsLintOptions(projectConfiguration);
  if (
    eslintTarget &&
    eslintTargetConfiguration.options?.lintFilePatterns?.includes(
      `${projectConfiguration.root}/generators.json`
    ) &&
    !eslintTargetConfiguration.options?.lintFilePatterns?.includes(
      `${projectConfiguration.root}/migrations.json`
    )
  ) {
    // Add to lintFilePatterns
    eslintTargetConfiguration.options.lintFilePatterns.push(
      `${projectConfiguration.root}/migrations.json`
    );
    updateProjectConfiguration(host, options.projectName, projectConfiguration);

    // Update project level eslintrc
    updateJson<ESLint.Config>(
      host,
      `${projectConfiguration.root}/.eslintrc.json`,
      (c) => {
        const override = c.overrides.find((o) =>
          o.files?.includes('generators.json')
        );
        (override.files as string[]).push('migrations.json');
        return c;
      }
    );
  }
}

function updateProjectTarget(
  host: Tree,
  options: PluginLintChecksGeneratorSchema
) {
  const project = readProjectConfiguration(host, options.projectName);
  project.targets ??= {};
  for (const [target, configuration] of Object.entries(project.targets)) {
    if (configuration.executor === '@nrwl/linter:eslint') {
      const opts: EsLintExecutorOptions = configuration.options ?? {};
      opts.lintFilePatterns ??= [];
      opts.lintFilePatterns.push(
        `${project.root}/generators.json`,
        `${project.root}/package.json`,
        `${project.root}/executors.json`
      );
      project.targets[target].options = opts;
    }
  }
  updateProjectConfiguration(host, options.projectName, project);
}

function updateProjectEslintConfig(host: Tree, options: ProjectConfiguration) {
  // Update the project level lint configuration to specify
  // the plugin schema rule for generated files
  const eslintPath = `${options.root}/.eslintrc.json`;
  const eslintConfig = readJson<ESLint.Config>(host, eslintPath);
  eslintConfig.overrides ??= [];
  eslintConfig.overrides.push({
    files: ['executors.json', 'package.json', 'generators.json'],
    parser: 'jsonc-eslint-parser',
    rules: {
      '@nrwl/nx/nx-plugin-checks': 'error',
    },
  });
  writeJson(host, eslintPath, eslintConfig);
}

// Update the root eslint to specify a parser for json files
// This is required, otherwise every json file that is not overriden
// will display false errors in the IDE
function updateRootEslintConfig(host: Tree) {
  const rootESLint = readJson<ESLint.Config>(host, '.eslintrc.json');
  rootESLint.overrides ??= [];
  if (!eslintConfigContainsJsonOverride(rootESLint)) {
    addDependenciesToPackageJson(
      host,
      {},
      { 'jsonc-eslint-parser': jsoncEslintParserVersion }
    );
    rootESLint.overrides.push({
      files: '*.json',
      parser: 'jsonc-eslint-parser',
      rules: {},
    });
    writeJson(host, '.eslintrc.json', rootESLint);
  }
}

function setupVsCodeLintingForJsonFiles(host: Tree) {
  let existing: Record<string, unknown> = {};
  if (host.exists('.vscode/settings.json')) {
    existing = readJson<Record<string, unknown>>(host, '.vscode/settings.json');
  }

  // setup eslint validation for json files
  const eslintValidate = (existing['eslint.validate'] as string[]) ?? [];
  existing['eslint.validate'] = [...eslintValidate, 'json'];
}

function eslintConfigContainsJsonOverride(eslintConfig: ESLint.Config) {
  return eslintConfig.overrides.some((x) => {
    if (typeof x.files === 'string' && x.files.includes('.json')) {
      return true;
    }
    return Array.isArray(x.files) && x.files.some((f) => f.includes('.json'));
  });
}

function projectIsEsLintEnabled(project: ProjectConfiguration) {
  return Object.values(project.targets || {}).some(
    (x) => x.executor === '@nrwl/linter:eslint'
  );
}

export function getEsLintOptions(
  project: ProjectConfiguration
): [target: string, configuration: TargetConfiguration<EsLintExecutorOptions>] {
  return Object.entries(project.targets || {}).find(
    ([, x]) => x.executor === '@nrwl/linter:eslint'
  );
}
