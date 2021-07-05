import * as chalk from 'chalk';
import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { copySync, removeSync } from 'fs-extra';
import * as path from 'path';
import * as yargsParser from 'yargs-parser';
import { appRootPath } from '@nrwl/tao/src/utils/app-root';
import { fileExists } from '../utilities/fileutils';
import { output } from '../utilities/output';
import type { CompilerOptions } from 'typescript';
import { Workspaces } from '@nrwl/tao/src/shared/workspace';
import {
  logger,
  normalizePath,
  getPackageManagerCommand,
  detectPackageManager,
  readJsonFile,
  writeJsonFile,
} from '@nrwl/devkit';
import { generate } from '@nrwl/tao/src/commands/generate';

const rootDirectory = appRootPath;
const toolsDir = path.join(rootDirectory, 'tools');
const generatorsDir = path.join(toolsDir, 'generators');
const toolsTsConfigPath = path.join(toolsDir, 'tsconfig.tools.json');

type TsConfig = {
  extends: string;
  compilerOptions: CompilerOptions;
  files?: string[];
  include?: string[];
  exclude?: string[];
  references?: Array<{ path: string }>;
};

export async function workspaceGenerators(args: string[]) {
  const outDir = compileTools();
  const parsedArgs = parseOptions(args, outDir);

  const collectionFile = path.join(outDir, 'workspace-generators.json');
  if (parsedArgs.listGenerators) {
    return listGenerators(collectionFile);
  }
  const generatorName = args[0];
  const ws = new Workspaces(rootDirectory);
  args[0] = collectionFile + ':' + generatorName;
  if (ws.isNxGenerator(collectionFile, generatorName)) {
    process.exitCode = await generate(
      process.cwd(),
      rootDirectory,
      args,
      parsedArgs.verbose
    );
  } else {
    const logger = require('@angular-devkit/core/node').createConsoleLogger(
      parsedArgs.verbose,
      process.stdout,
      process.stderr
    );
    try {
      const workflow = createWorkflow(ws, parsedArgs.dryRun);
      await executeAngularDevkitSchematic(
        generatorName,
        parsedArgs,
        workflow,
        outDir,
        logger
      );
    } catch {
      process.exit(1);
    }
  }
}

// compile tools
function compileTools() {
  const toolsOutDir = getToolsOutDir();
  removeSync(toolsOutDir);
  compileToolsDir(toolsOutDir);

  const generatorsOutDir = path.join(toolsOutDir, 'generators');
  const collectionData = constructCollection();
  writeJsonFile(
    path.join(generatorsOutDir, 'workspace-generators.json'),
    collectionData
  );
  return generatorsOutDir;
}

function getToolsOutDir() {
  return path.resolve(toolsDir, toolsTsConfig().compilerOptions.outDir);
}

function compileToolsDir(outDir: string) {
  copySync(generatorsDir, path.join(outDir, 'generators'));

  const tmpTsConfigPath = createTmpTsConfig(toolsTsConfigPath, {
    include: [path.join(generatorsDir, '**/*.ts')],
  });

  const pmc = getPackageManagerCommand();
  const tsc = `${pmc.exec} tsc`;
  try {
    execSync(`${tsc} -p ${tmpTsConfigPath}`, {
      stdio: 'inherit',
      cwd: rootDirectory,
    });
  } catch {
    process.exit(1);
  }
}

function constructCollection() {
  const generators = {};
  readdirSync(generatorsDir).forEach((c) => {
    const childDir = path.join(generatorsDir, c);
    if (existsSync(path.join(childDir, 'schema.json'))) {
      generators[c] = {
        factory: `./${c}`,
        schema: `./${normalizePath(path.join(c, 'schema.json'))}`,
        description: `Schematic ${c}`,
      };
    }
  });
  return {
    name: 'workspace-generators',
    version: '1.0',
    generators,
    schematics: generators,
  };
}

function toolsTsConfig(): TsConfig {
  return readJsonFile<TsConfig>(toolsTsConfigPath);
}

function createWorkflow(workspace: Workspaces, dryRun: boolean) {
  const { virtualFs, schema } = require('@angular-devkit/core');
  const { NodeJsSyncHost } = require('@angular-devkit/core/node');
  const { formats } = require('@angular-devkit/schematics');
  const { NodeWorkflow } = require('@angular-devkit/schematics/tools');
  const root = normalizePath(rootDirectory);
  const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), root);
  const workflow = new NodeWorkflow(host, {
    packageManager: detectPackageManager(),
    dryRun,
    registry: new schema.CoreSchemaRegistry(formats.standardFormats),
    resolvePaths: [process.cwd(), rootDirectory],
  });
  workflow.registry.addSmartDefaultProvider('projectName', () =>
    workspace.calculateDefaultProjectName(
      process.cwd(),
      workspace.readWorkspaceConfiguration()
    )
  );
  return workflow;
}

function listGenerators(collectionFile: string) {
  try {
    const bodyLines: string[] = [];

    const collection = readJsonFile(collectionFile);

    bodyLines.push(chalk.bold(chalk.green('WORKSPACE GENERATORS')));
    bodyLines.push('');
    bodyLines.push(
      ...Object.entries(collection.generators).map(
        ([schematicName, schematicMeta]: [string, any]) => {
          return `${chalk.bold(schematicName)} : ${schematicMeta.description}`;
        }
      )
    );
    bodyLines.push('');

    output.log({
      title: '',
      bodyLines,
    });
  } catch (error) {
    logger.fatal(error.message);
    return 1;
  }
  return 0;
}

function createPromptProvider() {
  interface Prompt {
    name: string;
    type: 'input' | 'select' | 'multiselect' | 'confirm' | 'numeral';
    message: string;
    initial?: any;
    choices?: (string | { name: string; message: string })[];
    validate?: (value: string) => boolean | string;
  }

  return (definitions: Array<any>) => {
    const questions: Prompt[] = definitions.map((definition) => {
      const question: Prompt = {
        name: definition.id,
        message: definition.message,
      } as any;

      if (definition.default) {
        question.initial = definition.default;
      }

      const validator = definition.validator;
      if (validator) {
        question.validate = (input) => validator(input);
      }

      switch (definition.type) {
        case 'string':
        case 'input':
          return { ...question, type: 'input' };
        case 'boolean':
        case 'confirmation':
        case 'confirm':
          return { ...question, type: 'confirm' };
        case 'number':
        case 'numeral':
          return { ...question, type: 'numeral' };
        case 'list':
          return {
            ...question,
            type: !!definition.multiselect ? 'multiselect' : 'select',
            choices:
              definition.items &&
              definition.items.map((item) => {
                if (typeof item == 'string') {
                  return item;
                } else {
                  return {
                    message: item.label,
                    name: item.value,
                  };
                }
              }),
          };
        default:
          return { ...question, type: definition.type };
      }
    });

    return require('enquirer').prompt(questions);
  };
}

// execute schematic
async function executeAngularDevkitSchematic(
  schematicName: string,
  options: { [p: string]: any },
  workflow: any,
  outDir: string,
  logger: any
) {
  const { schema } = require('@angular-devkit/core');
  const {
    validateOptionsWithSchema,
  } = require('@angular-devkit/schematics/tools');
  const {
    UnsuccessfulWorkflowExecution,
  } = require('@angular-devkit/schematics');

  output.logSingleLine(
    `${output.colors.gray(`Executing your local schematic`)}: ${schematicName}`
  );

  let nothingDone = true;
  let loggingQueue: string[] = [];
  let hasError = false;

  workflow.reporter.subscribe((event: any) => {
    nothingDone = false;
    const eventPath = event.path.startsWith('/')
      ? event.path.substr(1)
      : event.path;
    switch (event.kind) {
      case 'error':
        hasError = true;

        const desc =
          event.description == 'alreadyExist'
            ? 'already exists'
            : 'does not exist.';
        logger.warn(`ERROR! ${eventPath} ${desc}.`);
        break;
      case 'update':
        loggingQueue.push(
          `${chalk.white('UPDATE')} ${eventPath} (${
            event.content.length
          } bytes)`
        );
        break;
      case 'create':
        loggingQueue.push(
          `${chalk.green('CREATE')} ${eventPath} (${
            event.content.length
          } bytes)`
        );
        break;
      case 'delete':
        loggingQueue.push(`${chalk.yellow('DELETE')} ${eventPath}`);
        break;
      case 'rename':
        const eventToPath = event.to.startsWith('/')
          ? event.to.substr(1)
          : event.to;
        loggingQueue.push(
          `${chalk.blue('RENAME')} ${eventPath} => ${eventToPath}`
        );
        break;
    }
  });

  workflow.lifeCycle.subscribe((event) => {
    if (event.kind === 'workflow-end' || event.kind === 'post-tasks-start') {
      if (!hasError) {
        loggingQueue.forEach((log) => logger.info(log));
      }

      loggingQueue = [];
      hasError = false;
    }
  });

  const args = options._.slice(1);
  workflow.registry.addSmartDefaultProvider('argv', (schema: any) => {
    if ('index' in schema) {
      return args[+schema.index];
    } else {
      return args;
    }
  });
  delete options._;

  if (options.defaults) {
    workflow.registry.addPreTransform(schema.transforms.addUndefinedDefaults);
  } else {
    workflow.registry.addPostTransform(schema.transforms.addUndefinedDefaults);
  }

  workflow.engineHost.registerOptionsTransform(
    validateOptionsWithSchema(workflow.registry)
  );

  // Add support for interactive prompts
  if (options.interactive) {
    workflow.registry.usePromptProvider(createPromptProvider());
  }

  try {
    await workflow
      .execute({
        collection: path.join(outDir, 'workspace-generators.json'),
        schematic: schematicName,
        options,
        logger,
      })
      .toPromise();

    if (nothingDone) {
      logger.info('Nothing to be done.');
    }

    if (options.dryRun) {
      logger.warn(`\nNOTE: The "dryRun" flag means no changes were made.`);
    }
  } catch (err) {
    if (err instanceof UnsuccessfulWorkflowExecution) {
      // "See above" because we already printed the error.
      logger.fatal('The Schematic workflow failed. See above.');
    } else {
      logger.fatal(err.stack || err.message);
    }
    throw err;
  }
}

function parseOptions(args: string[], outDir: string): { [k: string]: any } {
  const schemaPath = path.join(outDir, args[0], 'schema.json');
  let booleanProps = [];
  if (fileExists(schemaPath)) {
    const { properties } = readJsonFile(
      path.join(outDir, args[0], 'schema.json')
    );
    if (properties) {
      booleanProps = Object.keys(properties).filter(
        (key) => properties[key].type === 'boolean'
      );
    }
  }
  return yargsParser(args, {
    boolean: ['dryRun', 'listGenerators', 'interactive', ...booleanProps],
    alias: {
      dryRun: ['d'],
      listSchematics: ['l'],
    },
    default: {
      interactive: true,
    },
  });
}

function createTmpTsConfig(
  tsconfigPath: string,
  updateConfig: Partial<TsConfig>
) {
  const tmpTsConfigPath = path.join(
    path.dirname(tsconfigPath),
    'tsconfig.generated.json'
  );
  const originalTSConfig = readJsonFile<TsConfig>(tsconfigPath);
  const generatedTSConfig: TsConfig = {
    ...originalTSConfig,
    ...updateConfig,
  };
  process.on('exit', () => cleanupTmpTsConfigFile(tmpTsConfigPath));
  writeJsonFile(tmpTsConfigPath, generatedTSConfig);

  return tmpTsConfigPath;
}

function cleanupTmpTsConfigFile(tmpTsConfigPath: string) {
  if (tmpTsConfigPath) {
    removeSync(tmpTsConfigPath);
  }
}
