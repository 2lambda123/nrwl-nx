/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

/**
 * Expands the given entries into a list of existing directories and files.
 * This is used for copying outputs to and from the cache
 */
export function expandOutputs(directory: string, entries: Array<string>): Array<string>
/**
 * Expands the given outputs into a list of existing files.
 * This is used when hashing outputs
 */
export function getFilesForOutputs(directory: string, entries: Array<string>): Array<string>
export function remove(src: string): void
export function copy(src: string, dest: string): void
export function hashArray(input: Array<string>): string
export function hashFile(file: string): string | null
export function hashFiles(workspaceRoot: string): Record<string, string>
export function findImports(projectFileMap: Record<string, Array<string>>): Array<ImportResult>
export interface ExternalNodeData {
  version: string
  hash?: string
}
export interface ExternalNode {
  version: string
  hash?: string
}
export interface Target {
  executor?: string
  inputs?: Array<JsInputs>
  outputs?: Array<string>
}
export interface Project {
  root: string
  namedInputs?: Record<string, Array<JsInputs>>
  tags?: Array<string>
  targets: Record<string, Target>
}
export interface ProjectGraph {
  nodes: Record<string, Project>
  dependencies: Record<string, Array<string>>
  externalNodes: Record<string, ExternalNode>
}
export interface Task {
  id: string
  target: TaskTarget
  outputs: Array<string>
  projectRoot?: string
}
export interface TaskTarget {
  project: string
  target: string
  configuration?: string
}
export interface TaskGraph {
  roots: Array<string>
  tasks: Record<string, Task>
  dependencies: Record<string, Array<string>>
}
export interface FileData {
  file: string
  hash: string
}
export interface InputsInput {
  input: string
  dependencies?: boolean
  projects?: string | Array<string>
}
export interface FileSetInput {
  fileset: string
}
export interface RuntimeInput {
  runtime: string
}
export interface EnvironmentInput {
  env: string
}
export interface ExternalDependenciesInput {
  externalDependencies: Array<string>
}
export interface DepsOutputsInput {
  dependentTasksOutputFiles: string
  transitive?: boolean
}
/** Stripped version of the NxJson interface for use in rust */
export interface NxJson {
  namedInputs?: Record<string, Array<JsInputs>>
  targetDefaults?: Record<string, Target>
}
export const enum EventType {
  delete = 'delete',
  update = 'update',
  create = 'create'
}
export interface WatchEvent {
  path: string
  type: EventType
}
/** Public NAPI error codes that are for Node */
export const enum WorkspaceErrors {
  ParseError = 'ParseError',
  Generic = 'Generic'
}
export interface NxWorkspaceFiles {
  projectFileMap: Record<string, Array<FileData>>
  globalFiles: Array<FileData>
}
export class ImportResult {
  file: string
  sourceProject: string
  dynamicImportExpressions: Array<string>
  staticImportExpressions: Array<string>
}
export class HashPlanner {
  constructor(workspaceRoot: string, nxJson: NxJson, projectGraph: ProjectGraph)
  getPlans(taskIds: Array<string>, taskGraph: TaskGraph): Record<string, string[]>
  getPlansReference(taskIds: Array<string>, taskGraph: TaskGraph): JsExternal
}
export class Watcher {
  origin: string
  /**
   * Creates a new Watcher instance.
   * Will always ignore the following directories:
   * * .git/
   * * node_modules/
   * * .nx/
   */
  constructor(origin: string, additionalGlobs?: Array<string> | undefined | null, useIgnore?: boolean | undefined | null)
  watch(callback: (err: string | null, events: WatchEvent[]) => void): void
  stop(): Promise<void>
}
export class WorkspaceContext {
  workspaceRoot: string
  constructor(workspaceRoot: string)
  getWorkspaceFiles(globs: Array<string>, parseConfigurations: (arg0: Array<string>) => Promise<Record<string, string>>): Promise<NxWorkspaceFiles>
  glob(globs: Array<string>): Array<string>
  getProjectConfigurations(globs: Array<string>, parseConfigurations: (arg0: Array<string>) => Promise<Record<string, string>>): Promise<Record<string, string>>
  incrementalUpdate(updatedFiles: Array<string>, deletedFiles: Array<string>): Record<string, string>
  allFileData(): Array<FileData>
}
