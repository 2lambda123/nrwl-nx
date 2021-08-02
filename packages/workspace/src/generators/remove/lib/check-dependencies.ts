import {
  createProjectGraphAsync,
  LATEST_GRAPH_VERSION,
  onlyWorkspaceProjects,
  reverse,
} from '../../../core/project-graph';
import type { ProjectGraph } from '@nrwl/devkit';
import { Schema } from '../schema';

/**
 * Check whether the project to be removed is depended on by another project
 *
 * Throws an error if the project is in use, unless the `--forceRemove` option is used.
 */
export async function checkDependencies(_, schema: Schema): Promise<void> {
  if (schema.forceRemove) {
    return;
  }

  const graph: ProjectGraph = await createProjectGraphAsync(
    LATEST_GRAPH_VERSION
  );

  const reverseGraph = onlyWorkspaceProjects(reverse(graph));

  const deps = reverseGraph.dependencies[schema.projectName] || [];

  if (deps.length > 0) {
    throw new Error(
      `${
        schema.projectName
      } is still depended on by the following projects:\n${deps
        .map((x) => x.target)
        .join('\n')}`
    );
  }
}
