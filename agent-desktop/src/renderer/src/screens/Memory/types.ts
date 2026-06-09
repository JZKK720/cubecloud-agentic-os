export interface MemoryEntry {
  index: number;
  content: string;
}

export interface MemoryData {
  memory: {
    content: string;
    exists: boolean;
    lastModified: number | null;
    entries: MemoryEntry[];
    charCount: number;
    charLimit: number;
  };
  user: {
    content: string;
    exists: boolean;
    lastModified: number | null;
    charCount: number;
    charLimit: number;
  };
  stats: { totalSessions: number; totalMessages: number };
}

export interface MemoryProviderInfo {
  name: string;
  description: string;
  installed: boolean;
  active: boolean;
  envVars: string[];
}

export type MemoryTab =
  | "entries"
  | "profile"
  | "providers"
  | "soul"
  | "wiki"
  | "learnings";

export interface WikiIndexEntry {
  title: string;
  category: string;
  summary: string;
  relPath: string;
  sourceCount?: number;
}

export interface WikiIndex {
  raw: string;
  catalog: WikiIndexEntry[];
  categories: string[];
  entryCount: number;
  lastModified: number | null;
  exists: boolean;
}

export interface WikiLogEntry {
  raw: string;
  iso: string;
  kind: string;
  title: string;
}

export interface WikiLog {
  raw: string;
  entries: WikiLogEntry[];
  lastModified: number | null;
  exists: boolean;
}

export interface WikiSource {
  name: string;
  relPath: string;
  size: number;
  lastModified: number;
}

export interface WikiSources {
  items: WikiSource[];
  total: number;
}

export interface WikiStatus {
  wikiHome: string;
  rawDir: string;
  indexPath: string;
  logPath: string;
  schemaPath: string;
  indexExists: boolean;
  logExists: boolean;
  schemaExists: boolean;
  rawSourceCount: number;
}
