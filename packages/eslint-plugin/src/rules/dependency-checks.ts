import { AST } from 'jsonc-eslint-parser';
import { normalizePath, readJsonFile, workspaceRoot } from '@nx/devkit';
import { createESLintRule } from '../utils/create-eslint-rule';
import {
  readProjectGraph,
  removePackageJsonFromFileMap,
} from '../utils/project-graph-utils';
import { findProject, getSourceFilePath } from '../utils/runtime-lint-utils';
import { existsSync } from 'fs';
import { join } from 'path';
import { findProjectsNpmDependencies } from '@nx/js/src/internal';
import { satisfies } from 'semver';
import { getHelperDependenciesFromProjectGraph } from '@nx/js';

// TODO LIST
// - handle helper dependencies (e.g. tslib or @swc/node)

export type Options = [
  {
    buildTargets?: string[];
    checkMissingDependencies?: boolean;
    checkObsoleteDependencies?: boolean;
    checkVersionMismatches?: boolean;
    checkMissingPackageJson?: boolean;
    ignoredDependencies?: string[];
  }
];

export type MessageIds =
  | 'noPackageJson'
  | 'missingDependency'
  | 'obsoleteDependency'
  | 'versionMismatch'
  | 'missingDependencySection';

export const RULE_NAME = 'dependency-checks';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description: `Checks dependencies in project's package.json for version mismatches`,
      recommended: 'error',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          buildTargets: [{ type: 'string' }],
          ignoreDependencies: [{ type: 'string' }],
          checkMissingDependencies: { type: 'boolean' },
          checkObsoleteDependencies: { type: 'boolean' },
          checkVersionMismatches: { type: 'boolean' },
          checkMissingPackageJson: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noPackageJson: `The "package.json" is required for buildable libraries, but does not exist in "{{projectName}}".`,
      missingDependency: `The "{{packageName}}" is missing from the "package.json".`,
      obsoleteDependency: `The "{{packageName}}" is found in the "package.json" but is not used.`,
      versionMismatch: `The "{{packageName}}" is found in the "package.json" but it's range is not matching the installed version. Installed version: {{version}}.`,
      missingDependencySection: `The "dependencies" section is missing from the "package.json".`,
    },
  },
  defaultOptions: [
    {
      buildTargets: ['build'],
      checkMissingDependencies: true,
      checkObsoleteDependencies: true,
      checkVersionMismatches: true,
      checkMissingPackageJson: true,
      ignoredDependencies: [],
    },
  ],
  create(
    context,
    [
      {
        buildTargets,
        ignoredDependencies,
        checkMissingDependencies,
        checkObsoleteDependencies,
        checkVersionMismatches,
        checkMissingPackageJson,
      },
    ]
  ) {
    if (!(context.parserServices as any).isJSON) {
      return {};
    }
    const fileName = normalizePath(context.getFilename());
    // support only package.json and project.json
    if (
      !fileName.endsWith('/package.json') &&
      !fileName.endsWith('/project.json')
    ) {
      return {};
    }

    const projectPath = normalizePath(
      (global as any).projectPath || workspaceRoot
    );
    const sourceFilePath = getSourceFilePath(fileName, projectPath);
    const { projectGraph, projectRootMappings, projectFileMap } =
      readProjectGraph(RULE_NAME);

    if (!projectGraph) {
      return {};
    }

    const sourceProject = findProject(
      projectGraph,
      projectRootMappings,
      sourceFilePath
    );
    const packageJsonPath = join(
      workspaceRoot,
      sourceProject.data.root,
      'package.json'
    );

    // check if source project exists, it's library and has a build target
    if (
      !sourceProject ||
      sourceProject.type !== 'lib' ||
      !buildTargets.some((t) => sourceProject.data.targets?.[t])
    ) {
      return {};
    }
    const buildTarget = buildTargets.find(
      (t) => sourceProject.data.targets?.[t]
    );
    if (!buildTarget) {
      return {};
    }

    // gather helper dependencies for @nx/js executors
    const helperDependencies = getHelperDependenciesFromProjectGraph(
      workspaceRoot,
      sourceProject.name,
      projectGraph
    );

    console.log('helperDependencies', helperDependencies);

    const npmDeps = findProjectsNpmDependencies(
      sourceProject,
      projectGraph,
      buildTarget,
      {
        helperDependencies: helperDependencies.map((dep) => dep.target),
      },
      removePackageJsonFromFileMap(projectFileMap)
    );
    const allDependencies = {
      ...npmDeps.dependencies,
      ...npmDeps.peerDependencies,
    };
    const allDependencyNames = Object.keys(allDependencies);

    let packageJsonDeps: string[] = [];
    if (existsSync(packageJsonPath)) {
      const packageJson = readJsonFile(packageJsonPath);
      packageJsonDeps = Object.keys({
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      });
    }

    function validateMissingDependencies(node: AST.JSONProperty) {
      if (checkMissingDependencies) {
        const missingDeps = allDependencyNames.filter(
          (d) => !packageJsonDeps.find((p) => p === d)
        );

        missingDeps.forEach((d) => {
          if (!ignoredDependencies.includes(d)) {
            context.report({
              node: node as any,
              messageId: 'missingDependency',
              data: { packageName: d },
              // TODO create fixer
            });
          }
        });
      }
    }

    function validateInvalidDependencies(node: AST.JSONProperty) {
      const packageName = (node.key as any).value;
      const packageRange = (node.value as any).value;

      if (!allDependencyNames.includes(packageName)) {
        if (
          checkObsoleteDependencies &&
          !ignoredDependencies.includes(packageName)
        ) {
          context.report({
            node: node as any,
            messageId: 'obsoleteDependency',
            data: { packageName: packageName },
          });
        }
      } else if (
        checkVersionMismatches &&
        !ignoredDependencies.includes(packageName) &&
        !satisfies(allDependencies[packageName], packageRange)
      ) {
        context.report({
          node: node as any,
          messageId: 'versionMismatch',
          data: {
            packageName: packageName,
            version: allDependencies[packageName],
          },
        });
      }
    }

    function validateDependenciesSectionExistance(
      node: AST.JSONObjectExpression
    ) {
      if (
        allDependencyNames.length &&
        allDependencyNames.some((d) => !ignoredDependencies.includes(d))
      ) {
        if (
          !node.properties ||
          !node.properties.some((p) =>
            ['dependencies', 'peerDependencies', 'devDependencies'].includes(
              (p.key as any).value
            )
          )
        ) {
          context.report({
            node: node as any,
            messageId: 'missingDependencySection',
          });
        }
      }
    }

    function validatePackageJsonExistance(node: AST.JSONLiteral) {
      if (
        checkMissingPackageJson &&
        !existsSync(packageJsonPath) &&
        buildTargets.includes(node.value.toString()) &&
        allDependencyNames.length > 0
      ) {
        context.report({
          node: node as any,
          messageId: 'noPackageJson',
          data: { projectName: sourceProject.name },
        });
      }
    }

    if (fileName.endsWith('/package.json')) {
      return {
        ['JSONExpressionStatement > JSONObjectExpression > JSONProperty[key.value=/^(dev|peer)?dependencies$/i]'](
          node: AST.JSONProperty
        ) {
          return validateMissingDependencies(node);
        },
        ['JSONExpressionStatement > JSONObjectExpression > JSONProperty[key.value=/^(dev|peer)?dependencies$/i] > JSONObjectExpression > JSONProperty'](
          node: AST.JSONProperty
        ) {
          return validateInvalidDependencies(node);
        },
        ['JSONExpressionStatement > JSONObjectExpression'](
          node: AST.JSONObjectExpression
        ) {
          return validateDependenciesSectionExistance(node);
        },
      };
    } else {
      return {
        ['JSONExpressionStatement > JSONObjectExpression > JSONProperty[key.value="targets"] > JSONObjectExpression > JSONProperty > JSONLiteral'](
          node: AST.JSONLiteral
        ) {
          return validatePackageJsonExistance(node);
        },
      };
    }
  },
});
