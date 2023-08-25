import {
  convertNxGenerator,
  getProjects,
  joinPathFragments,
  ProjectConfiguration,
  readNxJson,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { moveGenerator } from '../move/move';

export async function monorepoGenerator(tree: Tree, options: {}) {
  const projects = getProjects(tree);

  const nxJson = readNxJson(tree);
  updateNxJson(tree, nxJson);

  let rootProject: ProjectConfiguration;
  const projectsToMove: ProjectConfiguration[] = [];

  // Need to determine libs vs packages directory base on the type of root project.
  for (const [, project] of projects) {
    if (project.root === '.') rootProject = project;
    projectsToMove.push(project);
  }

  // Currently, Nx only handles apps+libs or packages. You cannot mix and match them.
  // If the standalone project is an app (React, Angular, etc), then use apps+libs.
  // Otherwise, for TS standalone (lib), use packages.
  const isRootProjectApp = rootProject.projectType === 'application';
  const appsDir = isRootProjectApp ? 'apps' : 'packages';
  const libsDir = isRootProjectApp ? 'libs' : 'packages';

  for (const project of projectsToMove) {
    await moveGenerator(tree, {
      projectName: project.name,
      newProjectName:
        project.projectType === 'application' ? project.name : project.root,
      destination:
        project.projectType === 'application'
          ? joinPathFragments(appsDir, project.name)
          : joinPathFragments(
              libsDir,
              project.root === '.' ? project.name : project.root
            ),
      destinationRelativeToRoot: true,
      updateImportPath: project.projectType === 'library',
    });
  }
}

export default monorepoGenerator;

export const monorepoSchematic = convertNxGenerator(monorepoGenerator);
