import { CreateNodesContext } from '@nx/devkit';

import { createNodes } from './plugin';

describe('@nx/playwright/plugin', () => {
  let createNodesFunction = createNodes[1];
  let context: CreateNodesContext;

  beforeEach(async () => {
    context = {
      nxJsonConfiguration: {
        namedInputs: {
          default: ['{projectRoot}/**/*'],
          production: ['!{projectRoot}/**/*.spec.ts'],
        },
      },
      workspaceRoot: '',
    };
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should create nodes', () => {
    mockPlaywrightConfig({});
    const nodes = createNodesFunction(
      'TODO',
      {
        targetName: 'target',
      },
      context
    );

    expect(nodes).toMatchInlineSnapshot();
  });
});

function mockPlaywrightConfig(config: any) {
  jest.mock(
    'TODO',
    () => ({
      default: config,
    }),
    {
      virtual: true,
    }
  );
}
