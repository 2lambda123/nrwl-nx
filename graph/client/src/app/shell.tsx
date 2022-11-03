import {
  ArrowLeftCircleIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Tippy from '@tippyjs/react';
import classNames from 'classnames';
// nx-ignore-next-line
import type { DepGraphClientResponse } from 'nx/src/command-line/dep-graph';
import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

import DebuggerPanel from './debugger-panel';
import { useDepGraphService } from './hooks/use-dep-graph';
import { useDepGraphSelector } from './hooks/use-dep-graph-selector';
import { useEnvironmentConfig } from './hooks/use-environment-config';
import { useIntervalWhen } from './hooks/use-interval-when';
import { getProjectGraphDataService } from './hooks/get-project-graph-data-service';
import { getGraphService } from './machines/graph.service';
import {
  lastPerfReportSelector,
  projectIsSelectedSelector,
} from './machines/selectors';
import ProjectsSidebar from './feature-projects/projects-sidebar';
import { selectValueByThemeStatic } from './theme-resolver';
import { getTooltipService } from './tooltip-service';
import ProjectNodeToolTip from './project-node-tooltip';
import EdgeNodeTooltip from './edge-tooltip';
import { Outlet, useNavigate } from 'react-router-dom';
import ThemePanel from './sidebar/theme-panel';
import Dropdown from './ui-components/dropdown';
import { useCurrentPath } from './hooks/use-current-path';
import ExperimentalFeature from './experimental-feature';
import RankdirPanel from './sidebar/rankdir-panel';

const tooltipService = getTooltipService();

export function Shell(): JSX.Element {
  const depGraphService = useDepGraphService();

  const currentTooltip = useSyncExternalStore(
    (callback) => tooltipService.subscribe(callback),
    () => tooltipService.currentTooltip
  );

  const projectGraphService = getProjectGraphDataService();
  const environment = useEnvironmentConfig();
  const lastPerfReport = useDepGraphSelector(lastPerfReportSelector);
  const projectIsSelected = useDepGraphSelector(projectIsSelectedSelector);
  const environmentConfig = useEnvironmentConfig();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    environment.appConfig.defaultProjectGraph
  );

  const navigate = useNavigate();
  const currentRoute = useCurrentPath();

  const routes = [
    { route: '/projects', label: 'Projects' },
    {
      route: '/tasks',
      label: 'Tasks',
    },
  ];

  function projectChange(projectGraphId: string) {
    setSelectedProjectId(projectGraphId);
  }

  useEffect(() => {
    const { appConfig } = environment;

    const projectInfo = appConfig.projectGraphs.find(
      (graph) => graph.id === selectedProjectId
    );

    const fetchProjectGraph = async () => {
      const project: DepGraphClientResponse =
        await projectGraphService.getProjectGraph(projectInfo.url);

      const workspaceLayout = project?.layout;
      console.log('shell');
      depGraphService.send({
        type: 'initGraph',
        projects: project.projects,
        dependencies: project.dependencies,
        affectedProjects: project.affected,
        workspaceLayout: workspaceLayout,
      });
    };
    fetchProjectGraph();
  }, [selectedProjectId, environment, depGraphService, projectGraphService]);

  useIntervalWhen(
    () => {
      const projectInfo = environment.appConfig.projectGraphs.find(
        (graph) => graph.id === selectedProjectId
      );

      const fetchProjectGraph = async () => {
        const project: DepGraphClientResponse =
          await projectGraphService.getProjectGraph(projectInfo.url);

        depGraphService.send({
          type: 'updateGraph',
          projects: project.projects,
          dependencies: project.dependencies,
        });
      };

      fetchProjectGraph();
    },
    5000,
    environment.watch
  );

  function downloadImage() {
    const graph = getGraphService();
    const data = graph.getImage();

    let downloadLink = document.createElement('a');
    downloadLink.href = data;
    downloadLink.download = 'graph.png';
    // this is necessary as link.click() does not work on the latest firefox
    downloadLink.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  }

  return (
    <>
      <div
        className={`${
          environmentConfig.environment === 'nx-console'
            ? 'absolute top-5 left-5 z-50 bg-white'
            : 'relative flex h-full overflow-y-scroll'
        } w-72 flex-col pb-10 shadow-lg ring-1 ring-slate-900/10 ring-opacity-10 transition-all dark:ring-slate-300/10`}
        id="sidebar"
      >
        {environmentConfig.environment !== 'nx-console' ? (
          <>
            <div className="border-b border-slate-900/10 text-slate-700 dark:border-slate-300/10 dark:bg-transparent dark:text-slate-400">
              <div className="mx-4 my-2 flex items-center justify-between">
                <svg
                  className="h-10 w-auto text-slate-900 dark:text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Nx</title>
                  <path d="M11.987 14.138l-3.132 4.923-5.193-8.427-.012 8.822H0V4.544h3.691l5.247 8.833.005-3.998 3.044 4.759zm.601-5.761c.024-.048 0-3.784.008-3.833h-3.65c.002.059-.005 3.776-.003 3.833h3.645zm5.634 4.134a2.061 2.061 0 0 0-1.969 1.336 1.963 1.963 0 0 1 2.343-.739c.396.161.917.422 1.33.283a2.1 2.1 0 0 0-1.704-.88zm3.39 1.061c-.375-.13-.8-.277-1.109-.681-.06-.08-.116-.17-.176-.265a2.143 2.143 0 0 0-.533-.642c-.294-.216-.68-.322-1.18-.322a2.482 2.482 0 0 0-2.294 1.536 2.325 2.325 0 0 1 4.002.388.75.75 0 0 0 .836.334c.493-.105.46.36 1.203.518v-.133c-.003-.446-.246-.55-.75-.733zm2.024 1.266a.723.723 0 0 0 .347-.638c-.01-2.957-2.41-5.487-5.37-5.487a5.364 5.364 0 0 0-4.487 2.418c-.01-.026-1.522-2.39-1.538-2.418H8.943l3.463 5.423-3.379 5.32h3.54l1.54-2.366 1.568 2.366h3.541l-3.21-5.052a.7.7 0 0 1-.084-.32 2.69 2.69 0 0 1 2.69-2.691h.001c1.488 0 1.736.89 2.057 1.308.634.826 1.9.464 1.9 1.541a.707.707 0 0 0 1.066.596zm.35.133c-.173.372-.56.338-.755.639-.176.271.114.412.114.412s.337.156.538-.311c.104-.231.14-.488.103-.74z" />
                </svg>
                <ExperimentalFeature>
                  <Dropdown
                    data-cy="project-select"
                    defaultValue={currentRoute}
                    onChange={(event) => {
                      depGraphService.send('deselectAll');
                      navigate(event.currentTarget.value);
                    }}
                  >
                    {routes.map((route) => (
                      <option value={route.route}>{route.label}</option>
                    ))}
                  </Dropdown>
                </ExperimentalFeature>

                <ExperimentalFeature>
                  <RankdirPanel />
                </ExperimentalFeature>

                <ThemePanel />
              </div>
            </div>

            <a
              id="help"
              className="
      mt-3
      flex cursor-pointer
      items-center
      px-4
      text-xs
      hover:underline
    "
              href="https://nx.dev/structure/dependency-graph"
              rel="noreferrer"
              target="_blank"
            >
              <InformationCircleIcon className="mr-2 h-4 w-4" />
              Analyse and visualize your workspace.
            </a>
          </>
        ) : null}
        <Outlet></Outlet>
      </div>
      <div
        id="main-content"
        className="flex-grow overflow-hidden transition-all"
      >
        {environment.appConfig.showDebugger ? (
          <DebuggerPanel
            projectGraphs={environment.appConfig.projectGraphs}
            selectedProjectGraph={selectedProjectId}
            lastPerfReport={lastPerfReport}
            projectGraphChange={projectChange}
          ></DebuggerPanel>
        ) : null}

        {!projectIsSelected ? (
          <div
            id="no-projects-chosen"
            className="flex text-slate-700 dark:text-slate-400"
          >
            <ArrowLeftCircleIcon className="mr-4 h-6 w-6" />
            <h4>Please select projects in the sidebar.</h4>
          </div>
        ) : null}
        <div id="graph-container">
          <div id="cytoscape-graph"></div>
          {currentTooltip ? (
            <Tippy
              content={
                currentTooltip.type === 'node' ? (
                  <ProjectNodeToolTip
                    {...currentTooltip.props}
                  ></ProjectNodeToolTip>
                ) : (
                  <EdgeNodeTooltip {...currentTooltip.props}></EdgeNodeTooltip>
                )
              }
              visible={true}
              getReferenceClientRect={currentTooltip.ref.getBoundingClientRect}
              theme={selectValueByThemeStatic('dark-nx', 'nx')}
              interactive={true}
              appendTo={document.body}
              maxWidth="none"
            ></Tippy>
          ) : null}

          <Tippy
            content="Download Graph as PNG"
            placement="right"
            theme={selectValueByThemeStatic('dark-nx', 'nx')}
          >
            <button
              type="button"
              className={classNames(
                !projectIsSelected ? 'opacity-0' : '',
                'fixed bottom-4 right-4 z-50 block h-16 w-16 transform rounded-full bg-blue-500 text-white shadow-sm transition duration-300 dark:bg-sky-500'
              )}
              data-cy="downloadImageButton"
              onClick={downloadImage}
            >
              <ArrowDownTrayIcon className="absolute top-1/2 left-1/2 -mt-3 -ml-3 h-6 w-6" />
            </button>
          </Tippy>
        </div>
      </div>
    </>
  );
}
