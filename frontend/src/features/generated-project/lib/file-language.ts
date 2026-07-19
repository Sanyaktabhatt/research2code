import {
  FileArchive,
  FileCode2,
  FileCog,
  FileJson2,
  FileText,
  FileTerminal,
  FileType2,
  type LucideIcon,
  NotebookText,
} from "lucide-react";

interface LanguageInfo {
  monacoLanguage: string;
  icon: LucideIcon;
}

const EXTENSION_MAP: Record<string, LanguageInfo> = {
  py: { monacoLanguage: "python", icon: FileCode2 },
  json: { monacoLanguage: "json", icon: FileJson2 },
  ipynb: { monacoLanguage: "json", icon: NotebookText },
  yaml: { monacoLanguage: "yaml", icon: FileCog },
  yml: { monacoLanguage: "yaml", icon: FileCog },
  md: { monacoLanguage: "markdown", icon: FileText },
  txt: { monacoLanguage: "plaintext", icon: FileText },
  sh: { monacoLanguage: "shell", icon: FileTerminal },
  cfg: { monacoLanguage: "ini", icon: FileCog },
  toml: { monacoLanguage: "ini", icon: FileCog },
  gitignore: { monacoLanguage: "plaintext", icon: FileType2 },
};

const FILENAME_MAP: Record<string, LanguageInfo> = {
  dockerfile: { monacoLanguage: "dockerfile", icon: FileArchive },
  "docker-compose.yml": { monacoLanguage: "yaml", icon: FileArchive },
  license: { monacoLanguage: "plaintext", icon: FileText },
  ".gitignore": { monacoLanguage: "plaintext", icon: FileType2 },
};

const DEFAULT_INFO: LanguageInfo = { monacoLanguage: "plaintext", icon: FileType2 };

export function languageInfoForPath(path: string): LanguageInfo {
  const name = path.split("/").pop() ?? path;
  const byName = FILENAME_MAP[name.toLowerCase()];
  if (byName) return byName;

  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return EXTENSION_MAP[extension] ?? DEFAULT_INFO;
}

export function monacoLanguageForPath(path: string): string {
  return languageInfoForPath(path).monacoLanguage;
}
