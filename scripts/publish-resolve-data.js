// @ts-check

/**
 * This function is invoked by the publish.yml GitHub Action workflow and contains all of the dynamic logic needed
 * for the various workflow trigger types. This avoids the need for the logic to be stored in fragile inline
 * shell commands.
 *
 * @typedef {'--dry-run' | ''} DryRunFlag
 *
 * @typedef {{
 *   version: string;
 *   dry_run_flag: DryRunFlag;
 *   success_comment: string;
 *   publish_branch: string;
 *   repo: string;
 *   ref: string;
 * }} PublishResolveData
 *
 * Partial from https://github.com/actions/toolkit/blob/c6b487124a61d7dc6c7bd6ea0208368af3513a6e/packages/github/src/context.ts
 * @typedef {{
 *   actor: string;
 *   runId: number;
 *   repo: { owner: string; repo: string };
 * }} GitHubContext
 *
 * @param {{
 *  github: import('octokit/dist-types').Octokit & { ref_name: string };
 *  context: GitHubContext;
 * }} param
 *
 * @returns {Promise<PublishResolveData>}
 */
module.exports = async ({ github, context }) => {
  // We use empty strings as default values so that we can let the `actions/checkout` action apply its default resolution
  const DEFAULT_REF = '';
  const DEFAULT_REPO = '';

  const DEFAULT_PUBLISH_BRANCH = `publish/${github.ref_name}`;

  /** @type {DryRunFlag} */
  const DRY_RUN_DISABLED = '';
  /** @type {DryRunFlag} */
  const DRY_RUN_ENABLED = '--dry-run';

  switch (process.env.GITHUB_EVENT_NAME) {
    case 'schedule': {
      const data = {
        version: 'canary',
        dry_run_flag: DRY_RUN_DISABLED,
        success_comment: '',
        publish_branch: DEFAULT_PUBLISH_BRANCH,
        // In this case the default checkout logic should use the default (master) branch
        repo: DEFAULT_REPO,
        ref: DEFAULT_REF,
      };
      console.log('"schedule" trigger detected', { data });
      return data;
    }

    case 'release': {
      const data = {
        version: github.ref_name,
        dry_run_flag: DRY_RUN_DISABLED,
        success_comment: '',
        publish_branch: DEFAULT_PUBLISH_BRANCH,
        // In this case the default checkout logic should use the tag that triggered the release event
        ref: DEFAULT_REF,
        repo: DEFAULT_REPO,
      };
      console.log('"release" trigger detected', { data });
      return data;
    }

    case 'workflow_dispatch': {
      const prNumber = process.env.PR_NUMBER;

      if (!prNumber) {
        const data = {
          version: '0.0.0-dry-run.0',
          dry_run_flag: DRY_RUN_ENABLED,
          success_comment: '',
          publish_branch: DEFAULT_PUBLISH_BRANCH,
          // In this case the default checkout logic should use the branch/tag selected when triggering the workflow
          repo: DEFAULT_REPO,
          ref: DEFAULT_REF,
        };
        console.log(
          '"workflow_dispatch" trigger detected, no PR number provided',
          { data }
        );
        return data;
      }

      const pr = await github.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: Number(prNumber),
      });
      if (!pr?.data?.head?.repo) {
        throw new Error(
          `The PR data for PR number ${prNumber} is missing the head branch information`
        );
      }

      const fullSHA = pr.data.head.sha;
      const shortSHA = fullSHA.slice(0, 7);
      const version = `0.0.0-pr-${prNumber}-${shortSHA}`;
      const repo = pr.data.head.repo.full_name;
      const ref = pr.data.head.ref;

      const data = {
        version,
        dry_run_flag: DRY_RUN_DISABLED,
        success_comment: getSuccessCommentForPR({
          context,
          version,
          repo,
          ref,
          pr_short_sha: shortSHA,
          pr_full_sha: fullSHA,
        }),
        // Custom publish branch name for PRs
        publish_branch: `publish/pr-${prNumber}`,
        // In this case we instruct the checkout action what repo and ref to use
        repo,
        ref,
      };
      console.log(
        `"workflow_dispatch" trigger detected, PR number ${prNumber} provided`,
        { data }
      );

      console.log(`Owner: ${context.repo.owner}`);
      console.log(`Repo: ${context.repo.repo}`);
      console.log(`Fork repo:`, pr.data.head.repo.full_name);
      console.log(`Fetched PR details: ${pr.data.head.ref}`);
      console.log(`Full PR SHA: ${pr.data.head.sha}`);

      return data;
    }

    default:
      throw new Error(
        `The publish.yml workflow was triggered by an unexpected event: "${process.env.GITHUB_EVENT_NAME}"`
      );
  }
};

function getSuccessCommentForPR({
  context,
  version,
  repo,
  ref,
  pr_short_sha,
  pr_full_sha,
}) {
  return `## 🐳 We have a release for that!

  This PR has a release associated with it. You can try it out using this command:
  
  \`\`\`bash
  npx create-nx-workspace@${version} my-workspace
  \`\`\`

  Or just copy this version and use it in your own command:
  \`\`\`bash
  ${version}
  \`\`\`

  | Release details | 📑 |
  | ------------- | ------------- |
  | **Published version** | [${version}](https://www.npmjs.com/package/nx/v/${version}) |
  | **Triggered by** | @${context.actor} |
  | **Branch** | [${ref}](https://github.com/${repo}/tree/${ref}) |
  | **Commit** | [${pr_short_sha}](https://github.com/${repo}/commit/${pr_full_sha}) |
  | **Workflow run** | [${context.runId}](https://github.com/nrwl/nx/actions/runs/${context.runId}) |

  To request a new release for this pull request, mention someone from the Nx team or the \`@nrwl/nx-pipelines-reviewers\`.
`;
}
