import type { ProjectNameAndRootFormat } from '@nx/devkit/src/generators/project-name-and-root-utils';
import type { Linter } from '@nx/eslint';
import type { NxCloudOnBoardingStatus } from 'nx/src/nx-cloud/models/onboarding-status';

export interface Schema {
  name: string;
  directory?: string;
  projectNameAndRootFormat?: ProjectNameAndRootFormat;
  linter?: Linter;
  skipFormat?: boolean;
  unitTestRunner?: 'vitest' | 'none';
  e2eTestRunner?: 'cypress' | 'playwright' | 'none';
  tags?: string;
  js?: boolean;
  skipPackageJson?: boolean;
  rootProject?: boolean;
  setParserOptionsProject?: boolean;
  style?: 'css' | 'scss' | 'less' | 'none';
  nxCloudToken?: string;
}

export interface NormalizedSchema extends Schema {
  projectName: string;
  appProjectRoot: string;
  e2eProjectName: string;
  e2eProjectRoot: string;
  e2eWebServerAddress: string;
  e2eWebServerTarget: string;
  e2ePort: number;
  parsedTags: string[];
  onBoardingStatus?: NxCloudOnBoardingStatus;
  connectCloudUrl?: string;
}
