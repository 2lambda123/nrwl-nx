import { Type } from '@sinclair/typebox';
import { JsonSchema } from './schema';

describe('dynamic schema', () => {
  it('should equal old schema', () => {
    expect(Type.Strict(JsonSchema)).toStrictEqual({
      cli: 'nx',
      $id: 'NxPluginGenerator',
      title: 'Create a Generator for an Nx Plugin',
      description: 'Create a Generator for an Nx Plugin.',
      type: 'object',
      examples: [
        {
          command: 'nx g generator my-generator --project=my-plugin',
          description: 'Generate `libs/my-plugin/src/generators/my-generator`',
        },
      ],
      properties: {
        project: {
          type: 'string',
          description: 'The name of the project.',
          alias: 'p',
          $default: {
            $source: 'projectName',
          },
          'x-prompt': 'What is the name of the project for the generator?',
        },
        name: {
          type: 'string',
          description: 'Generator name.',
          $default: {
            $source: 'argv',
            index: 0,
          },
          'x-prompt': 'What name would you like to use for the generator?',
        },
        description: {
          type: 'string',
          description: 'Generator description.',
          alias: 'd',
        },
        unitTestRunner: {
          type: 'string',
          enum: ['jest', 'none'],
          description: 'Test runner to use for unit tests.',
          default: 'jest',
        },
      },
      required: ['project', 'name'],
      additionalProperties: false,
    });
  });
});
