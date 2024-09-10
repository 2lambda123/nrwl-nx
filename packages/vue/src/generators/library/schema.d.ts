import type { ProjectNameAndRootFormat } from '@nx/devkit/src/generators/project-name-and-root-utils';
import type { Linter, LinterType } from '@nx/eslint';
import type { SupportedStyles } from '../../../typings/style';

export interface Schema {
  appProject?: string;
  bundler?: 'none' | 'vite';
  component?: boolean;
  directory?: string;
  projectNameAndRootFormat?: ProjectNameAndRootFormat;
  importPath?: string;
  inSourceTests?: boolean;
  js?: boolean;
  linter: Linter | LinterType;
  name: string;
  publishable?: boolean;
  routing?: boolean;
  setParserOptionsProject?: boolean;
  skipFormat?: boolean;
  skipPackageJson?: boolean;
  skipTsConfig?: boolean;
  strict?: boolean;
  tags?: string;
  unitTestRunner?: 'vitest' | 'none';
  minimal?: boolean;
  e2eTestRunner?: 'cypress' | 'none';
  addPlugin?: boolean;
}

export interface NormalizedSchema extends Schema {
  js: boolean;
  name: string;
  linter: Linter | LinterType;
  fileName: string;
  projectRoot: string;
  routePath: string;
  parsedTags: string[];
  appMain?: string;
  appSourceRoot?: string;
  unitTestRunner?: 'vitest' | 'none';
}
