import * as path from 'path';
import { generateFiles, offsetFromRoot, Tree } from '@nx/devkit';
import { getRelativePathToRootTsConfig } from '@nx/js';

import { createTsConfig } from '../../../utils/create-ts-config';
import { NormalizedSchema } from '../schema';

export function createApplicationFiles(tree: Tree, options: NormalizedSchema) {
  const nxWelcomePath = {
    claimed: '../files/nx-welcome/claimed',
    'not-configured': '../files/nx-welcome/not-configured',
    unclaimed: '../files/nx-welcome/unclaimed',
  }[options.onBoardingStatus];

  generateFiles(
    tree,
    path.join(__dirname, '../files/common'),
    options.appProjectRoot,
    {
      ...options,
      offsetFromRoot: offsetFromRoot(options.appProjectRoot),
      title: options.projectName,
    }
  );

  generateFiles(
    tree,
    path.join(__dirname, nxWelcomePath),
    options.appProjectRoot,
    {
      ...options,
      offsetFromRoot: offsetFromRoot(options.appProjectRoot),
      title: options.projectName,
    }
  );

  if (options.style !== 'none') {
    generateFiles(
      tree,
      path.join(__dirname, '../files/stylesheet'),
      options.appProjectRoot,
      {
        ...options,
        offsetFromRoot: offsetFromRoot(options.appProjectRoot),
        title: options.projectName,
      }
    );
  }

  if (options.routing) {
    generateFiles(
      tree,
      path.join(__dirname, '../files/routing'),
      options.appProjectRoot,
      {
        ...options,
        offsetFromRoot: offsetFromRoot(options.appProjectRoot),
        title: options.projectName,
      }
    );
  }

  createTsConfig(
    tree,
    options.appProjectRoot,
    'app',
    options,
    getRelativePathToRootTsConfig(tree, options.appProjectRoot)
  );
}
