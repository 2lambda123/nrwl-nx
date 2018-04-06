import { writeToFile, createDirectory } from '../utils/fileutils';
import * as graphviz from 'graphviz';
import * as appRoot from 'app-root-path';
import * as opn from 'opn';
import { readFileSync } from 'fs';
const viz = require('viz.js'); // typings are incorrect in viz.js library - need to use `require`

import {
  ProjectNode,
  ProjectType,
  dependencies,
  Deps,
  Dependency,
  DependencyType
} from './affected-apps';

import { readCliConfig, getProjectNodes } from './shared';

export const defaultHTMLExportFilename = '.vis/dep-graph.html';

export enum NodeEdgeVariant {
  default = 'default',
  highlighted = 'highlighted'
}

export type GraphvizOptions = {
  fontname?: string;
  fontsize?: number;
  shape?: string;
  color?: string;
  style?: string;
  fillcolor?: string;
};
export type AttrValue = {
  attr: string;
  value: boolean | number | string;
};

export type GraphvizOptionNodeEdge = {
  [key: string]: {
    [variant: string]: GraphvizOptions;
  };
};

export type GraphvizConfig = {
  graph: AttrValue[];
  nodes: GraphvizOptionNodeEdge;
  edges: GraphvizOptionNodeEdge;
};

export type ProjectMap = {
  [name: string]: ProjectNode;
};

export type CriticalPathMap = {
  [name: string]: boolean;
};

export enum OutputType {
  'json' = 'json',
  'html' = 'html',
  'dot' = 'dot'
}

export type UserOptions = {
  file?: string;
  output?: string;
  files?: string;
  open: boolean;
};

type ParsedUserOptions = {
  isFilePresent?: boolean;
  filename?: string;
  type?: string;
  output?: string;
  shouldOpen: boolean;
};

type OutputOptions = {
  data: string;
  shouldOpen: boolean;
  shouldWriteToFile: boolean;
  filename?: string;
};

type JSONOutput = {
  deps: Deps;
  criticalPath: string[];
};

const defaultConfig = {
  isFilePresent: true,
  filename: '',
  type: OutputType.html,
  shouldOpen: true
};

export const graphvizConfig: GraphvizConfig = {
  graph: [
    {
      attr: 'overlap',
      value: false
    },
    {
      attr: 'pad',
      value: 0.111
    }
  ],
  nodes: {
    [ProjectType.app]: {
      [NodeEdgeVariant.default]: {
        fontname: 'Arial',
        fontsize: 14,
        shape: 'box'
      },
      [NodeEdgeVariant.highlighted]: {
        fontname: 'Arial',
        fontsize: 14,
        shape: 'box',
        color: '#FF0033'
      }
    },
    [ProjectType.lib]: {
      [NodeEdgeVariant.default]: {
        fontname: 'Arial',
        fontsize: 14,
        style: 'filled',
        fillcolor: '#EFEFEF'
      },
      [NodeEdgeVariant.highlighted]: {
        fontname: 'Arial',
        fontsize: 14,
        style: 'filled',
        fillcolor: '#EFEFEF',
        color: '#FF0033'
      }
    }
  },
  edges: {
    [DependencyType.es6Import]: {
      [NodeEdgeVariant.default]: {
        color: '#757575'
      },
      [NodeEdgeVariant.highlighted]: {
        color: '#FF0033'
      }
    },
    [DependencyType.loadChildren]: {
      [NodeEdgeVariant.default]: {
        color: '#757575',
        style: 'dotted'
      },
      [NodeEdgeVariant.highlighted]: {
        color: '#FF0033',
        style: 'dotted'
      }
    },
    [DependencyType.implicit]: {
      [NodeEdgeVariant.default]: {
        color: '#000000',
        style: 'bold'
      },
      [NodeEdgeVariant.highlighted]: {
        color: '#FF0033',
        style: 'bold'
      }
    }
  }
};

function mapProjectNodes(projects: ProjectNode[]) {
  return projects.reduce((m, proj) => ({ ...m, [proj.name]: proj }), {});
}

function getVariant(map: CriticalPathMap, key: string) {
  return map[key] ? NodeEdgeVariant.highlighted : NodeEdgeVariant.default;
}

function getNodeProps(
  config: GraphvizOptionNodeEdge,
  projectNode: ProjectNode,
  criticalPath: CriticalPathMap
) {
  const nodeProps = config[projectNode.type];
  return nodeProps[getVariant(criticalPath, projectNode.name)];
}

function getEdgeProps(
  config: GraphvizOptionNodeEdge,
  depType: DependencyType,
  child: string,
  criticalPath: CriticalPathMap
) {
  const edgeProps = config[depType];
  return edgeProps[getVariant(criticalPath, child)];
}

export function createGraphviz(
  config: GraphvizConfig,
  deps: Deps,
  projects: ProjectNode[],
  criticalPath: CriticalPathMap
) {
  const projectMap: ProjectMap = mapProjectNodes(projects);
  const g = graphviz.digraph('G');

  config.graph.forEach(({ attr, value }) => g.set(attr, value));

  Object.keys(deps)
    .sort() // sorting helps with testing
    .forEach(key => {
      const projectNode = projectMap[key];
      const dependencies = deps[key];

      g.addNode(key, getNodeProps(config.nodes, projectNode, criticalPath));

      if (dependencies.length > 0) {
        dependencies.forEach((dep: Dependency, i: number) => {
          g.addNode(
            dep.projectName,
            getNodeProps(config.nodes, projectNode, criticalPath)
          ); // child node

          g.addEdge(
            key,
            dep.projectName,
            getEdgeProps(config.edges, dep.type, dep.projectName, criticalPath)
          );
        });
      }
    });

  return g.to_dot();
}

function openFileIfRequested(shouldOpen: boolean, filename: string) {
  if (shouldOpen) {
    opn(filename, {
      wait: false
    });
  }
}

function handleOutput({
  data,
  shouldOpen,
  shouldWriteToFile,
  filename
}: OutputOptions) {
  let finalFilename = filename;

  if (!shouldWriteToFile) {
    return console.log(data);
  }

  if (!filename || filename.length === 0) {
    finalFilename = defaultHTMLExportFilename;
    createDirectory('.vis');
  }

  writeToFile(finalFilename, data);

  openFileIfRequested(shouldOpen, finalFilename);
}

function applyHTMLTemplate(svg: string) {
  return `<!DOCTYPE html>
  <html>
    <head><title></title></head>
    <body>${svg}</body>
  </html>
  `;
}

function generateGraphJson(criticalPath?: string[]): JSONOutput {
  const config = readCliConfig();
  const npmScope = config.project.npmScope;
  const projects: ProjectNode[] = getProjectNodes(config);

  // fetch all apps and libs
  const deps = dependencies(npmScope, projects, f =>
    readFileSync(`${appRoot.path}/${f}`, 'utf-8')
  );

  return {
    deps,
    criticalPath
  };
}

function getDot(json: JSONOutput) {
  const config = readCliConfig();
  const projects: ProjectNode[] = getProjectNodes(config);

  return createGraphviz(
    graphvizConfig,
    json.deps,
    projects,
    json.criticalPath.reduce((m, proj) => ({ ...m, [proj]: true }), {})
  );
}

function getConfigFromUserInput(cmdOpts: UserOptions): ParsedUserOptions {
  const filename = cmdOpts.file;
  const output = cmdOpts.output;

  if (filename && output) {
    throw new Error(
      'Received both filename as well as output type. Please only specify one of the options.'
    );
  }

  let isFilePresent = !output;
  const isOpenSupressed = cmdOpts.open === false;
  const shouldOpen = isFilePresent && !isOpenSupressed;

  const extension = !!filename
    ? filename.substr(filename.lastIndexOf('.') + 1)
    : output || OutputType.html;

  return {
    isFilePresent,
    type: extension,
    output: output,
    shouldOpen,
    filename
  };
}

function extractDataFromJson(json, type) {
  switch (type) {
    case OutputType.json:
      return JSON.stringify(json, null, 2);
    case OutputType.dot:
      return getDot(json);
    case OutputType.html:
      return applyHTMLTemplate(viz(getDot(json)));
    default:
      throw new Error('Unrecognized file extension');
  }
}

export function generateGraph(
  args: UserOptions,
  criticalPath?: string[]
): void {
  const json = generateGraphJson(criticalPath || []);

  const config = {
    ...defaultConfig,
    ...getConfigFromUserInput(args)
  };

  if (config.isFilePresent) {
    createDirectory('.vis');
  }

  handleOutput({
    data: extractDataFromJson(json, config.type),
    filename: config.filename,
    shouldWriteToFile: config.isFilePresent,
    shouldOpen: config.shouldOpen
  });
}
