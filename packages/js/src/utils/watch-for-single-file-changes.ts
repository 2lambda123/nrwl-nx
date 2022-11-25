import { logger } from '@nrwl/devkit';
import { daemonClient } from 'nx/src/daemon/client/client';

export async function watchForSingleFileChanges(
  projectName: string,
  relativeFilePath: string,
  callback: () => void
): Promise<() => void> {
  const unregisterFileWatcher = await daemonClient.registerFileWatcher(
    { watchProjects: [projectName] },
    (err, data) => {
      if (err === 'closed') {
        logger.error(`Watch error: Daemon closed the connection`);
        process.exit(1);
      } else if (err) {
        logger.error(`Watch error: ${err?.message ?? 'Unknown'}`);
      } else if (
        data.changedFiles.some((file) => file.path.includes(relativeFilePath))
      ) {
        callback();
      }
    }
  );

  return () => unregisterFileWatcher();
}
