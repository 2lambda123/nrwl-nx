import type { Tree } from '@nrwl/devkit';
import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
} from '@nrwl/devkit';
import { addToNgModule, findModule } from '../utils';
import { normalizeOptions, validateOptions } from './lib';
import type { Schema } from './schema';

export async function directiveGenerator(tree: Tree, schema: Schema) {
  validateOptions(tree, schema);
  const options = normalizeOptions(tree, schema);

  const directiveNames = names(options.name);

  const pathToGenerateFiles = options.flat
    ? './files/__directiveFileName__'
    : './files';
  generateFiles(
    tree,
    joinPathFragments(__dirname, pathToGenerateFiles),
    options.path,
    {
      selector: options.selector,
      directiveClassName: directiveNames.className,
      directiveFileName: directiveNames.fileName,
      standalone: options.standalone,
      tpl: '',
    }
  );

  if (options.skipTests) {
    const pathToSpecFile = joinPathFragments(
      options.path,
      `${!options.flat ? `${directiveNames.fileName}/` : ``}${
        directiveNames.fileName
      }.directive.spec.ts`
    );

    tree.delete(pathToSpecFile);
  }

  if (!options.skipImport && !options.standalone) {
    const modulePath = findModule(tree, options.path, options.module);
    addToNgModule(
      tree,
      options.path,
      modulePath,
      directiveNames.fileName,
      `${directiveNames.className}Directive`,
      `${directiveNames.fileName}.directive`,
      'declarations',
      options.flat,
      options.export
    );
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default directiveGenerator;
