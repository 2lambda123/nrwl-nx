import {
  Tree,
  names,
  generateFiles,
  joinPathFragments,
  detectPackageManager,
  getPackageManagerCommand,
} from '@nrwl/devkit';
import { deduceDefaultBase } from '../../utilities/default-base';

export interface Schema {
  name?: string;
  ci: 'github' | 'azure' | 'circleci';
}

export async function ciWorkflowGenerator(host: Tree, schema: Schema) {
  const ci = schema.ci;
  const options = normalizeOptions(schema);

  generateFiles(host, joinPathFragments(__dirname, 'files', ci), '', options);
  // TODO: Implement error handling when file already exists
}

interface Substitutes {
  mainBranch: string;
  workflowName: string;
  packageManagerInstall: string;
  packageManagerPrefix: string;
  tmpl: '';
}

function normalizeOptions(options: Schema): Substitutes {
  const { name: workflowName } = names(options.name || 'build');
  const { exec: packageManagerPrefix, ciInstall: packageManagerInstall } =
    getPackageManagerCommand();
  return {
    workflowName,
    packageManagerInstall,
    packageManagerPrefix,
    mainBranch: deduceDefaultBase(),
    tmpl: '',
  };
}
