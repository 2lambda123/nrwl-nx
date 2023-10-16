import {
  cleanupProject,
  newProject,
  uniq,
  runCLI,
  ensurePlaywrightBrowsersInstallation,
  getPackageManagerCommand,
  getSelectedPackageManager,
} from '@nx/e2e/utils';

const TEN_MINS_MS = 600_000;
// TODO: re-enable this when tests are passing again
xdescribe('Playwright E2E Test runner', () => {
  const pmc = getPackageManagerCommand({
    packageManager: getSelectedPackageManager(),
  });

  beforeAll(() => {
    newProject({ name: uniq('playwright') });
  });

  afterAll(() => cleanupProject());

  it(
    'should test and lint example app',
    () => {
      runCLI(
        `g @nx/web:app demo-e2e --unitTestRunner=none --bundler=vite --e2eTestRunner=none --style=css --no-interactive`
      );
      runCLI(
        `g @nx/playwright:configuration --project demo-e2e --webServerCommand="${pmc.runNx} serve demo-e2e" --webServerAddress="http://localhost:4200"`
      );
      ensurePlaywrightBrowsersInstallation();

      const e2eResults = runCLI(`e2e demo-e2e`);
      expect(e2eResults).toContain('Successfully ran target e2e for project');

      const lintResults = runCLI(`lint demo-e2e`);
      expect(lintResults).toContain('All files pass linting');
    },
    TEN_MINS_MS
  );

  it(
    'should test and lint example app with js',
    () => {
      runCLI(
        `g @nx/web:app demo-js-e2e --unitTestRunner=none --bundler=vite --e2eTestRunner=none --style=css --no-interactive`
      );
      runCLI(
        `g @nx/playwright:configuration --project demo-js-e2e --js  --webServerCommand="${pmc.runNx} serve demo-e2e" --webServerAddress="http://localhost:4200"`
      );
      ensurePlaywrightBrowsersInstallation();

      const e2eResults = runCLI(`e2e demo-js-e2e`);
      expect(e2eResults).toContain('Successfully ran target e2e for project');

      const lintResults = runCLI(`lint demo-e2e`);
      expect(lintResults).toContain('All files pass linting');
    },
    TEN_MINS_MS
  );
});
