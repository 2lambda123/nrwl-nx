import {checkFilesExists, cleanup, copyMissingPackages, newApp, readFile, runCLI, runCommand, runSchematic, updateFile} from '../utils';

describe('angular library', () => {
  beforeEach(cleanup);

  it('creates a new  angularlibrary in a workspace', () => {
    runSchematic('@nrwl/bazel:application --name=proj');
    runSchematic('@nrwl/bazel:nglib --name=myLib');

    checkFilesExists(
        'tsconfig.json', 'WORKSPACE', 'BUILD.bazel', 'libs/my-lib/BUILD.bazel',
        'libs/my-lib/index.ts', 'libs/my-lib/src/my-lib.module.ts');

    const cliConfig = JSON.parse(readFile('.angular-cli.json'));
    expect(cliConfig.apps[0].name).toEqual('myLib');
    expect(cliConfig.apps[0].root).toEqual('libs/my-lib/src');
  });
});
