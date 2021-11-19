import { Workspaces } from '@nrwl/tao/src/shared/workspace';
import type { ProjectGraph, Task, TaskGraph } from '@nrwl/devkit';
import { performance } from 'perf_hooks';
import { Hasher } from '../core/hasher/hasher';
import { ForkedProcessTaskRunner } from './forked-process-task-runner';
import { appRootPath } from '@nrwl/tao/src/utils/app-root';
import { TaskCacheStatus } from '../utilities/output';
import { Cache } from './cache';
import { DefaultTasksRunnerOptions } from './default-tasks-runner';
import { TaskStatus } from './tasks-runner';
import {
  calculateReverseDeps,
  getExecutorForTask,
  getOutputs,
  removeTasksFromTaskGraph,
} from './utils';
import { Batch, TasksSchedule } from './tasks-schedule';

export class TaskOrchestrator {
  private cache = new Cache(this.options);
  private workspace = new Workspaces(appRootPath);
  private forkedProcessTaskRunner = new ForkedProcessTaskRunner(this.options);
  private tasksSchedule = new TasksSchedule(
    this.hasher,
    this.taskGraph,
    this.workspace,
    this.options
  );

  // region internal state
  private reverseTaskDeps = calculateReverseDeps(this.taskGraph);
  private completedTasks: {
    [id: string]: TaskStatus;
  } = {};
  private waitingForTasks: Function[] = [];

  // endregion internal state

  constructor(
    private readonly hasher: Hasher,
    private readonly initiatingProject: string | undefined,
    private readonly projectGraph: ProjectGraph,
    private readonly taskGraph: TaskGraph,
    private readonly options: DefaultTasksRunnerOptions
  ) {}

  async run() {
    // initial scheduling
    await this.tasksSchedule.scheduleNextTasks();
    performance.mark('task-execution-begins');

    const threads = [];

    // initial seeding of the queue
    for (let i = 0; i < this.options.parallel; ++i) {
      threads.push(this.executeNextBatchOfTasksUsingTaskSchedule());
    }
    await Promise.all(threads);

    performance.mark('task-execution-ends');
    performance.measure(
      'command-execution',
      'task-execution-begins',
      'task-execution-ends'
    );
    this.cache.removeOldCacheRecords();

    return this.completedTasks;
  }

  private async executeNextBatchOfTasksUsingTaskSchedule() {
    // completed all the tasks
    if (!this.tasksSchedule.hasTasks()) {
      return null;
    }

    const doNotSkipCache =
      this.options.skipNxCache === false ||
      this.options.skipNxCache === undefined;

    const batch = this.tasksSchedule.nextBatch();
    if (batch) {
      await this.applyFromCacheOrRunBatch(doNotSkipCache, batch);

      return this.executeNextBatchOfTasksUsingTaskSchedule();
    }

    const task = this.tasksSchedule.nextTask();
    if (task) {
      await this.applyFromCacheOrRunTask(doNotSkipCache, task);

      return this.executeNextBatchOfTasksUsingTaskSchedule();
    }

    // block until some other task completes, then try again
    return new Promise((res) => this.waitingForTasks.push(res)).then(() =>
      this.executeNextBatchOfTasksUsingTaskSchedule()
    );
  }

  // region Applying Cache
  private async applyCachedResults(
    tasks: Task[]
  ): Promise<{ task: Task; status: 'cache' }[]> {
    const cacheableTasks = tasks.filter((t) => this.isCacheableTask(t));
    const res = await Promise.all(
      cacheableTasks.map((t) => this.applyCachedResult(t))
    );
    return res
      .filter((r) => r !== null)
      .map((task) => ({ task, status: 'cache' }));
  }

  private async applyCachedResult(task: Task) {
    const cachedResult = await this.cache.get(task);
    if (!cachedResult || cachedResult.code !== 0) return null;

    const outputs = getOutputs(this.projectGraph.nodes, task);
    const shouldCopyOutputsFromCache =
      !!outputs.length &&
      (await this.cache.shouldCopyOutputsFromCache(
        { task, cachedResult },
        outputs
      ));
    if (shouldCopyOutputsFromCache) {
      await this.cache.copyFilesFromCache(task.hash, cachedResult, outputs);
    }
    this.options.lifeCycle.printTaskTerminalOutput(
      task,
      shouldCopyOutputsFromCache
        ? TaskCacheStatus.RetrievedFromCache
        : TaskCacheStatus.MatchedExistingOutput,
      cachedResult.terminalOutput
    );
    return task;
  }

  // endregion Applying Cache

  // region Batch
  private async applyFromCacheOrRunBatch(
    doNotSkipCache: boolean,
    batch: Batch
  ) {
    const taskEntries = Object.entries(batch.taskGraph.tasks);
    const tasks = taskEntries.map(([, task]) => task);

    await this.preRunSteps(tasks);

    let results: {
      task: Task;
      status: TaskStatus;
      terminalOutput?: string;
    }[] = doNotSkipCache ? await this.applyCachedResults(tasks) : [];

    // Run tasks that were not cached
    if (results.length !== taskEntries.length) {
      const unrunTaskGraph = removeTasksFromTaskGraph(
        batch.taskGraph,
        results.map(({ task }) => task.id)
      );

      // cache prep
      for (const task of Object.values(unrunTaskGraph.tasks)) {
        const taskOutputs = getOutputs(this.projectGraph.nodes, task);
        await this.cache.removeRecordedOutputsHashes(taskOutputs);
      }

      const batchResults = await this.runBatch({
        executorName: batch.executorName,
        taskGraph: unrunTaskGraph,
      });

      results.push(...batchResults);
    }

    await this.postRunSteps(results);

    const tasksCompleted = taskEntries.filter(
      ([taskId]) => this.completedTasks[taskId]
    );

    // Batch is still not done, run it again
    if (tasksCompleted.length !== taskEntries.length) {
      await this.applyFromCacheOrRunBatch(doNotSkipCache, {
        executorName: batch.executorName,
        taskGraph: removeTasksFromTaskGraph(
          batch.taskGraph,
          tasksCompleted.map(([taskId]) => taskId)
        ),
      });
    }
  }

  private async runBatch(batch: Batch) {
    try {
      const results = await this.forkedProcessTaskRunner.forkProcessForBatch(
        batch
      );
      const batchResultEntries = Object.entries(results);
      return batchResultEntries.map(([taskId, result]) => ({
        task: this.taskGraph.tasks[taskId],
        status: (result.success ? 'success' : 'failure') as TaskStatus,
        terminalOutput: result.terminalOutput,
      }));
    } catch (e) {
      return batch.taskGraph.roots.map((rootTaskId) => ({
        task: this.taskGraph.tasks[rootTaskId],
        status: 'failure' as TaskStatus,
      }));
    }
  }

  // endregion Batch

  // region Single Task
  private async applyFromCacheOrRunTask(doNotSkipCache: boolean, task: Task) {
    await this.preRunSteps([task]);

    // hash the task here
    let results: {
      task: Task;
      status: TaskStatus;
      terminalOutput?: string;
    }[] = doNotSkipCache ? await this.applyCachedResults([task]) : [];

    // the task wasn't cached
    if (results.length === 0) {
      // cache prep
      const taskOutputs = getOutputs(this.projectGraph.nodes, task);
      await this.cache.removeRecordedOutputsHashes(taskOutputs);

      const { code, terminalOutput } = await this.runTaskInForkedProcess(task);

      results.push({
        task,
        status: code === 0 ? 'success' : 'failure',
        terminalOutput,
      });
    }
    await this.postRunSteps(results);
  }

  private async runTaskInForkedProcess(task: Task) {
    try {
      // obtain metadata
      const outputPath = this.cache.temporaryOutputPath(task);
      const forwardOutput = this.shouldForwardOutput(task);
      const pipeOutput = this.pipeOutputCapture(task);

      // execution
      const { code, terminalOutput } = pipeOutput
        ? await this.forkedProcessTaskRunner.forkProcessPipeOutputCapture(
            task,
            {
              forwardOutput,
            }
          )
        : await this.forkedProcessTaskRunner.forkProcessDirectOutputCapture(
            task,
            {
              temporaryOutputPath: outputPath,
              forwardOutput,
            }
          );

      return {
        code,
        terminalOutput,
      };
    } catch (e) {
      return {
        code: 1,
      };
    }
  }

  // endregion Single Task

  // region Lifecycle
  private async preRunSteps(tasks: Task[]) {
    this.options.lifeCycle.startTasks(tasks);
  }

  private async postRunSteps(
    results: {
      task: Task;
      status: TaskStatus;
      terminalOutput?: string;
    }[]
  ) {
    // cache the results
    await Promise.all(
      results
        .filter(({ status }) => status !== 'cache' && status !== 'skipped')
        .map((result) => ({
          ...result,
          code:
            result.status === 'cache' || result.status === 'success' ? 0 : 1,
          outputs: getOutputs(this.projectGraph.nodes, result.task),
        }))
        .filter(({ task, code }) => this.shouldCacheTaskResult(task, code))
        .filter(({ terminalOutput, outputs }) => terminalOutput || outputs)
        .map(async ({ task, code, terminalOutput, outputs }) => {
          await this.cache.put(task, terminalOutput, outputs, code);
        })
    );

    this.options.lifeCycle.endTasks(
      results.map((result) => {
        const code =
          result.status === 'success' || result.status === 'cache' ? 0 : 1;
        return {
          task: result.task,
          status: result.status,
          code,
        };
      })
    );

    this.complete(
      results.map(({ task, status }) => {
        return {
          taskId: task.id,
          status,
        };
      })
    );

    await this.tasksSchedule.scheduleNextTasks();
  }

  private complete(
    taskResults: {
      taskId: string;
      status: TaskStatus;
    }[]
  ) {
    this.tasksSchedule.complete(taskResults.map(({ taskId }) => taskId));

    for (const { taskId, status } of taskResults) {
      if (this.completedTasks[taskId] === undefined) {
        this.completedTasks[taskId] = status;
      }

      if (status === 'failure' || status === 'skipped') {
        this.complete(
          this.reverseTaskDeps[taskId].map((depTaskId) => ({
            taskId: depTaskId,
            status: 'skipped',
          }))
        );
      }
    }
    this.waitingForTasks // release blocked threads
      .forEach((f) => f(null));
    this.waitingForTasks.length = 0;
  }

  //endregion Lifecycle

  // region utils

  private pipeOutputCapture(task: Task) {
    try {
      return (
        getExecutorForTask(task, this.workspace).schema.outputCapture === 'pipe'
      );
    } catch (e) {
      return false;
    }
  }

  private shouldCacheTaskResult(task: Task, code: number) {
    return (
      this.isCacheableTask(task) &&
      (process.env.NX_CACHE_FAILURES == 'true' ? true : code === 0)
    );
  }

  private shouldForwardOutput(task: Task) {
    if (!this.isCacheableTask(task)) return true;
    if (process.env.NX_FORWARD_OUTPUT === 'true') return true;
    if (task.target.project === this.initiatingProject) return true;
    return false;
  }

  private isCacheableTask(task: Task) {
    const cacheable =
      this.options.cacheableOperations || this.options.cacheableTargets;
    return (
      cacheable &&
      cacheable.indexOf(task.target.target) > -1 &&
      !this.longRunningTask(task)
    );
  }

  private longRunningTask(task: Task) {
    return !!task.overrides['watch'];
  }

  // endregion utils
}
