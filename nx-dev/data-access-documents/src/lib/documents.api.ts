import { DocumentData, DocumentMetadata } from '@nrwl/nx-dev/models-document';
import { readFileSync } from 'fs';
import matter from 'gray-matter';
import { join } from 'path';
import { extractTitle } from './documents.utils';

export interface StaticDocumentPaths {
  params: { segments: string[] };
}

export class DocumentsApi {
  constructor(
    private readonly options: {
      publicDocsRoot: string;
      documents: DocumentMetadata;
    }
  ) {
    if (!options.publicDocsRoot) {
      throw new Error('public docs root cannot be undefined');
    }
  }

  getDocument(path: string[]): DocumentData {
    const docPath = this.getFilePath(path);

    const originalContent = readFileSync(docPath, 'utf8');
    const file = matter(originalContent);

    // Set default title if not provided in front-matter section.
    if (!file.data.title) {
      file.data.title = extractTitle(originalContent) ?? path[path.length - 1];
      file.data.description = file.excerpt ?? path[path.length - 1];
    }

    return {
      filePath: docPath,
      data: file.data,
      content: file.content,
      excerpt: file.excerpt,
    };
  }

  getDocuments(): DocumentMetadata {
    const docs = this.options.documents;
    if (docs) return docs;
    throw new Error(`Cannot find any documents`);
  }

  getStaticDocumentPaths(): StaticDocumentPaths[] {
    const paths: StaticDocumentPaths[] = [];

    function recur(curr, acc) {
      if (curr.itemList) {
        curr.itemList.forEach((ii) => {
          recur(ii, [...acc, curr.id]);
        });
      } else {
        /*
         * Do not try to get paths for Packages (done by the PackagesApi).
         * This should be removed when the packages/schemas menu is inferred directly from PackagesApi.
         * TODO@ben: Remove this when packages schemas menu is auto-generated.
         */
        if (!!curr['path'] && curr['path'].startsWith('/packages/'))
          return void 0; // Do nothing

        paths.push({
          params: {
            segments: [...acc, curr.id],
          },
        });
      }
    }

    if (!this.options.documents || !this.options.documents.itemList)
      throw new Error(`Can't find any items`);
    this.options.documents.itemList.forEach((item) => {
      recur(item, []);
    });

    return paths;
  }

  private getFilePath(path: string[]): string {
    let items = this.options.documents?.itemList;

    if (!items) {
      throw new Error(`Document not found`);
    }

    let found;
    for (const part of path) {
      found = items?.find((item) => item.id === part);
      if (found) {
        items = found.itemList;
      } else {
        throw new Error(`Document not found`);
      }
    }
    const file = found.file ?? ['generated', ...path].join('/');
    return join(this.options.publicDocsRoot, `${file}.md`);
  }
}
