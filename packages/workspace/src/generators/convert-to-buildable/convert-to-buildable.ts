import {
  getWorkspacePath,
  isStandaloneProject,
  NxJsonConfiguration,
  readJsonFile,
  readProjectConfiguration,
  readWorkspaceConfiguration,
  formatFiles,
  Tree,
  updateJson,
  writeJson,
  convertNxGenerator,
} from '@nrwl/devkit';

import { Schema } from './schema';
import { checkWorkspaceVersion } from '@nrwl/workspace/src/utils/workspace';
import { join } from 'path';

function getExecutor(type: Schema['type']): string {
  switch (type) {
    case 'detox':
    case 'js':
    case 'web':
      return '@nrwl/js:tsc';
    case 'next':
    case 'react':
      return '@nrwl/web:rollup';
    case 'node':
    case 'nest':
      return '@nrwl/node:package';
  }
}

export async function convertToBuildable(host: Tree, schema: Schema) {
  const workspace = readWorkspaceConfiguration(host);

  checkWorkspaceVersion(workspace, host);

  const configuration = readProjectConfiguration(host, schema.project);

  const nxJson = readJsonFile<NxJsonConfiguration>('nx.json');

  if (configuration.targets['build'] != null) {
    throw new Error(`${schema.project} is already buildable.`);
  }

  /*
   * Note on this: It seems new workspaces default to `packages` even though
   * it is not set in nx.json whereas old workspaces may be using `libs` but
   * it is also not set in the nx.json.
   */
  const libDir = nxJson.workspaceLayout?.libsDir ?? 'packages';

  const projectImport = `@${nxJson.npmScope}/${configuration.root.replace(
    `${libDir}/`,
    ''
  )}`;

  // Write the package.json the builder will need
  writeJson(host, join(configuration.root, 'package.json'), {
    name: projectImport,
    version: '0.0.1',
  });

  // Write the build target to the projects configuration
  const buildTarget: any = {
    executor: getExecutor(schema.type),
    outputs: ['{options.outputPath}'],
    options: {
      outputPath: `dist/${configuration.root}`,
      tsConfig: `${configuration.root}/tsconfig.lib.json`,
      main: `${configuration.root}/src/index.ts`,
      assets: [`${configuration.root}/*.md`],
    },
  };

  switch (schema.type) {
    case 'nest':
    case 'node':
      buildTarget.options['packageJson'] = `${configuration.root}/package.json`;
      break;
    case 'next':
    case 'react':
      const { main, ...options } = buildTarget.options;
      buildTarget.options = {
        ...options,
        project: `${configuration.root}/package.json`,
        entryFile: `${configuration.root}/src/index.ts`,
        external: ['react/jsx-runtime'],
        rollupConfig: '@nrwl/react/plugins/bundle-rollup',
        compiler: 'babel',
        assets: [
          {
            glob: `${configuration.root}/README.md`,
            input: '.',
            output: '.',
          },
        ],
      };
      break;
  }

  const isStandalone = isStandaloneProject(host, schema.project);

  if (isStandalone) {
    writeJson(host, join(configuration.root, 'project.json'), {
      ...configuration,
      targets: {
        ...configuration.targets,
        build: buildTarget,
      },
    });
  } else {
    updateJson(host, getWorkspacePath(host), (value) => {
      value.projects[schema.project].targets['build'] = buildTarget;
      return value;
    });
  }

  if (!schema.skipFormat) {
    await formatFiles(host);
  }
}

export default convertToBuildable;

export const convertToNxProjectSchematic =
  convertNxGenerator(convertToBuildable);
