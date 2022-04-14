import * as chalk from 'chalk';
import { EOL } from 'os';
import { isCI } from './is-ci';
import { TaskStatus } from '../tasks-runner/tasks-runner';

export interface CLIErrorMessageConfig {
  title: string;
  bodyLines?: string[];
  slug?: string;
}

export interface CLIWarnMessageConfig {
  title: string;
  bodyLines?: string[];
  slug?: string;
}

export interface CLINoteMessageConfig {
  title: string;
  bodyLines?: string[];
}

export interface CLISuccessMessageConfig {
  title: string;
  bodyLines?: string[];
}

/**
 * Automatically disable styling applied by chalk if CI=true
 */
const forceColor =
  process.env.FORCE_COLOR === '' || process.env.FORCE_COLOR === 'true';
if (isCI() && !forceColor) {
  (chalk as any).level = 0;
}

class CLIOutput {
  readonly X_PADDING = ' ';
  cliName = 'NX';
  formatCommand = (taskId: string) => `${chalk.dim('nx run')} ${taskId}`;

  /**
   * Longer dash character which forms more of a continuous line when place side to side
   * with itself, unlike the standard dash character
   */
  private get VERTICAL_SEPARATOR() {
    let divider = '';
    for (
      let i = 0;
      i < process.stdout.columns - this.X_PADDING.length * 2;
      i++
    ) {
      divider += '\u2014';
    }
    return divider;
  }

  /**
   * Expose some color and other utility functions so that other parts of the codebase that need
   * more fine-grained control of message bodies are still using a centralized
   * implementation.
   */
  colors = {
    gray: chalk.gray,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    white: chalk.white,
  };
  bold = chalk.bold;
  underline = chalk.underline;
  dim = chalk.dim;

  private writeToStdOut(str: string) {
    process.stdout.write(str);
  }

  private writeOutputTitle({
    color,
    title,
  }: {
    color: string;
    title: string;
  }): void {
    this.writeToStdOut(` ${this.applyNxPrefix(color, title)}${EOL}`);
  }

  private writeOptionalOutputBody(bodyLines?: string[]): void {
    if (!bodyLines) {
      return;
    }
    this.addNewline();
    bodyLines.forEach((bodyLine) => this.writeToStdOut(`   ${bodyLine}${EOL}`));
  }

  applyNxPrefix(color = 'cyan', text: string): string {
    let nxPrefix = '';
    if (chalk[color]) {
      nxPrefix = `${chalk[color]('>')} ${chalk.reset.inverse.bold[color](
        ` ${this.cliName} `
      )}`;
    } else {
      nxPrefix = `${chalk.keyword(color)(
        '>'
      )} ${chalk.reset.inverse.bold.keyword(color)(` ${this.cliName} `)}`;
    }
    return `${nxPrefix}  ${text}`;
  }

  addNewline() {
    this.writeToStdOut(EOL);
  }

  addVerticalSeparator(color = 'gray') {
    this.addNewline();
    this.addVerticalSeparatorWithoutNewLines(color);
    this.addNewline();
  }

  addVerticalSeparatorWithoutNewLines(color = 'gray') {
    this.writeToStdOut(
      `${this.X_PADDING}${chalk.dim[color](this.VERTICAL_SEPARATOR)}${EOL}`
    );
  }

  error({ title, slug, bodyLines }: CLIErrorMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'red',
      title: chalk.red(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    /**
     * Optional slug to be used in an Nx error message redirect URL
     */
    if (slug && typeof slug === 'string') {
      this.addNewline();
      this.writeToStdOut(
        `${chalk.grey(
          '  Learn more about this error: '
        )}https://errors.nx.dev/${slug}${EOL}`
      );
    }

    this.addNewline();
  }

  warn({ title, slug, bodyLines }: CLIWarnMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'yellow',
      title: chalk.yellow(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    /**
     * Optional slug to be used in an Nx warning message redirect URL
     */
    if (slug && typeof slug === 'string') {
      this.addNewline();
      this.writeToStdOut(
        `${chalk.grey(
          '  Learn more about this warning: '
        )}https://errors.nx.dev/${slug}\n`
      );
    }

    this.addNewline();
  }

  note({ title, bodyLines }: CLINoteMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'orange',
      title: chalk.keyword('orange')(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    this.addNewline();
  }

  success({ title, bodyLines }: CLISuccessMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'green',
      title: chalk.green(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    this.addNewline();
  }

  logSingleLine(message: string) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'gray',
      title: message,
    });

    this.addNewline();
  }

  logCommand(message: string, taskStatus?: TaskStatus) {
    this.addNewline();
    const commandOutput =
      chalk.dim('> ') + this.formatCommand(this.normalizeMessage(message));
    const commandOutputWithStatus = this.addTaskStatus(
      taskStatus,
      commandOutput
    );
    this.writeToStdOut(commandOutputWithStatus);
    this.addNewline();
  }

  private normalizeMessage(message: string) {
    if (message.startsWith('nx run ')) {
      return message.substring('nx run '.length);
    } else if (message.startsWith('run ')) {
      return message.substring('run '.length);
    } else {
      return message;
    }
  }

  private addTaskStatus(
    taskStatus:
      | 'success'
      | 'failure'
      | 'skipped'
      | 'local-cache-kept-existing'
      | 'local-cache'
      | 'remote-cache',
    commandOutput: string
  ) {
    if (taskStatus === 'local-cache') {
      return `${commandOutput}  ${chalk.dim('[local cache]')}`;
    } else if (taskStatus === 'remote-cache') {
      return `${commandOutput}  ${chalk.dim('[remote cache]')}`;
    } else if (taskStatus === 'local-cache-kept-existing') {
      return `${commandOutput}  ${chalk.dim(
        '[existing outputs match the cache, left as is]'
      )}`;
    } else {
      return commandOutput;
    }
  }

  logGenerateCommand(message: string): void {
    // normalize the message
    message = message.replace(/^(nx generate |nx g |generate |g )/, '');

    this.addNewline();
    this.writeToStdOut(`${chalk.dim('> nx generate')} ${message}`);
    this.addNewline();
  }

  log({ title, bodyLines, color }: CLIWarnMessageConfig & { color?: string }) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'cyan',
      title: color ? chalk[color](title) : title,
    });

    this.writeOptionalOutputBody(bodyLines);

    this.addNewline();
  }
}

export const output = new CLIOutput();
