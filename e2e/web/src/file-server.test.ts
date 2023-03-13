import {
  cleanupProject,
  killPorts,
  newProject,
  promisifiedTreeKill,
  runCLI,
  runCommandUntil,
  uniq,
  updateProjectConfig,
} from '@nrwl/e2e/utils';

describe('file-server', () => {
  beforeAll(() => {
    newProject({ name: uniq('fileserver') });
  });
  afterAll(() => cleanupProject());

  it('should serve folder of files', async () => {
    const appName = uniq('app');
    const port = 4301;

    runCLI(`generate @nrwl/web:app ${appName} --no-interactive`);
    updateProjectConfig(appName, (config) => {
      config.targets['serve'].executor = '@nrwl/web:file-server';
      return config;
    });

    const p = await runCommandUntil(
      `serve ${appName} --port=${port}`,
      (output) => {
        return output.indexOf(`localhost:${port}`) > -1;
      }
    );

    try {
      await promisifiedTreeKill(p.pid, 'SIGKILL');
      await killPorts(port);
    } catch {
      // ignore
    }
  }, 300_000);

  it('should setup and serve static files from app', async () => {
    const ngAppName = uniq('ng-app');
    const reactAppName = uniq('react-app');

    runCLI(`generate @nrwl/angular:app ${ngAppName} --no-interactive`);
    runCLI(`generate @nrwl/react:app ${reactAppName} --no-interactive`);
    runCLI(
      `generate @nrwl/web:static-config --buildTarget=${ngAppName}:build --no-interactive`
    );
    runCLI(
      `generate @nrwl/web:static-config --buildTarget=${reactAppName}:build --targetName=custom-serve-static --no-interactive`
    );

    const ngServe = await runCommandUntil(
      `serve-static ${ngAppName}`,
      (output) => {
        return output.indexOf('localhost:4200') > -1;
      }
    );

    try {
      await promisifiedTreeKill(ngServe.pid, 'SIGKILL');
      await killPorts(4200);
    } catch {
      // ignore
    }

    const reactServe = await runCommandUntil(
      `custom-serve-static ${reactAppName}`,
      (output) => {
        return output.indexOf('localhost:4200') > -1;
      }
    );

    try {
      await promisifiedTreeKill(reactServe.pid, 'SIGKILL');
      await killPorts(4200);
    } catch {
      // ignore
    }
  }, 300_000);
});
