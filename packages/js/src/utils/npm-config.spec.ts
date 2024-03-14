import { ExecException } from 'child_process';
import { getNpmRegistry, getNpmTag } from './npm-config';

jest.mock('child_process', () => {
  const original = jest.requireActual('child_process');
  return {
    ...original,
    exec: jest
      .fn()
      .mockImplementation(
        (
          command: string,
          _: unknown,
          callback: (
            error: ExecException,
            stdout: string,
            stderr: string
          ) => void
        ) => {
          switch (command) {
            case 'npm config get @scope:registry':
              callback(null, 'https://scoped-registry.com', null);
              break;
            case 'npm config get @missing:registry':
              callback(null, 'undefined', null);
              break;
            case 'npm config get registry':
              callback(null, 'https://custom-registry.com', null);
              break;
            case 'npm config get tag':
              callback(null, 'next', null);
              break;
            default:
              callback(
                new Error(`unexpected command: ${command}`),
                null,
                'ERROR'
              );
          }
        }
      ),
  };
});

describe('npm-config', () => {
  const cwd = '/root';

  describe('getNpmRegistry', () => {
    it('should return scoped registry if it exists', async () => {
      expect(await getNpmRegistry('@scope/package', cwd)).toEqual(
        'https://scoped-registry.com'
      );
    });

    it('should return registry if scoped registry does not exist', async () => {
      expect(await getNpmRegistry('@missing/package', cwd)).toEqual(
        'https://custom-registry.com'
      );
    });

    it('should return registry if package is not scoped', async () => {
      expect(await getNpmRegistry('package', cwd)).toEqual(
        'https://custom-registry.com'
      );
    });
  });

  describe('getNpmTag', () => {
    it('should return tag', async () => {
      expect(await getNpmTag(cwd)).toEqual('next');
    });
  });
});
