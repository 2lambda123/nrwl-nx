import {
  checkFilesExist,
  cleanupProject,
  getPackageManagerCommand,
  newProject,
  runCLI,
  runCommand,
  uniq,
  updateJson,
} from '@nrwl/e2e/utils';

describe('Next.js Applications', () => {
  let proj: string;

  beforeEach(() => {
    proj = newProject({
      name: 'proj',
      packageManager: 'npm',
    });
  });

  afterEach(() => cleanupProject());

  it('should run a Next.js based Storybook setup', async () => {
    const appName = uniq('app');

    // TODO(jack): Overriding enhanced-resolve to 5.10.0 now until the package is fixed.
    // See: https://github.com/webpack/enhanced-resolve/issues/362
    updateJson('package.json', (json) => {
      json['overrides'] = {
        'enhanced-resolve': '5.10.0',
      };
      return json;
    });
    runCommand(getPackageManagerCommand().install);

    runCLI(`generate @nrwl/next:app ${appName} --no-interactive`);
    runCLI(
      `generate @nrwl/next:component Foo --project=${appName} --no-interactive`
    );

    // Currently due to auto-installing peer deps in pnpm, the generator can fail while installing deps with unmet peet deps.
    runCLI(
      `generate @nrwl/react:storybook-configuration ${appName} --generateStories --no-interactive`,
      {
        silenceError: true,
      }
    );

    runCLI(`build-storybook ${appName}`);
    checkFilesExist(`dist/storybook/${appName}/index.html`);
  }, 1_000_000);
});
