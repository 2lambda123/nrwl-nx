import PQueue from 'p-queue';
import {
  ProjectGraph,
  ProjectGraphProjectNode,
} from '../../config/project-graph';
import { getCycles, mergeOverlappingCycles } from './cycles';

interface TopologicalConfig {
  concurrency?: number;
}

/**
 * Run callback in maximally-saturated topological order.
 */
export async function runProjectsTopologically<T>(
  projects: ProjectGraphProjectNode[],
  projectGraph: ProjectGraph,
  runner: (node: ProjectGraphProjectNode) => Promise<T>,
  { concurrency }: TopologicalConfig = {}
): Promise<T[]> {
  const queue = new PQueue({ concurrency });

  const returnValues: T[] = [];

  const projectsMap = new Map(projects.map((p) => [p.name, p]));
  const localDependencies = projectGraph.dependencies;
  const flattenedLocalDependencies = flatten(Object.values(localDependencies));

  const getProject = (name: string) => {
    const project = projectsMap.get(name);
    if (!project) {
      throw new Error(
        `Failed to find project ${name}. This is likely a bug in Nx.`
      );
    }
    return project;
  };

  const dependenciesBySource: Record<string, Set<string>> = projects.reduce(
    (prev, next) => ({
      ...prev,
      [next.name]: new Set<string>(),
    }),
    {}
  );

  flattenedLocalDependencies.forEach((dep) => {
    if (dependenciesBySource[dep.source] && projectsMap.has(dep.target)) {
      dependenciesBySource[dep.source].add(dep.target);
    }
  });

  const unmergedCycles = getCycles(localDependencies);
  const cycles = new Set(mergeOverlappingCycles(unmergedCycles));

  const seen: Set<string> = new Set();

  const errors: Error[] = [];

  const queueNextPackages = () => {
    if (seen.size === projects.length) {
      return;
    }
    let batch = Object.keys(dependenciesBySource)
      .filter((p) => dependenciesBySource[p].size === 0)
      .filter((p) => !seen.has(p));

    if (batch.length === 0) {
      const cycle = Array.from(cycles.values()).find((cycle) => {
        // only process the cycle if it has NO nodes with dependencies outside this same cycle
        const cycleHasExternalDependencies = cycle.some((project) => {
          const projectDeps = dependenciesBySource[project];
          const depIsNotInCycle = (dep: string) => cycle.indexOf(dep) === -1;
          return Array.from(projectDeps).filter(depIsNotInCycle).length > 0;
        });
        return !cycleHasExternalDependencies;
      });

      if (cycle) {
        cycles.delete(cycle);
        batch = cycle.filter((p) => projectsMap.has(p));
      }
    }

    batch.forEach((p) => {
      const project = getProject(p);
      seen.add(p);

      queue
        .add(() =>
          runner(project).then((value) => {
            returnValues.push(value);

            delete dependenciesBySource[p];

            Object.keys(dependenciesBySource).forEach((dep) =>
              dependenciesBySource[dep].delete(p)
            );

            queueNextPackages();
          })
        )
        .catch((err) => {
          // capture the inner error to throw later, since queue.onIdle will not throw it
          errors.push(err);
        });
    });
  };

  queueNextPackages();

  await queue.onIdle();

  if (errors.length) {
    // throw the first error that was captured above
    throw errors[0];
  }

  if (seen.size !== projects.length) {
    throw new Error('Not all tasks were run. This is likely a bug in Nx.');
  }

  return returnValues;
}

function flatten<T>(arr: T[][]): T[] {
  return arr.reduce((acc, next) => [...acc, ...next], []);
}
