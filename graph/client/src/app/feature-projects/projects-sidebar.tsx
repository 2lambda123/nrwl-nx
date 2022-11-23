import { useCallback, useEffect } from 'react';
import ExperimentalFeature from '../ui-components/experimental-feature';
import { useProjectGraphSelector } from './hooks/use-project-graph-selector';
import {
  collapseEdgesSelector,
  focusedProjectNameSelector,
  getTracingInfo,
  groupByFolderSelector,
  hasAffectedProjectsSelector,
  includePathSelector,
  searchDepthSelector,
  textFilterSelector,
} from './machines/selectors';
import CollapseEdgesPanel from './panels/collapse-edges-panel';
import FocusedPanel from '../ui-components/focused-panel';
import GroupByFolderPanel from './panels/group-by-folder-panel';
import ProjectList from './project-list';
import SearchDepth from './panels/search-depth';
import ShowHideProjects from '../ui-components/show-hide-all';
import TextFilterPanel from './panels/text-filter-panel';
import TracingPanel from './panels/tracing-panel';
import { useEnvironmentConfig } from '../hooks/use-environment-config';
import { TracingAlgorithmType } from './machines/interfaces';
import { getProjectGraphService } from '../machines/get-services';
import { useIntervalWhen } from '../hooks/use-interval-when';
// nx-ignore-next-line
import { ProjectGraphClientResponse } from 'nx/src/command-line/dep-graph';
import { useParams, useRouteLoaderData } from 'react-router-dom';
import { getProjectGraphDataService } from '../hooks/get-project-graph-data-service';

export function ProjectsSidebar(): JSX.Element {
  const environmentConfig = useEnvironmentConfig();
  const projectGraphService = getProjectGraphService();
  const focusedProject = useProjectGraphSelector(focusedProjectNameSelector);
  const searchDepthInfo = useProjectGraphSelector(searchDepthSelector);
  const includePath = useProjectGraphSelector(includePathSelector);
  const textFilter = useProjectGraphSelector(textFilterSelector);
  const hasAffectedProjects = useProjectGraphSelector(
    hasAffectedProjectsSelector
  );
  const groupByFolder = useProjectGraphSelector(groupByFolderSelector);
  const collapseEdges = useProjectGraphSelector(collapseEdgesSelector);

  const isTracing = projectGraphService.state.matches('tracing');
  const tracingInfo = useProjectGraphSelector(getTracingInfo);
  const projectGraphDataService = getProjectGraphDataService();

  const selectedProjectRouteData = useRouteLoaderData(
    'selectedWorkspace'
  ) as ProjectGraphClientResponse;
  const params = useParams();

  function resetFocus() {
    projectGraphService.send({ type: 'unfocusProject' });
  }

  function showAllProjects() {
    projectGraphService.send({ type: 'selectAll' });
  }

  function hideAllProjects() {
    projectGraphService.send({ type: 'deselectAll' });
  }

  function showAffectedProjects() {
    projectGraphService.send({ type: 'selectAffected' });
  }

  function searchDepthFilterEnabledChange(checked: boolean) {
    projectGraphService.send({
      type: 'setSearchDepthEnabled',
      searchDepthEnabled: checked,
    });
  }

  function groupByFolderChanged(checked: boolean) {
    projectGraphService.send({
      type: 'setGroupByFolder',
      groupByFolder: checked,
    });
  }

  function collapseEdgesChanged(checked: boolean) {
    projectGraphService.send({
      type: 'setCollapseEdges',
      collapseEdges: checked,
    });
  }

  function incrementDepthFilter() {
    projectGraphService.send({ type: 'incrementSearchDepth' });
  }

  function decrementDepthFilter() {
    projectGraphService.send({ type: 'decrementSearchDepth' });
  }

  function resetTextFilter() {
    projectGraphService.send({ type: 'clearTextFilter' });
  }

  function includeLibsInPathChange() {
    projectGraphService.send({
      type: 'setIncludeProjectsByPath',
      includeProjectsByPath: !includePath,
    });
  }

  function resetTraceStart() {
    projectGraphService.send({ type: 'clearTraceStart' });
  }

  function resetTraceEnd() {
    projectGraphService.send({ type: 'clearTraceEnd' });
  }

  function setAlgorithm(algorithm: TracingAlgorithmType) {
    projectGraphService.send({
      type: 'setTracingAlgorithm',
      algorithm: algorithm,
    });
  }

  useEffect(() => {
    projectGraphService.send({
      type: 'setProjects',
      projects: selectedProjectRouteData.projects,
      dependencies: selectedProjectRouteData.dependencies,
      affectedProjects: selectedProjectRouteData.affected,
      workspaceLayout: selectedProjectRouteData.layout,
    });
  }, [selectedProjectRouteData]);

  useIntervalWhen(
    () => {
      const selectedWorkspaceId =
        params.selectedWorkspaceId ??
        environmentConfig.appConfig.defaultWorkspaceId;

      const projectInfo = environmentConfig.appConfig.workspaces.find(
        (graph) => graph.id === selectedWorkspaceId
      );

      const fetchProjectGraph = async () => {
        const project: ProjectGraphClientResponse =
          await projectGraphDataService.getProjectGraph(
            projectInfo.projectGraphUrl
          );

        projectGraphService.send({
          type: 'updateGraph',
          projects: project.projects,
          dependencies: project.dependencies,
        });
      };

      fetchProjectGraph();
    },
    5000,
    environmentConfig.watch
  );

  const updateTextFilter = useCallback(
    (textFilter: string) => {
      projectGraphService.send({ type: 'filterByText', search: textFilter });
    },
    [projectGraphService]
  );

  return (
    <>
      {focusedProject ? (
        <FocusedPanel
          focusedLabel={focusedProject}
          resetFocus={resetFocus}
        ></FocusedPanel>
      ) : null}
      {isTracing ? (
        <TracingPanel
          start={tracingInfo.start}
          end={tracingInfo.end}
          algorithm={tracingInfo.algorithm}
          setAlgorithm={setAlgorithm}
          resetStart={resetTraceStart}
          resetEnd={resetTraceEnd}
        ></TracingPanel>
      ) : null}

      <TextFilterPanel
        includePath={includePath}
        resetTextFilter={resetTextFilter}
        textFilter={textFilter}
        toggleIncludeLibsInPathChange={includeLibsInPathChange}
        updateTextFilter={updateTextFilter}
      ></TextFilterPanel>

      <div>
        <ShowHideProjects
          hideAll={hideAllProjects}
          showAll={showAllProjects}
          showAffected={showAffectedProjects}
          hasAffected={hasAffectedProjects}
          label="projects"
        ></ShowHideProjects>

        <GroupByFolderPanel
          groupByFolder={groupByFolder}
          groupByFolderChanged={groupByFolderChanged}
        ></GroupByFolderPanel>

        <SearchDepth
          searchDepth={searchDepthInfo.searchDepth}
          searchDepthEnabled={searchDepthInfo.searchDepthEnabled}
          searchDepthFilterEnabledChange={searchDepthFilterEnabledChange}
          incrementDepthFilter={incrementDepthFilter}
          decrementDepthFilter={decrementDepthFilter}
        ></SearchDepth>

        <ExperimentalFeature>
          <div className="mx-4 mt-4 rounded-lg border-2 border-dashed border-purple-500 p-4 shadow-lg dark:border-purple-600 dark:bg-[#0B1221]">
            <h3 className="cursor-text px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-200 lg:text-xs">
              Experimental Features
            </h3>
            <CollapseEdgesPanel
              collapseEdges={collapseEdges}
              collapseEdgesChanged={collapseEdgesChanged}
            ></CollapseEdgesPanel>
          </div>
        </ExperimentalFeature>
      </div>

      {environmentConfig.environment !== 'nx-console' ? (
        <ProjectList></ProjectList>
      ) : null}
    </>
  );
}

export default ProjectsSidebar;
