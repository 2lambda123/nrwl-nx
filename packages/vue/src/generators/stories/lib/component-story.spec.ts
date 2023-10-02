import { getProjects, Tree, updateProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import libraryGenerator from '../../library/library';
import { createComponentStories } from './component-story';
import { Linter } from '@nx/linter';

describe('vue:component-story', () => {
  let appTree: Tree;
  let cmpPath = 'test-ui-lib/src/components/test-ui-lib.vue';
  let storyFilePath = 'test-ui-lib/src/components/test-ui-lib.stories.ts';

  describe('default setup', () => {
    beforeEach(async () => {
      appTree = await createTestUILib('test-ui-lib');
    });

    describe('default component setup', () => {
      beforeEach(async () => {
        createComponentStories(
          appTree,
          {
            interactionTests: true,
            project: 'test-ui-lib',
          },
          'components/test-ui-lib.vue'
        );
      });

      it('should properly set up the story', () => {
        expect(appTree.read(storyFilePath, 'utf-8')).toMatchSnapshot();
      });
    });

    describe('component with props defined', () => {
      beforeEach(async () => {
        appTree.write(
          cmpPath,
          `<script setup lang="ts">
          defineProps<{
            name: string;
            displayAge: boolean;
            age: number;
          }>();
          </script>
          
          <template>
            <div>
              <p>Welcome to Vlv!</p>
            </div>
          </template>
          
          <style scoped>
          div {
            color: pink;
          }
          </style>
          `
        );

        createComponentStories(
          appTree,
          {
            interactionTests: true,
            project: 'test-ui-lib',
          },
          'components/test-ui-lib.vue'
        );
      });

      it('should create a story with controls', () => {
        expect(appTree.read(storyFilePath, 'utf-8')).toMatchSnapshot();
      });
    });

    describe('component with other syntax of props defined', () => {
      beforeEach(async () => {
        appTree.write(
          cmpPath,
          `<script>
            export default {
              name: 'HelloWorld',
              props: {
                name: string;
                displayAge: boolean;
                age: number;
              }
            }
            </script>
          
          <template>
            <div>
              <p>Welcome to Vlv!</p>
            </div>
          </template>
          
          <style scoped>
          div {
            color: pink;
          }
          </style>
          `
        );

        createComponentStories(
          appTree,
          {
            interactionTests: true,
            project: 'test-ui-lib',
          },
          'components/test-ui-lib.vue'
        );
      });

      it('should create a story with controls', () => {
        expect(appTree.read(storyFilePath, 'utf-8')).toMatchSnapshot();
      });
    });
  });
});

export async function createTestUILib(libName: string): Promise<Tree> {
  let appTree = createTreeWithEmptyWorkspace();
  await libraryGenerator(appTree, {
    name: libName,
    linter: Linter.EsLint,
    component: true,
    skipFormat: true,
    skipTsConfig: false,
    unitTestRunner: 'jest',
    projectNameAndRootFormat: 'as-provided',
  });

  const currentWorkspaceJson = getProjects(appTree);

  const projectConfig = currentWorkspaceJson.get(libName);
  projectConfig.targets.lint.options.linter = 'eslint';

  updateProjectConfiguration(appTree, libName, projectConfig);

  return appTree;
}
