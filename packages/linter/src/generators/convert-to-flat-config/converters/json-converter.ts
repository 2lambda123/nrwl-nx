import { Tree, addDependenciesToPackageJson, names } from '@nx/devkit';
import { join } from 'path';
import { ESLint } from 'eslint';
import * as ts from 'typescript';
import { generateAst, generateRequire } from './generate-ast';
import { eslintrcVersion } from '../../../utils/versions';

/**
 * Converts an ESLint JSON config to a flat config.
 * Deletes the original file along with .eslintignore if it exists.
 */
export function convertEslintJsonToFlatConfig(
  tree: Tree,
  root: string,
  config: ESLint.ConfigData,
  sourceFile: string,
  destinationFile: string
) {
  const importsList: ts.VariableStatement[] = [];
  const exportElements: ts.Expression[] = [];
  let isFlatCompatNeeded = false;
  let combinedConfig: ts.PropertyAssignment[] = [];
  let languageOptions: ts.PropertyAssignment[] = [];

  if (config.extends) {
    isFlatCompatNeeded = addExtends(importsList, exportElements, config, tree);
  }

  if (config.plugins) {
    addPlugins(importsList, exportElements, config);
  }

  if (config.parser) {
    languageOptions.push(addParser(importsList, config));
  }

  if (config.parserOptions) {
    languageOptions.push(
      ts.factory.createPropertyAssignment(
        'parserOptions',
        generateAst(config.parserOptions, ts.factory)
      )
    );
  }

  if (config.env) {
    languageOptions.push(
      ts.factory.createPropertyAssignment(
        'env',
        generateAst(config.env, ts.factory)
      )
    );
  }

  if (config.globals) {
    languageOptions.push(
      ts.factory.createPropertyAssignment(
        'globals',
        generateAst(config.globals, ts.factory)
      )
    );
  }

  if (config.settings) {
    combinedConfig.push(
      ts.factory.createPropertyAssignment(
        'settings',
        generateAst(config.settings, ts.factory)
      )
    );
  }

  if (
    config.noInlineConfig !== undefined ||
    config.reportUnusedDisableDirectives !== undefined
  ) {
    combinedConfig.push(
      ts.factory.createPropertyAssignment(
        'linterOptions',
        generateAst(
          {
            noInlineConfig: config.noInlineConfig,
            reportUnusedDisableDirectives: config.reportUnusedDisableDirectives,
          },
          ts.factory
        )
      )
    );
  }

  if (languageOptions.length > 0) {
    combinedConfig.push(
      ts.factory.createPropertyAssignment(
        'languageOptions',
        ts.factory.createObjectLiteralExpression(
          languageOptions,
          languageOptions.length > 1
        )
      )
    );
  }

  if (combinedConfig.length > 0) {
    exportElements.push(
      ts.factory.createObjectLiteralExpression(
        combinedConfig,
        combinedConfig.length > 1
      )
    );
  }

  if (config.rules) {
    exportElements.push(generateAst({ rules: config.rules }, ts.factory));
  }

  if (config.overrides) {
    config.overrides.forEach((override) => {
      exportElements.push(generateAst(override, ts.factory));
    });
  }

  if (config.ignorePatterns) {
    const patterns = (
      Array.isArray(config.ignorePatterns)
        ? config.ignorePatterns
        : [config.ignorePatterns]
    ).filter((pattern) => pattern !== '**/*' && pattern !== '!**/*'); // these are useless in a flat config
    if (patterns.length > 0) {
      exportElements.push(generateAst({ ignores: patterns }, ts.factory));
    }
  }

  if (tree.exists(`${root}/.eslintignore`)) {
    const patterns = tree
      .read(`${root}/.eslintignore`, 'utf-8')
      .split('\n')
      .filter((line) => line.length > 0);
    exportElements.push(generateAst({ ignores: patterns }, ts.factory));
  }

  tree.delete(join(root, sourceFile));
  tree.delete(join(root, '.eslintignore'));

  // create the node list and print it to new file
  const nodeList = createNodeList(
    importsList,
    exportElements,
    isFlatCompatNeeded
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const resultFile = ts.createSourceFile(
    join(root, destinationFile),
    '',
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    nodeList,
    resultFile
  );
  tree.write(join(root, destinationFile), result);

  if (isFlatCompatNeeded) {
    addDependenciesToPackageJson(
      tree,
      {},
      {
        '@eslint/eslintrc': eslintrcVersion,
      }
    );
  }
}

// add parsed extends to export blocks and add import statements
function addExtends(
  importsList,
  configBlocks,
  config: ESLint.ConfigData,
  tree: Tree
): boolean {
  let isFlatCompatNeeded = false;
  const extendsConfig = Array.isArray(config.extends)
    ? config.extends
    : [config.extends];

  const eslintrcConfigs = [];

  // add base extends
  extendsConfig
    .filter((imp) => imp.match(/^\.?(\.\/)/))
    .forEach((imp, index) => {
      if (imp.match(/\.eslintrc(.base)?\.json$/)) {
        const localName = index ? `baseConfig${index}` : 'baseConfig';
        configBlocks.push(ts.factory.createIdentifier(localName));
        const newImport = imp.replace(
          /^(.*)\.eslintrc(.base)?\.json$/,
          '$1eslint$2.config.js'
        );
        const importStatement = generateRequire(
          localName,
          newImport,
          ts.factory
        );
        importsList.push(importStatement);
      } else {
        eslintrcConfigs.push(imp);
      }
    });
  // add plugin extends
  const pluginExtends = extendsConfig.filter((imp) => !imp.match(/^\.?(\.\/)/));
  if (pluginExtends.length) {
    const eslintPluginExtends = pluginExtends.filter((imp) =>
      imp.startsWith('eslint:')
    );
    pluginExtends.forEach((imp) => {
      if (!imp.startsWith('eslint:')) {
        eslintrcConfigs.push(imp);
      }
    });

    if (eslintPluginExtends.length) {
      const importStatement = generateRequire('js', '@eslint/js', ts.factory);

      addDependenciesToPackageJson(
        tree,
        {},
        {
          '@eslint/js': eslintrcVersion,
        }
      );

      importsList.push(importStatement);
      eslintPluginExtends.forEach((plugin) => {
        configBlocks.push(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('js'),
              ts.factory.createIdentifier('configs')
            ),
            ts.factory.createIdentifier(plugin.slice(7)) // strip 'eslint:' prefix
          )
        );
      });
    }
  }
  if (eslintrcConfigs.length) {
    isFlatCompatNeeded = true;

    const pluginExtendsSpread = ts.factory.createSpreadElement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('eslintrc'),
          ts.factory.createIdentifier('extends')
        ),
        undefined,
        eslintrcConfigs.map((plugin) => ts.factory.createStringLiteral(plugin))
      )
    );
    configBlocks.push(pluginExtendsSpread);
  }

  return isFlatCompatNeeded;
}

function getPluginImport(pluginName: string): string {
  if (pluginName.includes('eslint-plugin-')) {
    return pluginName;
  }
  if (!pluginName.startsWith('@')) {
    return `eslint-plugin-${pluginName}`;
  }
  if (!pluginName.includes('/')) {
    return `${pluginName}/eslint-plugin`;
  }
  const [scope, name] = pluginName.split('/');
  return `${scope}/eslint-plugin-${name}`;
}

function addPlugins(importsList, configBlocks, config: ESLint.ConfigData) {
  const mappedPlugins: { name: string; varName: string; imp: string }[] = [];
  config.plugins.forEach((name) => {
    const imp = getPluginImport(name);
    const varName = names(imp).propertyName;
    mappedPlugins.push({ name, varName, imp });
  });
  mappedPlugins.forEach(({ varName, imp }) => {
    const importStatement = generateRequire(varName, imp, ts.factory);
    importsList.push(importStatement);
  });
  const pluginsAst = ts.factory.createObjectLiteralExpression(
    [
      ts.factory.createPropertyAssignment(
        'plugins',
        ts.factory.createObjectLiteralExpression(
          mappedPlugins.map(({ name, varName }) => {
            return ts.factory.createPropertyAssignment(
              ts.factory.createStringLiteral(name),
              ts.factory.createIdentifier(varName)
            );
          }),
          mappedPlugins.length > 1
        )
      ),
      ...(config.processor
        ? [
            ts.factory.createPropertyAssignment(
              'processor',
              ts.factory.createStringLiteral(config.processor)
            ),
          ]
        : []),
    ],
    false
  );
  configBlocks.push(pluginsAst);
}

function addParser(
  importsList,
  config: ESLint.ConfigData
): ts.PropertyAssignment {
  const imp = config.parser;
  const parserName = names(imp).propertyName;
  const importStatement = generateRequire(parserName, imp, ts.factory);
  importsList.push(importStatement);

  return ts.factory.createPropertyAssignment(
    'parser',
    ts.factory.createIdentifier(parserName)
  );
}

const DEFAULT_FLAT_CONFIG = `const { FlatCompat } = require('@eslint/eslintrc');
const eslintrc = new FlatCompat({
    baseDirectory: __dirname
});
`;

function createNodeList(
  importsList: ts.VariableStatement[],
  exportElements: ts.Expression[],
  isFlatCompatNeeded: boolean
): ts.NodeArray<
  ts.VariableStatement | ts.Identifier | ts.ExpressionStatement | ts.SourceFile
> {
  return ts.factory.createNodeArray([
    // add plugin imports
    ...importsList,
    ts.createSourceFile(
      '',
      isFlatCompatNeeded ? DEFAULT_FLAT_CONFIG : '',
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.JS
    ),
    // creates:
    // module.exports = [ ... ];
    ts.factory.createExpressionStatement(
      ts.factory.createBinaryExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('module'),
          ts.factory.createIdentifier('exports')
        ),
        ts.factory.createToken(ts.SyntaxKind.EqualsToken),
        ts.factory.createArrayLiteralExpression(exportElements, true)
      )
    ),
  ]);
}
