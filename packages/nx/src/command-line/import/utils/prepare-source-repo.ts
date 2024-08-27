import * as createSpinner from 'ora';
import { basename, dirname, join, relative } from 'path';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { GitRepository } from '../../../utils/git-utils';

export async function prepareSourceRepo(
  gitClient: GitRepository,
  ref: string,
  source: string,
  relativeDestination: string,
  tempImportBranch: string,
  sourceRemoteUrl: string,
  originName: string
) {
  const spinner = createSpinner().start(
    `Fetching ${ref} from ${sourceRemoteUrl}`
  );
  await gitClient.addFetchRemote(originName, ref);
  await gitClient.fetch(originName, ref);
  spinner.succeed(`Fetched ${ref} from ${sourceRemoteUrl}`);
  spinner.start(
    `Checking out a temporary branch, ${tempImportBranch} based on ${ref}`
  );
  await gitClient.checkout(tempImportBranch, {
    new: true,
    base: `${originName}/${ref}`,
  });

  spinner.succeed(`Created a ${tempImportBranch} branch based on ${ref}`);
  const relativeSourceDir = relative(
    gitClient.root,
    join(gitClient.root, source)
  );

  if (relativeSourceDir !== '') {
    if (await gitClient.hasFilterRepoInstalled()) {
      spinner.start(
        `Filtering git history to only include files in ${relativeSourceDir}`
      );
      await gitClient.filterRepo(relativeSourceDir);
    } else {
      spinner.start(
        `Filtering git history to only include files in ${relativeSourceDir} (this might take a few minutes -- install git-filter-repo for faster performance)`
      );
      await gitClient.filterBranch(relativeSourceDir, tempImportBranch);
    }
    spinner.succeed(
      `Filtered git history to only include files in ${relativeSourceDir}`
    );
  }

  const destinationInSource = join(gitClient.root, relativeDestination);
  spinner.start(`Moving files and git history to ${destinationInSource}`);

  // The result of filter-branch will contain only the files in the subdirectory at its root.
  const files = await gitClient.getGitFiles('.');
  try {
    await rm(destinationInSource, {
      recursive: true,
    });
  } catch {}
  await mkdir(destinationInSource, { recursive: true });
  const gitignores = new Set<string>();
  for (const file of files) {
    if (basename(file) === '.gitignore') {
      gitignores.add(file);
      continue;
    }
    spinner.start(
      `Moving files and git history to ${destinationInSource}: ${file}`
    );

    const newPath = join(destinationInSource, file);

    await mkdir(dirname(newPath), { recursive: true });
    try {
      await gitClient.move(file, newPath);
    } catch {
      await wait(100);
      await gitClient.move(file, newPath);
    }
  }

  await gitClient.commit(
    `chore(repo): move ${source} to ${relativeDestination} to prepare to be imported`
  );

  for (const gitignore of gitignores) {
    await gitClient.move(gitignore, join(destinationInSource, gitignore));
  }

  await gitClient.amendCommit();

  for (const gitignore of gitignores) {
    await copyFile(
      join(destinationInSource, gitignore),
      join(gitClient.root, gitignore)
    );
  }

  spinner.succeed(
    `${sourceRemoteUrl} has been prepared to be imported into this workspace on a temporary branch: ${tempImportBranch} in ${gitClient.root}`
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
