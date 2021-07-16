import { readFileSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';
import { extractTitle } from './documents.utils';
import {
  DocumentData,
  DocumentMetadata,
  VersionMetadata,
} from './documents.models';

export const flavorList: {
  label: string;
  value: string;
  default?: boolean;
}[] = [
  { label: 'Angular', value: 'angular' },
  { label: 'React', value: 'react', default: true },
  { label: 'Node', value: 'node' },
];

export class DocumentsApi {
  constructor(
    private readonly options: {
      previewRoot: string;
      archiveRoot: string;
      versions: VersionMetadata[];
      documentsMap: Map<string, DocumentMetadata[]>;
    }
  ) {}

  getDefaultVersion(): VersionMetadata {
    return this.options.versions.find((v) => v.default);
  }

  getVersions(): VersionMetadata[] {
    return this.options.versions;
  }

  getDocument(
    versionId: string,
    flavorId: string,
    path: string[]
  ): DocumentData {
    const docPath = this.getFilePath(versionId, flavorId, path);
    const originalContent = readFileSync(docPath, 'utf8');
    const file = matter(originalContent);

    // Set default title if not provided in front-matter section.
    if (!file.data.title) {
      file.data.title = extractTitle(originalContent) ?? path[path.length - 1];
    }

    return {
      filePath: relative(
        versionId === 'preview'
          ? this.options.previewRoot
          : this.options.archiveRoot,
        docPath
      ),
      data: file.data,
      content: file.content,
      excerpt: file.excerpt,
    };
  }

  getDocuments(version: string) {
    const docs = this.options.documentsMap.get(version);
    if (docs) {
      return docs;
    } else {
      throw new Error(`Cannot find documents for ${version}`);
    }
  }

  getStaticDocumentPaths(version: string) {
    const paths = [];
    const defaultVersion = this.getDefaultVersion();

    function recur(curr, acc) {
      if (curr.itemList) {
        curr.itemList.forEach((ii) => {
          recur(ii, [...acc, curr.id]);
        });
      } else {
        paths.push({
          params: {
            segments: [version, ...acc, curr.id],
          },
        });

        // For generic paths such as `/getting-started/intro`, use the default version and react flavor.
        if (version === defaultVersion.id && acc[0] === 'react') {
          paths.push({
            params: {
              segments: [...acc.slice(1), curr.id],
            },
          });
        }
      }
    }

    this.getDocuments(version).forEach((item) => {
      recur(item, []);
    });

    return paths;
  }

  getDocumentsRoot(version: string): string {
    if (version === 'preview') {
      return this.options.previewRoot;
    }

    if (version === 'latest' || version === 'previous') {
      return join(
        this.options.archiveRoot,
        this.options.versions.find((x) => x.id === version).path
      );
    }

    throw new Error(`Cannot find root for ${version}`);
  }

  private getFilePath(versionId, flavorId, path): string {
    let items = this.getDocuments(versionId).find(
      (item) => item.id === flavorId
    )?.itemList;

    if (!items) {
      throw new Error(`Document not found`);
    }

    let found;
    for (const part of path) {
      found = items.find((item) => item.id === part);
      if (found) {
        items = found.itemList;
      } else {
        throw new Error(`Document not found`);
      }
    }
    const file = found.file ?? [flavorId, ...path].join('/');
    return join(this.getDocumentsRoot(versionId), `${file}.md`);
  }
}
