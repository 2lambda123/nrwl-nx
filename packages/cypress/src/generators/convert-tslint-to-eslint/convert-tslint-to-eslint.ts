import {
  convertNxGenerator,
  formatFiles,
  GeneratorCallback,
  Tree,
} from '@nx/devkit';
import {
  ConvertTSLintToESLintSchema,
  Linter,
  ProjectConverter,
} from '@nx/linter';
import { addLinterToCyProject } from '../../utils/add-linter';
import type { Linter as ESLinter } from 'eslint';

export async function conversionGenerator(
  host: Tree,
  options: ConvertTSLintToESLintSchema
) {
  /**
   * The ProjectConverter instance encapsulates all the standard operations we need
   * to perform in order to convert a project from TSLint to ESLint, as well as some
   * extensibility points for adjusting the behavior on a per package basis.
   *
   * E.g. @nrwl/angular projects might need to make different changes to the final
   * ESLint config when compared with @nrwl/next projects.
   *
   * See the ProjectConverter implementation for a full breakdown of what it does.
   */
  const projectConverter = new ProjectConverter({
    host,
    projectName: options.project,
    ignoreExistingTslintConfig: options.ignoreExistingTslintConfig,
    eslintInitializer: async ({ projectName, projectConfig }) => {
      await addLinterToCyProject(host, {
        linter: Linter.EsLint,
        project: projectName,
        /**
         * We set the parserOptions.project config just in case the converted config uses
         * rules which require type-checking. Later in the conversion we check if it actually
         * does and remove the config again if it doesn't, so that it is most efficient.
         */
        setParserOptionsProject: true,
        cypressDir: 'src',
        overwriteExisting: true,
      });
    },
  });

  /**
   * If root eslint configuration already exists it will not be recreated
   * but we also don't want to re-run the tslint config conversion
   * as it was likely already done
   */
  const rootEslintConfigExists = host.exists('.eslintrc.json');

  /**
   * Create the standard (which is applicable to the current package) ESLint setup
   * for converting the project.
   */
  const eslintInitInstallTask = await projectConverter.initESLint();

  /**
   * Convert the root tslint.json and apply the converted rules to the root .eslintrc.json.
   */
  const rootConfigInstallTask = await projectConverter.convertRootTSLintConfig(
    (json) => removeCodelyzerRelatedRules(json),
    rootEslintConfigExists
  );

  /**
   * Convert the project's tslint.json to an equivalent ESLint config.
   */
  const projectConfigInstallTask = await projectConverter.convertProjectConfig(
    (json) => json
  );

  /**
   * Clean up the original TSLint configuration for the project.
   */
  projectConverter.removeProjectTSLintFile();

  // Only project shouldn't be added as a default
  const { project, ...defaults } = options;

  /**
   * Store user preferences for the collection
   */
  projectConverter.setDefaults('@nrwl/cypress', defaults);

  /**
   * Based on user preference and remaining usage, remove TSLint from the workspace entirely.
   */
  let uninstallTSLintTask: GeneratorCallback = () => Promise.resolve(undefined);
  if (
    options.removeTSLintIfNoMoreTSLintTargets &&
    !projectConverter.isTSLintUsedInWorkspace()
  ) {
    uninstallTSLintTask = projectConverter.removeTSLintFromWorkspace();
  }

  if (!options.skipFormat) {
    await formatFiles(host);
  }

  return async () => {
    await eslintInitInstallTask();
    await rootConfigInstallTask();
    await projectConfigInstallTask();
    await uninstallTSLintTask();
  };
}

export const conversionSchematic = convertNxGenerator(conversionGenerator);

/**
 * Remove any @angular-eslint rules that were applied as a result of converting prior codelyzer
 * rules, because they are only relevant for Angular projects.
 */
function removeCodelyzerRelatedRules(json: ESLinter.Config): ESLinter.Config {
  for (const ruleName of Object.keys(json.rules)) {
    if (ruleName.startsWith('@angular-eslint')) {
      delete json.rules[ruleName];
    }
  }
  if (json.plugins) {
    json.plugins = json.plugins.filter(
      (plugin) => !plugin.startsWith('@angular-eslint')
    );
  }
  return json;
}
