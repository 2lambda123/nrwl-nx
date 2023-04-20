import {
  formatFiles,
  getProjects,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';

export async function update(tree: Tree) {
  const projects = getProjects(tree);

  projects.forEach((config, name) => {
    let shouldUpdate = false;
    if (config.targets?.build?.executor === '@nx/web:webpack') {
      shouldUpdate = true;
      config.targets.build.defaultConfiguration ??= 'production';
      config.targets.build.configurations ??= {};
      config.targets.build.configurations.development ??= {
        extractLicenses: false,
        optimization: false,
        sourceMap: true,
        vendorChunk: true,
      };
    }

    if (config.targets?.serve?.executor === '@nx/web:dev-server') {
      shouldUpdate = true;
      config.targets.serve.defaultConfiguration ??= 'development';
      config.targets.serve.configurations ??= {};
      config.targets.serve.configurations.development ??= {
        buildTarget: `${name}:build:development`,
      };
    }

    if (shouldUpdate) updateProjectConfiguration(tree, name, config);
  });

  await formatFiles(tree);
}

export default update;
