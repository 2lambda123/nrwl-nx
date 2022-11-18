import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/solid';
// nx-ignore-next-line
import type { ProjectGraphNode } from '@nrwl/devkit';
import { getProjectsByType, groupProjectsByDirectory } from '../util';
import { WorkspaceLayout } from '../interfaces';
import Tag from '../ui-components/tag';

interface SidebarTarget {
  targetName: string;
  configurations: Array<{
    name: string;
    isSelected: boolean;
    default: boolean;
  }>;
}

interface SidebarProjectWithTargets {
  projectGraphNode: ProjectGraphNode;
  targets: SidebarTarget[];
}

function createTaskName(
  project: string,
  target: string,
  configuration?: string
) {
  if (configuration) {
    return `${project}:${target}:${configuration}`;
  } else {
    return `${project}:${target}`;
  }
}

function ProjectListItem({
  project,
  selectTask,
  selectedTaskId,
}: {
  project: SidebarProjectWithTargets;
  selectTask: (taskId: string) => void;
  selectedTaskId: string;
}) {
  return (
    <li className="relative block cursor-default select-none py-1 pl-2 pr-6 text-xs text-slate-600 dark:text-slate-400">
      <strong>{project.projectGraphNode.name}</strong>
      <br />
      {project.targets.map((target) => (
        <>
          <div className="flex items-center">
            <button
              data-cy={`focus-button-${createTaskName(
                project.projectGraphNode.name,
                target.targetName
              )}`}
              type="button"
              className="mr-1 flex items-center rounded-md border-slate-300 bg-white p-1 font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 hover:dark:bg-slate-700"
              title="Focus on this task"
              onClick={() =>
                selectTask(
                  `${createTaskName(
                    project.projectGraphNode.name,
                    target.targetName
                  )}`
                )
              }
            >
              <DocumentMagnifyingGlassIcon className="h-5 w-5" />
            </button>

            <label
              className="ml-2 block w-full truncate rounded-md p-2 font-mono font-normal"
              title={createTaskName(
                project.projectGraphNode.name,
                target.targetName
              )}
              data-active={
                selectedTaskId ===
                createTaskName(project.projectGraphNode.name, target.targetName)
              }
            >
              {target.targetName}{' '}
            </label>
          </div>
          {target.configurations.map((configuration) => (
            <div className="flex items-center">
              <button
                data-cy={`focus-button-${createTaskName(
                  project.projectGraphNode.name,
                  target.targetName,
                  configuration.name
                )}`}
                type="button"
                className="mr-1 flex items-center rounded-md border-slate-300 bg-white p-1 font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 hover:dark:bg-slate-700"
                title="Focus on this task"
                onClick={() =>
                  selectTask(
                    `${project.projectGraphNode.name}:${target.targetName}:${configuration.name}`
                  )
                }
              >
                <DocumentMagnifyingGlassIcon className="h-5 w-5" />
              </button>

              <label
                className="ml-4 block w-full cursor-pointer truncate rounded-md p-2 font-mono font-normal transition hover:bg-slate-50 hover:dark:bg-slate-700"
                data-project={configuration.name}
                title={configuration.name}
                data-active={
                  selectedTaskId ===
                  createTaskName(
                    project.projectGraphNode.name,
                    target.targetName,
                    configuration.name
                  )
                }
              >
                {configuration.name}
              </label>

              {configuration.default ? <Tag>default</Tag> : null}
            </div>
          ))}
        </>
      ))}
    </li>
  );
}

function SubProjectList({
  headerText = '',
  projects,
  selectTask,
  selectedTaskId,
}: {
  headerText: string;
  projects: SidebarProjectWithTargets[];
  selectTask: (taskId: string) => void;
  selectedTaskId: string;
}) {
  let sortedProjects = [...projects];
  sortedProjects.sort((a, b) => {
    return a.projectGraphNode.name.localeCompare(b.projectGraphNode.name);
  });

  return (
    <>
      {headerText !== '' ? (
        <h3 className="mt-4 cursor-text py-2 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-200 lg:text-xs">
          {headerText}
        </h3>
      ) : null}
      <ul className="mt-2 -ml-3">
        {sortedProjects.map((project) => {
          return (
            <ProjectListItem
              key={project.projectGraphNode.name}
              project={project}
              selectTask={selectTask}
              selectedTaskId={selectedTaskId}
            ></ProjectListItem>
          );
        })}
      </ul>
    </>
  );
}

function mapToSidebarProjectWithTasks(
  project: ProjectGraphNode,
  selectedTask: string
): SidebarProjectWithTargets {
  const targets: SidebarTarget[] = [];

  for (const targetName in project.data?.targets) {
    const target: SidebarTarget = {
      targetName,
      configurations: [],
    };

    for (const configuration in project.data?.targets?.[targetName]
      ?.configurations) {
      target.configurations.push({
        name: configuration,
        isSelected: configuration === selectedTask,
        default:
          configuration ===
          project.data?.targets?.[targetName]?.defaultConfiguration,
      });
    }

    targets.push(target);
  }

  return {
    projectGraphNode: project,
    targets,
  };
}

export interface TaskListProps {
  projects: ProjectGraphNode[];
  workspaceLayout: WorkspaceLayout;
  selectedTask: string;
  selectTask: (taskId: string) => void;
}

export function TaskList({
  projects,
  workspaceLayout,
  selectedTask,
  selectTask,
}: TaskListProps) {
  const appProjects = getProjectsByType('app', projects);
  const libProjects = getProjectsByType('lib', projects);
  const e2eProjects = getProjectsByType('e2e', projects);

  const appDirectoryGroups = groupProjectsByDirectory(
    appProjects,
    workspaceLayout
  );
  const libDirectoryGroups = groupProjectsByDirectory(
    libProjects,
    workspaceLayout
  );
  const e2eDirectoryGroups = groupProjectsByDirectory(
    e2eProjects,
    workspaceLayout
  );

  const sortedAppDirectories = Object.keys(appDirectoryGroups).sort();
  const sortedLibDirectories = Object.keys(libDirectoryGroups).sort();
  const sortedE2EDirectories = Object.keys(e2eDirectoryGroups).sort();

  return (
    <div id="project-lists" className="mt-8 border-t border-slate-400/10 px-4">
      <h2 className="mt-8 border-b border-solid border-slate-200/10 text-lg font-light text-slate-400 dark:text-slate-500">
        app projects
      </h2>

      {sortedAppDirectories.map((directoryName) => {
        return (
          <SubProjectList
            key={'app-' + directoryName}
            headerText={directoryName}
            projects={appDirectoryGroups[directoryName].map((project) =>
              mapToSidebarProjectWithTasks(project, selectedTask)
            )}
            selectTask={selectTask}
            selectedTaskId={selectedTask}
          ></SubProjectList>
        );
      })}

      <h2 className="mt-8 border-b border-solid border-slate-200/10 text-lg font-light">
        e2e projects
      </h2>

      {sortedE2EDirectories.map((directoryName) => {
        return (
          <SubProjectList
            key={'e2e-' + directoryName}
            headerText={directoryName}
            projects={e2eDirectoryGroups[directoryName].map((project) =>
              mapToSidebarProjectWithTasks(project, selectedTask)
            )}
            selectTask={selectTask}
            selectedTaskId={selectedTask}
          ></SubProjectList>
        );
      })}

      <h2 className="mt-8 border-b border-solid border-slate-200/10 text-lg font-light">
        lib projects
      </h2>

      {sortedLibDirectories.map((directoryName) => {
        return (
          <SubProjectList
            key={'lib-' + directoryName}
            headerText={directoryName}
            projects={libDirectoryGroups[directoryName].map((project) =>
              mapToSidebarProjectWithTasks(project, selectedTask)
            )}
            selectTask={selectTask}
            selectedTaskId={selectedTask}
          ></SubProjectList>
        );
      })}
    </div>
  );
}

export default TaskList;
