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

export interface FactionRecord {
  id: number;
  project_id: number;
  name: string;
  type: string | null;
  leader: string | null;
  goal: string | null;
  stance: string | null;
  summary: string | null;
  details: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFactionInput {
  projectId: number;
  name: string;
  type?: string;
  leader?: string;
  goal?: string;
  stance?: string;
  summary?: string;
  details?: string;
}

export interface CharacterRecord {
  id: number;
  project_id: number;
  name: string;
  role: string | null;
  faction_id: number | null;
  profession: string | null;
  profession_detail: string | null;
  age: string | null;
  profile: string | null;
  personality: string | null;
  goal: string | null;
  conflict: string | null;
  secret: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterListItem extends CharacterRecord {
  faction_name: string | null;
}

export interface CreateCharacterInput {
  projectId: number;
  name: string;
  role?: string;
  factionId?: number;
  profession?: string;
  professionDetail?: string;
  age?: string;
  profile?: string;
  personality?: string;
  goal?: string;
  conflict?: string;
  secret?: string;
  notes?: string;
}

export interface CharacterRelationRecord {
  id: number;
  project_id: number;
  character_id: number;
  related_character_id: number;
  relation_type: string;
  summary: string | null;
  details: string | null;
  intensity: number | null;
  visibility: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CharacterRelationListItem extends CharacterRelationRecord {
  character_name: string;
  related_character_name: string;
}

export interface CreateCharacterRelationInput {
  projectId: number;
  characterId: number;
  relatedCharacterId: number;
  relationType: string;
  summary?: string;
  details?: string;
  intensity?: number;
  visibility?: string;
}

export interface CharacterFactionRelationRecord {
  id: number;
  project_id: number;
  character_id: number;
  faction_id: number;
  relation_type: string;
  title: string | null;
  stance: string | null;
  summary: string | null;
  details: string | null;
  is_primary: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CharacterFactionRelationListItem extends CharacterFactionRelationRecord {
  character_name: string;
  faction_name: string;
}

export interface CreateCharacterFactionRelationInput {
  projectId: number;
  characterId: number;
  factionId: number;
  relationType: string;
  title?: string;
  stance?: string;
  summary?: string;
  details?: string;
  isPrimary?: boolean;
}
