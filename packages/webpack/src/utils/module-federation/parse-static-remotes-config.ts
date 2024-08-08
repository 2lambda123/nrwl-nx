import type { ExecutorContext } from '@nx/devkit';
import { basename, dirname } from 'path';

export type StaticRemoteConfig = {
  basePath: string;
  outputPath: string;
  urlSegment: string;
  port: number;
};

export type StaticRemotesConfig = {
  remotes: string[];
  config: Record<string, StaticRemoteConfig> | undefined;
};

export function parseStaticRemotesConfig(
  staticRemotes: string[] | undefined,
  context: ExecutorContext
): StaticRemotesConfig {
  if (!staticRemotes?.length) {
    return { remotes: [], config: undefined };
  }

  const config: Record<string, StaticRemoteConfig> = {};
  for (const app of staticRemotes) {
    const outputPath =
      context.projectGraph.nodes[app].data.targets['build'].options.outputPath;
    const basePath = dirname(outputPath);
    const urlSegment = basename(outputPath);
    const port =
      context.projectGraph.nodes[app].data.targets['serve'].options.port;
    config[app] = { basePath, outputPath, urlSegment, port };
  }

  return { remotes: staticRemotes, config };
}

export function parseStaticSsrRemotesConfig(
  staticRemotes: string[] | undefined,
  context: ExecutorContext
): StaticRemotesConfig {
  if (!staticRemotes?.length) {
    return { remotes: [], config: undefined };
  }
  const config: Record<string, StaticRemoteConfig> = {};
  for (const app of staticRemotes) {
    const outputPath = context.projectGraph.nodes[app].data.targets['build']
      .options.outputPath as string;
    const basePath = dirname(outputPath); // dist/checkout/browser -> checkout
    const urlSegment =
      basename(outputPath) === 'browser'
        ? basename(basePath)
        : basename(outputPath); // we do not want to have /browser in the url
    const port =
      context.projectGraph.nodes[app].data.targets['serve'].options.port;
    config[app] = { basePath, outputPath, urlSegment, port };
  }

  return { remotes: staticRemotes, config };
}
