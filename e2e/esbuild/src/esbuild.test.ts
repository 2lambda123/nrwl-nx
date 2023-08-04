import {
  checkFilesDoNotExist,
  checkFilesExist,
  cleanupProject,
  newProject,
  packageInstall,
  readFile,
  readJson,
  rmDist,
  runCLI,
  runCommand,
  runCommandUntil,
  uniq,
  updateFile,
  updateProjectConfig,
  waitUntil,
} from '@nx/e2e/utils';

describe('EsBuild Plugin', () => {
  let proj: string;

  beforeEach(() => (proj = newProject()));

  afterEach(() => cleanupProject());

  it('should setup and build projects using build', async () => {
    const myPkg = uniq('my-pkg');
    runCLI(`generate @nx/js:lib ${myPkg} --bundler=esbuild`);
    updateFile(`libs/${myPkg}/src/index.ts`, `console.log('Hello');\n`);
    updateProjectConfig(myPkg, (json) => {
      json.targets.build.options.assets = [`libs/${myPkg}/assets/*`];
      return json;
    });
    updateFile(`libs/${myPkg}/assets/a.md`, 'file a');
    updateFile(`libs/${myPkg}/assets/b.md`, 'file b');

    // Copy package.json as asset rather than generate with Nx-detected fields.
    runCLI(`build ${myPkg} --generatePackageJson=false`);
    const packageJson = readJson(`libs/${myPkg}/package.json`);
    // This is the file that is generated by lib generator (no deps, no main, etc.).
    expect(packageJson).toEqual({
      name: `@proj/${myPkg}`,
      version: '0.0.1',
      type: 'commonjs',
      main: './index.cjs',
      dependencies: {},
    });

    // Build normally with package.json generation.
    runCLI(`build ${myPkg}`);

    expect(runCommand(`node dist/libs/${myPkg}/index.cjs`)).toMatch(/Hello/);
    // main field should be set correctly in package.json
    checkFilesExist(
      `dist/libs/${myPkg}/package.json`,
      `dist/libs/${myPkg}/pnpm-lock.yaml`
    );
    expect(runCommand(`node dist/libs/${myPkg}`)).toMatch(/Hello/);

    expect(runCommand(`node dist/libs/${myPkg}/index.cjs`)).toMatch(/Hello/);
    // main field should be set correctly in package.json

    expect(readFile(`dist/libs/${myPkg}/assets/a.md`)).toMatch(/file a/);
    expect(readFile(`dist/libs/${myPkg}/assets/b.md`)).toMatch(/file b/);

    /* Metafile is not generated by default, but passing --metafile generates it.
     */
    checkFilesDoNotExist(`dist/libs/${myPkg}/meta.json`);
    runCLI(`build ${myPkg} --metafile`);
    checkFilesExist(`dist/libs/${myPkg}/meta.json`);

    /* Type errors are turned on by default
     */
    updateFile(
      `libs/${myPkg}/src/index.ts`,
      `
      const x: number = 'a'; // type error
      console.log('Bye');
    `
    );
    expect(() => runCLI(`build ${myPkg}`)).toThrow();
    expect(() => runCLI(`build ${myPkg} --skipTypeCheck`)).not.toThrow();
    expect(runCommand(`node dist/libs/${myPkg}/index.cjs`)).toMatch(/Bye/);
    // Reset file
    updateFile(
      `libs/${myPkg}/src/index.ts`,
      `
      console.log('Hello');
    `
    );

    /* Test that watch mode copies assets on start, and again on update.
     */
    updateFile(`libs/${myPkg}/assets/a.md`, 'initial a');
    const watchProcess = await runCommandUntil(
      `build ${myPkg} --watch`,
      (output) => {
        return output.includes('watching for changes');
      }
    );
    readFile(`dist/libs/${myPkg}/assets/a.md`).includes('initial a');
    updateFile(`libs/${myPkg}/assets/a.md`, 'updated a');
    await expect(
      waitUntil(() =>
        readFile(`dist/libs/${myPkg}/assets/a.md`).includes('updated a')
      )
    ).resolves.not.toThrow();
    watchProcess.kill();
  }, 300_000);

  it('should support bundling everything or only workspace libs', async () => {
    packageInstall('rambda', undefined, '~7.3.0', 'prod');
    packageInstall('lodash', undefined, '~4.14.0', 'prod');
    const parentLib = uniq('parent-lib');
    const childLib = uniq('child-lib');
    runCLI(`generate @nx/js:lib ${parentLib} --bundler=esbuild`);
    runCLI(`generate @nx/js:lib ${childLib} --bundler=none`);
    updateFile(
      `libs/${parentLib}/src/index.ts`,
      `
        // @ts-ignore
        import _ from 'lodash';
        import { greet } from '@${proj}/${childLib}';

        console.log(_.upperFirst('hello world'));
        console.log(greet());
      `
    );
    updateFile(
      `libs/${childLib}/src/index.ts`,
      `
        import { always } from 'rambda';
        export const greet = always('Hello from child lib');
      `
    );

    // Bundle child lib and third-party packages
    runCLI(`build ${parentLib}`);

    expect(
      readJson(`dist/libs/${parentLib}/package.json`).dependencies?.['dayjs']
    ).not.toBeDefined();
    let runResult = runCommand(`node dist/libs/${parentLib}/index.cjs`);
    expect(runResult).toMatch(/Hello world/);
    expect(runResult).toMatch(/Hello from child lib/);

    // Bundle only child lib
    runCLI(`build ${parentLib} --third-party=false`);

    expect(
      readJson(`dist/libs/${parentLib}/package.json`).dependencies
    ).toEqual({
      // Don't care about the versions, just that they exist
      rambda: expect.any(String),
      lodash: expect.any(String),
    });
    runResult = runCommand(`node dist/libs/${parentLib}/index.cjs`);
    expect(runResult).toMatch(/Hello world/);
    expect(runResult).toMatch(/Hello from child lib/);
  }, 300_000);

  it('should support non-bundle builds', () => {
    const myPkg = uniq('my-pkg');
    runCLI(`generate @nx/js:lib ${myPkg} --bundler=esbuild`);
    updateFile(`libs/${myPkg}/src/lib/${myPkg}.ts`, `console.log('Hello');\n`);
    updateFile(`libs/${myPkg}/src/index.ts`, `import './lib/${myPkg}.cjs';\n`);

    runCLI(`build ${myPkg} --bundle=false`);

    checkFilesExist(
      `dist/libs/${myPkg}/libs/${myPkg}/src/lib/${myPkg}.cjs`,
      `dist/libs/${myPkg}/index.cjs`
    );
    // Test files are excluded in tsconfig (e.g. tsconfig.lib.json)
    checkFilesDoNotExist(
      `dist/libs/${myPkg}/libs/${myPkg}/src/lib/${myPkg}.spec.cjs`
    );
    // Can run package (package.json fields are correctly generated)
    expect(runCommand(`node dist/libs/${myPkg}`)).toMatch(/Hello/);
  }, 300_000);

  it('should support additional entry points', () => {
    const myPkg = uniq('my-pkg');
    runCLI(`generate @nx/js:lib ${myPkg} --bundler=esbuild`);
    updateFile(`libs/${myPkg}/src/index.ts`, `console.log('main');\n`);
    updateFile(`libs/${myPkg}/src/extra.ts`, `console.log('extra');\n`);
    updateProjectConfig(myPkg, (json) => {
      json.targets.build.options.additionalEntryPoints = [
        `libs/${myPkg}/src/extra.ts`,
      ];
      return json;
    });

    runCLI(`build ${myPkg}`);

    checkFilesExist(
      `dist/libs/${myPkg}/index.cjs`,
      `dist/libs/${myPkg}/extra.cjs`
    );
    expect(
      runCommand(`node dist/libs/${myPkg}/index.cjs`, { failOnError: true })
    ).toMatch(/main/);
    expect(
      runCommand(`node dist/libs/${myPkg}/extra.cjs`, { failOnError: true })
    ).toMatch(/extra/);
  }, 120_000);

  it('should support external esbuild.config.js file', async () => {
    const myPkg = uniq('my-pkg');
    runCLI(`generate @nx/js:lib ${myPkg} --bundler=esbuild`);
    updateFile(
      `libs/${myPkg}/esbuild.config.js`,
      `console.log('custom config loaded');\nmodule.exports = {};\n`
    );
    updateProjectConfig(myPkg, (json) => {
      delete json.targets.build.options.esbuildOptions;
      json.targets.build.options.esbuildConfig = `libs/${myPkg}/esbuild.config.js`;
      return json;
    });

    const output = runCLI(`build ${myPkg}`);
    expect(output).toContain('custom config loaded');
  }, 120_000);
});
