import { parseSyml, stringifySyml } from '@yarnpkg/parsers';
import { stringify } from '@yarnpkg/lockfile';
import {
  LockFileData,
  PackageDependency,
  PackageVersions,
} from './lock-file-type';
import { sortObject, hashString } from './utils';

type LockFileDependencies = Record<
  string,
  Omit<PackageDependency, 'packageMeta'>
>;

const BERRY_LOCK_FILE_DISCLAIMER = `# This file was generated by Nx. Do not edit this file directly\n# Manual changes might be lost - proceed with caution!\n\n`;

/**
 * Parses `yarn.lock` syml file and maps to {@link LockFileData}
 *
 * @param lockFile
 * @returns
 */
export function parseYarnLockFile(lockFile: string): LockFileData {
  const { __metadata, ...dependencies } = parseSyml(lockFile);

  // Yarn Berry has workspace packages includes, so we need to extract those to metadata
  const [mappedPackages, workspacePackages] = mapPackages(dependencies);
  const isBerry = !!__metadata;
  const hash = hashString(lockFile);
  if (isBerry) {
    return {
      dependencies: mappedPackages,
      lockFileMetadata: {
        __metadata,
        workspacePackages,
      },
      hash,
    };
  } else {
    return { dependencies: mappedPackages, hash };
  }
}

// map original yarn packages to the LockFileData structure
function mapPackages(
  packages: LockFileDependencies
): [LockFileData['dependencies'], LockFileDependencies] {
  const mappedPackages: LockFileData['dependencies'] = {};
  const workspacePackages: LockFileDependencies = {};

  Object.entries(packages).forEach(([keyExpr, value]) => {
    // separate workspace packages from the external ones
    // we only combine them back when stringifying
    if (value.linkType === 'soft') {
      workspacePackages[keyExpr] = value;
    } else {
      // key might be "@nrwl/somedep@1.2.3, @nrwl/somedep@^1.0.0..."
      const keys = keyExpr.split(', ');
      const packageName = keys[0].slice(0, keys[0].lastIndexOf('@'));
      const newKey = `${packageName}@${value.version}`;

      mappedPackages[packageName] = mappedPackages[packageName] || {};
      if (!mappedPackages[packageName][newKey]) {
        mappedPackages[packageName][newKey] = {
          ...value,
          packageMeta: keys,
        };
      } else {
        mappedPackages[packageName][newKey].packageMeta.push(...keys);
      }
    }
  });
  // sort the version in descending order
  Object.keys(mappedPackages).forEach((packageName) => {
    mappedPackages[packageName] = sortObject(
      mappedPackages[packageName],
      undefined,
      true
    );
  });
  return [mappedPackages, workspacePackages];
}

/**
 * Generates yarn.lock file from `LockFileData` object
 *
 * @param lockFileData
 * @returns
 */
export function stringifyYarnLockFile(lockFileData: LockFileData): string {
  // only berry's format has metadata defined
  // this is an easy way to distinguish it from the classic
  const isBerry = !!lockFileData.lockFileMetadata?.__metadata;
  const dependencies = unmapPackages(lockFileData.dependencies, isBerry);
  if (isBerry) {
    const lockFile = {
      __metadata: lockFileData.lockFileMetadata.__metadata,
      ...lockFileData.lockFileMetadata.workspacePackages,
      ...dependencies,
    };
    // berry's stringifySyml doesn't generate comment
    return BERRY_LOCK_FILE_DISCLAIMER + stringifySyml(lockFile);
  } else {
    return stringify(dependencies);
  }
}

// revert mapping of packages from LockFileData to the original JSON structure
// E.g. from:
//  "abc": {
//    "abc@1.2.3": {
//      ...value
//      packageMeta: ["abc@^1.0.0", "abc@~1.2.0"]
//    }
// }
// to:
//  "abc@^1.0.0, abc@~1.2.0": {
//    ...value
//  }
//
function unmapPackages(
  dependencies: LockFileDependencies,
  isBerry = false
): LockFileDependencies {
  const packages: LockFileDependencies = {};

  Object.values(dependencies).forEach((packageVersions) => {
    Object.values(packageVersions).forEach((value) => {
      const { packageMeta, ...rest } = value;
      if (isBerry) {
        // berry's `stringifySyml` does not combine packages
        // we have to do it manually
        packages[packageMeta.join(', ')] = rest;
      } else {
        // classic's `stringify` combines packages with same resolution
        packageMeta.forEach((key) => {
          packages[key] = rest;
        });
      }
    });
  });
  return packages;
}

/**
 * Prunes the lock file data based on the list of packages and their transitive dependencies
 *
 * @param lockFileData
 * @returns
 */
export function pruneYarnLockFile(
  lockFileData: LockFileData,
  packages: string[]
): LockFileData {
  const isBerry = !!lockFileData.lockFileMetadata?.__metadata;
  const prunedDependencies = pruneDependencies(
    lockFileData.dependencies,
    packages
  );

  let prunedLockFileData: LockFileData;
  if (isBerry) {
    const { __metadata, workspacePackages } = lockFileData.lockFileMetadata;
    prunedLockFileData = {
      lockFileMetadata: {
        __metadata,
        workspacePackages: pruneWorkspacePackages(
          workspacePackages,
          prunedDependencies,
          packages
        ),
      },
      dependencies: prunedDependencies,
      hash: '',
    };
  } else {
    prunedLockFileData = { dependencies: prunedDependencies, hash: '' };
  }

  prunedLockFileData.hash = hashString(JSON.stringify(prunedLockFileData));
  return prunedLockFileData;
}

// iterate over packages to collect the affected tree of dependencies
function pruneDependencies(
  dependencies: LockFileData['dependencies'],
  packages: string[]
): LockFileData['dependencies'] {
  const result: LockFileData['dependencies'] = {};

  packages.forEach((packageName) => {
    if (dependencies[packageName]) {
      // take the first version of the package as the default
      const [key, value] = Object.entries(dependencies[packageName])[0];

      result[packageName] = result[packageName] || {};
      result[packageName][key] = value;
      pruneTransitiveDependencies(dependencies, result, value);
    } else {
      console.warn(
        `Could not find ${packageName} in the lock file. Skipping...`
      );
    }
  });

  return result;
}

// find all transitive dependencies of already pruned packages
// and adds them to the collection
// recursively prunes their dependencies
function pruneTransitiveDependencies(
  dependencies: LockFileData['dependencies'],
  prunedDeps: LockFileData['dependencies'],
  value: PackageDependency
): void {
  if (!value.dependencies) {
    return;
  }

  Object.entries(value.dependencies).forEach(([packageName, version]) => {
    if (dependencies[packageName]) {
      // check if package with given version exists in data
      // if yes, return key, value and version expression from packageMeta
      const dependencyTriplet = findDependencyTriplet(
        dependencies[packageName],
        packageName,
        version
      );
      if (dependencyTriplet) {
        const [key, { packageMeta, ...value }, metaVersion] = dependencyTriplet;
        if (!prunedDeps[packageName]) {
          prunedDeps[packageName] = {};
        }

        if (prunedDeps[packageName][key]) {
          const packageMeta = prunedDeps[packageName][key].packageMeta;
          if (packageMeta.indexOf(metaVersion) === -1) {
            packageMeta.push(metaVersion);
            packageMeta.sort();
          }
        } else {
          prunedDeps[packageName][key] = {
            ...value,
            packageMeta: [metaVersion],
          };
          // recurively collect dependencies
          pruneTransitiveDependencies(
            dependencies,
            prunedDeps,
            prunedDeps[packageName][key]
          );
        }
      }
    }
  });
}

// prune dependencies of workspace packages from the lockFileMeta
function pruneWorkspacePackages(
  workspacePackages: LockFileDependencies,
  prunedDependencies: LockFileData['dependencies'],
  packages: string[]
): LockFileDependencies {
  const result: LockFileDependencies = {};

  Object.entries(workspacePackages).forEach(
    ([packageKey, { dependencies, ...value }]) => {
      const isRootPackage = packageKey.indexOf('@workspace:.') !== -1;
      const prunedWorkspaceDependencies = pruneWorkspacePackageDependencies(
        dependencies,
        packages,
        prunedDependencies,
        isRootPackage
      );
      result[packageKey] = {
        ...value,
        dependencies: sortObject(prunedWorkspaceDependencies),
      };
    }
  );

  return result;
}

function pruneWorkspacePackageDependencies(
  dependencies: Record<string, string>,
  packages: string[],
  prunedDependencies: LockFileData['dependencies'],
  isRoot: boolean
): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(dependencies).forEach(
    ([packageName, packageVersion]: [string, string]) => {
      if (
        isPackageVersionMatch(
          prunedDependencies[packageName],
          packageName,
          packageVersion
        )
      ) {
        result[packageName] = packageVersion;
      }
    }
  );
  // add all missing deps to root workspace package
  if (isRoot) {
    packages.forEach((p) => {
      if (!result[p]) {
        // extract first version expression from package's structure
        const metaVersion = Object.values(prunedDependencies[p])[0]
          .packageMeta[0] as string;
        result[p] = metaVersion.split('@npm:')[1];
      }
    });
  }

  return result;
}

// check if package with given version exists in pruned dependencies
function isPackageVersionMatch(
  packageVersions: PackageVersions,
  packageName: string,
  packageVersion: string
): boolean {
  if (!packageVersions) {
    return false;
  }
  const versionExpr = `${packageName}@${packageVersion}`;
  const berryVersionExpr = `${packageName}@npm:${packageVersion}`;

  const values = Object.values(packageVersions);
  for (let i = 0; i < values.length; i++) {
    if (
      values[i].packageMeta.includes(versionExpr) ||
      values[i].packageMeta.includes(berryVersionExpr)
    ) {
      return true;
    }
  }
  return false;
}

// find version of the package in LockFileData that matches given depVersion expression
// returns [package@version, packageValue, package@npm:version]
// for berry, the third parameter is different so we return it as well
function findDependencyTriplet(
  dependency: PackageVersions,
  packageName: string,
  version: string
): [string, PackageDependency, string] {
  const entries = Object.entries(dependency);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    let metaVersion = `${packageName}@${version}`;
    if (value.packageMeta.includes(metaVersion)) {
      return [key, value, metaVersion];
    }
    // for berry, meta version starts with 'npm:'
    metaVersion = `${packageName}@npm:${version}`;
    if (value.packageMeta.includes(metaVersion)) {
      return [key, value, metaVersion];
    }
  }
  return;
}
