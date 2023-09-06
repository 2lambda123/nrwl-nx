import { ProjectGraph } from '../config/project-graph';
import {
  ExternalNode,
  Project,
  Target,
  ProjectGraph as RustProjectGraph,
} from './index';

export function transformProjectGraphForRust(
  graph: ProjectGraph
): RustProjectGraph {
  const dependencies: Record<string, string[]> = {};
  const nodes: Record<string, Project> = {};
  const externalNodes: Record<string, ExternalNode> = {};
  for (const [projectName, projectNode] of Object.entries(graph.nodes)) {
    const targets: Record<string, Target> = {};
    for (const [targetName, targetConfig] of Object.entries(
      projectNode.data.targets
    )) {
      targets[targetName] = {
        executor: targetConfig.executor,
        inputs: targetConfig.inputs,
        outputs: targetConfig.outputs,
      };
    }
    nodes[projectName] = {
      root: projectNode.data.root,
      targets,
    };
    if (graph.dependencies[projectName]) {
      dependencies[projectName] = [];
      for (const dep of graph.dependencies[projectName]) {
        dependencies[projectName].push(dep.target);
      }
    }
  }
  for (const [projectName, externalNode] of Object.entries(
    graph.externalNodes
  )) {
    externalNodes[projectName] = {
      hash: externalNode.data.hash,
      version: externalNode.data.version,
    };
    if (graph.dependencies[projectName]) {
      dependencies[projectName] = [];
      for (const dep of graph.dependencies[projectName]) {
        dependencies[projectName].push(dep.target);
      }
    }
  }

  return {
    nodes,
    externalNodes,
    dependencies,
  };
}
