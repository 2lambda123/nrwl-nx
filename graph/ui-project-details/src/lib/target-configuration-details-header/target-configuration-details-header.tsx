/* eslint-disable @nx/enforce-module-boundaries */
// nx-ignore-next-line
import type { TargetConfiguration } from '@nx/devkit';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

import { PropertyInfoTooltip, Tooltip } from '@nx/graph/ui-tooltips';
import { twMerge } from 'tailwind-merge';
import { Pill } from '../pill';
import { TargetTechnologies } from '../target-technologies/target-technologies';
import { SourceInfo } from '../source-info/source-info';
import { CopyToClipboard } from '../copy-to-clipboard/copy-to-clipboard';

export interface TargetConfigurationDetailsHeaderProps {
  isCollasped: boolean;
  toggleCollapse: () => void;
  collapsable: boolean;
  isCompact?: boolean;
  targetConfiguration: TargetConfiguration;
  projectName: string;
  targetName: string;
  sourceMap: Record<string, string[]>;
  onRunTarget?: (data: { projectName: string; targetName: string }) => void;
  onViewInTaskGraph?: (data: {
    projectName: string;
    targetName: string;
  }) => void;
}

export const TargetConfigurationDetailsHeader = ({
  isCollasped,
  toggleCollapse,
  collapsable,
  isCompact,
  targetConfiguration,
  projectName,
  targetName,
  sourceMap,
  onRunTarget,
  onViewInTaskGraph,
}: TargetConfigurationDetailsHeaderProps) => {
  const handleCopyClick = async (copyText: string) => {
    await window.navigator.clipboard.writeText(copyText);
  };

  if (!collapsable) {
    // when collapsable is false, isCollasped should be false
    isCollasped = false;
  }

  const singleCommand =
    targetConfiguration.executor === 'nx:run-commands'
      ? targetConfiguration.command ?? targetConfiguration.options?.command
      : null;

  return (
    <header
      className={twMerge(
        `group hover:bg-slate-50 dark:hover:bg-slate-800/60`,
        collapsable ? 'cursor-pointer' : '',
        isCompact ? 'px-2 py-1' : 'p-2',
        !isCollasped || !collapsable
          ? 'bg-slate-50 dark:bg-slate-800/60 border-b dark:border-slate-700/60 dark:border-slate-300/10 '
          : ''
      )}
      onClick={collapsable ? toggleCollapse : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {collapsable &&
            (isCollasped ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronUpIcon className="h-3 w-3" />
            ))}
          <TargetTechnologies
            technologies={targetConfiguration.metadata?.technologies}
            showTooltip={!isCollasped}
          />
          <h3 className="font-medium dark:text-slate-300">{targetName}</h3>
          {isCollasped &&
            targetConfiguration?.executor !== '@nx/js:release-publish' && (
              <p className="text-slate-400 text-sm">
                {singleCommand ? singleCommand : targetConfiguration.executor}
              </p>
            )}
          {targetName === 'nx-release-publish' && (
            <Tooltip
              openAction="hover"
              strategy="fixed"
              content={(<PropertyInfoTooltip type="release" />) as any}
            >
              <span className="inline-flex">
                <Pill text="nx release" color="grey" />
              </span>
            </Tooltip>
          )}
          {targetConfiguration.cache && (
            <Tooltip
              openAction="hover"
              strategy="fixed"
              content={(<PropertyInfoTooltip type="cacheable" />) as any}
            >
              <span className="inline-flex">
                <Pill text="Cacheable" color="green" />
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onViewInTaskGraph && (
            <button
              className="text-slate-600 dark:text-slate-300 text-sm ring-1 ring-inset ring-slate-400/40 dark:ring-slate-400/30 hover:bg-slate-200 dark:hover:bg-slate-700/60 p-1 bg-inherit rounded-md"
              // TODO: fix tooltip overflow in collapsed state
              data-tooltip={isCollasped ? false : 'View in Task Graph'}
              data-tooltip-align-right
            >
              <EyeIcon
                className={`h-5 w-5 !cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewInTaskGraph({ projectName, targetName });
                }}
              />
            </button>
          )}

          {onRunTarget && (
            <span
              className="text-slate-600 dark:text-slate-300 text-sm ring-1 ring-inset ring-slate-400/40 dark:ring-slate-400/30 hover:bg-slate-200 dark:hover:bg-slate-700/60 p-1 bg-inherit rounded-md"
              // TODO: fix tooltip overflow in collapsed state
              data-tooltip={isCollasped ? false : 'Run Target'}
              data-tooltip-align-right
            >
              <PlayIcon
                className="h-5 w-5 !cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onRunTarget({ projectName, targetName });
                }}
              />
            </span>
          )}
        </div>
      </div>
      {!isCollasped && (
        <div className="flex items-center text-sm mt-2 ml-5">
          <span className="flex-1 flex min-w-0 items-center">
            <SourceInfo
              data={sourceMap[`targets.${targetName}`]}
              propertyKey={`targets.${targetName}`}
              color="text-gray-500 dark:text-slate-400"
            />
          </span>
          {targetName !== 'nx-release-publish' && (
            <div className="flex items-center gap-2">
              <code className="ml-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 font-mono px-2 py-1 rounded">
                nx run {projectName}:{targetName}
              </code>
              <span>
                <CopyToClipboard
                  onCopy={() =>
                    handleCopyClick(`nx run ${projectName}:${targetName}`)
                  }
                  tooltipAlignment="right"
                />
              </span>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
