import { GeneratorCallback, getProjects, Tree } from '@nrwl/devkit';
import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  logger,
  removeDependenciesFromPackageJson,
  formatFiles,
  applyChangesToString,
  ChangeType,
} from '@nrwl/devkit';
import { readPackageJson } from '@nrwl/workspace/src/core/file-utils';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import ts = require('typescript');
import { findNodes } from '@nrwl/workspace/src/utilities/typescript/find-nodes';

const basePackages = {
  'copy-webpack-plugin': '^9.0.1',
  webpack: '^5.47.0',
  'webpack-merge': '^5.8.0',
  'webpack-node-externals': '^3.0.0',
};

const webPackages = {
  'mini-css-extract-plugin': '^2.1.0',
  'source-map-loader': '^3.0.0',
  'terser-webpack-plugin': '^5.1.1',
  'webpack-dev-server': '4.0.0-rc.0',
  'webpack-sources': '^3.0.2',
  'react-refresh': '^0.10.0',
  '@pmmmwh/react-refresh-webpack-plugin': '0.5.0-rc.2',
};

export async function webMigrateToWebpack5Generator(tree: Tree, schema: {}) {
  const packages = { ...basePackages, ...webPackages };
  const tasks: GeneratorCallback[] = [];
  const packageJson = readPackageJson();

  logger.info(`NX Adding webpack 5 to workspace.`);

  // Removing the packages ensures that the versions will be updated when adding them after
  tasks.push(
    removeDependenciesFromPackageJson(tree, [], Object.keys(packages))
  );

  // Here, if our workspace has Storybook for react, we add the Storybook webpack 5 dependencies
  if (workspaceHasStorybookForReact(packageJson)) {
    packages['@storybook/builder-webpack5'] =
      workspaceHasStorybookForReact(packageJson);
    packages['@storybook/manager-webpack5'] =
      workspaceHasStorybookForReact(packageJson);

    await migrateStorybookToWebPack5(tree);
  }

  tasks.push(addDependenciesToPackageJson(tree, {}, packages));

  return runTasksInSerial(...tasks);
}

function workspaceHasStorybookForReact(packageJson: any): string | undefined {
  return (
    packageJson.dependencies['@storybook/react'] ||
    packageJson.devDependencies['@storybook/react']
  );
}

async function migrateStorybookToWebPack5(tree: Tree) {
  allReactProjectsWithStorybookConfiguration(tree).forEach((project) => {
    editProjectMainJs(
      tree,
      `${project.storybookConfigPath}/main.js`,
      project.projectName
    );
  });
  await formatFiles(tree);
}

function allReactProjectsWithStorybookConfiguration(tree: Tree): {
  projectName: string;
  storybookConfigPath: string;
}[] {
  const projects = getProjects(tree);
  const reactProjectsThatHaveStorybookConfiguration: {
    projectName: string;
    storybookConfigPath: string;
  }[] = [...projects.entries()]
    ?.filter(
      ([_, projectConfig]) =>
        projectConfig.targets &&
        projectConfig.targets.storybook &&
        projectConfig.targets.storybook.options
    )
    ?.map(([projectName, projectConfig]) => {
      if (
        projectConfig.targets &&
        projectConfig.targets.storybook &&
        projectConfig.targets.storybook.options?.config?.configFolder &&
        projectConfig.targets.storybook.options?.uiFramework ===
          '@storybook/react'
      ) {
        return {
          projectName,
          storybookConfigPath:
            projectConfig.targets.storybook.options.config.configFolder,
        };
      }
    });
  return reactProjectsThatHaveStorybookConfiguration;
}

function editProjectMainJs(
  tree: Tree,
  projectMainJsFile: string,
  projectName: string
) {
  let newContents: string;
  let moduleExportsIsEmptyOrNonExistentOrInvalid = false;
  let alreadyHasBuilder: any;
  const rootMainJsExists = tree.exists(projectMainJsFile);
  if (rootMainJsExists) {
    const file = getTsSourceFile(tree, projectMainJsFile);
    const appFileContent = tree.read(projectMainJsFile, 'utf-8');
    newContents = appFileContent;
    const moduleExportsFull = findNodes(file, [
      ts.SyntaxKind.ExpressionStatement,
    ]);

    if (moduleExportsFull && moduleExportsFull[0]) {
      const moduleExports = moduleExportsFull[0];
      const listOfStatements = findNodes(moduleExports, [
        ts.SyntaxKind.SyntaxList,
      ]);

      /**
       * Keep the index of the stories node
       * to put the core object before it
       * if it does not exist already
       */

      let indexOfStoriesNode = -1;

      const hasCoreObject = listOfStatements[0]?.getChildren()?.find((node) => {
        if (
          node &&
          node.getText().length > 0 &&
          indexOfStoriesNode < 0 &&
          node?.getText().startsWith('stories')
        ) {
          indexOfStoriesNode = node.getStart();
        }
        return (
          node?.kind === ts.SyntaxKind.PropertyAssignment &&
          node?.getText().startsWith('core')
        );
      });

      if (hasCoreObject) {
        const contentsOfCoreNode = hasCoreObject.getChildren().find((node) => {
          return node.kind === ts.SyntaxKind.ObjectLiteralExpression;
        });
        const everyAttributeInsideCoreNode = contentsOfCoreNode
          .getChildren()
          .find((node) => node.kind === ts.SyntaxKind.SyntaxList);

        alreadyHasBuilder = everyAttributeInsideCoreNode
          .getChildren()
          .find((node) => node.getText() === "builder: 'webpack5'");

        if (!alreadyHasBuilder) {
          newContents = applyChangesToString(newContents, [
            {
              type: ChangeType.Insert,
              index: contentsOfCoreNode.getEnd() - 1,
              text: ", builder: 'webpack5'",
            },
          ]);
        }
      } else if (indexOfStoriesNode >= 0) {
        /**
         * Does not have core object,
         * so just write one, at the start.
         */
        newContents = applyChangesToString(newContents, [
          {
            type: ChangeType.Insert,
            index: indexOfStoriesNode - 1,
            text: "core: { ...rootMain.core, builder: 'webpack5' }, ",
          },
        ]);
      } else {
        /**
         * Module exports is empty or does not
         * contain stories - most probably invalid
         */
        moduleExportsIsEmptyOrNonExistentOrInvalid = true;
      }
    } else {
      /**
       * module.exports does not exist
       */
      moduleExportsIsEmptyOrNonExistentOrInvalid = true;
    }
  } else {
    moduleExportsIsEmptyOrNonExistentOrInvalid = true;
  }

  if (moduleExportsIsEmptyOrNonExistentOrInvalid) {
    logger.info(
      `Please configure Storybook for project "${projectName}"", since it has not been configured properly.`
    );
    return;
  }

  if (!alreadyHasBuilder) {
    tree.write(projectMainJsFile, newContents);
  }
}

function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new Error(`Could not read TS file (${path}).`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  return source;
}

export default webMigrateToWebpack5Generator;
export const webMigrateToWebpack5Schematic = convertNxGenerator(
  webMigrateToWebpack5Generator
);
