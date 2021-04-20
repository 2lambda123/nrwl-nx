import {
  chain,
  externalSchematic,
  Rule,
  schematic,
  noop,
  Tree,
} from '@angular-devkit/schematics';
import { StorybookStoriesSchema } from '../stories/stories';
import { StorybookConfigureSchema } from './schema';
import { wrapAngularDevkitSchematic } from '@nrwl/devkit/ngcli-adapter';
import { getE2eProjectName } from '@nrwl/cypress/src/utils/project-name';
import { getWorkspace } from '@nrwl/workspace';

export default function (schema: StorybookConfigureSchema): Rule {
  if (schema.generateCypressSpecs && !schema.generateStories) {
    throw new Error(
      'Cannot set generateCypressSpecs to true when generateStories is set to false.'
    );
  }

  return chain([
    externalSchematic('@nrwl/storybook', 'configuration', {
      name: schema.name,
      uiFramework: '@storybook/angular',
      configureCypress: schema.configureCypress,
      linter: schema.linter,
      cypressDirectory: schema.cypressDirectory,
    }),
    schema.generateStories ? generateStories(schema) : noop(),
  ]);
}

function generateStories(schema: StorybookConfigureSchema): Rule {
  return async (tree: Tree, context) => {
    const workspace = await getWorkspace(tree);
    const project = workspace.projects[schema.name];
    const e2eProjectName = getE2eProjectName(
      schema.name,
      project.root,
      schema.cypressDirectory
    );
    return schematic<StorybookStoriesSchema>('stories', {
      name: schema.name,
      generateCypressSpecs:
        schema.configureCypress && schema.generateCypressSpecs,
      cypressProject: e2eProjectName,
    });
  };
}
export const storybookConfigurationGenerator = wrapAngularDevkitSchematic(
  '@nrwl/angular',
  'storybook-configuration'
);
