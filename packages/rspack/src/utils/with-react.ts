import { Configuration } from '@rspack/core';
import { SharedConfigContext } from './model';
import { withWeb, WithWebOptions } from './with-web';
import { applyReactConfig } from './lib/apply-react-config';

export interface SvgrOptions {
  svgo?: boolean;
  titleProp?: boolean;
  ref?: boolean;
}

export interface WithReactOptions extends WithWebOptions {
  svgr?: boolean | SvgrOptions;
}

export function withReact(opts: WithReactOptions = {}) {
  return function makeConfig(
    config: Configuration,
    { options, context }: SharedConfigContext
  ): Configuration {
    config = withWeb({ ...opts, cssModules: true })(config, {
      options,
      context,
    });

    applyReactConfig(opts, config);
    return config;
  };
}
