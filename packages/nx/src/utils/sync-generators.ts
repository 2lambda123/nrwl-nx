import { performance } from 'perf_hooks';
import { parseGeneratorString } from '../command-line/generate/generate';
import { getGeneratorInformation } from '../command-line/generate/generator-utils';
import { readNxJson } from '../config/nx-json';
import type { ProjectGraph } from '../config/project-graph';
import type { ProjectConfiguration } from '../config/workspace-json-project-json';
import { daemonClient } from '../daemon/client/client';
import { FsTree, type FileChange, type Tree } from '../generators/tree';
import {
  createProjectGraphAsync,
  readProjectsConfigurationFromProjectGraph,
} from '../project-graph/project-graph';
import { workspaceRoot } from './workspace-root';
import chalk = require('chalk');

export type SyncGenerator = (
  tree: Tree,
  options: unknown
) => void | string | Promise<void | string>;

export type SyncGeneratorChangesResult = {
  changes: FileChange[];
  generatorName: string;
  outOfSyncMessage?: string;
};

export async function getSyncGeneratorChanges(
  generators: string[]
): Promise<SyncGeneratorChangesResult[]> {
  performance.mark('get-sync-generators-changes:start');
  let results: SyncGeneratorChangesResult[];

  if (!daemonClient.enabled()) {
    results = await runSyncGenerators(generators);
  } else {
    results = await daemonClient.getSyncGeneratorChanges(generators);
  }

  performance.mark('get-sync-generators-changes:end');
  performance.measure(
    'get-sync-generators-changes',
    'get-sync-generators-changes:start',
    'get-sync-generators-changes:end'
  );

  return results.filter((r) => r.changes.length > 0);
}

export async function clearSyncGeneratorChanges(
  generators: string[]
): Promise<void> {
  if (daemonClient.enabled()) {
    await daemonClient.clearSyncGeneratorChanges(generators);
  }
}

export async function collectAllRegisteredSyncGenerators(
  projectGraph: ProjectGraph
): Promise<string[]> {
  if (!daemonClient.enabled()) {
    return [
      ...collectRegisteredTaskSyncGenerators(projectGraph),
      ...collectRegisteredGlobalSyncGenerators(),
    ];
  }

  return await daemonClient.getRegisteredSyncGenerators();
}

export async function runSyncGenerator(
  tree: FsTree,
  generatorSpecifier: string,
  projects: Record<string, ProjectConfiguration>
): Promise<SyncGeneratorChangesResult> {
  performance.mark(`run-sync-generator:${generatorSpecifier}:start`);
  const { collection, generator } = parseGeneratorString(generatorSpecifier);
  const { implementationFactory } = getGeneratorInformation(
    collection,
    generator,
    workspaceRoot,
    projects
  );
  const implementation = implementationFactory() as SyncGenerator;
  const result = await implementation(tree, {});

  performance.mark(`run-sync-generator:${generatorSpecifier}:end`);
  performance.measure(
    `run-sync-generator:${generatorSpecifier}`,
    `run-sync-generator:${generatorSpecifier}:start`,
    `run-sync-generator:${generatorSpecifier}:end`
  );

  return {
    changes: tree.listChanges(),
    generatorName: generatorSpecifier,
    outOfSyncMessage: typeof result === 'string' ? result : undefined,
  };
}

export function collectRegisteredTaskSyncGenerators(
  projectGraph: ProjectGraph
): Set<string> {
  const taskSyncGenerators = new Set<string>();

  for (const {
    data: { targets },
  } of Object.values(projectGraph.nodes)) {
    if (!targets) {
      continue;
    }

    for (const target of Object.values(targets)) {
      if (!target.syncGenerators) {
        continue;
      }

      for (const generator of target.syncGenerators) {
        taskSyncGenerators.add(generator);
      }
    }
  }

  return taskSyncGenerators;
}

export function collectRegisteredGlobalSyncGenerators(
  nxJson = readNxJson()
): Set<string> {
  const globalSyncGenerators = new Set<string>();

  if (!nxJson.sync?.globalGenerators?.length) {
    return globalSyncGenerators;
  }

  for (const generator of nxJson.sync.globalGenerators) {
    globalSyncGenerators.add(generator);
  }

  return globalSyncGenerators;
}

export function syncGeneratorResultsToMessageLines(
  results: SyncGeneratorChangesResult[]
): string[] {
  const messageLines: string[] = [];

  for (const result of results) {
    messageLines.push(
      `The ${chalk.bold(
        result.generatorName
      )} sync generator identified ${chalk.bold(result.changes.length)} file${
        result.changes.length === 1 ? '' : 's'
      } in the workspace that ${
        result.changes.length === 1 ? 'is' : 'are'
      } out of sync${result.outOfSyncMessage ? ':' : '.'}`
    );
    if (result.outOfSyncMessage) {
      messageLines.push(result.outOfSyncMessage);
    }
    messageLines.push('');
  }

  return messageLines;
}

async function runSyncGenerators(
  generators: string[]
): Promise<SyncGeneratorChangesResult[]> {
  const tree = new FsTree(workspaceRoot, false, 'running sync generators');
  const projectGraph = await createProjectGraphAsync();
  const { projects } = readProjectsConfigurationFromProjectGraph(projectGraph);

  const results: SyncGeneratorChangesResult[] = [];
  for (const generator of generators) {
    const result = await runSyncGenerator(tree, generator, projects);
    results.push(result);
  }

  return results;
}
