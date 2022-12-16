import {
  convertNxGenerator,
  formatFiles,
  GeneratorCallback,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import {
  findExistingTargetsInProject,
  addOrChangeBuildTarget,
  addOrChangeServeTarget,
  editTsConfig,
  moveAndEditIndexHtml,
  writeViteConfig,
  handleUnsupportedUserProvidedTargets,
  handleUnknownExecutors,
  UserProvidedTargetName,
} from '../../utils/generator-utils';

import initGenerator from '../init/init';
import vitestGenerator from '../vitest/vitest-generator';
import { Schema } from './schema';

export async function viteConfigurationGenerator(tree: Tree, schema: Schema) {
  const tasks: GeneratorCallback[] = [];

  const { targets, projectType } = readProjectConfiguration(
    tree,
    schema.project
  );
  let buildTargetName = 'build';
  let serveTargetName = 'serve';
  let testTargetName = 'test';

  schema.includeLib ??= projectType === 'library';

  /**
   * This is for when we are convering an existing project
   * to use the vite executors.
   *  */
  if (!schema.newProject) {
    const userProvidedTargetName: UserProvidedTargetName = {
      build: schema.buildTarget,
      serve: schema.serveTarget,
      test: schema.testTarget,
    };

    const {
      validFoundTargetName,
      projectContainsUnsupportedExecutor,
      userProvidedTargetIsUnsupported,
    } = findExistingTargetsInProject(targets, userProvidedTargetName);

    /**
     * This means that we only found unsupported build targets in that project.
     * The only way that buildTarget is defined, means that it is supported.
     *
     * If the `unsupported` flag was false, it would mean that we did not find
     * a build target at all, so we can create a new one.
     *
     * So we only throw if we found a target, but it is unsupported.
     *
     * */
    if (!validFoundTargetName.build && projectContainsUnsupportedExecutor) {
      throw new Error(
        `The project ${schema.project} cannot be converted to use the @nrwl/vite executors.`
      );
    }

    /**
     * This means that we did not find any supported executors
     * so we don't have any valid target names.
     *
     * However, the executors that we may have found are not in the
     * list of the specifically unsupported executors either.
     *
     * So, we should warn the user about it.
     */

    if (
      !projectContainsUnsupportedExecutor &&
      !validFoundTargetName.build &&
      !validFoundTargetName.serve &&
      !validFoundTargetName.test
    ) {
      await handleUnknownExecutors();
    }

    /**
     * There is a possibility at this stage that the user has provided
     * targets with unsupported executors.
     * We keep track here of which of the targets that the user provided
     * are unsupported.
     * We do this with the `userProvidedTargetIsUnsupported` object,
     * which contains flags for each target (whether it is supported or not).
     *
     * We also keep track of the targets that we found in the project,
     * through the findExistingTargetsInProject function, which returns
     * targets for build/serve/test that use supported executors, and
     * can be coverted to use the vite executors. These are the
     * kept in the validFoundTargetName object.
     *
     */
    await handleUnsupportedUserProvidedTargets(
      userProvidedTargetIsUnsupported,
      userProvidedTargetName,
      validFoundTargetName
    );

    /**
     * Once the user is at this stage, then they can go ahead and convert.
     */

    buildTargetName = validFoundTargetName.build ?? buildTargetName;
    serveTargetName = validFoundTargetName.serve ?? serveTargetName;

    if (projectType === 'application') {
      moveAndEditIndexHtml(tree, schema, buildTargetName);
    }
    editTsConfig(tree, schema);
  }

  const initTask = await initGenerator(tree, {
    uiFramework: schema.uiFramework,
    includeLib: schema.includeLib,
  });
  tasks.push(initTask);

  addOrChangeBuildTarget(tree, schema, buildTargetName);

  if (!schema.includeLib) {
    addOrChangeServeTarget(tree, schema, serveTargetName);
  }

  writeViteConfig(tree, schema);

  if (schema.includeVitest) {
    const vitestTask = await vitestGenerator(tree, {
      project: schema.project,
      uiFramework: schema.uiFramework,
      inSourceTests: schema.inSourceTests,
      coverageProvider: 'c8',
      skipViteConfig: true,
      testTarget: testTargetName,
    });
    tasks.push(vitestTask);
  }

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}

export default viteConfigurationGenerator;
export const configurationSchematic = convertNxGenerator(
  viteConfigurationGenerator
);
