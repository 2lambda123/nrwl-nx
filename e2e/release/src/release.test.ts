import {
  cleanupProject,
  newProject,
  runCLI,
  uniq,
  updateJson,
} from '@nx/e2e/utils';
import { execSync } from 'child_process';

expect.addSnapshotSerializer({
  serialize(str: string) {
    return (
      str
        // Remove all output unique to specific projects to ensure deterministic snapshots
        .replaceAll(/my-pkg-\d+/g, '{project-name}')
        .replaceAll(
          /integrity:\s*.*/g,
          'integrity: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        )
        .replaceAll(/\b[0-9a-f]{40}\b/g, '{SHASUM}')
        .replaceAll(/\d*B  index\.js/g, 'XXB  index.js')
        .replaceAll(/\d*B  project\.json/g, 'XXB  project.json')
        .replaceAll(/\d*B package\.json/g, 'XXXB package.json')
        .replaceAll(/size:\s*\d*\s?B/g, 'size: XXXB')
        .replaceAll(/\d*\.\d*\s?kB/g, 'XXX.XXX kb')
        // We trim each line to reduce the chances of snapshot flakiness
        .split('\n')
        .map((r) => r.trim())
        .join('\n')
    );
  },
  test(val: string) {
    return val != null && typeof val === 'string';
  },
});

describe('nx release', () => {
  let pkg1: string;
  let pkg2: string;
  let pkg3: string;

  beforeAll(() => {
    newProject();

    pkg1 = uniq('my-pkg-1');
    runCLI(`generate @nx/workspace:npm-package ${pkg1}`);

    pkg2 = uniq('my-pkg-2');
    runCLI(`generate @nx/workspace:npm-package ${pkg2}`);

    pkg3 = uniq('my-pkg-3');
    runCLI(`generate @nx/workspace:npm-package ${pkg3}`);

    // Update pkg2 to depend on pkg1
    updateJson(`libs/${pkg2}/package.json`, (json) => {
      json.dependencies ??= {};
      json.dependencies[`@proj/${pkg1}`] = '0.0.0';
      return json;
    });
  });
  afterAll(() => cleanupProject());

  it('should version and publish multiple related npm packages with zero config', async () => {
    const versionOutput = runCLI(`release version 999.9.9`);

    /**
     * We can't just assert on the whole version output as a snapshot because the order of the projects
     * is non-deterministic, and not every project has the same number of log lines (because of the
     * dependency relationship)
     */
    expect(
      versionOutput.match(/Running release version for project: my-pkg-\d*/g)
        .length
    ).toEqual(3);
    expect(
      versionOutput.match(
        /Reading data for package "@proj\/my-pkg-\d*" from libs\/my-pkg-\d*\/package.json/g
      ).length
    ).toEqual(3);
    expect(
      versionOutput.match(
        /Resolved the current version as 0.0.0 from libs\/my-pkg-\d*\/package.json/g
      ).length
    ).toEqual(3);
    expect(
      versionOutput.match(
        /New version 999.9.9 written to libs\/my-pkg-\d*\/package.json/g
      ).length
    ).toEqual(3);

    // Only one dependency relationship exists, so this log should only match once
    expect(
      versionOutput.match(
        /Applying new version 999.9.9 to 1 package which depends on my-pkg-\d*/g
      ).length
    ).toEqual(1);

    const registryUrl = execSync('npm config get registry').toString().trim();

    // Thanks to the custom serializer above, the publish output should be deterministic
    const publishOutput = runCLI(`release publish`);
    expect(publishOutput).toMatchInlineSnapshot(`

      >  NX   Running target release-publish for 3 projects:

      - {project-name}
      - {project-name}
      - {project-name}



      > nx run {project-name}:release-publish

      {project-name}: 📦  @proj/{project-name}@999.9.9
      {project-name}: === Tarball Contents ===
      {project-name}: XXB  index.js
      {project-name}: XXXB package.json
      {project-name}: XXB  project.json
      {project-name}: === Tarball Details ===
      {project-name}: name:          @proj/{project-name}
      {project-name}: version:       999.9.9
      {project-name}: filename:      proj-{project-name}-999.9.9.tgz
      {project-name}: package size: XXXB
      {project-name}: unpacked size: XXXB
      {project-name}: shasum:        {SHASUM}
      {project-name}: integrity: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      {project-name}: total files:   3
      {project-name}:
      {project-name}: Published to ${registryUrl} with tag "latest"

      > nx run {project-name}:release-publish

      {project-name}: 📦  @proj/{project-name}@999.9.9
      {project-name}: === Tarball Contents ===
      {project-name}: XXB  index.js
      {project-name}: XXXB package.json
      {project-name}: XXB  project.json
      {project-name}: === Tarball Details ===
      {project-name}: name:          @proj/{project-name}
      {project-name}: version:       999.9.9
      {project-name}: filename:      proj-{project-name}-999.9.9.tgz
      {project-name}: package size: XXXB
      {project-name}: unpacked size: XXXB
      {project-name}: shasum:        {SHASUM}
      {project-name}: integrity: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      {project-name}: total files:   3
      {project-name}:
      {project-name}: Published to ${registryUrl} with tag "latest"

      > nx run {project-name}:release-publish

      {project-name}: 📦  @proj/{project-name}@999.9.9
      {project-name}: === Tarball Contents ===
      {project-name}: XXB  index.js
      {project-name}: XXXB package.json
      {project-name}: XXB  project.json
      {project-name}: === Tarball Details ===
      {project-name}: name:          @proj/{project-name}
      {project-name}: version:       999.9.9
      {project-name}: filename:      proj-{project-name}-999.9.9.tgz
      {project-name}: package size: XXXB
      {project-name}: unpacked size: XXXB
      {project-name}: shasum:        {SHASUM}
      {project-name}: integrity: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      {project-name}: total files:   3
      {project-name}:
      {project-name}: Published to ${registryUrl} with tag "latest"



      >  NX   Successfully ran target release-publish for 3 projects



    `);
  }, 500000);
});
