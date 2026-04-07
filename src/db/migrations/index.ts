export interface MigrationDefinition {
  id: string;
  sql: string;
}

export const migrations: MigrationDefinition[] = [
  {
    id: "001_initial_schema",
    sql: `
      -- 第一条 migration 直接创建 V1 全量表结构，保证新工作区可以一次初始化完成。
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        genre TEXT,
        premise TEXT,
        style TEXT,
        target_word_count INTEGER,
        status TEXT NOT NULL DEFAULT 'planning',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS factions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        leader TEXT,
        goal TEXT,
        stance TEXT,
        summary TEXT,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        faction_id INTEGER,
        profession TEXT,
        profession_detail TEXT,
        age TEXT,
        profile TEXT,
        personality TEXT,
        goal TEXT,
        conflict TEXT,
        secret TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS character_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        related_character_id INTEGER NOT NULL,
        relation_type TEXT NOT NULL,
        summary TEXT,
        details TEXT,
        intensity INTEGER,
        visibility TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (related_character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS character_faction_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        faction_id INTEGER NOT NULL,
        relation_type TEXT NOT NULL,
        title TEXT,
        stance TEXT,
        summary TEXT,
        details TEXT,
        is_primary INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS lore_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        details TEXT,
        tags TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS outlines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        parent_id INTEGER,
        node_type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        goal TEXT,
        conflict TEXT,
        outcome TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES outlines(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        outline_id INTEGER,
        title TEXT NOT NULL,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'planned',
        final_text TEXT,
        approved_draft_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS chapter_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        source_type TEXT NOT NULL,
        author_intent TEXT,
        plan_text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chapter_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        plan_id INTEGER,
        draft_text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'generated',
        review_notes TEXT,
        review_report TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES chapter_plans(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS story_hooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        hook_type TEXT NOT NULL,
        summary TEXT,
        setup_text TEXT,
        payoff_text TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER,
        start_chapter_id INTEGER,
        target_chapter_id INTEGER,
        end_chapter_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (start_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
        FOREIGN KEY (target_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
        FOREIGN KEY (end_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS hook_chapter_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        hook_id INTEGER NOT NULL,
        chapter_id INTEGER NOT NULL,
        link_type TEXT NOT NULL,
        planned_note TEXT,
        actual_note TEXT,
        status TEXT NOT NULL DEFAULT 'planned',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (hook_id) REFERENCES story_hooks(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS generation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        chapter_id INTEGER,
        run_type TEXT NOT NULL,
        prompt_text TEXT,
        input_context TEXT,
        output_text TEXT,
        model TEXT,
        status TEXT NOT NULL DEFAULT 'success',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
      CREATE INDEX IF NOT EXISTS idx_factions_project_id ON factions(project_id);
      CREATE INDEX IF NOT EXISTS idx_outlines_project_id ON outlines(project_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
      CREATE INDEX IF NOT EXISTS idx_chapter_plans_chapter_id ON chapter_plans(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_chapter_drafts_chapter_id ON chapter_drafts(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_story_hooks_project_id ON story_hooks(project_id);
      CREATE INDEX IF NOT EXISTS idx_generation_runs_project_id ON generation_runs(project_id);
    `
  }
];
