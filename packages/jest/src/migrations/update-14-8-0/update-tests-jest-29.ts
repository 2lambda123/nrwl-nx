import {
  readProjectConfiguration,
  Tree,
  visitNotIgnoredFiles,
} from '@nrwl/devkit';
import { forEachExecutorOptions } from '@nrwl/workspace/src/utilities/executor-options-utils';
import { tsquery } from '@phenomnomnominal/tsquery';
import {
  CallExpression,
  ImportDeclaration,
  isCallExpression,
  PropertyAccessExpression,
  VariableStatement,
} from 'typescript';
import type { JestExecutorOptions } from '../../executors/jest/schema';
import { TEST_FILE_PATTERN } from '../../utils/ast-utils';

export function updateTestsJest29(tree: Tree) {
  forEachExecutorOptions<JestExecutorOptions>(
    tree,
    '@nrwl/jest:jest',
    (options, projectName) => {
      const projectConfig = readProjectConfiguration(tree, projectName);
      visitNotIgnoredFiles(tree, projectConfig.sourceRoot, (file) => {
        if (!TEST_FILE_PATTERN.test(file)) {
          return;
        }
        updateJestMockTypes(tree, file);
        updateJestMocked(tree, file);
      });
    }
  );
}

export function updateJestMockTypes(tree: Tree, filePath: string) {
  const contents = tree.read(filePath, 'utf-8');
  const updatedContent = tsquery.replace(
    contents,
    ':matches(ImportDeclaration, VariableStatement):has(Identifier[name="MaybeMockedDeep"], Identifier[name="MaybeMocked"]):has(StringLiteral[value="jest-mock"])',
    (node: ImportDeclaration | VariableStatement) => {
      return (
        node
          .getText()
          // MaybeMockedDeep and MaybeMocked now are exported as Mocked and MockedShallow
          .replace('MaybeMockedDeep', 'Mocked')
          .replace('MaybeMocked', 'MockedShallow')
      );
    }
  );
  tree.write(filePath, updatedContent);
}

export function updateJestMocked(tree: Tree, filePath: string) {
  const contents = tree.read(filePath, 'utf-8');
  const jestGlobalNodes = tsquery.query(
    contents,
    ':matches(ImportDeclaration, VariableStatement):has(Identifier[name="jest"]):has(StringLiteral[value="@jest/globals"])'
  );

  // this only applies if using jest from @jest/globals
  if (jestGlobalNodes.length === 0) {
    return;
  }

  const updatedJestMockTypes = tsquery.replace(
    contents,
    'CallExpression:has(Identifier[name="jest"]):has(Identifier[name="mocked"])',
    (node: CallExpression) => {
      if (
        node.arguments.length === 2 &&
        node.getText().startsWith('jest.mocked(')
      ) {
        const text = node.getText();
        // jest.mocked(someObject, true); => jest.mocked(someObject);
        if (node.arguments[1].getText() === 'true') {
          return text.replace(/,\s*true/g, '');
        }
        // jest.mocked(someObject, false); => jest.mocked(someObject, {shallow: true});
        // opt into the new behavior unless explicitly opting out
        if (node.arguments[1].getText() === 'false') {
          return text.replace('false', '{shallow: true}');
        }
      }
    }
  );

  tree.write(filePath, updatedJestMockTypes);
}

export default updateTestsJest29;
