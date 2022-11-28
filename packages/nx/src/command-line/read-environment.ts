import { NxConfig } from '../config/nx-json';
import {
  readNxJson,
  readAllWorkspaceConfiguration,
} from '../config/configuration';

export interface Environment {
  nxConfig: NxConfig;
  workspaceJson: any;
  /**
   * @deprecated the field will be removed after Nx 14 is released. It's left here
   * not to break the type checker in case someone extends
   * the tasks runner
   */
  workspaceResults: any;
}

/**
 * @deprecated Read workspaceJson from projectGraph, and use readNxJson on its own.
 */
export function readEnvironment(): Environment {
  const nxConfig = readNxJson();
  const workspaceJson = readAllWorkspaceConfiguration();
  return { nxConfig, workspaceJson, workspaceResults: null } as any;
}
