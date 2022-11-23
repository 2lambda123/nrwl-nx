import { ModuleFederationConfig } from '@nrwl/devkit';
import { readCachedProjectConfiguration } from 'nx/src/project-graph/project-graph';
import { getModuleFederationConfig } from './utils';
import ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

function determineRemoteUrl(remote: string) {
  const remoteConfiguration = readCachedProjectConfiguration(remote);
  const serveTarget = remoteConfiguration?.targets?.serve;

  if (!serveTarget) {
    throw new Error(
      `Cannot automatically determine URL of remote (${remote}). Looked for property "host" in the project's "serve" target.\n
      You can also use the tuple syntax in your webpack config to configure your remotes. e.g. \`remotes: [['remote1', '//localhost:4201']]\``
    );
  }

  const host = serveTarget.options?.host ?? '//localhost';
  const port = serveTarget.options?.port ?? 4201;
  return `${
    host.endsWith('/') ? host.slice(0, -1) : host
  }:${port}/remoteEntry.js`;
}

export async function withModuleFederation(options: ModuleFederationConfig) {
  const reactWebpackConfig = require('../../plugins/webpack');

  const { sharedDependencies, sharedLibraries, mappedRemotes } =
    await getModuleFederationConfig(options, determineRemoteUrl);

  return (config) => {
    config = reactWebpackConfig(config);
    config.output.uniqueName = options.name;
    config.output.publicPath = 'auto';

    config.optimization = {
      runtimeChunk: false,
    };

    config.experiments = {
      ...config.experiments,
      outputModule: true,
    };

    config.plugins.push(
      new ModuleFederationPlugin({
        name: options.name,
        library: {
          type: 'module',
        },
        filename: 'remoteEntry.js',
        exposes: options.exposes,
        remotes: mappedRemotes,
        shared: {
          ...sharedDependencies,
        },
      }),
      sharedLibraries.getReplacementPlugin()
    );

    return config;
  };
}
