import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { moveGenerator } from '@nrwl/workspace';
import { Schema } from '../schema';
import { updateModuleName } from './update-module-name';
import libraryGenerator from '../../library/library';
import { Linter } from '@nrwl/workspace';
import { UnitTestRunner } from '@nrwl/angular/src/utils/test-runners';

describe('updateModuleName Rule', () => {
  let tree: Tree;

  describe('move to subfolder', () => {
    const updatedModulePath =
      '/libs/shared/my-first/src/lib/shared-my-first.module.ts';
    const updatedModuleSpecPath =
      '/libs/shared/my-first/src/lib/shared-my-first.module.spec.ts';
    const indexPath = '/libs/shared/my-first/src/index.ts';
    const secondModulePath = '/libs/my-second/src/lib/my-second.module.ts';

    const schema: Schema = {
      projectName: 'my-first',
      destination: 'shared/my-first',
      updateImportPath: true,
    };

    beforeEach(async () => {
      tree = createTreeWithEmptyWorkspace();

      await libraryGenerator(tree, {
        name: 'my-first',
        buildable: false,
        enableIvy: false,
        linter: Linter.EsLint,
        publishable: false,
        simpleModuleName: true,
        skipFormat: false,
        unitTestRunner: UnitTestRunner.Jest,
      });
      await libraryGenerator(tree, {
        name: 'my-second',
        buildable: false,
        enableIvy: false,
        linter: Linter.EsLint,
        publishable: false,
        simpleModuleName: true,
        skipFormat: false,
        unitTestRunner: UnitTestRunner.Jest,
      });
      tree.write(
        '/libs/my-first/src/lib/my-first.module.ts',
        `import { NgModule } from '@angular/core';
    import { CommonModule } from '@angular/common';

    @NgModule({
      imports: [CommonModule]
    })
    export class MyFirstModule {}`
      );

      tree.write(
        '/libs/my-first/src/lib/my-first.module.spec.ts',
        `import { async, TestBed } from '@angular/core/testing';
    import { MyFirstModule } from './my-first.module';

    describe('MyFirstModule', () => {
      beforeEach(async(() => {
        TestBed.configureTestingModule({
          imports: [MyFirstModule]
        }).compileComponents();
      }));

      it('should create', () => {
        expect(MyFirstModule).toBeDefined();
      });
    });`
      );
      tree.write(
        secondModulePath,
        `import { MyFirstModule } from '@proj/my-first';

      export class MySecondModule extends MyFirstModule {}
      `
      );
      await moveGenerator(tree, schema);
    });

    it('should rename the module files and update the module name', async () => {
      await updateModuleName(tree, schema);

      expect(tree.exists(updatedModulePath)).toBe(true);
      expect(tree.exists(updatedModuleSpecPath)).toBe(true);

      const moduleFile = tree.read(updatedModulePath).toString('utf-8');
      expect(moduleFile).toContain(`export class SharedMyFirstModule {}`);

      const moduleSpecFile = tree.read(updatedModuleSpecPath).toString('utf-8');
      expect(moduleSpecFile).toContain(
        `import { SharedMyFirstModule } from './shared-my-first.module';`
      );
      expect(moduleSpecFile).toContain(
        `describe('SharedMyFirstModule', () => {`
      );
      expect(moduleSpecFile).toContain(`imports: [SharedMyFirstModule]`);
      expect(moduleSpecFile).toContain(
        `expect(SharedMyFirstModule).toBeDefined();`
      );
    });

    it('should update any references to the module', async () => {
      await updateModuleName(tree, schema);

      const importerFile = tree.read(secondModulePath).toString('utf-8');
      expect(importerFile).toContain(
        `import { SharedMyFirstModule } from '@proj/shared/my-first';`
      );
      expect(importerFile).toContain(
        `export class MySecondModule extends SharedMyFirstModule {}`
      );
    });

    it('should update the index.ts file which exports the module', async () => {
      await updateModuleName(tree, schema);

      const indexFile = tree.read(indexPath).toString('utf-8');
      expect(indexFile).toContain(
        `export * from './lib/shared-my-first.module';`
      );
    });
  });
});
