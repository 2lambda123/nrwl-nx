import * as yargs from 'yargs';
import { ProjectNode } from '../shared-models';
import { getProjectNodes } from '../shared-utils';
import { createDepGraph } from '../dep-graph/create-dep-graph';
import { runCommand } from './run-command';
import {
  projectHasTargetAndConfiguration,
  readEnvironment,
  splitArgs,
  TaskArgs
} from './utils';
import { output } from '../output';
import { readDependencies } from '../read-dependencies';

export type YargsRunManyOptions = yargs.Arguments & RunManyOptions;

export interface RunManyOptions {
  target: string;
  projects: string[];
  all: boolean;
  configuration?: string;
  runner?: string;
  parallel?: boolean;
  maxParallel?: number;
  onlyFailed?: boolean;
  'only-failed'?: boolean;
  'max-parallel'?: boolean;
  verbose?: boolean;
  help?: boolean;
  version?: boolean;
  quiet?: boolean;
}

export function runMany(parsedArgs: yargs.Arguments): void {
  parsedArgs = preprocess(parsedArgs);

  const args = splitArgs(parsedArgs as YargsRunManyOptions, flags);
  const environment = readEnvironment(args.nxArgs.target);
  const { nxJson, workspaceJson } = environment;

  const allProjects = getProjectNodes(workspaceJson, nxJson);
  const projects = getProjectsToRun(args.nxArgs, allProjects);
  const projectNodes = getProjectNodes(workspaceJson, nxJson);
  const dependencies = readDependencies(nxJson.npmScope, projectNodes);
  const dependencyGraph = createDepGraph(dependencies, projectNodes);

  runCommand(projects, dependencyGraph, args, environment);
}

function preprocess(args: yargs.Arguments): yargs.Arguments {
  if (!args.all) {
    args.all = false;
  }

  if (!args.projects) {
    args.projects = [];
  } else {
    args.projects = args.projects.split(',').map((p: string) => p.trim());
  }

  return args;
}

export function getProjectsToRun(
  args: TaskArgs,
  allProjects: ProjectNode[]
): ProjectNode[] {
  const { projects, target, all } = args;

  let found = [];

  if (!all) {
    const notFound = [];
    const noConfig = [];

    for (let project of projects) {
      const node = allProjects.find(p => p.name === project);

      if (!node) {
        notFound.push(project);
      } else if (!projectHasTargetAndConfiguration(node, target)) {
        noConfig.push(project);
      } else {
        found.push(node);
      }
    }

    if (notFound.length) {
      output.error({
        title: 'the following projects were not found in nx.json',
        bodyLines: notFound.map(p => '- ' + p)
      });
    }

    if (noConfig.length) {
      output.warn({
        title: `the following do not have configuration for "${target}"`,
        bodyLines: noConfig.map(p => '- ' + p)
      });
    }
  } else {
    found = allProjects;
  }

  return found;
}

const dummyOptions: RunManyOptions = {
  target: '',
  projects: [],
  all: false,
  configuration: '',
  onlyFailed: false,
  'only-failed': false,
  runner: '',
  help: false,
  version: false,
  quiet: false,
  verbose: false
};

const flags = Object.keys(dummyOptions);
