import * as chalk from 'chalk';
import { output } from '../output';
import type { CommunityPlugin, CorePlugin, PluginCapabilities } from './models';
import { getPluginCapabilities } from './plugin-capabilities';
import { hasElements } from './shared';
import { readJsonFile } from '../fileutils';
import { PackageJson, readModulePackageJson } from '../package-json';
import { workspaceRoot } from '../workspace-root';
import { join } from 'path';
import { NxJsonConfiguration } from '../../config/nx-json';

export function findInstalledPlugins(): PackageJson[] {
  const packageJsonDeps = getDependenciesFromPackageJson();
  const nxJsonDeps = getDependenciesFromNxJson();
  const deps = packageJsonDeps.concat(nxJsonDeps);
  return deps.reduce(
    (arr: any[], nextDep: string): { project: string; version: string }[] => {
      try {
        const depPackageJson: Partial<PackageJson> =
          readModulePackageJson(nextDep, [
            workspaceRoot,
            join(workspaceRoot, '.nx', ' installation'),
          ]).packageJson || {};
        if (
          [
            'ng-update',
            'nx-migrations',
            'schematics',
            'generators',
            'builders',
            'executors',
          ].some((field) => field in depPackageJson)
        ) {
          arr.push({ package: nextDep, ...depPackageJson });
          return arr;
        } else {
          return arr;
        }
      } catch {
        return arr;
      }
    },
    []
  );
}

function getDependenciesFromPackageJson(
  packageJsonPath = 'package.json'
): string[] {
  try {
    const { dependencies, devDependencies } = readJsonFile(
      join(workspaceRoot, packageJsonPath)
    );
    return Object.keys({ ...dependencies, ...devDependencies });
  } catch {}
  return [];
}

function getDependenciesFromNxJson(): string[] {
  const { installation } = readJsonFile<NxJsonConfiguration>(
    join(workspaceRoot, 'nx.json')
  );
  if (!installation) {
    return [];
  }
  return ['nx', ...Object.keys(installation.plugins || {})];
}

export function getInstalledPluginsAndCapabilities(
  workspaceRoot: string,
  corePlugins: CorePlugin[],
  communityPlugins: CommunityPlugin[] = []
): Map<string, PluginCapabilities> {
  const plugins = new Set([
    ...corePlugins.map((p) => p.name),
    ...communityPlugins.map((p) => p.name),
    ...findInstalledPlugins().map((p) => p.name),
  ]);

  return new Map(
    Array.from(plugins)
      .filter((name) => {
        try {
          // Check for `package.json` existence instead of requiring the module itself
          // because malformed entries like `main`, may throw false exceptions.
          readModulePackageJson(name, [workspaceRoot]);
          return true;
        } catch {
          return false;
        }
      })
      .sort()
      .map<[string, PluginCapabilities]>((name) => [
        name,
        getPluginCapabilities(workspaceRoot, name),
      ])
      .filter(([, x]) => x && !!(x.generators || x.executors))
  );
}

export function listInstalledPlugins(
  installedPlugins: Map<string, PluginCapabilities>
) {
  const bodyLines: string[] = [];

  for (const [, p] of installedPlugins) {
    const capabilities = [];
    if (hasElements(p.executors)) {
      capabilities.push('executors');
    }
    if (hasElements(p.generators)) {
      capabilities.push('generators');
    }
    bodyLines.push(`${chalk.bold(p.name)} (${capabilities.join()})`);
  }

  output.log({
    title: `Installed plugins:`,
    bodyLines: bodyLines,
  });
}
