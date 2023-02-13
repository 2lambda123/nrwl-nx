import {
  cleanupProject,
  newProject,
  readFile,
  rmDist,
  runCLI,
  runCommand,
  uniq,
  updateFile,
  updateProjectConfig,
} from '@nrwl/e2e/utils';

describe('Webpack Plugin', () => {
  beforeEach(() => newProject());
  afterEach(() => cleanupProject());

  it('should be able to setup project to build node programs with webpack and different compilers', async () => {
    const myPkg = uniq('my-pkg');
    runCLI(`generate @nrwl/js:lib ${myPkg} --buildable=false`);
    updateFile(`libs/${myPkg}/src/index.ts`, `console.log('Hello');\n`);

    // babel (default)
    runCLI(
      `generate @nrwl/webpack:webpack-project ${myPkg} --target=node --tsConfig=libs/${myPkg}/tsconfig.lib.json --main=libs/${myPkg}/src/index.ts`
    );
    rmDist();
    runCLI(`build ${myPkg}`);
    let output = runCommand(`node dist/libs/${myPkg}/main.js`);
    expect(output).toMatch(/Hello/);
    expect(output).not.toMatch(/Conflicting/);
    expect(output).not.toMatch(/process.env.NODE_ENV/);

    updateProjectConfig(myPkg, (config) => {
      delete config.targets.build;
      return config;
    });

    // swc
    runCLI(
      `generate @nrwl/webpack:webpack-project ${myPkg} --target=node --tsConfig=libs/${myPkg}/tsconfig.lib.json --main=libs/${myPkg}/src/index.ts --compiler=swc`
    );
    rmDist();
    runCLI(`build ${myPkg}`);
    output = runCommand(`node dist/libs/${myPkg}/main.js`);
    expect(output).toMatch(/Hello/);

    updateProjectConfig(myPkg, (config) => {
      delete config.targets.build;
      return config;
    });

    // tsc
    runCLI(
      `generate @nrwl/webpack:webpack-project ${myPkg} --target=node --tsConfig=libs/${myPkg}/tsconfig.lib.json --main=libs/${myPkg}/src/index.ts --compiler=tsc`
    );
    rmDist();
    runCLI(`build ${myPkg}`);
    output = runCommand(`node dist/libs/${myPkg}/main.js`);
    expect(output).toMatch(/Hello/);
  }, 500000);
});
