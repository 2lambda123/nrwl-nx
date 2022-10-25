import 'dotenv/config';
import { runCLI } from 'jest';
import { readConfig, readConfigs } from 'jest-config';
import { utils as jestReporterUtils } from '@jest/reporters';
import { addResult, makeEmptyAggregatedTestResult } from '@jest/test-result';
import * as path from 'path';
import { join } from 'path';
import { JestExecutorOptions } from './schema';
import { Config } from '@jest/types';
import {
  ExecutorContext,
  stripIndents,
  TaskGraph,
  workspaceRoot,
} from '@nrwl/devkit';
import { getSummary } from './summary';
import { readFileSync } from 'fs';

process.env.NODE_ENV ??= 'test';

export async function jestExecutor(
  options: JestExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const config = await jestConfigParser(options, context);

  const { results } = await runCLI(config, [options.jestConfig]);

  return { success: results.success };
}

function getExtraArgs(
  options: JestExecutorOptions,
  schema: { properties: Record<string, any> }
) {
  const extraArgs = {};
  for (const key of Object.keys(options)) {
    if (!schema.properties[key]) {
      extraArgs[key] = options[key];
    }
  }

  return extraArgs;
}

export async function jestConfigParser(
  options: JestExecutorOptions,
  context: ExecutorContext,
  multiProjects = false
): Promise<Config.Argv> {
  let jestConfig:
    | {
        transform: any;
        globals: any;
        setupFilesAfterEnv: any;
      }
    | undefined;

  // support passing extra args to jest cli supporting 3rd party plugins
  // like 'jest-runner-groups' --group arg
  const schema = await import('./schema.json');
  const extraArgs = getExtraArgs(options, schema);

  const config: Config.Argv = {
    ...extraArgs,
    $0: undefined,
    _: [],
    config: options.config,
    coverage: options.codeCoverage,
    bail: options.bail,
    ci: options.ci,
    color: options.color,
    detectOpenHandles: options.detectOpenHandles,
    logHeapUsage: options.logHeapUsage,
    detectLeaks: options.detectLeaks,
    json: options.json,
    maxWorkers: options.maxWorkers,
    onlyChanged: options.onlyChanged,
    changedSince: options.changedSince,
    outputFile: options.outputFile,
    passWithNoTests: options.passWithNoTests,
    runInBand: options.runInBand,
    showConfig: options.showConfig,
    silent: options.silent,
    testLocationInResults: options.testLocationInResults,
    testNamePattern: options.testNamePattern,
    testPathPattern: options.testPathPattern,
    testPathIgnorePatterns: options.testPathIgnorePatterns,
    testTimeout: options.testTimeout,
    colors: options.colors,
    verbose: options.verbose,
    testResultsProcessor: options.testResultsProcessor,
    updateSnapshot: options.updateSnapshot,
    useStderr: options.useStderr,
    watch: options.watch,
    watchAll: options.watchAll,
  };

  if (!multiProjects) {
    options.jestConfig = path.resolve(context.root, options.jestConfig);

    jestConfig = (await readConfig(config, options.jestConfig)).projectConfig;
  }

  // for backwards compatibility
  if (options.setupFile && !multiProjects) {
    const setupFilesAfterEnvSet = new Set([
      ...(jestConfig.setupFilesAfterEnv ?? []),
      path.resolve(context.root, options.setupFile),
    ]);
    config.setupFilesAfterEnv = Array.from(setupFilesAfterEnvSet);
  }

  if (options.testFile) {
    config._.push(options.testFile);
  }

  if (options.findRelatedTests) {
    const parsedTests = options.findRelatedTests
      .split(',')
      .map((s) => s.trim());
    config._.push(...parsedTests);
    config.findRelatedTests = true;
  }

  if (options.coverageDirectory) {
    config.coverageDirectory = path.join(
      context.root,
      options.coverageDirectory
    );
  }

  if (options.clearCache) {
    config.clearCache = true;
  }

  if (options.reporters && options.reporters.length > 0) {
    config.reporters = options.reporters;
  }

  if (
    Array.isArray(options.coverageReporters) &&
    options.coverageReporters.length > 0
  ) {
    config.coverageReporters = options.coverageReporters;
  }

  return config;
}

export default jestExecutor;

export async function batchJest(
  taskGraph: TaskGraph,
  inputs: Record<string, JestExecutorOptions>,
  overrides: JestExecutorOptions,
  context: ExecutorContext
): Promise<Record<string, { success: boolean; terminalOutput: string }>> {
  let configPaths: string[] = [];
  let selectedProjects: string[] = [];
  for (const task of taskGraph.roots) {
    let configPath = path.resolve(context.root, inputs[task].jestConfig);
    configPaths.push(configPath);

    /* The display name in the jest.config.js is the correct project name jest
     * uses to determine projects. It is usually the same as the Nx projectName
     * but it can be changed. The safest method is to extract the displayName
     * from the config file, but skip the project if it does not exist. */
    const displayNameValueRegex = new RegExp(
      /(['"]+.*['"])(?<=displayName+.*)/,
      'g'
    );
    const fileContents = readFileSync(configPath, { encoding: 'utf-8' });
    if (!displayNameValueRegex.test(fileContents)) {
      console.warn(stripIndents`Could not find "displayName" in ${configPath}. 
      Please add a "displayName" to the Jest Config File.
      Skipping this project (${task.split(':')[0]})...`);
      continue;
    }

    const displayName = fileContents
      .match(displayNameValueRegex)
      .map((value) => value.substring(1, value.length - 1))[0];
    selectedProjects.push(displayName);
  }

  const parsedConfigs = await jestConfigParser(overrides, context, true);

  const { globalConfig, results } = await runCLI(
    {
      ...parsedConfigs,
      selectProjects: selectedProjects,
    },
    [workspaceRoot]
  );

  const { configs } = await readConfigs({ $0: undefined, _: [] }, configPaths);
  const jestTaskExecutionResults: Record<
    string,
    { success: boolean; terminalOutput: string }
  > = {};

  for (let i = 0; i < taskGraph.roots.length; i++) {
    let root = taskGraph.roots[i];
    const aggregatedResults = makeEmptyAggregatedTestResult();
    aggregatedResults.startTime = results.startTime;

    const projectRoot = join(context.root, taskGraph.tasks[root].projectRoot);

    let resultOutput = '';
    for (const testResult of results.testResults) {
      if (testResult.testFilePath.startsWith(projectRoot)) {
        addResult(aggregatedResults, testResult);
        resultOutput +=
          '\n\r' +
          jestReporterUtils.getResultHeader(
            testResult,
            globalConfig as any,
            configs[i] as any
          );
      }
    }
    aggregatedResults.numTotalTestSuites = aggregatedResults.testResults.length;

    jestTaskExecutionResults[root] = {
      success: aggregatedResults.numFailedTests === 0,
      terminalOutput: resultOutput + '\n\r\n\r' + getSummary(aggregatedResults),
    };
  }

  return jestTaskExecutionResults;
}
