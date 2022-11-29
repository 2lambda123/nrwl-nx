import { NxConfig } from '../config/nx-config';
import { ProjectGraph } from '../config/project-graph';
import { Task, TaskGraph } from '../config/task-graph';
import { NxArgs } from '../utils/command-line-utils';
import { Hasher } from '../hasher/hasher';
import { DaemonClient } from '../daemon/client/client';

export type TaskStatus =
  | 'success'
  | 'failure'
  | 'skipped'
  | 'local-cache-kept-existing'
  | 'local-cache'
  | 'remote-cache';

/**
 * `any | Promise<{ [id: string]: TaskStatus }>`
 * will change to Promise<{ [id: string]: TaskStatus }> after Nx 15 is released.
 */
export type TasksRunner<T = unknown> = (
  tasks: Task[],
  options: T,
  context?: {
    target?: string;
    initiatingProject?: string | null;
    projectGraph: ProjectGraph;
    nxConfig: NxConfig;
    nxArgs: NxArgs;
    taskGraph?: TaskGraph;
    hasher?: Hasher;
    daemon?: DaemonClient;
  }
) => any | Promise<{ [id: string]: TaskStatus }>;
