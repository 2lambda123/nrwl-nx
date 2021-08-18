import * as rollup from 'rollup';
import * as peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { getBabelInputPlugin } from '@rollup/plugin-babel';
import { join, relative } from 'path';
import { from, Observable, of } from 'rxjs';
import { catchError, last, mergeMap, scan, tap } from 'rxjs/operators';
import { eachValueFrom } from 'rxjs-for-await';
import * as autoprefixer from 'autoprefixer';

import type { ExecutorContext, ProjectGraphNode } from '@nrwl/devkit';
import { logger, names, readJsonFile, writeJsonFile } from '@nrwl/devkit';
import { readCachedProjectGraph } from '@nrwl/workspace/src/core/project-graph';
import {
  calculateProjectDependencies,
  computeCompilerOptionsPaths,
  DependentBuildableProjectNode,
  updateBuildableProjectPackageJsonDependencies,
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import resolve from '@rollup/plugin-node-resolve';

import { AssetGlobPattern } from '../../utils/shared-models';
import { WebPackageOptions } from './schema';
import { runRollup } from './lib/run-rollup';
import {
  NormalizedWebPackageOptions,
  normalizePackageOptions,
} from './lib/normalize';
import { analyze } from './lib/analyze-plugin';
import { deleteOutputDir } from '../../utils/fs';
import { swc } from './lib/swc-plugin';

// These use require because the ES import isn't correct.
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const image = require('@rollup/plugin-image');
const json = require('@rollup/plugin-json');
const copy = require('rollup-plugin-copy');
const postcss = require('rollup-plugin-postcss');

const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];

export default async function* run(
  rawOptions: WebPackageOptions,
  context: ExecutorContext
) {
  const project = context.workspace.projects[context.projectName];
  const projectGraph = readCachedProjectGraph();
  const sourceRoot = project.sourceRoot;
  const { target, dependencies } = calculateProjectDependencies(
    projectGraph,
    context.root,
    context.projectName,
    context.targetName,
    context.configurationName
  );
  const options = normalizePackageOptions(rawOptions, context.root, sourceRoot);
  const packageJson = readJsonFile(options.project);

  const npmDeps = (projectGraph.dependencies[context.projectName] ?? [])
    .filter((d) => d.target.startsWith('npm:'))
    .map((d) => d.target.substr(4));

  const rollupOptions = createRollupOptions(
    options,
    dependencies,
    context,
    packageJson,
    sourceRoot,
    npmDeps
  );

  if (options.watch) {
    const watcher = rollup.watch(rollupOptions);
    return yield* eachValueFrom(
      new Observable<{ success: boolean }>((obs) => {
        watcher.on('event', (data) => {
          if (data.code === 'START') {
            logger.info(`Bundling ${context.projectName}...`);
          } else if (data.code === 'END') {
            updatePackageJson(
              options,
              context,
              target,
              dependencies,
              packageJson
            );
            logger.info('Bundle complete. Watching for file changes...');
            obs.next({ success: true });
          } else if (data.code === 'ERROR') {
            logger.error(`Error during bundle: ${data.error.message}`);
            obs.next({ success: false });
          }
        });
        // Teardown logic. Close watcher when unsubscribed.
        return () => watcher.close();
      })
    );
  } else {
    logger.info(`Bundling ${context.projectName}...`);

    // Delete output path before bundling
    if (options.deleteOutputPath) {
      deleteOutputDir(context.root, options.outputPath);
    }

    const start = process.hrtime.bigint();

    return from(rollupOptions)
      .pipe(
        mergeMap((opts) =>
          runRollup(opts).pipe(
            catchError((e) => {
              logger.error(`Error during bundle: ${e}`);
              return of({ success: false });
            })
          )
        )
      )
      .pipe(
        scan(
          (acc, result) => {
            if (acc.success && !result.success) {
              acc.success = false;
            }
            return acc;
          },
          { success: true }
        ),
        last(),
        tap({
          next: (result) => {
            if (result.success) {
              const end = process.hrtime.bigint();
              const duration = `${(Number(end - start) / 1_000_000_000).toFixed(
                2
              )}s`;

              updatePackageJson(
                options,
                context,
                target,
                dependencies,
                packageJson
              );
              logger.info(`⚡ Done in ${duration}`);
            } else {
              logger.error(`Bundle failed: ${context.projectName}`);
            }
          },
        })
      )
      .toPromise();
  }
}

// -----------------------------------------------------------------------------

export function createRollupOptions(
  options: NormalizedWebPackageOptions,
  dependencies: DependentBuildableProjectNode[],
  context: ExecutorContext,
  packageJson: any,
  sourceRoot: string,
  npmDeps: string[]
): rollup.InputOptions[] {
  return options.format.map((format, idx) => {
    const plugins = [
      copy({
        targets: convertCopyAssetsToRollupOptions(
          options.outputPath,
          options.assets
        ),
      }),
      image(),
      options.swc &&
        swc({
          check: idx === 0,
          workspaceRoot: context.root,
          projectRoot: options.projectRoot,
          tsconfig: options.tsConfig,
        }),
      !options.swc &&
        typescript({
          check: idx === 0,
          tsconfig: options.tsConfig,
          tsconfigOverride: {
            compilerOptions: createCompilerOptions(
              format,
              options,
              dependencies
            ),
          },
        }),
      peerDepsExternal({
        packageJsonPath: options.project,
      }),
      postcss({
        inject: true,
        extract: options.extractCss,
        autoModules: true,
        plugins: [autoprefixer],
      }),
      resolve({
        preferBuiltins: true,
        extensions: fileExtensions,
      }),
      !options.swc &&
        getBabelInputPlugin({
          // Let's `@nrwl/web/babel` preset know that we are packaging.
          caller: {
            // @ts-ignore
            // Ignoring type checks for caller since we have custom attributes
            isNxPackage: true,
            // Always target esnext and let rollup handle cjs/umd
            supportsStaticESM: true,
            isModern: true,
          },
          cwd: join(context.root, sourceRoot),
          rootMode: 'upward',
          babelrc: true,
          extensions: fileExtensions,
          babelHelpers: 'bundled',
          skipPreflightCheck: true, // pre-flight check may yield false positives and also slows down the build
          exclude: /node_modules/,
          plugins: [
            format === 'esm'
              ? undefined
              : require.resolve('babel-plugin-transform-async-to-promises'),
          ].filter(Boolean),
        }),
      commonjs(),
      analyze(),
      json(),
    ];

    const globals = options.globals
      ? options.globals.reduce(
          (acc, item) => {
            acc[item.moduleId] = item.global;
            return acc;
          },
          { 'react/jsx-runtime': 'jsxRuntime' }
        )
      : { 'react/jsx-runtime': 'jsxRuntime' };

    const externalPackages = dependencies
      .map((d) => d.name)
      .concat(options.external || [])
      .concat(Object.keys(packageJson.dependencies || {}));

    const rollupConfig = {
      input: options.entryFile,
      output: {
        globals,
        format,
        file: `${options.outputPath}/${context.projectName}.${format}.js`,
        name: options.umdName || names(context.projectName).className,
      },
      external: (id) =>
        externalPackages.some(
          (name) => id === name || id.startsWith(`${name}/`)
        ) || npmDeps.some((name) => id === name || id.startsWith(`${name}/`)), // Could be a deep import
      plugins,
    };

    return options.rollupConfig.reduce((currentConfig, plugin) => {
      return require(plugin)(currentConfig, options);
    }, rollupConfig);
  });
}

function createCompilerOptions(format, options, dependencies) {
  const compilerOptionPaths = computeCompilerOptionsPaths(
    options.tsConfig,
    dependencies
  );

  const compilerOptions = {
    rootDir: options.entryRoot,
    allowJs: false,
    declaration: true,
    paths: compilerOptionPaths,
  };

  if (format !== 'esm') {
    return {
      ...compilerOptions,
      target: 'es5',
    };
  }

  return compilerOptions;
}

function updatePackageJson(
  options: NormalizedWebPackageOptions,
  context: ExecutorContext,
  target: ProjectGraphNode,
  dependencies: DependentBuildableProjectNode[],
  packageJson: any
) {
  const entryFileTmpl = `./${context.projectName}.<%= extension %>.js`;
  const typingsFile = relative(options.entryRoot, options.entryFile).replace(
    /\.[jt]sx?$/,
    '.d.ts'
  );
  packageJson.main = entryFileTmpl.replace('<%= extension %>', 'umd');
  packageJson.module = entryFileTmpl.replace('<%= extension %>', 'esm');
  packageJson.typings = `./${typingsFile}`;
  writeJsonFile(`${options.outputPath}/package.json`, packageJson);

  if (
    dependencies.length > 0 &&
    options.updateBuildableProjectDepsInPackageJson
  ) {
    updateBuildableProjectPackageJsonDependencies(
      context.root,
      context.projectName,
      context.targetName,
      context.configurationName,
      target,
      dependencies,
      options.buildableProjectDepsInPackageJsonType
    );
  }
}

interface RollupCopyAssetOption {
  src: string;
  dest: string;
}

function convertCopyAssetsToRollupOptions(
  outputPath: string,
  assets: AssetGlobPattern[]
): RollupCopyAssetOption[] {
  return assets
    ? assets.map((a) => ({
        src: join(a.input, a.glob).replace(/\\/g, '/'),
        dest: join(outputPath, a.output).replace(/\\/g, '/'),
      }))
    : undefined;
}
