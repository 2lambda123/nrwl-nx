import {
  chain,
  move,
  noop,
  Rule,
  schematic,
  SchematicContext,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import {
  getProjectConfig,
  offsetFromRoot,
  updateWorkspace,
  updateWorkspaceInTree,
  serializeJson,
  Linter,
} from '@nrwl/workspace';
import { join, normalize } from '@angular-devkit/core';

import {
  applyWithSkipExisting,
  isFramework,
  getTsConfigContent,
} from '../../utils/utils';
import { CypressConfigureSchema } from '../cypress-project/cypress-project';
import { StorybookConfigureSchema } from './schema';
import { toJS } from '@nrwl/workspace/src/utils/rules/to-js';
import { readPackageJson } from '@nrwl/workspace/src/core/file-utils';
import { storybookVersion } from '../../utils/versions';

export default function (rawSchema: StorybookConfigureSchema): Rule {
  const schema = normalizeSchema(rawSchema);

  const workspaceStorybookVersion = readCurrentWorkspaceStorybookVersion();

  return chain([
    schematic('ng-add', {
      uiFramework: schema.uiFramework,
    }),
    createRootStorybookDir(
      schema.uiFramework,
      schema.js,
      workspaceStorybookVersion
    ),
    createLibStorybookDir(
      schema.name,
      schema.uiFramework,
      schema.js,
      workspaceStorybookVersion
    ),
    configureTsLibConfig(schema),
    configureTsSolutionConfig(schema),
    updateLintTask(schema),
    addStorybookTask(schema.name, schema.uiFramework),
    schema.configureCypress
      ? schematic<CypressConfigureSchema>('cypress-project', {
          name: schema.name,
          js: schema.js,
          linter: schema.linter,
        })
      : () => {},
  ]);
}

function readCurrentWorkspaceStorybookVersion(): string {
  const packageJsonContents = readPackageJson();
  let workspaceStorybookVersion = storybookVersion;
  if (packageJsonContents && packageJsonContents['devDependencies']) {
    if (packageJsonContents['devDependencies']['@storybook/angular']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/angular'];
    }
    if (packageJsonContents['devDependencies']['@storybook/react']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/react'];
    }
    if (packageJsonContents['devDependencies']['@storybook/core']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/core'];
    }
  }
  if (packageJsonContents && packageJsonContents['dependencies']) {
    if (packageJsonContents['dependencies']['@storybook/angular']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/angular'];
    }
    if (packageJsonContents['dependencies']['@storybook/react']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/react'];
    }
    if (packageJsonContents['dependencies']['@storybook/core']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/core'];
    }
  }
  if (
    workspaceStorybookVersion.startsWith('6') ||
    workspaceStorybookVersion.startsWith('^6')
  ) {
    workspaceStorybookVersion = '6';
  }
  return workspaceStorybookVersion;
}

function normalizeSchema(schema: StorybookConfigureSchema) {
  const defaults = {
    linter: Linter.TsLint,
    js: false,
  };
  return {
    ...defaults,
    ...schema,
  };
}

function createRootStorybookDir(
  uiFramework: string,
  js: boolean,
  workspaceStorybookVersion: string
): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.debug(
      `adding .storybook folder to root -\n
      based on the Storybook version installed: ${workspaceStorybookVersion}, we'll bootstrap a scaffold for that particular version.`
    );

    return chain([
      applyWithSkipExisting(
        url(
          workspaceStorybookVersion === '6' ? './root-files' : './root-files-5'
        ),
        [js ? toJS() : noop()]
      ),
    ])(tree, context);
  };
}

function createLibStorybookDir(
  projectName: string,
  uiFramework: StorybookConfigureSchema['uiFramework'],
  js: boolean,
  workspaceStorybookVersion: string
): Rule {
  return (tree: Tree, context: SchematicContext) => {
    /**
     * Here, same as above
     * Check storybook version
     * and use the correct folder
     * lib-files-5 or lib-files-6
     */

    context.logger.debug(
      `adding .storybook folder to lib - using Storybook version ${workspaceStorybookVersion}`
    );
    const projectConfig = getProjectConfig(tree, projectName);
    return chain([
      applyWithSkipExisting(
        url(
          workspaceStorybookVersion === '6' ? './lib-files' : './lib-files-5'
        ),
        [
          template({
            tmpl: '',
            uiFramework,
            offsetFromRoot: offsetFromRoot(projectConfig.root),
          }),
          move(projectConfig.root),
          js ? toJS() : noop(),
        ]
      ),
    ])(tree, context);
  };
}

function configureTsLibConfig(schema: StorybookConfigureSchema): Rule {
  const { name: projectName } = schema;

  return (tree: Tree) => {
    const projectPath = getProjectConfig(tree, projectName).root;
    const tsConfigPath = join(projectPath, 'tsconfig.lib.json');
    const tsConfigContent = getTsConfigContent(tree, tsConfigPath);

    tsConfigContent.exclude = [
      ...(tsConfigContent.exclude || []),
      '**/*.stories.ts',
      '**/*.stories.js',
      ...(isFramework('react', schema)
        ? ['**/*.stories.jsx', '**/*.stories.tsx']
        : []),
    ];

    tree.overwrite(tsConfigPath, serializeJson(tsConfigContent));

    return tree;
  };
}

function configureTsSolutionConfig(schema: StorybookConfigureSchema): Rule {
  const { name: projectName } = schema;

  return (tree: Tree) => {
    const projectPath = getProjectConfig(tree, projectName).root;
    const tsConfigPath = projectPath + '/tsconfig.json';
    const tsConfigContent = getTsConfigContent(tree, tsConfigPath);

    tsConfigContent.references = [
      ...(tsConfigContent.references || []),
      {
        path: './.storybook/tsconfig.json',
      },
    ];

    tree.overwrite(tsConfigPath, serializeJson(tsConfigContent));

    return tree;
  };
}

function updateLintTask(schema: StorybookConfigureSchema): Rule {
  const { name: projectName } = schema;

  return updateWorkspaceInTree((json) => {
    const projectConfig = json.projects[projectName];
    const lintTarget = projectConfig.architect.lint;

    if (lintTarget) {
      lintTarget.options.tsConfig = [
        ...lintTarget.options.tsConfig,
        `${projectConfig.root}/.storybook/tsconfig.json`,
      ];
    }

    return json;
  });
}

function addStorybookTask(projectName: string, uiFramework: string): Rule {
  return updateWorkspace((workspace) => {
    const projectConfig = workspace.projects.get(projectName);
    if (!projectConfig) {
      return;
    }

    projectConfig.targets.set('storybook', {
      builder: '@nrwl/storybook:storybook',
      options: {
        uiFramework,
        port: 4400,
        config: {
          configFolder: `${projectConfig.root}/.storybook`,
        },
      },
      configurations: {
        ci: {
          quiet: true,
        },
      },
    });
    projectConfig.targets.set('build-storybook', {
      builder: '@nrwl/storybook:build',
      options: {
        uiFramework,
        outputPath: join(
          normalize('dist'),
          normalize('storybook'),
          projectName
        ),
        config: {
          configFolder: `${projectConfig.root}/.storybook`,
        },
      },
      configurations: {
        ci: {
          quiet: true,
        },
      },
    });
  });
}
