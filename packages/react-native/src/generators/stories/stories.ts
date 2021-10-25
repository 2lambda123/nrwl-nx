import { getComponentName } from '@nrwl/react/src/utils/ast-utils';
import * as ts from 'typescript';
import {
  convertNxGenerator,
  getProjects,
  joinPathFragments,
  ProjectType,
  Tree,
  visitNotIgnoredFiles,
} from '@nrwl/devkit';
import { join } from 'path';

import componentStoryGenerator from '../component-story/component-story';

export interface StorybookStoriesSchema {
  project: string;
}

export function projectRootPath(
  tree: Tree,
  sourceRoot: string,
  projectType: ProjectType
): string {
  let projectDir = '';
  if (projectType === 'application') {
    // apps/test-app/src/app
    projectDir = 'app';
  } else if (projectType == 'library') {
    // libs/test-lib/src/lib
    projectDir = 'lib';
  }

  return joinPathFragments(sourceRoot, projectDir);
}

function containsComponentDeclaration(
  tree: Tree,
  componentPath: string
): boolean {
  const contents = tree.read(componentPath, 'utf-8');
  if (contents === null) {
    throw new Error(`Failed to read ${componentPath}`);
  }

  const sourceFile = ts.createSourceFile(
    componentPath,
    contents,
    ts.ScriptTarget.Latest,
    true
  );

  return !!getComponentName(sourceFile);
}

export async function createAllStories(tree: Tree, projectName: string) {
  const projects = getProjects(tree);
  const project = projects.get(projectName);

  const { sourceRoot, projectType } = project;
  const projectPath = projectRootPath(tree, sourceRoot, projectType);

  let componentPaths: string[] = [];
  visitNotIgnoredFiles(tree, projectPath, (path) => {
    if (path.endsWith('.tsx') && !path.endsWith('.spec.tsx')) {
      componentPaths.push(path);
    }
  });

  await Promise.all(
    componentPaths.map(async (componentPath) => {
      const relativeCmpDir = componentPath.replace(join(sourceRoot, '/'), '');

      if (!containsComponentDeclaration(tree, componentPath)) {
        return;
      }

      await componentStoryGenerator(tree, {
        componentPath: relativeCmpDir,
        project: projectName,
      });
    })
  );
}

export async function storiesGenerator(
  host: Tree,
  schema: StorybookStoriesSchema
) {
  await createAllStories(host, schema.project);
}

export default storiesGenerator;
export const storiesSchematic = convertNxGenerator(storiesGenerator);
