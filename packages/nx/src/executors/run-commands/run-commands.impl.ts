import { exec } from 'child_process';
import * as path from 'path';
import * as yargsParser from 'yargs-parser';
import { env as appendLocalEnv } from 'npm-run-path';
import { ExecutorContext } from '../../config/misc-interfaces';
import * as chalk from 'chalk';

export const LARGE_BUFFER = 1024 * 1000000;

async function loadEnvVars(path?: string) {
  if (path) {
    const result = (await import('dotenv')).config({ path });
    if (result.error) {
      throw result.error;
    }
  } else {
    try {
      (await import('dotenv')).config();
    } catch {}
  }
}

export type Json = { [k: string]: any };

export interface RunCommandsOptions extends Json {
  command?: string;
  commands?: (
    | {
        command: string;
        forwardAllArgs?: boolean;
        /**
         * description was added to allow users to document their commands inline,
         * it is not intended to be used as part of the execution of the command.
         */
        description?: string;
        prefix?: string;
        color?: string;
        bgColor?: string;
      }
    | string
  )[];
  color?: boolean;
  parallel?: boolean;
  readyWhen?: string | string[];
  cwd?: string;
  args?: string;
  envFile?: string;
  __unparsed__: string[];
}

const propKeys = [
  'command',
  'commands',
  'color',
  'parallel',
  'readyWhen',
  'cwd',
  'args',
  'envFile',
];

export interface NormalizedRunCommandsOptions extends RunCommandsOptions {
  commands: {
    command: string;
    forwardAllArgs?: boolean;
  }[];
  parsedArgs: { [k: string]: any };
  readyWhen: string[];
}

export default async function (
  options: RunCommandsOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  await loadEnvVars(options.envFile);
  const normalized = normalizeOptions(options);

  if (normalized.readyWhen.length > 0 && !normalized.parallel) {
    throw new Error(
      'ERROR: Bad executor config for run-commands - "readyWhen" can only be used when "parallel=true".'
    );
  }

  if (
    options.commands.find((c: any) => c.prefix || c.color || c.bgColor) &&
    !options.parallel
  ) {
    throw new Error(
      'ERROR: Bad executor config for run-commands - "prefix", "color" and "bgColor" can only be set when "parallel=true".'
    );
  }

  try {
    const success = options.parallel
      ? await runInParallel(normalized, context)
      : await runSerially(normalized, context);
    return { success };
  } catch (e) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      console.error(e);
    }
    throw new Error(
      `ERROR: Something went wrong in run-commands - ${e.message}`
    );
  }
}

async function runInParallel(
  options: NormalizedRunCommandsOptions,
  context: ExecutorContext
) {
  // initialize status for each "readyWhen" string to match
  const readyWhenStatus = options.readyWhen.map((stringToMatch) => ({
    stringToMatch,
    found: false,
  }));

  const procs = options.commands.map((c) =>
    createProcess(
      c,
      readyWhenStatus,
      options.color,
      calculateCwd(options.cwd, context)
    ).then((result) => ({
      result,
      command: c.command,
    }))
  );

  if (options.readyWhen.length > 0) {
    const r = await Promise.race(procs);
    if (!r.result) {
      process.stderr.write(
        `Warning: run-commands command "${r.command}" exited with non-zero status code`
      );
      return false;
    } else {
      return true;
    }
  } else {
    const r = await Promise.all(procs);
    const failed = r.filter((v) => !v.result);
    if (failed.length > 0) {
      failed.forEach((f) => {
        process.stderr.write(
          `Warning: run-commands command "${f.command}" exited with non-zero status code`
        );
      });
      return false;
    } else {
      return true;
    }
  }
}

function normalizeOptions(
  options: RunCommandsOptions
): NormalizedRunCommandsOptions {
  options.parsedArgs = parseArgs(options);

  if (options.readyWhen && typeof options.readyWhen === 'string') {
    options.readyWhen = [options.readyWhen];
  } else {
    options.readyWhen = options.readyWhen ?? [];
  }

  if (options.command) {
    options.commands = [{ command: options.command }];
    options.parallel = options.readyWhen?.length > 0;
  } else {
    options.commands = options.commands.map((c) =>
      typeof c === 'string' ? { command: c } : c
    );
  }
  (options as NormalizedRunCommandsOptions).commands.forEach((c) => {
    c.command = interpolateArgsIntoCommand(
      c.command,
      options as NormalizedRunCommandsOptions,
      c.forwardAllArgs ?? true
    );
  });
  return options as any;
}

async function runSerially(
  options: NormalizedRunCommandsOptions,
  context: ExecutorContext
) {
  for (const c of options.commands) {
    const success = await createProcess(
      c,
      [],
      options.color,
      calculateCwd(options.cwd, context)
    );
    if (!success) {
      process.stderr.write(
        `Warning: run-commands command "${c.command}" exited with non-zero status code`
      );
      return false;
    }
  }

  return true;
}

function createProcess(
  commandConfig: {
    command: string;
    color?: string;
    bgColor?: string;
    prefix?: string;
  },
  readyWhenStatus: { stringToMatch: string; found: boolean }[],
  color: boolean,
  cwd: string
): Promise<boolean> {
  return new Promise((res) => {
    const childProcess = exec(commandConfig.command, {
      maxBuffer: LARGE_BUFFER,
      env: processEnv(color),
      cwd,
    });
    /**
     * Ensure the child process is killed when the parent exits
     */
    const processExitListener = (signal?: number | NodeJS.Signals) => () =>
      childProcess.kill(signal);

    process.on('exit', processExitListener);
    process.on('SIGTERM', processExitListener);
    process.on('SIGINT', processExitListener);
    process.on('SIGQUIT', processExitListener);

    const isReady = () =>
      readyWhenStatus.every((readyWhenElement) => readyWhenElement.found);

    childProcess.stdout.on('data', (data) => {
      process.stdout.write(addColorAndPrefix(data, commandConfig));
      for (const readyWhenElement of readyWhenStatus) {
        if (data.toString().indexOf(readyWhenElement.stringToMatch) > -1) {
          readyWhenElement.found = true;
          if (isReady()) {
            res(true);
          }
          break;
        }
      }
    });
    childProcess.stderr.on('data', (err) => {
      process.stderr.write(addColorAndPrefix(err, commandConfig));
      for (const readyWhenElement of readyWhenStatus) {
        if (err.toString().indexOf(readyWhenElement.stringToMatch) > -1) {
          readyWhenElement.found = true;
          if (isReady()) {
            res(true);
          }
          break;
        }
      }
    });
    childProcess.on('error', (err) => {
      console.log('error', err);
      process.stderr.write(addColorAndPrefix(err.toString(), commandConfig));
      res(false);
    });
    childProcess.on('exit', (code) => {
      if (isReady()) {
        res(code === 0);
      }
    });
  });
}

function addColorAndPrefix(
  out: string,
  config: {
    prefix?: string;
    color?: string;
    bgColor?: string;
  }
) {
  if (config.prefix) {
    out = out
      .split('\n')
      .map((l) =>
        l.trim().length > 0 ? `${chalk.bold(config.prefix)} ${l}` : l
      )
      .join('\n');
  }
  if (config.color && chalk[config.color]) {
    out = chalk[config.color](out);
  }
  if (config.bgColor && chalk[config.bgColor]) {
    out = chalk[config.bgColor](out);
  }
  return out;
}

function calculateCwd(
  cwd: string | undefined,
  context: ExecutorContext
): string {
  if (!cwd) return context.root;
  if (path.isAbsolute(cwd)) return cwd;
  return path.join(context.root, cwd);
}

function processEnv(color: boolean) {
  const env = {
    ...process.env,
    ...appendLocalEnv(),
  };

  if (color) {
    env.FORCE_COLOR = `${color}`;
  }
  return env;
}

export function interpolateArgsIntoCommand(
  command: string,
  opts: NormalizedRunCommandsOptions,
  forwardAllArgs: boolean
) {
  if (command.indexOf('{args.') > -1) {
    const regex = /{args\.([^}]+)}/g;
    return command.replace(regex, (_, group: string) => opts.parsedArgs[group]);
  } else if (forwardAllArgs) {
    return `${command}${
      opts.__unparsed__.length > 0 ? ' ' + opts.__unparsed__.join(' ') : ''
    }`;
  } else {
    return command;
  }
}

function parseArgs(options: RunCommandsOptions) {
  const args = options.args;
  if (!args) {
    const unknownOptionsTreatedAsArgs = Object.keys(options)
      .filter((p) => propKeys.indexOf(p) === -1)
      .reduce((m, c) => ((m[c] = options[c]), m), {});
    return unknownOptionsTreatedAsArgs;
  }
  return yargsParser(args.replace(/(^"|"$)/g, ''), {
    configuration: { 'camel-case-expansion': false },
  });
}
