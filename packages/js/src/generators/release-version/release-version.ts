import {
  ProjectGraphProjectNode,
  Tree,
  formatFiles,
  joinPathFragments,
  output,
  readJson,
  updateJson,
  workspaceRoot,
  writeJson,
} from '@nx/devkit';
import * as chalk from 'chalk';
import { exec } from 'child_process';
import { IMPLICIT_DEFAULT_RELEASE_GROUP } from 'nx/src/command-line/release/config/config';
import { getLatestGitTagForPattern } from 'nx/src/command-line/release/utils/git';
import {
  resolveSemverSpecifierFromConventionalCommits,
  resolveSemverSpecifierFromPrompt,
} from 'nx/src/command-line/release/utils/resolve-semver-specifier';
import { isValidSemverSpecifier } from 'nx/src/command-line/release/utils/semver';
import {
  ReleaseVersionGeneratorResult,
  VersionData,
  deriveNewSemverVersion,
  validReleaseVersionPrefixes,
} from 'nx/src/command-line/release/version';
import { daemonClient } from 'nx/src/daemon/client/client';
import { interpolate } from 'nx/src/tasks-runner/utils';
import * as ora from 'ora';
import { relative } from 'path';
import { prerelease } from 'semver';
import { ReleaseVersionGeneratorSchema } from './schema';
import {
  LocalPackageDependency,
  resolveLocalPackageDependencies,
} from './utils/resolve-local-package-dependencies';
import { updateLockFile } from './utils/update-lock-file';

export async function releaseVersionGenerator(
  tree: Tree,
  options: ReleaseVersionGeneratorSchema
): Promise<ReleaseVersionGeneratorResult> {
  try {
    const versionData: VersionData = {};

    // If the user provided a specifier, validate that it is valid semver or a relative semver keyword
    if (options.specifier) {
      if (!isValidSemverSpecifier(options.specifier)) {
        throw new Error(
          `The given version specifier "${options.specifier}" is not valid. You provide an exact version or a valid semver keyword such as "major", "minor", "patch", etc.`
        );
      }
      // The node semver library classes a leading `v` as valid, but we want to ensure it is not present in the final version
      options.specifier = options.specifier.replace(/^v/, '');
    }

    if (
      options.versionPrefix &&
      validReleaseVersionPrefixes.indexOf(options.versionPrefix) === -1
    ) {
      throw new Error(
        `Invalid value for version.generatorOptions.versionPrefix: "${
          options.versionPrefix
        }"

Valid values are: ${validReleaseVersionPrefixes
          .map((s) => `"${s}"`)
          .join(', ')}`
      );
    }

    if (options.firstRelease) {
      // always use disk as a fallback for the first release
      options.fallbackCurrentVersionResolver = 'disk';
    }

    const projects = options.projects;

    const createResolvePackageRoot =
      (customPackageRoot?: string) =>
      (projectNode: ProjectGraphProjectNode): string => {
        // Default to the project root if no custom packageRoot
        if (!customPackageRoot) {
          return projectNode.data.root;
        }
        return interpolate(customPackageRoot, {
          workspaceRoot: '',
          projectRoot: projectNode.data.root,
          projectName: projectNode.name,
        });
      };

    const resolvePackageRoot = createResolvePackageRoot(options.packageRoot);

    // Resolve any custom package roots for each project upfront as they will need to be reused during dependency resolution
    const projectNameToPackageRootMap = new Map<string, string>();
    for (const project of projects) {
      projectNameToPackageRootMap.set(
        project.name,
        resolvePackageRoot(project)
      );
    }

    let currentVersion: string;
    let currentVersionResolvedFromFallback: boolean = false;

    // only used for options.currentVersionResolver === 'git-tag', but
    // must be declared here in order to reuse it for additional projects
    let latestMatchingGitTag: { tag: string; extractedVersion: string };

    // if specifier is undefined, then we haven't resolved it yet
    // if specifier is null, then it has been resolved and no changes are necessary
    let specifier = options.specifier ? options.specifier : undefined;

    for (const project of projects) {
      const projectName = project.name;
      const packageRoot = projectNameToPackageRootMap.get(projectName);
      const packageJsonPath = joinPathFragments(packageRoot, 'package.json');
      const workspaceRelativePackageJsonPath = relative(
        workspaceRoot,
        packageJsonPath
      );

      const color = getColor(projectName);
      const log = (msg: string) => {
        console.log(color.instance.bold(projectName) + ' ' + msg);
      };

      if (!tree.exists(packageJsonPath)) {
        throw new Error(
          `The project "${projectName}" does not have a package.json available at ${workspaceRelativePackageJsonPath}.

To fix this you will either need to add a package.json file at that location, or configure "release" within your nx.json to exclude "${projectName}" from the current release group, or amend the packageRoot configuration to point to where the package.json should be.`
        );
      }

      output.logSingleLine(
        `Running release version for project: ${color.instance.bold(
          project.name
        )}`
      );

      const projectPackageJson = readJson(tree, packageJsonPath);
      log(
        `🔍 Reading data for package "${projectPackageJson.name}" from ${workspaceRelativePackageJsonPath}`
      );

      const { name: packageName, version: currentVersionFromDisk } =
        projectPackageJson;

      switch (options.currentVersionResolver) {
        case 'registry': {
          const metadata = options.currentVersionResolverMetadata;
          const registry =
            metadata?.registry ??
            (await getNpmRegistry()) ??
            'https://registry.npmjs.org';
          const tag = metadata?.tag ?? 'latest';

          /**
           * If the currentVersionResolver is set to registry, and the projects are not independent, we only want to make the request once for the whole batch of projects.
           * For independent projects, we need to make a request for each project individually as they will most likely have different versions.
           */
          if (
            !currentVersion ||
            options.releaseGroup.projectsRelationship === 'independent'
          ) {
            const spinner = ora(
              `${Array.from(new Array(projectName.length + 3)).join(
                ' '
              )}Resolving the current version for tag "${tag}" on ${registry}`
            );
            spinner.color =
              color.spinnerColor as typeof colors[number]['spinnerColor'];
            spinner.start();

            try {
              // Must be non-blocking async to allow spinner to render
              currentVersion = await new Promise<string>((resolve, reject) => {
                exec(
                  `npm view ${packageName} version --registry=${registry} --tag=${tag}`,
                  (error, stdout, stderr) => {
                    if (error) {
                      return reject(error);
                    }
                    if (stderr) {
                      return reject(stderr);
                    }
                    return resolve(stdout.trim());
                  }
                );
              });

              spinner.stop();

              log(
                `📄 Resolved the current version as ${currentVersion} for tag "${tag}" from registry ${registry}`
              );
            } catch (e) {
              spinner.stop();

              if (options.fallbackCurrentVersionResolver === 'disk') {
                log(
                  `📄 Unable to resolve the current version from the registry ${registry}. Falling back to the version on disk of ${currentVersionFromDisk}`
                );
                currentVersion = currentVersionFromDisk;
                currentVersionResolvedFromFallback = true;
              } else {
                throw new Error(
                  `Unable to resolve the current version from the registry ${registry}. Please ensure that the package exists in the registry in order to use the "registry" currentVersionResolver. Alternatively, you can use the --first-release option or set "version.generatorOptions.fallbackCurrentVersionResolver" to "disk" in order to fallback to the version on disk when the registry lookup fails.`
                );
              }
            }
          } else {
            if (currentVersionResolvedFromFallback) {
              log(
                `📄 Using the current version ${currentVersion} already resolved from disk fallback.`
              );
            } else {
              log(
                `📄 Using the current version ${currentVersion} already resolved from the registry ${registry}`
              );
            }
          }
          break;
        }
        case 'disk':
          currentVersion = currentVersionFromDisk;
          if (!currentVersion) {
            throw new Error(
              `Unable to determine the current version for project "${project.name}" from ${packageJsonPath}`
            );
          }
          log(
            `📄 Resolved the current version as ${currentVersion} from ${packageJsonPath}`
          );
          break;
        case 'git-tag': {
          if (
            !currentVersion ||
            // We always need to independently resolve the current version from git tag per project if the projects are independent
            options.releaseGroup.projectsRelationship === 'independent'
          ) {
            const releaseTagPattern = options.releaseGroup.releaseTagPattern;
            latestMatchingGitTag = await getLatestGitTagForPattern(
              releaseTagPattern,
              {
                projectName: project.name,
              }
            );
            if (!latestMatchingGitTag) {
              if (options.fallbackCurrentVersionResolver === 'disk') {
                log(
                  `📄 Unable to resolve the current version from git tag using pattern "${releaseTagPattern}". Falling back to the version on disk of ${currentVersionFromDisk}`
                );
                currentVersion = currentVersionFromDisk;
                currentVersionResolvedFromFallback = true;
              } else {
                throw new Error(
                  `No git tags matching pattern "${releaseTagPattern}" for project "${project.name}" were found. You will need to create an initial matching tag to use as a base for determining the next version. Alternatively, you can use the --first-release option or set "version.generatorOptions.fallbackCurrentVersionResolver" to "disk" in order to fallback to the version on disk when no matching git tags are found.`
                );
              }
            } else {
              currentVersion = latestMatchingGitTag.extractedVersion;
              log(
                `📄 Resolved the current version as ${currentVersion} from git tag "${latestMatchingGitTag.tag}".`
              );
            }
          } else {
            if (currentVersionResolvedFromFallback) {
              log(
                `📄 Using the current version ${currentVersion} already resolved from disk fallback.`
              );
            } else {
              log(
                `📄 Using the current version ${currentVersion} already resolved from git tag "${latestMatchingGitTag.tag}".`
              );
            }
          }
          break;
        }
        default:
          throw new Error(
            `Invalid value for options.currentVersionResolver: ${options.currentVersionResolver}`
          );
      }

      if (options.specifier) {
        log(`📄 Using the provided version specifier "${options.specifier}".`);
      }

      /**
       * If we are versioning independently then we always need to determine the specifier for each project individually, except
       * for the case where the user has provided an explicit specifier on the command.
       *
       * Otherwise, if versioning the projects together we only need to perform this logic if the specifier is still unset from
       * previous iterations of the loop.
       *
       * NOTE: In the case that we have previously determined via conventional commits that no changes are necessary, the specifier
       * will be explicitly set to `null`, so that is why we only check for `undefined` explicitly here.
       */
      if (
        specifier === undefined ||
        (options.releaseGroup.projectsRelationship === 'independent' &&
          !options.specifier)
      ) {
        const specifierSource = options.specifierSource;
        switch (specifierSource) {
          case 'conventional-commits':
            if (options.currentVersionResolver !== 'git-tag') {
              throw new Error(
                `Invalid currentVersionResolver "${options.currentVersionResolver}" provided for release group "${options.releaseGroup.name}". Must be "git-tag" when "specifierSource" is "conventional-commits"`
              );
            }

            const affectedProjects =
              options.releaseGroup.projectsRelationship === 'independent'
                ? [projectName]
                : projects.map((p) => p.name);

            specifier = await resolveSemverSpecifierFromConventionalCommits(
              latestMatchingGitTag.tag,
              options.projectGraph,
              affectedProjects
            );

            if (!specifier) {
              log(
                `🚫 No changes were detected using git history and the conventional commits standard.`
              );
              break;
            }

            // TODO: reevaluate this logic/workflow for independent projects
            //
            // Always assume that if the current version is a prerelease, then the next version should be a prerelease.
            // Users must manually graduate from a prerelease to a release by providing an explicit specifier.
            if (prerelease(currentVersion)) {
              specifier = 'prerelease';
              log(
                `📄 Resolved the specifier as "${specifier}" since the current version is a prerelease.`
              );
            } else {
              log(
                `📄 Resolved the specifier as "${specifier}" using git history and the conventional commits standard.`
              );
            }
            break;
          case 'prompt': {
            // Only add the release group name to the log if it is one set by the user, otherwise it is useless noise
            const maybeLogReleaseGroup = (log: string): string => {
              if (
                options.releaseGroup.name === IMPLICIT_DEFAULT_RELEASE_GROUP
              ) {
                return log;
              }
              return `${log} within release group "${options.releaseGroup.name}"`;
            };
            if (options.releaseGroup.projectsRelationship === 'independent') {
              specifier = await resolveSemverSpecifierFromPrompt(
                `${maybeLogReleaseGroup(
                  `What kind of change is this for project "${projectName}"`
                )}?`,
                `${maybeLogReleaseGroup(
                  `What is the exact version for project "${projectName}"`
                )}?`
              );
            } else {
              specifier = await resolveSemverSpecifierFromPrompt(
                `${maybeLogReleaseGroup(
                  `What kind of change is this for the ${projects.length} matched projects(s)`
                )}?`,
                `${maybeLogReleaseGroup(
                  `What is the exact version for the ${projects.length} matched project(s)`
                )}?`
              );
            }
            break;
          }
          default:
            throw new Error(
              `Invalid specifierSource "${specifierSource}" provided. Must be one of "prompt" or "conventional-commits"`
            );
        }
      }

      // Resolve any local package dependencies for this project (before applying the new version or updating the versionData)
      const localPackageDependencies = resolveLocalPackageDependencies(
        tree,
        options.projectGraph,
        projects,
        projectNameToPackageRootMap,
        resolvePackageRoot,
        // includeAll when the release group is independent, as we may be filtering to a specific subset of projects, but we still want to update their dependents
        options.releaseGroup.projectsRelationship === 'independent'
      );

      const updateDependentsOptions = options.updateDependents ?? {};
      // "auto" means "only when the dependents are already included in the current batch", and is the default
      updateDependentsOptions.when = updateDependentsOptions.when || 'auto';
      // in the case "when" is set to "always", what semver bump should be applied to the dependents which are not included in the current batch
      updateDependentsOptions.bump = updateDependentsOptions.bump || 'patch';

      const allDependentProjects = Object.values(localPackageDependencies)
        .flat()
        .filter((localPackageDependency) => {
          return localPackageDependency.target === project.name;
        });

      const dependentProjectsInCurrentBatch = [];
      const dependentProjectsOutsideCurrentBatch = [];

      for (const dependentProject of allDependentProjects) {
        const isInCurrentBatch = options.projects.some(
          (project) => project.name === dependentProject.source
        );
        if (!isInCurrentBatch) {
          dependentProjectsOutsideCurrentBatch.push(dependentProject);
        } else {
          dependentProjectsInCurrentBatch.push(dependentProject);
        }
      }

      // If not always updating dependents (when they don't already appear in the batch itself), print a warning to the user about what is being skipped and how to change it
      if (updateDependentsOptions.when === 'auto') {
        if (dependentProjectsOutsideCurrentBatch.length > 0) {
          let logMsg = `⚠️  Warning, the following packages depend on "${project.name}"`;
          if (options.releaseGroup.name === IMPLICIT_DEFAULT_RELEASE_GROUP) {
            logMsg += ` but have been filtered out via --projects, and therefore will not be updated:`;
          } else {
            logMsg += ` but are either not part of the current release group "${options.releaseGroup.name}", or have been filtered out via --projects, and therefore will not be updated:`;
          }
          const indent = Array.from(new Array(projectName.length + 4))
            .map(() => ' ')
            .join('');
          logMsg += `\n${dependentProjectsOutsideCurrentBatch
            .map((dependentProject) => `${indent}- ${dependentProject.source}`)
            .join('\n')}`;
          logMsg += `\n${indent}=> You can adjust this behavior by setting \`version.generatorOptions.updateDependents.when\` to "always"`;
          log(logMsg);
        }
      }

      versionData[projectName] = {
        currentVersion,
        newVersion: null, // will stay as null in the final result in the case that no changes are detected
        additionalDependentProjects: dependentProjectsOutsideCurrentBatch,
      };

      if (!specifier) {
        log(
          `🚫 Skipping versioning "${projectPackageJson.name}" as no changes were detected.`
        );
        continue;
      }

      const newVersion = deriveNewSemverVersion(
        currentVersion,
        specifier,
        options.preid
      );
      versionData[projectName].newVersion = newVersion;

      writeJson(tree, packageJsonPath, {
        ...projectPackageJson,
        version: newVersion,
      });

      log(
        `✍️  New version ${newVersion} written to ${workspaceRelativePackageJsonPath}`
      );

      if (allDependentProjects.length > 0) {
        const totalProjectsToUpdate =
          updateDependentsOptions.when === 'always'
            ? allDependentProjects.length
            : dependentProjectsInCurrentBatch.length;
        if (totalProjectsToUpdate > 0) {
          log(
            `✍️  Applying new version ${newVersion} to ${totalProjectsToUpdate} ${
              totalProjectsToUpdate > 1
                ? 'packages which depend'
                : 'package which depends'
            } on ${project.name}`
          );
        }
      }

      const updateDependentProjectAndAddToVersionData = ({
        dependentProject,
        versionBump,
      }: {
        dependentProject: LocalPackageDependency;
        versionBump: 'major' | 'minor' | 'patch' | false;
      }) => {
        const updatedFilePath = joinPathFragments(
          projectNameToPackageRootMap.get(dependentProject.source),
          'package.json'
        );
        updateJson(tree, updatedFilePath, (json) => {
          // Auto (i.e.infer existing) by default
          let versionPrefix = options.versionPrefix ?? 'auto';
          const currentDependencyVersion =
            json[dependentProject.dependencyCollection][packageName];

          // For auto, we infer the prefix based on the current version of the dependent
          if (versionPrefix === 'auto') {
            versionPrefix = ''; // we don't want to end up printing auto
            if (currentDependencyVersion) {
              const prefixMatch = currentDependencyVersion.match(/^[~^]/);
              if (prefixMatch) {
                versionPrefix = prefixMatch[0];
              } else {
                versionPrefix = '';
              }
            }
          }

          // Apply the new version of the dependency to the dependent
          const newDepVersion = `${versionPrefix}${newVersion}`;
          json[dependentProject.dependencyCollection][packageName] =
            newDepVersion;

          // Bump the dependent's version if applicable and record it in the version data
          if (versionBump) {
            const currentPackageVersion = json.version;
            const newPackageVersion = deriveNewSemverVersion(
              currentPackageVersion,
              versionBump,
              options.preid
            );
            json.version = newPackageVersion;
            versionData[dependentProject.source] = {
              currentVersion: currentPackageVersion,
              newVersion: newPackageVersion,
              additionalDependentProjects: [],
            };
          }

          return json;
        });
      };

      for (const dependentProject of dependentProjectsInCurrentBatch) {
        updateDependentProjectAndAddToVersionData({
          dependentProject,
          versionBump: false,
        });
      }

      if (updateDependentsOptions.when === 'always') {
        for (const dependentProject of dependentProjectsOutsideCurrentBatch) {
          updateDependentProjectAndAddToVersionData({
            dependentProject,
            // For these additional dependents, we need to update their own package.json version as well with the appropriate bump
            versionBump: updateDependentsOptions.bump,
          });
        }
      }
    }

    /**
     * Ensure that formatting is applied so that version bump diffs are as minimal as possible
     * within the context of the user's workspace.
     */
    await formatFiles(tree);

    // Return the version data so that it can be leveraged by the overall version command
    return {
      data: versionData,
      callback: async (tree, opts) => {
        const cwd = tree.root;

        const isDaemonEnabled = daemonClient.enabled();
        if (isDaemonEnabled) {
          // temporarily stop the daemon, as it will error if the lock file is updated
          await daemonClient.stop();
        }

        const updatedFiles = updateLockFile(cwd, opts);

        if (isDaemonEnabled) {
          try {
            await daemonClient.startInBackground();
          } catch (e) {
            // If the daemon fails to start, we don't want to prevent the user from continuing, so we just log the error and move on
            if (opts.verbose) {
              output.warn({
                title:
                  'Unable to restart the Nx Daemon. It will be disabled until you run "nx reset"',
                bodyLines: [e.message],
              });
            }
          }
        }
        return updatedFiles;
      },
    };
  } catch (e) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      output.error({
        title: e.message,
      });
      // Dump the full stack trace in verbose mode
      console.error(e);
    } else {
      output.error({
        title: e.message,
      });
    }
    process.exit(1);
  }
}

export default releaseVersionGenerator;

const colors = [
  { instance: chalk.green, spinnerColor: 'green' },
  { instance: chalk.greenBright, spinnerColor: 'green' },
  { instance: chalk.red, spinnerColor: 'red' },
  { instance: chalk.redBright, spinnerColor: 'red' },
  { instance: chalk.cyan, spinnerColor: 'cyan' },
  { instance: chalk.cyanBright, spinnerColor: 'cyan' },
  { instance: chalk.yellow, spinnerColor: 'yellow' },
  { instance: chalk.yellowBright, spinnerColor: 'yellow' },
  { instance: chalk.magenta, spinnerColor: 'magenta' },
  { instance: chalk.magentaBright, spinnerColor: 'magenta' },
] as const;

function getColor(projectName: string) {
  let code = 0;
  for (let i = 0; i < projectName.length; ++i) {
    code += projectName.charCodeAt(i);
  }
  const colorIndex = code % colors.length;

  return colors[colorIndex];
}

async function getNpmRegistry() {
  // Must be non-blocking async to allow spinner to render
  return await new Promise<string>((resolve, reject) => {
    exec('npm config get registry', (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(stderr);
      }
      return resolve(stdout.trim());
    });
  });
}
