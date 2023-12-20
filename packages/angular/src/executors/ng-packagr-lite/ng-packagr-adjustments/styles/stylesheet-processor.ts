/**
 * Adapted from the original ng-packagr source.
 *
 * Changes made:
 * - Added the filePath parameter to the cache key.
 * - Refactored caching to take into account TailwindCSS processing.
 * - Added PostCSS plugins needed to support TailwindCSS.
 * - Added watch mode parameter.
 */

import * as browserslist from 'browserslist';
import { existsSync } from 'fs';
import { EsbuildExecutor } from 'ng-packagr/lib/esbuild/esbuild-executor';
import {
  generateKey,
  readCacheEntry,
  saveCacheEntry,
} from 'ng-packagr/lib/utils/cache';
import * as log from 'ng-packagr/lib/utils/log';
import { dirname, extname, join } from 'path';
import * as postcssPresetEnv from 'postcss-preset-env';
import * as postcssUrl from 'postcss-url';
import { pathToFileURL } from 'node:url';
import {
  getTailwindPostCssPlugins,
  getTailwindSetup,
  tailwindDirectives,
  TailwindSetup,
} from '../../../utilities/ng-packagr/tailwindcss';

const postcss = require('postcss');

export enum CssUrl {
  inline = 'inline',
  none = 'none',
}

export enum InlineStyleLanguage {
  sass = 'sass',
  scss = 'scss',
  css = 'css',
  less = 'less',
}

export interface Result {
  css: string;
  warnings: string[];
  error?: string;
}

export class StylesheetProcessor {
  private browserslistData: string[];
  private targets: string[];
  private postCssProcessor: ReturnType<typeof postcss>;
  private esbuild = new EsbuildExecutor();
  private styleIncludePaths: string[];
  private tailwindSetup: TailwindSetup | undefined;

  constructor(
    private readonly basePath: string,
    private readonly cssUrl?: CssUrl,
    private readonly includePaths?: string[],
    private readonly cacheDirectory?: string | false,
    private readonly watch?: boolean,
    private readonly tailwindConfig?: string
  ) {
    // By default, browserslist defaults are too inclusive
    // https://github.com/browserslist/browserslist/blob/83764ea81ffaa39111c204b02c371afa44a4ff07/index.js#L516-L522

    // We change the default query to browsers that Angular support.
    // https://angular.io/guide/browser-support
    (browserslist.defaults as string[]) = [
      'last 2 Chrome version',
      'last 1 Firefox version',
      'last 2 Edge major versions',
      'last 2 Safari major versions',
      'last 2 iOS major versions',
      'Firefox ESR',
    ];

    this.styleIncludePaths = [...this.includePaths];
    let prevDir = null;
    let currentDir = this.basePath;

    while (currentDir !== prevDir) {
      const p = join(currentDir, 'node_modules');
      if (existsSync(p)) {
        this.styleIncludePaths.push(p);
      }

      prevDir = currentDir;
      currentDir = dirname(prevDir);
    }

    this.browserslistData = browserslist(undefined, { path: this.basePath });
    this.targets = transformSupportedBrowsersToTargets(this.browserslistData);
    this.tailwindSetup = getTailwindSetup(this.basePath, this.tailwindConfig);
    this.postCssProcessor = this.createPostCssPlugins();
  }

  async process({
    filePath,
    content,
  }: {
    filePath: string;
    content: string;
  }): Promise<string> {
    let key: string | undefined;

    if (
      this.cacheDirectory &&
      !content.includes('@import') &&
      !content.includes('@use') &&
      !this.containsTailwindDirectives(content)
    ) {
      // No transitive deps and no Tailwind directives, we can cache more aggressively.
      key = await generateKey(content, ...this.browserslistData, filePath);
      const result = await readCacheEntry(this.cacheDirectory, key);
      if (result) {
        result.warnings.forEach((msg) => log.warn(msg));

        return result.css;
      }
    }

    // Render pre-processor language (sass, styl, less)
    const renderedCss = await this.renderCss(filePath, content);

    let containsTailwindDirectives = false;
    if (this.cacheDirectory) {
      containsTailwindDirectives = this.containsTailwindDirectives(renderedCss);
      if (!containsTailwindDirectives) {
        // No Tailwind directives to process by PostCSS, we can return cached results
        if (!key) {
          key = await generateKey(
            renderedCss,
            ...this.browserslistData,
            filePath
          );
        }

        const cachedResult = await this.getCachedResult(key);
        if (cachedResult) {
          return cachedResult;
        }
      }
    }

    // Render postcss (autoprefixing and friends)
    const result = await this.postCssProcessor.process(renderedCss, {
      from: filePath,
      to: filePath.replace(extname(filePath), '.css'),
    });

    if (this.cacheDirectory && containsTailwindDirectives) {
      // We had Tailwind directives to process by PostCSS, only now
      // is safe to return cached results
      key = await generateKey(result.css, ...this.browserslistData, filePath);

      const cachedResult = await this.getCachedResult(key);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const warnings = result.warnings().map((w) => w.toString());
    const { code, warnings: esBuildWarnings } = await this.esbuild.transform(
      result.css,
      {
        loader: 'css',
        minify: true,
        target: this.targets,
        sourcefile: filePath,
      }
    );

    if (esBuildWarnings.length > 0) {
      warnings.push(
        ...(await this.esbuild.formatMessages(esBuildWarnings, {
          kind: 'warning',
        }))
      );
    }

    if (this.cacheDirectory) {
      await saveCacheEntry(
        this.cacheDirectory,
        key,
        JSON.stringify({
          css: code,
          warnings,
        })
      );
    }
    warnings.forEach((msg) => log.warn(msg));

    return code;
  }

  private async getCachedResult(key: string): Promise<string | undefined> {
    const cachedResult = await readCacheEntry(
      this.cacheDirectory as string,
      key
    );
    if (cachedResult) {
      cachedResult.warnings.forEach((msg) => log.warn(msg));

      return cachedResult.css;
    }

    return undefined;
  }

  private containsTailwindDirectives(content: string): boolean {
    return (
      this.tailwindSetup && tailwindDirectives.some((d) => content.includes(d))
    );
  }

  private createPostCssPlugins(): ReturnType<typeof postcss> {
    const postCssPlugins = [];
    if (this.cssUrl !== CssUrl.none) {
      postCssPlugins.push(postcssUrl({ url: this.cssUrl }));
    }

    if (this.tailwindSetup) {
      postCssPlugins.push(
        ...getTailwindPostCssPlugins(
          this.tailwindSetup,
          this.styleIncludePaths,
          this.watch
        )
      );
    }

    postCssPlugins.push(
      postcssPresetEnv({
        browsers: this.browserslistData,
        autoprefixer: true,
        stage: 3,
      })
    );

    return postcss(postCssPlugins);
  }

  private async renderCss(filePath: string, css: string): Promise<string> {
    const ext = extname(filePath);

    switch (ext) {
      case '.sass':
      case '.scss': {
        return (await import('sass'))
          .compileString(css, {
            url: pathToFileURL(filePath),
            syntax: '.sass' === ext ? 'indented' : 'scss',
            loadPaths: this.styleIncludePaths,
          })
          .css.toString();
      }
      case '.less': {
        const { css: content } = await (
          await import('less')
        ).render(css, {
          filename: filePath,
          javascriptEnabled: true,
          paths: this.styleIncludePaths,
        });

        return content;
      }
      case '.css':
      default:
        return css;
    }
  }
}

function transformSupportedBrowsersToTargets(
  supportedBrowsers: string[]
): string[] {
  const transformed: string[] = [];

  // https://esbuild.github.io/api/#target
  const esBuildSupportedBrowsers = new Set([
    'safari',
    'firefox',
    'edge',
    'chrome',
    'ios',
  ]);

  for (const browser of supportedBrowsers) {
    let [browserName, version] = browser.split(' ');

    // browserslist uses the name `ios_saf` for iOS Safari whereas esbuild uses `ios`
    if (browserName === 'ios_saf') {
      browserName = 'ios';
    }

    // browserslist uses ranges `15.2-15.3` versions but only the lowest is required
    // to perform minimum supported feature checks. esbuild also expects a single version.
    [version] = version.split('-');

    if (browserName === 'ie') {
      transformed.push('edge12');
    } else if (esBuildSupportedBrowsers.has(browserName)) {
      if (browserName === 'safari' && version === 'tp') {
        // esbuild only supports numeric versions so `TP` is converted to a high number (999) since
        // a Technology Preview (TP) of Safari is assumed to support all currently known features.
        version = '999';
      }

      transformed.push(browserName + version);
    }
  }

  return transformed.length ? transformed : undefined;
}
