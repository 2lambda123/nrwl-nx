import {
  addProjectConfiguration,
  ensurePackage,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  joinPathFragments,
  names,
  offsetFromRoot,
  runTasksInSerial,
  TargetConfiguration,
  toJS,
  Tree,
  updateJson,
} from '@nx/devkit';

import {
  addTsConfigPath,
  getRelativePathToRootTsConfig,
  initGenerator as jsInitGenerator,
} from '@nx/js';
import init from '../init/init';
import { addLinting } from '../../utils/add-linting';
import { addJest } from '../../utils/add-jest';
import {
  nxVersion,
  reactNativeVersion,
  reactVersion,
} from '../../utils/versions';
import { NormalizedSchema, normalizeOptions } from './lib/normalize-options';
import { Schema } from './schema';
import { ensureDependencies } from '../../utils/ensure-dependencies';

export async function reactNativeLibraryGenerator(
  host: Tree,
  schema: Schema
): Promise<GeneratorCallback> {
  return await reactNativeLibraryGeneratorInternal(host, {
    projectNameAndRootFormat: 'derived',
    ...schema,
  });
}

export async function reactNativeLibraryGeneratorInternal(
  host: Tree,
  schema: Schema
): Promise<GeneratorCallback> {
  const options = await normalizeOptions(host, schema);
  if (options.publishable === true && !schema.importPath) {
    throw new Error(
      `For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)`
    );
  }

  const tasks: GeneratorCallback[] = [];

  const jsInitTask = await jsInitGenerator(host, {
    ...schema,
    skipFormat: true,
  });
  tasks.push(jsInitTask);
  const initTask = await init(host, { ...options, skipFormat: true });
  tasks.push(initTask);

  if (!options.skipPackageJson) {
    tasks.push(ensureDependencies(host));
  }

  const addProjectTask = await addProject(host, options);
  if (addProjectTask) {
    tasks.push(addProjectTask);
  }

  createFiles(host, options);

  const lintTask = await addLinting(host, {
    ...options,
    projectName: options.name,
    tsConfigPaths: [
      joinPathFragments(options.projectRoot, 'tsconfig.lib.json'),
    ],
  });
  tasks.push(lintTask);

  const jestTask = await addJest(
    host,
    options.unitTestRunner,
    options.name,
    options.projectRoot,
    options.js,
    options.skipPackageJson
  );
  tasks.push(jestTask);

  if (options.publishable || options.buildable) {
    updateLibPackageNpmScope(host, options);
  }

  if (!options.skipTsConfig) {
    addTsConfigPath(host, options.importPath, [
      joinPathFragments(
        options.projectRoot,
        './src',
        'index.' + (options.js ? 'js' : 'ts')
      ),
    ]);
  }

  if (!options.skipFormat) {
    await formatFiles(host);
  }

  return runTasksInSerial(...tasks);
}

async function addProject(host: Tree, options: NormalizedSchema) {
  const targets: { [key: string]: TargetConfiguration } = {};

  const tasks: GeneratorCallback[] = [];
  if (options.publishable || options.buildable) {
    const { rollupInitGenerator } = ensurePackage<typeof import('@nx/rollup')>(
      '@nx/rollup',
      nxVersion
    );
    tasks.push(
      await rollupInitGenerator(host, { ...options, skipFormat: true })
    );
    if (!options.skipPackageJson) {
      const { ensureDependencies } = await import(
        '@nx/rollup/src/utils/ensure-dependencies'
      );
      tasks.push(ensureDependencies(host, {}));
    }

    const external = [
      'react/jsx-runtime',
      'react-native',
      'react',
      'react-dom',
    ];

    targets.build = {
      executor: '@nx/rollup:rollup',
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: `dist/${options.projectRoot}`,
        tsConfig: `${options.projectRoot}/tsconfig.lib.json`,
        project: `${options.projectRoot}/package.json`,
        entryFile: maybeJs(options, `${options.projectRoot}/src/index.ts`),
        external,
        rollupConfig: `@nx/react/plugins/bundle-rollup`,
        assets: [
          {
            glob: `${options.projectRoot}/README.md`,
            input: '.',
            output: '.',
          },
        ],
      },
    };
  }

  addProjectConfiguration(host, options.name, {
    root: options.projectRoot,
    sourceRoot: joinPathFragments(options.projectRoot, 'src'),
    projectType: 'library',
    tags: options.parsedTags,
    targets,
  });

  return runTasksInSerial(...tasks);
}

function updateTsConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(
    tree,
    joinPathFragments(options.projectRoot, 'tsconfig.json'),
    (json) => {
      if (options.strict) {
        json.compilerOptions = {
          ...json.compilerOptions,
          forceConsistentCasingInFileNames: true,
          strict: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
        };
      }

      return json;
    }
  );
}

function createFiles(host: Tree, options: NormalizedSchema) {
  generateFiles(
    host,
    joinPathFragments(__dirname, './files/lib'),
    options.projectRoot,
    {
      ...options,
      ...names(options.name),
      offsetFromRoot: offsetFromRoot(options.projectRoot),
      rootTsConfigPath: getRelativePathToRootTsConfig(
        host,
        options.projectRoot
      ),
    }
  );

  if (!options.publishable && !options.buildable) {
    host.delete(`${options.projectRoot}/package.json`);
  }

  if (options.js) {
    toJS(host);
  }

  updateTsConfig(host, options);
}

function updateLibPackageNpmScope(host: Tree, options: NormalizedSchema) {
  return updateJson(host, `${options.projectRoot}/package.json`, (json) => {
    json.name = options.importPath;
    json.peerDependencies = {
      react: reactVersion,
      'react-native': reactNativeVersion,
    };
    return json;
  });
}

function maybeJs(options: NormalizedSchema, path: string): string {
  return options.js && (path.endsWith('.ts') || path.endsWith('.tsx'))
    ? path.replace(/\.tsx?$/, '.js')
    : path;
}

export default reactNativeLibraryGenerator;
