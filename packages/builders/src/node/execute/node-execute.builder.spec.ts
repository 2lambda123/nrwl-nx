import {
  NodeExecuteBuilder,
  NodeExecuteBuilderOptions,
  InspectType
} from './node-execute.builder';
import { TestLogger } from '@angular-devkit/architect/testing';
import { normalize } from '@angular-devkit/core';
import { of } from 'rxjs';
import { cold } from 'jasmine-marbles';
jest.mock('child_process');
let { fork } = require('child_process');
jest.mock('tree-kill');
let treeKill = require('tree-kill');

class MockArchitect {
  getBuilderConfiguration() {
    return {
      config: 'testConfig'
    };
  }
  run() {
    return cold('--a--b--a', {
      a: {
        success: true,
        outfile: 'outfile.js'
      },
      b: {
        success: false,
        outfile: 'outfile.js'
      }
    });
  }
  getBuilderDescription() {
    return of({
      description: 'testDescription'
    });
  }
  validateBuilderOptions() {
    return of({
      options: {}
    });
  }
}

describe('NodeExecuteBuilder', () => {
  let builder: NodeExecuteBuilder;
  let architect: MockArchitect;
  let logger: TestLogger;
  let testOptions: NodeExecuteBuilderOptions;

  beforeEach(() => {
    fork.mockReturnValue({
      pid: 123
    });
    treeKill.mockImplementation((pid, signal, callback) => {
      callback();
    });
    logger = new TestLogger('test');
    architect = new MockArchitect();
    builder = new NodeExecuteBuilder({
      workspace: <any>{
        root: '/root'
      },
      logger,
      host: <any>{},
      architect: <any>architect
    });
    testOptions = {
      inspect: true,
      args: [],
      buildTarget: 'nodeapp:build',
      port: 9229
    };
  });

  it('should build the application and start the built file', () => {
    const getBuilderConfiguration = spyOn(
      architect,
      'getBuilderConfiguration'
    ).and.callThrough();
    expect(
      builder.run({
        root: normalize('/root'),
        projectType: 'application',
        builder: '@nrwl/builders:node-execute',
        options: testOptions
      })
    ).toBeObservable(
      cold('--a--b--a', {
        a: {
          success: true,
          outfile: 'outfile.js'
        },
        b: {
          success: false,
          outfile: 'outfile.js'
        }
      })
    );
    expect(getBuilderConfiguration).toHaveBeenCalledWith({
      project: 'nodeapp',
      target: 'build',
      overrides: {
        watch: true
      }
    });
    expect(fork).toHaveBeenCalledWith('outfile.js', [], {
      execArgv: ['--inspect=localhost:9229']
    });
    expect(treeKill).toHaveBeenCalledTimes(1);
    expect(fork).toHaveBeenCalledTimes(2);
  });

  describe('--inspect', () => {
    describe('inspect', () => {
      it('should inspect the process', () => {
        expect(
          builder.run({
            root: normalize('/root'),
            projectType: 'application',
            builder: '@nrwl/builders:node-execute',
            options: {
              ...testOptions,
              inspect: InspectType.Inspect
            }
          })
        ).toBeObservable(
          cold('--a--b--a', {
            a: {
              success: true,
              outfile: 'outfile.js'
            },
            b: {
              success: false,
              outfile: 'outfile.js'
            }
          })
        );
        expect(fork).toHaveBeenCalledWith('outfile.js', [], {
          execArgv: ['--inspect=localhost:9229']
        });
      });
    });

    describe('inspect-brk', () => {
      it('should inspect and break at beginning of execution', () => {
        expect(
          builder.run({
            root: normalize('/root'),
            projectType: 'application',
            builder: '@nrwl/builders:node-execute',
            options: {
              ...testOptions,
              inspect: InspectType.InspectBrk
            }
          })
        ).toBeObservable(
          cold('--a--b--a', {
            a: {
              success: true,
              outfile: 'outfile.js'
            },
            b: {
              success: false,
              outfile: 'outfile.js'
            }
          })
        );
        expect(fork).toHaveBeenCalledWith('outfile.js', [], {
          execArgv: ['--inspect-brk=localhost:9229']
        });
      });
    });
  });

  describe('--port', () => {
    describe('1234', () => {
      it('should inspect the process on port 1234', () => {
        expect(
          builder.run({
            root: normalize('/root'),
            projectType: 'application',
            builder: '@nrwl/builders:node-execute',
            options: {
              ...testOptions,
              port: 1234
            }
          })
        ).toBeObservable(
          cold('--a--b--a', {
            a: {
              success: true,
              outfile: 'outfile.js'
            },
            b: {
              success: false,
              outfile: 'outfile.js'
            }
          })
        );
        expect(fork).toHaveBeenCalledWith('outfile.js', [], {
          execArgv: ['--inspect=localhost:1234']
        });
      });
    });
  });

  it('should log errors from killing the process', () => {
    treeKill.mockImplementation((pid, signal, callback) => {
      callback(new Error('Error Message'));
    });
    const loggerError = spyOn(logger, 'error');
    expect(
      builder.run({
        root: normalize('/root'),
        projectType: 'application',
        builder: '@nrwl/builders:node-execute',
        options: testOptions
      })
    ).toBeObservable(
      cold('--a--b--a', {
        a: {
          success: true,
          outfile: 'outfile.js'
        },
        b: {
          success: false,
          outfile: 'outfile.js'
        }
      })
    );
    expect(loggerError.calls.argsFor(1)).toEqual(['Error Message']);
  });

  it('should log errors from killing the process on windows', () => {
    treeKill.mockImplementation((pid, signal, callback) => {
      callback([new Error('error'), '', 'Error Message']);
    });
    const loggerError = spyOn(logger, 'error');
    expect(
      builder.run({
        root: normalize('/root'),
        projectType: 'application',
        builder: '@nrwl/builders:node-execute',
        options: testOptions
      })
    ).toBeObservable(
      cold('--a--b--a', {
        a: {
          success: true,
          outfile: 'outfile.js'
        },
        b: {
          success: false,
          outfile: 'outfile.js'
        }
      })
    );
    expect(loggerError.calls.argsFor(1)).toEqual(['Error Message']);
  });

  it('should build the application and start the built file with options', () => {
    expect(
      builder.run({
        root: normalize('/root'),
        projectType: 'application',
        builder: '@nrwl/builders:node-execute',
        options: {
          ...testOptions,
          inspect: false,
          args: ['arg1', 'arg2']
        }
      })
    ).toBeObservable(
      cold('--a--b--a', {
        a: {
          success: true,
          outfile: 'outfile.js'
        },
        b: {
          success: false,
          outfile: 'outfile.js'
        }
      })
    );
    expect(fork).toHaveBeenCalledWith('outfile.js', ['arg1', 'arg2'], {
      execArgv: []
    });
  });

  it('should warn users who try to use it in production', () => {
    spyOn(architect, 'validateBuilderOptions').and.returnValue(
      of({
        options: {
          optimization: true
        }
      })
    );
    spyOn(logger, 'warn');
    expect(
      builder.run({
        root: normalize('/root'),
        projectType: 'application',
        builder: '@nrwl/builders:node-execute',
        options: {
          ...testOptions,
          inspect: false,
          args: ['arg1', 'arg2']
        }
      })
    ).toBeObservable(
      cold('--a--b--a', {
        a: {
          success: true,
          outfile: 'outfile.js'
        },
        b: {
          success: false,
          outfile: 'outfile.js'
        }
      })
    );
    expect(logger.warn).toHaveBeenCalled();
  });
});
