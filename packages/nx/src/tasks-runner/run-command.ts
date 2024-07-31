import { prompt } from 'enquirer';
import * as ora from 'ora';
import { join } from 'path';
import {
  NxJsonConfiguration,
  readNxJson,
  TargetDefaults,
  TargetDependencies,
} from '../config/nx-json';
import { ProjectGraph, ProjectGraphProjectNode } from '../config/project-graph';
import { Task, TaskGraph } from '../config/task-graph';
import { TargetDependencyConfig } from '../config/workspace-json-project-json';
import { daemonClient } from '../daemon/client/client';
import { type FileChange, flushChanges } from '../generators/tree';
import { createTaskHasher } from '../hasher/create-task-hasher';
import { hashTasksThatDoNotDependOnOutputsOfOtherTasks } from '../hasher/hash-task';
import { createProjectGraphAsync } from '../project-graph/project-graph';
import { NxArgs } from '../utils/command-line-utils';
import { isRelativePath } from '../utils/fileutils';
import { isCI } from '../utils/is-ci';
import { isNxCloudUsed } from '../utils/nx-cloud-utils';
import { output } from '../utils/output';
import { handleErrors } from '../utils/params';
import {
  clearSyncGeneratorChanges,
  getSyncGeneratorChanges,
  syncGeneratorResultsToMessageLines,
  type SyncGeneratorChangesResult,
} from '../utils/sync-generators';
import { updateContextWithChangedFiles } from '../utils/workspace-context';
import { workspaceRoot } from '../utils/workspace-root';
import { createTaskGraph } from './create-task-graph';
import { CompositeLifeCycle, LifeCycle } from './life-cycle';
import { createRunManyDynamicOutputRenderer } from './life-cycles/dynamic-run-many-terminal-output-life-cycle';
import { createRunOneDynamicOutputRenderer } from './life-cycles/dynamic-run-one-terminal-output-life-cycle';
import { StaticRunManyTerminalOutputLifeCycle } from './life-cycles/static-run-many-terminal-output-life-cycle';
import { StaticRunOneTerminalOutputLifeCycle } from './life-cycles/static-run-one-terminal-output-life-cycle';
import { StoreRunInformationLifeCycle } from './life-cycles/store-run-information-life-cycle';
import { TaskHistoryLifeCycle } from './life-cycles/task-history-life-cycle';
import { TaskProfilingLifeCycle } from './life-cycles/task-profiling-life-cycle';
import { TaskTimingsLifeCycle } from './life-cycles/task-timings-life-cycle';
import {
  findCycle,
  makeAcyclic,
  validateNoAtomizedTasks,
} from './task-graph-utils';
import { TasksRunner, TaskStatus } from './tasks-runner';
import { shouldStreamOutput } from './utils';
import chalk = require('chalk');

async function getTerminalOutputLifeCycle(
  initiatingProject: string,
  projectNames: string[],
  tasks: Task[],
  nxArgs: NxArgs,
  nxJson: NxJsonConfiguration,
  overrides: Record<string, unknown>
): Promise<{ lifeCycle: LifeCycle; renderIsDone: Promise<void> }> {
  const { runnerOptions } = getRunner(nxArgs, nxJson);
  const isRunOne = initiatingProject != null;
  const useDynamicOutput = shouldUseDynamicLifeCycle(
    tasks,
    runnerOptions,
    nxArgs.outputStyle
  );

  const overridesWithoutHidden = { ...overrides };
  delete overridesWithoutHidden['__overrides_unparsed__'];

  if (isRunOne) {
    if (useDynamicOutput) {
      return await createRunOneDynamicOutputRenderer({
        initiatingProject,
        tasks,
        args: nxArgs,
        overrides: overridesWithoutHidden,
      });
    }
    return {
      lifeCycle: new StaticRunOneTerminalOutputLifeCycle(
        initiatingProject,
        projectNames,
        tasks,
        nxArgs
      ),
      renderIsDone: Promise.resolve(),
    };
  } else {
    if (useDynamicOutput) {
      return await createRunManyDynamicOutputRenderer({
        projectNames,
        tasks,
        args: nxArgs,
        overrides: overridesWithoutHidden,
      });
    } else {
      return {
        lifeCycle: new StaticRunManyTerminalOutputLifeCycle(
          projectNames,
          tasks,
          nxArgs,
          overridesWithoutHidden
        ),
        renderIsDone: Promise.resolve(),
      };
    }
  }
}

function createTaskGraphAndRunValidations(
  projectGraph: ProjectGraph,
  extraTargetDependencies: TargetDependencies,
  projectNames: string[],
  nxArgs: NxArgs,
  overrides: any,
  extraOptions: {
    excludeTaskDependencies: boolean;
    loadDotEnvFiles: boolean;
  }
) {
  const taskGraph = createTaskGraph(
    projectGraph,
    extraTargetDependencies,
    projectNames,
    nxArgs.targets,
    nxArgs.configuration,
    overrides,
    extraOptions.excludeTaskDependencies
  );

  const cycle = findCycle(taskGraph);
  if (cycle) {
    if (process.env.NX_IGNORE_CYCLES === 'true' || nxArgs.nxIgnoreCycles) {
      output.warn({
        title: `The task graph has a circular dependency`,
        bodyLines: [`${cycle.join(' --> ')}`],
      });
      makeAcyclic(taskGraph);
    } else {
      output.error({
        title: `Could not execute command because the task graph has a circular dependency`,
        bodyLines: [`${cycle.join(' --> ')}`],
      });
      process.exit(1);
    }
  }

  // validate that no atomized tasks like e2e-ci are used without Nx Cloud
  if (
    !isNxCloudUsed(readNxJson()) &&
    !process.env['NX_SKIP_ATOMIZER_VALIDATION']
  ) {
    validateNoAtomizedTasks(taskGraph, projectGraph);
  }

  return taskGraph;
}

export async function runCommand(
  projectsToRun: ProjectGraphProjectNode[],
  currentProjectGraph: ProjectGraph,
  { nxJson }: { nxJson: NxJsonConfiguration },
  nxArgs: NxArgs,
  overrides: any,
  initiatingProject: string | null,
  extraTargetDependencies: Record<string, (TargetDependencyConfig | string)[]>,
  extraOptions: { excludeTaskDependencies: boolean; loadDotEnvFiles: boolean }
): Promise<NodeJS.Process['exitCode']> {
  const status = await handleErrors(
    process.env.NX_VERBOSE_LOGGING === 'true',
    async () => {
      const projectNames = projectsToRun.map((t) => t.name);

      const { projectGraph, taskGraph } =
        await ensureWorkspaceIsInSyncAndGetGraphs(
          currentProjectGraph,
          projectNames,
          nxArgs,
          overrides,
          extraTargetDependencies,
          extraOptions
        );
      const tasks = Object.values(taskGraph.tasks);

      const { lifeCycle, renderIsDone } = await getTerminalOutputLifeCycle(
        initiatingProject,
        projectNames,
        tasks,
        nxArgs,
        nxJson,
        overrides
      );

      const status = await invokeTasksRunner({
        tasks,
        projectGraph,
        taskGraph,
        lifeCycle,
        nxJson,
        nxArgs,
        loadDotEnvFiles: extraOptions.loadDotEnvFiles,
        initiatingProject,
      });

      await renderIsDone;

      return status;
    }
  );

  return status;
}

async function ensureWorkspaceIsInSyncAndGetGraphs(
  projectGraph: ProjectGraph,
  projectNames: string[],
  nxArgs: NxArgs,
  overrides: any,
  extraTargetDependencies: Record<string, (TargetDependencyConfig | string)[]>,
  extraOptions: { excludeTaskDependencies: boolean; loadDotEnvFiles: boolean }
): Promise<{
  projectGraph: ProjectGraph;
  taskGraph: TaskGraph;
}> {
  let taskGraph = createTaskGraphAndRunValidations(
    projectGraph,
    extraTargetDependencies ?? {},
    projectNames,
    nxArgs,
    overrides,
    extraOptions
  );

  if (process.env.NX_ENABLE_SYNC_GENERATORS !== 'true') {
    return { projectGraph, taskGraph };
  }

  // collect unique syncGenerators from the tasks
  const uniqueSyncGenerators = new Set<string>();
  for (const { target } of Object.values(taskGraph.tasks)) {
    const { syncGenerators } =
      projectGraph.nodes[target.project].data.targets[target.target];
    if (!syncGenerators) {
      continue;
    }

    for (const generator of syncGenerators) {
      uniqueSyncGenerators.add(generator);
    }
  }

  if (!uniqueSyncGenerators.size) {
    // There are no sync generators registered in the tasks to run
    return { projectGraph, taskGraph };
  }

  const syncGenerators = Array.from(uniqueSyncGenerators);
  const results = await getSyncGeneratorChanges(syncGenerators);
  if (!results.length) {
    // There are no changes to sync, workspace is up to date
    return { projectGraph, taskGraph };
  }

  const errorTitle = 'The workspace is out of sync';
  const resultDescriptions = syncGeneratorResultsToMessageLines(results);
  const errorBodyLines = [
    ...resultDescriptions,
    '\nPlease run `nx sync` to sync the workspace configuration.',
  ];

  if (isCI()) {
    throw new Error(`${errorTitle}\n${errorBodyLines.join('\n')}`);
  }

  if (!process.stdout.isTTY) {
    output.warn({
      title: errorTitle,
      bodyLines: errorBodyLines,
    });

    return { projectGraph, taskGraph };
  }

  output.addNewline();
  const promptConfig = {
    name: 'applyChanges',
    type: 'select',
    message:
      'The workspace configuration for the tasks is out of sync. Would you like to sync it?',
    choices: [
      {
        name: 'yes',
        message: 'Yes, sync changes and run the tasks',
      },
      {
        name: 'no',
        message: 'No, run the tasks without syncing changes',
      },
    ],
    footer: () =>
      chalk.dim(
        `\nThe sync generators associated with the tasks to run yielded the following changes:\n${resultDescriptions.join(
          '\n'
        )}`
      ),
  };
  const applySyncChanges = await prompt<{ applyChanges: 'yes' | 'no' }>([
    promptConfig,
  ]).then(({ applyChanges }) => applyChanges === 'yes');

  if (applySyncChanges) {
    const spinner = ora('Syncing workspace configuration...');
    spinner.start();

    const { changes, createdFiles, updatedFiles, deletedFiles } =
      processSyncGeneratorResults(results);

    // Write changes to disk
    flushChanges(workspaceRoot, changes);
    // clear cached changes for the applied sync generators
    await clearSyncGeneratorChanges(syncGenerators);
    // Update the context files
    await updateContextWithChangedFiles(
      createdFiles,
      updatedFiles,
      deletedFiles
    );
    // Re-create project graph and task graph
    projectGraph = await createProjectGraphAsync();
    taskGraph = createTaskGraphAndRunValidations(
      projectGraph,
      extraTargetDependencies ?? {},
      projectNames,
      nxArgs,
      overrides,
      extraOptions
    );

    spinner.succeed('The workspace configuration was synced successfully!');
  } else {
    output.warn({
      title: errorTitle,
      bodyLines: errorBodyLines,
    });
  }

  return { projectGraph, taskGraph };
}

function processSyncGeneratorResults(results: SyncGeneratorChangesResult[]) {
  const changes: FileChange[] = [];
  const createdFiles: string[] = [];
  const updatedFiles: string[] = [];
  const deletedFiles: string[] = [];

  for (const result of results) {
    for (const change of result.changes) {
      changes.push(change);
      if (change.type === 'CREATE') {
        createdFiles.push(change.path);
      } else if (change.type === 'UPDATE') {
        updatedFiles.push(change.path);
      } else if (change.type === 'DELETE') {
        deletedFiles.push(change.path);
      }
    }
  }

  return { changes, createdFiles, updatedFiles, deletedFiles };
}

function setEnvVarsBasedOnArgs(nxArgs: NxArgs, loadDotEnvFiles: boolean) {
  if (
    nxArgs.outputStyle == 'stream' ||
    process.env.NX_BATCH_MODE === 'true' ||
    nxArgs.batch
  ) {
    process.env.NX_STREAM_OUTPUT = 'true';
    process.env.NX_PREFIX_OUTPUT = 'true';
  }
  if (nxArgs.outputStyle == 'stream-without-prefixes') {
    process.env.NX_STREAM_OUTPUT = 'true';
  }
  if (loadDotEnvFiles) {
    process.env.NX_LOAD_DOT_ENV_FILES = 'true';
  }
}

export async function invokeTasksRunner({
  tasks,
  projectGraph,
  taskGraph,
  lifeCycle,
  nxJson,
  nxArgs,
  loadDotEnvFiles,
  initiatingProject,
}: {
  tasks: Task[];
  projectGraph: ProjectGraph;
  taskGraph: TaskGraph;
  lifeCycle: LifeCycle;
  nxJson: NxJsonConfiguration;
  nxArgs: NxArgs;
  loadDotEnvFiles: boolean;
  initiatingProject: string | null;
}) {
  setEnvVarsBasedOnArgs(nxArgs, loadDotEnvFiles);

  const { tasksRunner, runnerOptions } = getRunner(nxArgs, nxJson);

  let hasher = createTaskHasher(projectGraph, nxJson, runnerOptions);

  // this is used for two reasons: to fetch all remote cache hits AND
  // to submit everything that is known in advance to Nx Cloud to run in
  // a distributed fashion

  await hashTasksThatDoNotDependOnOutputsOfOtherTasks(
    hasher,
    projectGraph,
    taskGraph,
    nxJson
  );

  const promiseOrObservable = tasksRunner(
    tasks,
    {
      ...runnerOptions,
      lifeCycle: new CompositeLifeCycle(constructLifeCycles(lifeCycle)),
    },
    {
      initiatingProject:
        nxArgs.outputStyle === 'compact' ? null : initiatingProject,
      projectGraph,
      nxJson,
      nxArgs,
      taskGraph,
      hasher: {
        hashTask(task: Task, taskGraph_?: TaskGraph, env?: NodeJS.ProcessEnv) {
          if (!taskGraph_) {
            output.warn({
              title: `TaskGraph is now required as an argument to hashTask`,
              bodyLines: [
                `The TaskGraph object can be retrieved from the context`,
                'This will result in an error in Nx 20',
              ],
            });
            taskGraph_ = taskGraph;
          }
          if (!env) {
            output.warn({
              title: `The environment variables are now required as an argument to hashTask`,
              bodyLines: [
                `Please pass the environment variables used when running the task`,
                'This will result in an error in Nx 20',
              ],
            });
            env = process.env;
          }
          return hasher.hashTask(task, taskGraph_, env);
        },
        hashTasks(
          task: Task[],
          taskGraph_?: TaskGraph,
          env?: NodeJS.ProcessEnv
        ) {
          if (!taskGraph_) {
            output.warn({
              title: `TaskGraph is now required as an argument to hashTasks`,
              bodyLines: [
                `The TaskGraph object can be retrieved from the context`,
                'This will result in an error in Nx 20',
              ],
            });
            taskGraph_ = taskGraph;
          }
          if (!env) {
            output.warn({
              title: `The environment variables are now required as an argument to hashTasks`,
              bodyLines: [
                `Please pass the environment variables used when running the tasks`,
                'This will result in an error in Nx 20',
              ],
            });
            env = process.env;
          }

          return hasher.hashTasks(task, taskGraph_, env);
        },
      },
      daemon: daemonClient,
    }
  );
  let anyFailures;
  if ((promiseOrObservable as any).subscribe) {
    anyFailures = await anyFailuresInObservable(promiseOrObservable);
  } else {
    // simply await the promise
    anyFailures = await anyFailuresInPromise(promiseOrObservable as any);
  }
  return anyFailures ? 1 : 0;
}

function constructLifeCycles(lifeCycle: LifeCycle) {
  const lifeCycles = [] as LifeCycle[];
  lifeCycles.push(new StoreRunInformationLifeCycle());
  lifeCycles.push(lifeCycle);
  if (process.env.NX_PERF_LOGGING === 'true') {
    lifeCycles.push(new TaskTimingsLifeCycle());
  }
  if (process.env.NX_PROFILE) {
    lifeCycles.push(new TaskProfilingLifeCycle(process.env.NX_PROFILE));
  }
  if (!isNxCloudUsed(readNxJson())) {
    lifeCycles.push(new TaskHistoryLifeCycle());
  }
  return lifeCycles;
}

function mergeTargetDependencies(
  defaults: TargetDefaults | undefined | null,
  deps: TargetDependencies
): TargetDependencies {
  const res = {};
  Object.keys(defaults ?? {}).forEach((k) => {
    res[k] = defaults[k].dependsOn;
  });
  if (deps) {
    Object.keys(deps).forEach((k) => {
      if (res[k]) {
        res[k] = [...res[k], deps[k]];
      } else {
        res[k] = deps[k];
      }
    });

    return res;
  }
}

async function anyFailuresInPromise(
  promise: Promise<{ [id: string]: TaskStatus }>
) {
  return Object.values(await promise).some(
    (v) => v === 'failure' || v === 'skipped'
  );
}

async function anyFailuresInObservable(obs: any) {
  return await new Promise((res) => {
    let anyFailures = false;
    obs.subscribe(
      (t) => {
        if (!t.success) {
          anyFailures = true;
        }
      },
      (error) => {
        output.error({
          title: 'Unhandled error in task executor',
        });
        console.error(error);
        res(true);
      },
      () => {
        res(anyFailures);
      }
    );
  });
}

function shouldUseDynamicLifeCycle(
  tasks: Task[],
  options: any,
  outputStyle: string
) {
  if (
    process.env.NX_BATCH_MODE === 'true' ||
    process.env.NX_VERBOSE_LOGGING === 'true' ||
    process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT === 'false'
  ) {
    return false;
  }
  if (!process.stdout.isTTY) return false;
  if (isCI()) return false;
  if (outputStyle === 'static' || outputStyle === 'stream') return false;

  return !tasks.find((t) => shouldStreamOutput(t, null));
}

function loadTasksRunner(modulePath: string) {
  try {
    const maybeTasksRunner = require(modulePath) as
      | TasksRunner
      | { default: TasksRunner };
    // to support both babel and ts formats
    return 'default' in maybeTasksRunner
      ? maybeTasksRunner.default
      : maybeTasksRunner;
  } catch (e) {
    if (
      e.code === 'MODULE_NOT_FOUND' &&
      (modulePath === 'nx-cloud' || modulePath === '@nrwl/nx-cloud')
    ) {
      return require('../nx-cloud/nx-cloud-tasks-runner-shell')
        .nxCloudTasksRunnerShell;
    }
    throw e;
  }
}

export function getRunner(
  nxArgs: NxArgs,
  nxJson: NxJsonConfiguration
): {
  tasksRunner: TasksRunner;
  runnerOptions: any;
} {
  let runner = nxArgs.runner;
  runner = runner || 'default';

  if (runner !== 'default' && !nxJson.tasksRunnerOptions?.[runner]) {
    throw new Error(`Could not find runner configuration for ${runner}`);
  }

  const modulePath: string = getTasksRunnerPath(runner, nxJson);

  try {
    const tasksRunner = loadTasksRunner(modulePath);

    return {
      tasksRunner,
      runnerOptions: getRunnerOptions(
        runner,
        nxJson,
        nxArgs,
        modulePath === 'nx-cloud'
      ),
    };
  } catch {
    throw new Error(`Could not find runner configuration for ${runner}`);
  }
}

function getTasksRunnerPath(
  runner: string,
  nxJson: NxJsonConfiguration<string[] | '*'>
) {
  let modulePath: string = nxJson.tasksRunnerOptions?.[runner]?.runner;

  if (modulePath) {
    if (isRelativePath(modulePath)) {
      return join(workspaceRoot, modulePath);
    }
    return modulePath;
  }

  const isCloudRunner =
    // No tasksRunnerOptions for given --runner
    nxJson.nxCloudAccessToken ||
    // No runner prop in tasks runner options, check if access token is set.
    nxJson.tasksRunnerOptions?.[runner]?.options?.accessToken ||
    // Cloud access token specified in env var.
    process.env.NX_CLOUD_ACCESS_TOKEN ||
    // Nx Cloud Id specified in nxJson
    nxJson.nxCloudId;

  return isCloudRunner ? 'nx-cloud' : require.resolve('./default-tasks-runner');
}

export function getRunnerOptions(
  runner: string,
  nxJson: NxJsonConfiguration<string[] | '*'>,
  nxArgs: NxArgs,
  isCloudDefault: boolean
): any {
  const defaultCacheableOperations = [];

  for (const key in nxJson.targetDefaults) {
    if (nxJson.targetDefaults[key].cache) {
      defaultCacheableOperations.push(key);
    }
  }

  const result = {
    ...nxJson.tasksRunnerOptions?.[runner]?.options,
    ...nxArgs,
  };

  // NOTE: we don't pull from env here because the cloud package
  // supports it within nx-cloud's implementation. We could
  // normalize it here, and that may make more sense, but
  // leaving it as is for now.
  if (nxJson.nxCloudAccessToken && isCloudDefault) {
    result.accessToken ??= nxJson.nxCloudAccessToken;
  }

  if (nxJson.nxCloudId && isCloudDefault) {
    result.nxCloudId ??= nxJson.nxCloudId;
  }

  if (nxJson.nxCloudUrl && isCloudDefault) {
    result.url ??= nxJson.nxCloudUrl;
  }

  if (nxJson.nxCloudEncryptionKey && isCloudDefault) {
    result.encryptionKey ??= nxJson.nxCloudEncryptionKey;
  }

  if (nxJson.parallel) {
    result.parallel ??= nxJson.parallel;
  }

  if (nxJson.cacheDirectory) {
    result.cacheDirectory ??= nxJson.cacheDirectory;
  }

  if (defaultCacheableOperations.length) {
    result.cacheableOperations ??= [];
    result.cacheableOperations = result.cacheableOperations.concat(
      defaultCacheableOperations
    );
  }

  if (nxJson.useDaemonProcess !== undefined) {
    result.useDaemonProcess ??= nxJson.useDaemonProcess;
  }

  return result;
}
