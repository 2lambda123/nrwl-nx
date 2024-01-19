import { workspaceRoot } from '../../utils/workspace-root';
import { output } from '../../utils/output';
import {
  fetchCorePlugins,
  getInstalledPluginsAndCapabilities,
  listCorePlugins,
  listInstalledPlugins,
  listPluginCapabilities,
} from '../../utils/plugins';
import {
  getLocalWorkspacePlugins,
  listLocalWorkspacePlugins,
} from '../../utils/plugins/local-plugins';
import {
  createProjectGraphAsync,
  readProjectsConfigurationFromProjectGraph,
} from '../../project-graph/project-graph';
import { readNxJson } from '../../config/nx-json';
import { getResponseFromAI } from './lib/get-response-from-ai';

export interface ListArgs {
  prompt?: string | undefined;
}

/**
 * Write in natural language what you want to run. *
 *
 * @remarks
 *
 * Must be run within an Nx workspace
 *
 */
export async function aiHandler(args: ListArgs): Promise<void> {
  const nxJson = readNxJson();
  const projectGraph = await createProjectGraphAsync({ exitOnError: true });
  const projects = readProjectsConfigurationFromProjectGraph(projectGraph);

  if (args.prompt) {
    const response = await getResponseFromAI(args.prompt);
  } else {
    const corePlugins = fetchCorePlugins();

    const localPlugins = await getLocalWorkspacePlugins(projects, nxJson);
    const installedPlugins = await getInstalledPluginsAndCapabilities(
      workspaceRoot,
      projects.projects
    );

    if (localPlugins.size) {
      listLocalWorkspacePlugins(localPlugins);
    }
    listInstalledPlugins(installedPlugins);
    listCorePlugins(installedPlugins, corePlugins);

    output.note({
      title: 'Community Plugins',
      bodyLines: [
        'Looking for a technology / framework not listed above?',
        'There are many excellent plugins maintained by the Nx community.',
        'Search for the one you need here: https://nx.dev/plugins/registry.',
      ],
    });

    output.note({
      title: `Use "nx list [plugin]" to find out more`,
    });
  }
}
