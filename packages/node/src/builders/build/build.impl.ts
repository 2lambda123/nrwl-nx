import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import { runWebpack, BuildResult } from '@angular-devkit/build-webpack';

import { Observable, from } from 'rxjs';
import { join, resolve } from 'path';
import { map, concatMap, switchMap, tap } from 'rxjs/operators';
import { getNodeWebpackConfig } from '../../utils/node.config';
import { OUT_FILENAME } from '../../utils/config';
import { BuildBuilderOptions } from '../../utils/types';
import { normalizeBuildOptions } from '../../utils/normalize';
import { createProjectGraphAsync } from '@nrwl/workspace/src/core/project-graph';
import {
  calculateProjectDependencies,
  createTmpTsConfig,
} from '@nrwl/workspace/src/utils/buildable-libs-utils';

try {
  require('dotenv').config();
} catch (e) {}

export interface BuildNodeBuilderOptions extends BuildBuilderOptions {
  optimization?: boolean;
  sourceMap?: boolean;
  externalDependencies: 'all' | 'none' | string[];
  buildLibsFromSource?: boolean;
}

export type NodeBuildEvent = BuildResult & {
  outfile: string;
};

export default createBuilder<JsonObject & BuildNodeBuilderOptions>(run);

function run(
  options: JsonObject & BuildNodeBuilderOptions,
  context: BuilderContext
): Observable<NodeBuildEvent> {
  return from(createProjectGraphAsync()).pipe(
    tap((projGraph) => {
      if (!options.buildLibsFromSource) {
        const { target, dependencies } = calculateProjectDependencies(
          projGraph,
          context
        );
        options.tsConfig = createTmpTsConfig(
          join(context.workspaceRoot, options.tsConfig),
          context.workspaceRoot,
          target.data.root,
          dependencies
        );
      }
    }),
    switchMap(() => getSourceRoot(context)),
    map((sourceRoot) =>
      normalizeBuildOptions(options, context.workspaceRoot, sourceRoot)
    ),
    map((options) => {
      let config = getNodeWebpackConfig(options);
      if (options.webpackConfig) {
        config = require(options.webpackConfig)(config, {
          options,
          configuration: context.target.configuration,
        });
      }
      return config;
    }),
    concatMap((config) =>
      runWebpack(config, context, {
        logging: (stats) => {
          context.logger.info(stats.toString(config.stats));
        },
        webpackFactory: require('webpack'),
      })
    ),
    map((buildEvent: BuildResult) => {
      buildEvent.outfile = resolve(
        context.workspaceRoot,
        options.outputPath,
        OUT_FILENAME
      );
      return buildEvent as NodeBuildEvent;
    })
  );
}

async function getSourceRoot(context: BuilderContext) {
  const sourceRoot = (await context.getProjectMetadata(context.target.project))
    .sourceRoot as string;
  if (!sourceRoot) {
    context.reportStatus('Error');
    const message = `${context.target.project} does not have a sourceRoot. Please define one.`;
    context.logger.error(message);
    throw new Error(message);
  } else {
    return sourceRoot;
  }
}
