import { performance } from 'perf_hooks';
import { projectFileMapWithFiles } from '../project-graph-incremental-recomputation';

export type ChangedFile = {
  path: string;
  type: 'CREATED' | 'UPDATED' | 'DELETED';
};

export let projectAndGlobalChanges: {
  projects: { [changedProject: string]: ChangedFile[] };
  globalFiles: ChangedFile[];
} = {
  projects: {},
  globalFiles: [],
};

export function setProjectsAndGlobalChanges(
  createdFiles: Set<string> | undefined,
  updatedFiles?: Set<string>,
  deletedFiles?: Set<string>
) {
  performance.mark('changed-projects:start');

  const projectFileMap = projectFileMapWithFiles?.projectFileMap ?? {};

  const allChangedFiles: ChangedFile[] = [
    ...Array.from(createdFiles ?? []).map<ChangedFile>((c) => ({
      path: c,
      type: 'CREATED',
    })),
    ...Array.from(updatedFiles ?? []).map<ChangedFile>((c) => ({
      path: c,
      type: 'UPDATED',
    })),
    ...Array.from(deletedFiles ?? []).map<ChangedFile>((c) => ({
      path: c,
      type: 'DELETED',
    })),
  ];

  for (const changedFile of allChangedFiles) {
    const projects = Object.keys(projectFileMap);
    let globalFile = false;
    for (const project of projects) {
      const hasFile = projectFileMap[project].some(
        (f) => f.file === changedFile.path
      );
      if (hasFile) {
        const projectFiles = (projectAndGlobalChanges.projects[project] ??= []);
        // Only push to the project files if the changed file doesnt already exist
        if (!projectFiles.some((f) => f.path === changedFile.path)) {
          projectFiles.push(changedFile);
        }
        globalFile = false;
        // break this loop because a file can only belong to 1 project
        break;
      } else {
        globalFile = true;
      }
    }
    if (
      globalFile &&
      !projectAndGlobalChanges.globalFiles.some(
        (f) => f.path === changedFile.path
      )
    ) {
      projectAndGlobalChanges.globalFiles.push(changedFile);
    }
  }

  //

  performance.mark('changed-projects:end');
  performance.measure(
    'changed-projects',
    'changed-projects:start',
    'changed-projects:end'
  );
}

export function resetProjectAndGlobalChanges() {
  projectAndGlobalChanges = {
    projects: {},
    globalFiles: [],
  };
}
