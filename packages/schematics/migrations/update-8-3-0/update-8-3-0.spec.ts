import { Tree, mergeWith, url } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

import * as path from 'path';
import { readFileSync } from 'fs';

describe('Update 8.3.0', () => {
  let initialTree: Tree;
  let schematicRunner: SchematicTestRunner;

  beforeEach(async () => {
    initialTree = Tree.empty();
    schematicRunner = new SchematicTestRunner(
      '@nrwl/schematics',
      path.join(__dirname, '../migrations.json')
    );
  });

  it('should collectCoverage to false in the jest.config.js', async () => {
    initialTree.create(
      'jest.config.js',
      readFileSync(
        path.join(__dirname, './test-files/jest.config.js')
      ).toString()
    );

    const result = await schematicRunner
      .runSchematicAsync('update-8.3.0', {}, initialTree)
      .toPromise();

    expect(result.readContent('jest.config.js')).toContain(
      'collectCoverage: false'
    );
  });
});
