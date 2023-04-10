import { WholeFileChange } from '../../file-utils';
import { jsonDiff } from '../../../utils/json-diff';
import { getTouchedProjectsFromTsConfig } from './tsconfig-json-changes';
import * as tsUtils from '../../../utils/typescript';
import { DependencyType, ProjectGraph } from '../../../config/project-graph';

describe('getTouchedProjectsFromTsConfig', () => {
  let graph: ProjectGraph;
  beforeEach(() => {
    graph = {
      nodes: {
        proj1: {
          name: 'proj1',
          type: 'app',
          data: {
            root: 'proj1',
            files: [],
          },
        },
        proj2: {
          name: 'proj2',
          type: 'lib',
          data: {
            root: 'proj2',
            files: [],
          },
        },
      },
      dependencies: {
        proj1: [
          {
            type: DependencyType.static,
            source: 'proj1',
            target: 'proj2',
          },
        ],
        proj2: [],
      },
    };
  });

  ['tsconfig.json', 'tsconfig.base.json'].forEach((tsConfig) => {
    describe(`(${tsConfig})`, () => {
      beforeEach(() => {
        jest
          .spyOn(tsUtils, 'getRootTsConfigFileName')
          .mockReturnValue(tsConfig);
        jest.clearAllMocks();
      });

      it(`should not return changes when ${tsConfig} is not touched`, async () => {
        const result = [
          ...(
            await getTouchedProjectsFromTsConfig(
              [
                {
                  file: 'source.ts',
                  hash: 'some-hash',
                  getChanges: () => [new WholeFileChange()],
                },
              ],
              {},
              {
                npmScope: 'proj',
              }
            )
          ).keys(),
        ];
        expect(result).toEqual([]);
      });

      describe('Whole File Changes', () => {
        it('should return all projects for a whole file change', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () => [new WholeFileChange()],
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toEqual(['proj1', 'proj2']);
        });
      });

      describe('Changes to other compiler options', () => {
        it('should return all projects', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            strict: false,
                          },
                        },
                        {
                          compilerOptions: {
                            strict: true,
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toEqual(['proj1', 'proj2']);
        });
      });

      describe('Adding new path mappings', () => {
        it('should return projects pointed to by the path mappings', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            paths: {},
                          },
                        },
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj1/index.ts'],
                            },
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toEqual(['proj1']);
        });

        it('should accept different types of paths', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            paths: {},
                          },
                        },
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['./proj1/index.ts'],
                            },
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toEqual(['proj1']);
        });
      });

      describe('Removing path mappings', () => {
        it('should affect all projects if a project is removed', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj1/index.ts'],
                            },
                          },
                        },
                        {
                          compilerOptions: {
                            paths: {},
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toEqual(['proj1', 'proj2']);
        });

        it('should affect all projects if a path mapping is removed', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': [
                                'proj1/index.ts',
                                'proj1/index2.ts',
                              ],
                            },
                          },
                        },
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj1/index.ts'],
                            },
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toContainEqual('proj1');
          expect(result).toContainEqual('proj2');
        });
      });

      describe('Modifying Path Mappings', () => {
        it('should return projects that have path mappings modified within them', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj1/index.ts'],
                            },
                          },
                        },
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj1/index2.ts'],
                            },
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toContainEqual('proj1');
          expect(result).not.toContainEqual('proj2');
        });

        it('should return both projects that the mappings used to point to and point to now', async () => {
          const result = [
            ...(
              await getTouchedProjectsFromTsConfig(
                [
                  {
                    file: tsConfig,
                    hash: 'some-hash',
                    getChanges: () =>
                      jsonDiff(
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj1/index.ts'],
                            },
                          },
                        },
                        {
                          compilerOptions: {
                            paths: {
                              '@proj/proj1': ['proj2/index.ts'],
                            },
                          },
                        }
                      ),
                  },
                ],
                null,
                null,
                null,
                graph
              )
            ).keys(),
          ];
          expect(result).toContainEqual('proj1');
          expect(result).toContainEqual('proj2');
        });
      });
    });
  });
});
