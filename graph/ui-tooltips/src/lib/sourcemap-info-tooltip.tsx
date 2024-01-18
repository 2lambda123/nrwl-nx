import { type ReactNode } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export interface SourcemapInfoToolTipProps {
  propertyKey: string;
  plugin: string;
  file: string;
  children?: ReactNode | ReactNode[];
}

export function SourcemapInfoToolTip({
  propertyKey,
  plugin,
  file,
  children,
}: SourcemapInfoToolTipProps) {
  const docsUrlSlug: string | undefined = plugin.startsWith('@nx/')
    ? plugin.replace('@nx/', '').split('/')[0]
    : undefined;

  return (
    <div className="text-sm text-slate-700 dark:text-slate-400">
      <h4 className="flex justify-between items-center border-b text-base">
        <span className="font-mono">{propertyKey}</span>
        <span className="text-sm text-gray-500 italic">Nx Graph Insights</span>
      </h4>
      <div className="flex flex-col font-mono border-b py-2">
        <p className="flex grow items-center gap-2">
          <span className="font-bold">Created by:</span>
          <span className="inline-flex grow justify-between items-center">
            {plugin}
          </span>
        </p>
        <p>
          <span className="font-bold">Created from:</span> {file}
        </p>
      </div>
      <div className="flex py-2">
        {docsUrlSlug && (
          <p className="border-r pr-4 flex items-center">
            <ExternalLink
              text={`View @nx/${docsUrlSlug} Docs`}
              href={`https://nx.dev/nx-api/${docsUrlSlug}`}
            />
          </p>
        )}
        <p className={`${docsUrlSlug && 'pl-4'} flex flex-col gap-1`}>
          <ExternalLink
            text="What are Inferred Tasks?"
            href="https://nx.dev/concepts/inferred-tasks"
          />
          <ExternalLink
            text="What are Project Graph Plugins?"
            href="https://nx.dev/extending-nx/recipes/project-graph-plugins"
          />
        </p>
      </div>
    </div>
  );
}

function ExternalLink({ text, href }: { text: string; href: string }) {
  return (
    <a
      href={href}
      className="text-slate-500 dark:text-slate-300 hover:underline inline-flex items-center gap-2"
      target="_blank"
    >
      {text} <ArrowTopRightOnSquareIcon className="w-4 h-4 inline" />
    </a>
  );
}
