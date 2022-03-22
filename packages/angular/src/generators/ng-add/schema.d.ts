import { Linter } from '@nrwl/linter';
import { E2eTestRunner, UnitTestRunner } from '../../utils/test-runners';
import type { Styles } from '../utils/types';

export interface Schema {
  name?: string;
  skipInstall?: boolean;
  npmScope?: string;
  preserveAngularCliLayout?: boolean;
  defaultBase?: string;

  unitTestRunner?: UnitTestRunner;
  e2eTestRunner?: E2eTestRunner;
  skipFormat?: boolean;
  skipInstall?: boolean;
  style?: Styles;
  linter?: Exclude<Linter, Linter.TsLint>;
  skipPackageJson?: boolean;
}
