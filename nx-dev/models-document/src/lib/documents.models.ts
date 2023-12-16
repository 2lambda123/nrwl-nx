/**
 * @deprecated
 */
export interface DocumentData {
  filePath: string;
  data: { [key: string]: any };
  content: string;
  relatedContent: string;
  tags: string[];
}

export interface DocumentMetadata {
  id: string;
  name: string;
  description: string;
  mediaImage?: string;
  hideBacklinks?: boolean;
  file: string;
  path: string;
  isExternal: boolean;
  itemList: DocumentMetadata[];
  tags: string[];
}

export interface ProcessedDocument {
  content: string;
  description: string;
  mediaImage?: string;
  hideBacklinks?: boolean;
  filePath: string;
  id: string;
  name: string;
  relatedDocuments: Record<string, RelatedDocument[]>;
  tags: string[];
}

export interface RelatedDocument {
  description: string;
  file: string;
  id: string;
  name: string;
  path: string;
}

export interface BacklinkDocument {
  file: string;
  id: string;
  name: string;
  path: string;
}
