import { getTempTailwindPath } from '../../utils/ct-helpers';
import { stripIndents } from '@nrwl/devkit';
import * as path from 'path';
import { installedCypressVersion } from '../../utils/cypress-version';
import cypressExecutor, { CypressExecutorOptions } from './cypress.impl';

jest.mock('@nrwl/devkit');
let devkit = require('@nrwl/devkit');

jest.mock('../../utils/cypress-version');
jest.mock('../../utils/ct-helpers');
const Cypress = require('cypress');

describe('Cypress builder', () => {
  let cypressRun: jest.SpyInstance;
  let cypressOpen: jest.SpyInstance;
  const cypressOptions: CypressExecutorOptions = {
    cypressConfig: 'apps/my-app-e2e/cypress.json',
    parallel: false,
    tsConfig: 'apps/my-app-e2e/tsconfig.json',
    devServerTarget: 'my-app:serve',
    exit: true,
    record: false,
    baseUrl: undefined,
    watch: false,
    skipServe: false,
  };
  let mockContext;
  let mockedInstalledCypressVersion: jest.Mock<
    ReturnType<typeof installedCypressVersion>
  > = installedCypressVersion as any;
  mockContext = { root: '/root', workspace: { projects: {} } } as any;
  (devkit as any).readTargetOptions = jest.fn().mockReturnValue({
    watch: true,
  });
  let runExecutor: any;
  let mockGetTailwindPath: jest.Mock<ReturnType<typeof getTempTailwindPath>> =
    getTempTailwindPath as any;

  beforeEach(async () => {
    runExecutor = (devkit as any).runExecutor = jest.fn().mockReturnValue([
      {
        success: true,
        baseUrl: 'http://localhost:4200',
      },
    ]);
    (devkit as any).stripIndents = (s) => s;
    (devkit as any).parseTargetString = (s) => {
      const [project, target, configuration] = s.split(':');
      return {
        project,
        target,
        configuration,
      };
    };
    cypressRun = jest
      .spyOn(Cypress, 'run')
      .mockReturnValue(Promise.resolve({}));
    cypressOpen = jest
      .spyOn(Cypress, 'open')
      .mockReturnValue(Promise.resolve({}));
  });

  afterEach(() => jest.clearAllMocks());

  it('should call `Cypress.run` if headless mode is `true`', async () => {
    const { success } = await cypressExecutor(cypressOptions, mockContext);
    expect(success).toEqual(true);

    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { baseUrl: 'http://localhost:4200' },
        project: path.dirname(cypressOptions.cypressConfig),
      })
    );
    expect(cypressOpen).not.toHaveBeenCalled();
  });

  it('should call `Cypress.open` if headless mode is `false`', async () => {
    const { success } = await cypressExecutor(
      { ...cypressOptions, headless: false, watch: true },
      mockContext
    );
    expect(success).toEqual(true);

    expect(cypressOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { baseUrl: 'http://localhost:4200' },
        project: path.dirname(cypressOptions.cypressConfig),
      })
    );
    expect(cypressRun).not.toHaveBeenCalled();
  });

  it('should fail early if application build fails', async () => {
    (devkit as any).runExecutor = jest.fn().mockReturnValue([
      {
        success: false,
      },
    ]);
    try {
      await cypressExecutor(cypressOptions, mockContext);
      fail('Should not execute');
    } catch (e) {}
  });

  it('should show warnings if using unsupported browsers v3', async () => {
    mockedInstalledCypressVersion.mockReturnValue(3);
    await cypressExecutor(
      {
        ...cypressOptions,
        browser: 'edge',
      },
      mockContext
    );

    expect(devkit.logger.warn).toHaveBeenCalled();
  });

  it('should show warnings if using unsupported browsers v4', async () => {
    mockedInstalledCypressVersion.mockReturnValue(4);
    await cypressExecutor(
      {
        ...cypressOptions,
        browser: 'canary',
      },
      mockContext
    );

    expect(devkit.logger.warn).toHaveBeenCalled();
  });

  it('should show warnings if using v8 deprecated headless flag', async () => {
    mockedInstalledCypressVersion.mockReturnValue(8);
    await cypressExecutor(
      {
        ...cypressOptions,
        headless: true,
      },
      mockContext
    );

    expect(devkit.logger.warn).toHaveBeenCalled();
  });

  it('should skip warnings if using headless flag used on v7 and lower', async () => {
    mockedInstalledCypressVersion.mockReturnValue(7);
    await cypressExecutor(
      {
        ...cypressOptions,
        headless: true,
      },
      mockContext
    );
    const deprecatedMessage = stripIndents`
NOTE:
Support for Cypress versions < 10 is deprecated. Please upgrade to at least Cypress version 10. 
A generator to migrate from v8 to v10 is provided. See https://nx.dev/cypress/v10-migration-guide
`;

    // expect the warning about the using < v10 but should not also warn about headless
    expect(devkit.logger.warn).toHaveBeenCalledTimes(1);
    expect(devkit.logger.warn).toHaveBeenCalledWith(deprecatedMessage);
  });

  it('should call `Cypress.run` with provided baseUrl', async () => {
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        devServerTarget: undefined,
        baseUrl: 'http://my-distant-host.com',
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          baseUrl: 'http://my-distant-host.com',
        },
        project: path.dirname(cypressOptions.cypressConfig),
      })
    );
  });

  it('should call `Cypress.run` with provided ciBuildId (type: number)', async () => {
    const ciBuildId = 1234;
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        ciBuildId,
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ciBuildId: ciBuildId.toString(),
      })
    );
  });

  it('should call `Cypress.run` with provided ciBuildId (type: string)', async () => {
    const ciBuildId = 'stringBuildId';
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        devServerTarget: undefined,
        ciBuildId,
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ciBuildId,
        project: path.dirname(cypressOptions.cypressConfig),
      })
    );
  });

  it('should call `Cypress.run` with provided browser', async () => {
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        browser: 'chrome',
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: 'chrome',
        project: path.dirname(cypressOptions.cypressConfig),
      })
    );
  });

  it('should call `Cypress.run` without baseUrl nor dev server target value', async () => {
    const { success } = await cypressExecutor(
      {
        cypressConfig: 'apps/my-app-e2e/cypress.json',
        tsConfig: 'apps/my-app-e2e/tsconfig.json',
        devServerTarget: undefined,
        headless: true,
        exit: true,
        parallel: false,
        record: false,
        baseUrl: undefined,
        watch: false,
        skipServe: false,
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        project: path.dirname(cypressOptions.cypressConfig),
      })
    );
  });

  it('should call `Cypress.run` with a string of files to ignore', async () => {
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        ignoreTestFiles: '/some/path/to/a/file.js',
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ignoreTestFiles: '/some/path/to/a/file.js',
      })
    );
  });

  it('should call `Cypress.run` with a reporter and reporterOptions', async () => {
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        reporter: 'junit',
        reporterOptions: 'mochaFile=reports/results-[hash].xml,toConsole=true',
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        reporter: 'junit',
        reporterOptions: 'mochaFile=reports/results-[hash].xml,toConsole=true',
      })
    );
  });

  it('should call `Cypress.run` with provided cypressConfig as project and configFile', async () => {
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        cypressConfig: 'some/project/my-cypress.json',
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        project: 'some/project',
        configFile: 'my-cypress.json',
      })
    );
  });

  it.each(['app:serve', 'api:serve, app:serve'])(
    'when devServerTarget AND baseUrl options are both present, baseUrl should take precedence',
    async (devServerTarget) => {
      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          devServerTarget,
          baseUrl: 'test-url-from-options',
        },
        mockContext
      );
      expect(success).toEqual(true);
      expect(cypressRun).toHaveBeenLastCalledWith(
        expect.objectContaining({
          config: {
            baseUrl: 'test-url-from-options',
          },
        })
      );
    }
  );

  it.each(['app:serve', 'api:serve, app:serve'])(
    'when devServerTarget option present and baseUrl option is absent, baseUrl should come from devServerTarget',
    async (devServerTarget) => {
      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          devServerTarget,
        },
        mockContext
      );
      expect(success).toEqual(true);
      expect(cypressRun).toHaveBeenLastCalledWith(
        expect.objectContaining({
          config: {
            baseUrl: 'http://localhost:4200',
          },
        })
      );
    }
  );

  it.each(['app:serve', 'api:serve, app:serve'])(
    'should call `Cypress.run` without serving the app',
    async (devServerTarget) => {
      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          devServerTarget,
          skipServe: true,
          baseUrl: 'http://my-distant-host.com',
        },
        mockContext
      );
      expect(success).toEqual(true);
      expect(runExecutor).not.toHaveBeenCalled();
      expect(cypressRun).toHaveBeenCalledWith(
        expect.objectContaining({
          config: {
            baseUrl: 'http://my-distant-host.com',
          },
        })
      );
    }
  );

  it.each([
    ['app:serve', [{ project: 'app', target: 'serve' }]],
    [
      'api:serve, app:serve',
      [
        { project: 'api', target: 'serve' },
        { project: 'app', target: 'serve' },
      ],
    ],
  ])(
    'should not forward watch option to devServerTarget when not supported',
    async (devServerTarget, expectedOptions) => {
      // Simulate a dev server target that does not support watch option.
      (devkit as any).readTargetOptions = jest.fn().mockReturnValue({});

      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          devServerTarget,
        },
        mockContext
      );

      expect(success).toEqual(true);
      for (let i = 0; i < expectedOptions.length; i++) {
        expect((devkit as any).readTargetOptions.mock.calls[i][0]).toEqual(
          expect.objectContaining({
            project: expectedOptions[i].project,
            target: expectedOptions[i].target,
          })
        );
        expect(Object.keys(runExecutor.mock.calls[i][1])).not.toContain(
          'watch'
        );
      }
    }
  );

  it.each([
    ['app:serve', [{ project: 'app', target: 'serve' }]],
    [
      'api:serve, app:serve',
      [
        { project: 'api', target: 'serve' },
        { project: 'app', target: 'serve' },
      ],
    ],
  ])(
    'should forward watch option to devServerTarget when supported',
    async (devServerTarget, expectedOptions) => {
      // Simulate a dev server target that support watch option.
      (devkit as any).readTargetOptions = jest
        .fn()
        .mockReturnValue({ watch: true });

      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          devServerTarget,
        },
        mockContext
      );

      expect(success).toEqual(true);

      for (let i = 0; i < expectedOptions.length; i++) {
        expect((devkit as any).readTargetOptions.mock.calls[i][0]).toEqual(
          expect.objectContaining({
            project: expectedOptions[i].project,
            target: expectedOptions[i].target,
          })
        );
        expect(Object.keys(runExecutor.mock.calls[i][1])).toContain('watch');
      }
    }
  );

  it.each([
    ['app:serve', ['http://localhost:4200']],
    [
      'app1:serve, app2:serve',
      ['http://localhost:4200', 'http://localhost:4201'],
    ],
  ])(
    'should only yield last baseUrl from devServerTarget',
    async (devServerTarget, baseUrls) => {
      devkit.runExecutor = jest.fn();
      for (const baseUrl of baseUrls) {
        devkit.runExecutor.mockReturnValueOnce([
          {
            success: true,
            baseUrl,
          },
        ]);
      }

      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          devServerTarget,
        },
        mockContext
      );

      expect(success).toEqual(true);
      expect(cypressRun).toHaveBeenLastCalledWith(
        expect.objectContaining({
          config: {
            baseUrl: baseUrls[baseUrls.length - 1],
          },
        })
      );
    }
  );
  it('should forward headed', async () => {
    const { success } = await cypressExecutor(
      {
        ...cypressOptions,
        headed: true,
      },
      mockContext
    );
    expect(success).toEqual(true);
    expect(cypressRun).toHaveBeenCalledWith(
      expect.objectContaining({
        headed: true,
      })
    );
  });

  describe('Component Testing', () => {
    beforeEach(() => {
      mockGetTailwindPath.mockReturnValue(undefined);
    });
    it('should forward testingType', async () => {
      const { success } = await cypressExecutor(
        {
          ...cypressOptions,
          testingType: 'component',
        },
        mockContext
      );
      expect(success).toEqual(true);
      expect(cypressRun).toHaveBeenCalledWith(
        expect.objectContaining({
          testingType: 'component',
        })
      );
    });
  });
});
