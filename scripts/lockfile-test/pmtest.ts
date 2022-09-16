import {
  parseLockFile,
  writeLockFile,
} from '../../packages/nx/src/utils/lock-file/lock-file';

const pm = 'yarn';

const value = parseLockFile(pm, 'scripts/lockfile-test');

// console.log(value.dependencies['pify@4.0.1']);
// // console.log(value['importers']);
// console.log(value['lockfileVersion']);
// console.log(value['overrides']);
// console.log(value['packages']['/log4js/4.5.1']);
// console.log(value['importers']);

writeLockFile(value, pm, 'scripts/lockfile-test');
