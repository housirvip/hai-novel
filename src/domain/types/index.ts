export interface AppConfig {
  dbPath: string;
  exportsDir: string;
}

export interface ProjectRecord {
  id: number;
  name: string;
  genre: string | null;
  premise: string | null;
  style: string | null;
  target_word_count: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  genre?: string;
  premise?: string;
  style?: string;
  targetWordCount?: number;
}
