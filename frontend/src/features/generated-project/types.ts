export interface FileTreeFile {
  type: "file";
  name: string;
  path: string;
}

export interface FileTreeFolder {
  type: "folder";
  name: string;
  path: string;
  children: FileTreeNode[];
}

export type FileTreeNode = FileTreeFile | FileTreeFolder;

export interface OpenFileTab {
  path: string;
}
