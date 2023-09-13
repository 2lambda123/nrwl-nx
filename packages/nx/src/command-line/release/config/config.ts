import { NxJsonConfiguration } from '../../../config/nx-json';

// Apply default configuration to any optional user configuration
export function createNxReleaseConfig(
  userConfig: NxJsonConfiguration['release'] = {}
): Required<NxJsonConfiguration['release']> {
  const nxReleaseConfig: Required<NxJsonConfiguration['release']> = {
    ...userConfig,
    groups: userConfig.groups || {},
  };
  return nxReleaseConfig;
}
