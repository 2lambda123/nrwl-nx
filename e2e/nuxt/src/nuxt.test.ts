import {
  checkFilesExist,
  cleanupProject,
  killPorts,
  newProject,
  runCLI,
  uniq,
} from '@nx/e2e/utils';

describe('Nuxt Plugin', () => {
  let proj: string;
  const app = uniq('app');

  beforeAll(() => {
    proj = newProject({
      unsetProjectNameAndRootFormat: false,
    });
    runCLI(`generate @nx/nuxt:app ${app} --unitTestRunner=vitest`);
    runCLI(
      `generate @nx/nuxt:component --directory=${app}/src/components/one --name=one --nameAndDirectoryFormat=as-provided --unitTestRunner=vitest`
    );
  });

  afterAll(() => {
    killPorts();
    cleanupProject();
  });

  it('should build application', async () => {
    const result = runCLI(`build ${app}`);
    expect(result).toContain(
      `Successfully ran target build for project ${app}`
    );
  });

  it('should test application', async () => {
    const result = runCLI(`test ${app}`);
    expect(result).toContain(`Successfully ran target test for project ${app}`);
  });

  it('should lint application', async () => {
    const result = runCLI(`lint ${app}`);
    expect(result).toContain(`Successfully ran target lint for project ${app}`);
  });

  it('should build storybook for app', () => {
    runCLI(
      `generate @nx/nuxt:storybook-configuration ${app} --generateStories --no-interactive`
    );
    runCLI(`run ${app}:build-storybook --verbose`);
    checkFilesExist(`dist/storybook/${app}/index.html`);
  }, 300_000);
});
