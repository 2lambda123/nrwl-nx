import type { Tree } from '@nx/devkit';
import { names, readProjectConfiguration } from '@nx/devkit';
import { determineArtifactNameAndDirectoryOptions } from '@nx/devkit/src/generators/artifact-name-and-directory-utils';
import type { AngularProjectConfiguration } from '../../../utils/types';
import { buildSelector } from '../../utils/selector';
import type { NormalizedSchema, Schema } from '../schema';

export async function normalizeOptions(
  tree: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  options.type ??= 'component';
  const { directory, file, name, project } =
    await determineArtifactNameAndDirectoryOptions(tree, {
      artifactName: 'component',
      callingGenerator: '@nx/angular:component',
      name: options.name,
      directory: options.directory ?? options.path,
      flat: options.flat,
      nameAndDirectoryFormat: options.nameAndDirectoryFormat,
      project: options.project,
      suffix: options.type ?? 'component',
    });

  const { className } = names(name);
  const { className: suffixClassName } = names(options.type);
  const symbolName = `${className}${suffixClassName}`;

  const { prefix, root, sourceRoot } = readProjectConfiguration(
    tree,
    project
  ) as AngularProjectConfiguration;

  const selector =
    options.selector ??
    buildSelector(tree, name, options.prefix, prefix, 'fileName');

  return {
    ...options,
    name,
    project,
    changeDetection: options.changeDetection ?? 'Default',
    style: options.style ?? 'css',
    directory,
    fileName: file.name,
    filePath: file.path,
    symbolName,
    projectSourceRoot: sourceRoot,
    projectRoot: root,
    selector,
  };
}
