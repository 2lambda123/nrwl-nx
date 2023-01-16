import type { Tree } from '@nrwl/devkit';
import { tsquery } from '@phenomnomnominal/tsquery';
import { lt } from 'semver';
import { getInstalledAngularVersion } from '../../utils/angular-version-utils';
import type { NgRxGeneratorOptions } from '../schema';

export function validateOptions(
  tree: Tree,
  options: NgRxGeneratorOptions
): void {
  if (!options.module && !options.parent) {
    throw new Error('Please provide a value for "--parent"!');
  }
  if (options.module && !tree.exists(options.module)) {
    throw new Error(`Module does not exist: ${options.module}.`);
  }
  if (options.parent && !tree.exists(options.parent)) {
    throw new Error(`Parent does not exist: ${options.parent}.`);
  }

  const angularVersion = getInstalledAngularVersion(tree);
  const parentPath = options.parent ?? options.module;
  if (parentPath && lt(angularVersion, '14.1.0')) {
    const parentContent = tree.read(parentPath, 'utf-8');
    const ast = tsquery.ast(parentContent);

    const NG_MODULE_DECORATOR_SELECTOR =
      'ClassDeclaration > Decorator > CallExpression:has(Identifier[name=NgModule])';
    const nodes = tsquery(ast, NG_MODULE_DECORATOR_SELECTOR, {
      visitAllChildren: true,
    });
    if (nodes.length === 0) {
      throw new Error(
        `The provided parent path "${parentPath}" does not contain an "NgModule". ` +
          'Please make sure to provide a path to an "NgModule" where the state will be registered. ' +
          'If you are trying to use a "Routes" definition file (for Standalone API usage), ' +
          'please note this is not supported in Angular versions lower than 14.1.0.'
      );
    }
  }
}
