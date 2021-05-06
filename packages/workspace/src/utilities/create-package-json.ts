import {
  ProjectGraphExternalNode,
  ProjectGraph,
  isProjectGraphExternalNode,
} from '@nrwl/devkit';
import { readJsonFile } from './fileutils';

/**
 * Creates a package.json in the output directory for support to install dependencies within containers.
 *
 * If a package.json exists in the project, it will reuse that.
 */
export function createPackageJson(
  projectName: string,
  graph: ProjectGraph,
  options: {
    projectRoot?: string;
    root?: string;
  }
): any {
  const npmDeps = findAllNpmDeps(projectName, graph);
  // default package.json if one does not exist
  let packageJson = {
    name: projectName,
    version: '0.0.1',
    dependencies: {},
    devDependencies: {},
  };
  try {
    packageJson = readJsonFile(`${options.projectRoot}/package.json`);
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
  } catch (e) {}

  const rootPackageJson = readJsonFile(`${options.root}/package.json`);
  Object.entries(npmDeps).forEach(([packageName, version]) => {
    if (rootPackageJson.devDependencies?.[packageName]) {
      packageJson.devDependencies[packageName] = version;
    } else {
      packageJson.dependencies[packageName] = version;
    }
  });

  return packageJson;
}

function findAllNpmDeps(
  projectName: string,
  graph: ProjectGraph,
  list: { [packageName: string]: string } = {},
  seen = new Set<string>()
) {
  if (seen.has(projectName)) {
    return list;
  }

  seen.add(projectName);

  const node = graph.nodes[projectName];

  if (node.type === 'npm' && isProjectGraphExternalNode(node)) {
    list[node.data.packageName] = node.data.version;
    recursivelyCollectPeerDependencies(node.name, graph, list);
  }
  graph.dependencies[projectName]?.forEach((dep) => {
    findAllNpmDeps(dep.target, graph, list, seen);
  });

  return list;
}

function recursivelyCollectPeerDependencies(
  projectName: string,
  graph: ProjectGraph,
  list: { [packageName: string]: string } = {},
  seen: Set<string> = new Set<string>()
) {
  const projectNode = graph.nodes[projectName];
  if (
    projectNode &&
    projectNode.type === 'npm' &&
    !seen.has(projectName) &&
    isProjectGraphExternalNode(projectNode)
  ) {
    seen.add(projectName);
    const packageName = projectNode.data.packageName;
    try {
      const packageJson = require(`${packageName}/package.json`);
      if (packageJson.peerDependencies) {
        Object.keys(packageJson.peerDependencies)
          .map((dependencyName) => `npm:${dependencyName}`)
          .map((dependency) => graph.nodes[dependency])
          .filter(Boolean)
          .forEach((node: ProjectGraphExternalNode) => {
            list[node.data.packageName] = node.data.version;
            recursivelyCollectPeerDependencies(node.name, graph, list, seen);
          });
      }
    } catch {}
  }
  return list;
}
