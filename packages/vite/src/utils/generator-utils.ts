import {
  joinPathFragments,
  logger,
  offsetFromRoot,
  readJson,
  readProjectConfiguration,
  TargetConfiguration,
  Tree,
  updateProjectConfiguration,
  writeJson,
} from '@nrwl/devkit';
import { ViteBuildExecutorOptions } from '../executors/build/schema';
import { ViteDevServerExecutorOptions } from '../executors/dev-server/schema';
import { VitestExecutorOptions } from '../executors/test/schema';
import { Schema } from '../generators/configuration/schema';

/**
 * This function is used to find the build and serve targets for
 * an application.
 *
 * The reason this function exists is because we cannot assume
 * that the user has not created a custom build target for the application,
 * or that they have not changed the name of the build target
 * from build to anything else.
 *
 * So, in order to find the correct name of the target,
 * we have to look into all the targets, check the executor
 * they are using, and infer from the executor that the target
 * is a build target.
 */
export function findExistingTargets(targets: {
  [targetName: string]: TargetConfiguration;
}): {
  buildTarget: string;
  serveTarget: string;
  testTarget: string;
} {
  const returnObject: {
    buildTarget: string;
    serveTarget: string;
    testTarget: string;
  } = {
    buildTarget: 'build',
    serveTarget: 'serve',
    testTarget: 'test',
  };

  Object.entries(targets).forEach(([target, targetConfig]) => {
    switch (targetConfig.executor) {
      case '@nrwl/webpack:dev-server':
      case '@nxext/vite:dev':
        returnObject.serveTarget = target;
        break;
      case '@angular-devkit/build-angular:browser':
        /**
         * Not looking for '@nrwl/angular:ng-packagr-lite' or any other
         * angular executors.
         * Only looking for '@angular-devkit/build-angular:browser'
         * because the '@nrwl/angular:ng-packagr-lite' executor
         * (and maybe the other custom exeucutors) is only used for libs atm.
         */
        returnObject.buildTarget = target;
        break;
      case '@nrwl/webpack:webpack':
      case '@nrwl/next:build':
      case '@nrwl/web:webpack':
      case '@nrwl/web:rollup':
      case '@nrwl/js:tsc':
      case '@nrwl/angular:ng-packagr-lite':
      case '@nrwl/js:babel':
      case '@nrwl/js:swc':
      case '@nxext/vite:build':
        returnObject.buildTarget = target;
        break;
      case '@nrwl/jest:jest':
      case 'nxext/vitest:vitest':
        returnObject.testTarget = target;
      default:
        returnObject.buildTarget = 'build';
        returnObject.serveTarget = 'serve';
        returnObject.testTarget = 'test';
        break;
    }
  });

  return returnObject;
}

export function addOrChangeTestTarget(
  tree: Tree,
  options: Schema,
  target: string
) {
  const project = readProjectConfiguration(tree, options.project);
  const targets = {
    ...project.targets,
  };

  const testOptions: VitestExecutorOptions = {
    passWithNoTests: true,
  };

  if (targets[target]) {
    targets[target].executor = '@nrwl/vite:test';
    delete targets[target].options.jestConfig;
  } else {
    targets[target] = {
      executor: '@nrwl/vite:test',
      outputs: ['{projectRoot}/coverage'],
      options: testOptions,
    };
  }

  updateProjectConfiguration(tree, options.project, {
    ...project,
    targets: {
      ...targets,
    },
  });
}

export function addOrChangeBuildTarget(
  tree: Tree,
  options: Schema,
  target: string
) {
  const project = readProjectConfiguration(tree, options.project);

  const buildOptions: ViteBuildExecutorOptions = {
    outputPath: joinPathFragments(
      'dist',
      project.root != '.' ? project.root : options.project
    ),
  };

  const targets = {
    ...project.targets,
  };

  if (targets[target]) {
    targets[target].options = {
      ...buildOptions,
    };
    targets[target].executor = '@nrwl/vite:build';
  } else {
    targets[`${target}`] = {
      executor: '@nrwl/vite:build',
      outputs: ['{options.outputPath}'],
      defaultConfiguration: 'production',
      options: buildOptions,
      configurations: {
        development: {},
        production: {
          fileReplacements: [
            {
              replace: joinPathFragments(
                project.sourceRoot,
                'environments/environment.ts'
              ),
              with: joinPathFragments(
                project.sourceRoot,
                'environments/environment.prod.ts'
              ),
            },
          ],
          sourceMap: false,
        },
      },
    };
  }

  updateProjectConfiguration(tree, options.project, {
    ...project,
    targets: {
      ...targets,
    },
  });
}

export function addOrChangeServeTarget(
  tree: Tree,
  options: Schema,
  target: string
) {
  const project = readProjectConfiguration(tree, options.project);

  const serveOptions: ViteDevServerExecutorOptions = {
    buildTarget: `${options.project}:build`,
  };

  const targets = {
    ...project.targets,
  };

  if (targets[target]) {
    targets[target].options = {
      ...serveOptions,
    };
    targets[target].executor = '@nrwl/vite:dev-server';
  } else {
    targets[`${target}`] = {
      executor: '@nrwl/vite:dev-server',
      defaultConfiguration: 'development',
      options: {
        buildTarget: `${options.project}:build`,
      },
      configurations: {
        development: {
          buildTarget: `${options.project}:build:development`,
        },
        production: {
          buildTarget: `${options.project}:build:production`,
          hmr: false,
        },
      },
    };
  }

  updateProjectConfiguration(tree, options.project, {
    ...project,
    targets: {
      ...targets,
    },
  });
}

export function editTsConfig(tree: Tree, options: Schema) {
  const projectConfig = readProjectConfiguration(tree, options.project);

  const config = readJson(tree, `${projectConfig.root}/tsconfig.json`);

  switch (options.uiFramework) {
    case 'react':
      config.compilerOptions = {
        target: 'ESNext',
        useDefineForClassFields: true,
        lib: ['DOM', 'DOM.Iterable', 'ESNext'],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: false,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: 'ESNext',
        moduleResolution: 'Node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        types: ['vite/client'],
      };
      config.include = [...config.include, 'src'];
      break;
    case 'none':
      config.compilerOptions = {
        target: 'ESNext',
        useDefineForClassFields: true,
        module: 'ESNext',
        lib: ['ESNext', 'DOM'],
        moduleResolution: 'Node',
        strict: true,
        resolveJsonModule: true,
        isolatedModules: true,
        esModuleInterop: true,
        noEmit: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        skipLibCheck: true,
        types: ['vite/client'],
      };
      config.include = [...config.include, 'src'];
      break;
    default:
      break;
  }

  writeJson(tree, `${projectConfig.root}/tsconfig.json`, config);
}

export function moveAndEditIndexHtml(
  tree: Tree,
  options: Schema,
  buildTarget: string
) {
  const projectConfig = readProjectConfiguration(tree, options.project);

  let indexHtmlPath =
    projectConfig.targets[buildTarget].options?.index ??
    `${projectConfig.root}/src/index.html`;
  const mainPath = (
    projectConfig.targets[buildTarget].options?.main ??
    `${projectConfig.root}/src/main.ts${
      options.uiFramework === 'react' ? 'x' : ''
    }`
  ).replace(projectConfig.root, '');

  if (
    !tree.exists(indexHtmlPath) &&
    tree.exists(`${projectConfig.root}/index.html`)
  ) {
    indexHtmlPath = `${projectConfig.root}/index.html`;
  }

  if (tree.exists(indexHtmlPath)) {
    const indexHtmlContent = tree.read(indexHtmlPath, 'utf8');
    if (
      !indexHtmlContent.includes(
        `<script type="module" src="${mainPath}"></script>`
      )
    ) {
      tree.write(
        `${projectConfig.root}/index.html`,
        indexHtmlContent.replace(
          '</body>',
          `<script type="module" src="${mainPath}"></script>
          </body>`
        )
      );

      if (tree.exists(`${projectConfig.root}/src/index.html`))
        tree.delete(`${projectConfig.root}/src/index.html`);
    }
  } else {
    tree.write(
      `${projectConfig.root}/index.html`,
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Vite</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="${mainPath}"></script>
        </body>
      </html>`
    );
  }
}

export function writeViteConfig(tree: Tree, options: Schema) {
  const projectConfig = readProjectConfiguration(tree, options.project);

  const viteConfigPath = `${projectConfig.root}/vite.config.ts`;

  if (tree.exists(viteConfigPath)) {
    // TODO (katerina): Ideally we should check if the config is already set up correctly
    logger.info(
      `vite.config.ts already exists. Skipping creation of vite config for ${options.project}.`
    );
    return;
  }

  let viteConfigContent = '';

  const testOption = `test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    ${
      options.inSourceTests
        ? `includeSource: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']`
        : ''
    }
  },`;

  const defineOption = `define: {
    'import.meta.vitest': undefined
  },`;

  switch (options.uiFramework) {
    case 'react':
      viteConfigContent = `
${options.includeVitest ? '/// <reference types="vitest" />' : ''}
      import { defineConfig } from 'vite';
      import react from '@vitejs/plugin-react';
      import ViteTsConfigPathsPlugin from 'vite-tsconfig-paths';
      
      export default defineConfig({
        plugins: [
          react(),
          ViteTsConfigPathsPlugin({
            root: '${offsetFromRoot(projectConfig.root)}',
            projects: ['tsconfig.base.json'],
          }),
        ],
        ${options.inSourceTests ? defineOption : ''}
        ${options.includeVitest ? testOption : ''}
      });`;
      break;
    case 'none':
      viteConfigContent = `
      ${options.includeVitest ? '/// <reference types="vitest" />' : ''}
      import { defineConfig } from 'vite';
      import ViteTsConfigPathsPlugin from 'vite-tsconfig-paths';
      
      export default defineConfig({
        plugins: [
          ViteTsConfigPathsPlugin({
            root: '${offsetFromRoot(projectConfig.root)}',
            projects: ['tsconfig.base.json'],
          }),
        ],
        ${options.inSourceTests ? defineOption : ''}
        ${options.includeVitest ? testOption : ''}
      });`;
      break;
    default:
      break;
  }

  tree.write(viteConfigPath, viteConfigContent);
}
