import { ModuleFederationConfig } from '@nx/devkit';
import { getModuleFederationConfig } from './utils';

export async function withModuleFederationForSSR(
  options: ModuleFederationConfig
) {
  const reactWebpackConfig = require('../../plugins/webpack');

  const { sharedLibraries, sharedDependencies, mappedRemotes } =
    await getModuleFederationConfig(options, {
      isServer: true,
    });

  return (config) => {
    config = reactWebpackConfig(config);

    config.target = false;
    config.output.uniqueName = options.name;
    config.optimization = {
      runtimeChunk: false,
    };

    config.plugins.push(
      new (require('@module-federation/node').UniversalFederationPlugin)(
        {
          name: options.name,
          filename: 'remoteEntry.js',
          exposes: options.exposes,
          remotes: mappedRemotes,
          shared: {
            ...sharedDependencies,
          },
          library: {
            type: 'commonjs-module',
          },
          isServer: true,
        },
        {}
      ),
      sharedLibraries.getReplacementPlugin()
    );

    return config;
  };
}
