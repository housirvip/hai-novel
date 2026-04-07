import type Database from "better-sqlite3";
import { CharacterFactionRelationRepository } from "../../db/repositories/character-faction-relation-repository.js";
import { CharacterRelationRepository } from "../../db/repositories/character-relation-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import { LoreRepository } from "../../db/repositories/lore-repository.js";
import { OutlineRepository } from "../../db/repositories/outline-repository.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import { StoryHookRepository } from "../../db/repositories/story-hook-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import type {
  BuildChapterContextInput,
  ChapterGenerationContext,
  OutlineRecord
} from "../../domain/types/index.js";

export class ChapterContextBuilder {
  constructor(private readonly database: Database.Database) {}

  build(input: BuildChapterContextInput): ChapterGenerationContext {
    const projectRepository = new ProjectRepository(this.database);
    const chapterRepository = new ChapterRepository(this.database);
    const outlineRepository = new OutlineRepository(this.database);
    const characterRepository = new CharacterRepository(this.database);
    const factionRepository = new FactionRepository(this.database);
    const loreRepository = new LoreRepository(this.database);
    const characterRelationRepository = new CharacterRelationRepository(this.database);
    const characterFactionRelationRepository = new CharacterFactionRelationRepository(
      this.database
    );
    const chapterStateSnapshotRepository = new ChapterStateSnapshotRepository(this.database);
    const characterStateSnapshotRepository = new CharacterStateSnapshotRepository(this.database);
    const factionStateSnapshotRepository = new FactionStateSnapshotRepository(this.database);
    const hookStateSnapshotRepository = new HookStateSnapshotRepository(this.database);
    const hookRepository = new StoryHookRepository(this.database);
    const hookLinkRepository = new HookChapterLinkRepository(this.database);

    const chapter = chapterRepository.findDetailById(input.chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${input.chapterId} not found.`);
    }

    if (chapter.project_id !== input.projectId) {
      throw new Error(
        `Chapter ${input.chapterId} does not belong to project ${input.projectId}.`
      );
    }

    const project = projectRepository.findById(input.projectId);
    if (!project) {
      throw new Error(`Project ${input.projectId} not found.`);
    }

    const outlineChain = this.resolveOutlineChain(outlineRepository, chapter.outline_id);
    const rootOutlines = outlineRepository
      .findAllByProjectId(input.projectId)
      .filter((item) => item.parent_id === null);
    const characters = characterRepository.findAllByProjectId(input.projectId);
    const factions = factionRepository.findAllByProjectId(input.projectId);
    const loreEntries = loreRepository.findAllByProjectId(input.projectId);
    const characterRelations = characterRelationRepository.findAllByProjectId(input.projectId);
    const characterFactionRelations = characterFactionRelationRepository.findAllByProjectId(
      input.projectId
    );
    const hookLinks = hookLinkRepository.findAllByChapterId(input.chapterId);
    const allHooks = hookRepository.findAllByProjectId(input.projectId);
    const targetHooks = allHooks.filter((hook) => hook.target_chapter_id === input.chapterId);
    const activeHooks = allHooks.filter((hook) => hook.status === "active");
    const chapterSnapshots = chapterStateSnapshotRepository
      .findAllByProjectId(input.projectId)
      .filter((snapshot) => snapshot.chapter_id < input.chapterId);
    const latestChapterSnapshot = chapterSnapshots[0] ?? null;
    const latestCharacterStates = this.pickLatestSnapshotsByKey(
      characterStateSnapshotRepository
        .findAllByProjectId(input.projectId)
        .filter((snapshot) => snapshot.chapter_id < input.chapterId),
      (snapshot) => snapshot.character_id
    );
    const latestFactionStates = this.pickLatestSnapshotsByKey(
      factionStateSnapshotRepository
        .findAllByProjectId(input.projectId)
        .filter((snapshot) => snapshot.chapter_id < input.chapterId),
      (snapshot) => snapshot.faction_id
    );
    const latestHookStates = this.pickLatestSnapshotsByKey(
      hookStateSnapshotRepository
        .findAllByProjectId(input.projectId)
        .filter((snapshot) => snapshot.chapter_id < input.chapterId),
      (snapshot) => snapshot.hook_id
    );

    return {
      project,
      chapter,
      outline_chain: outlineChain,
      root_outlines: rootOutlines,
      lore_entries: loreEntries,
      characters,
      factions,
      character_relations: characterRelations,
      character_faction_relations: characterFactionRelations,
      hook_links: hookLinks,
      target_hooks: targetHooks,
      active_hooks: activeHooks,
      latest_chapter_snapshot: latestChapterSnapshot,
      latest_character_states: latestCharacterStates,
      latest_faction_states: latestFactionStates,
      latest_hook_states: latestHookStates
    };
  }

  private pickLatestSnapshotsByKey<T>(
    snapshots: T[],
    resolveKey: (snapshot: T) => number
  ): T[] {
    const snapshotMap = new Map<number, T>();

    for (const snapshot of snapshots) {
      const key = resolveKey(snapshot);
      if (!snapshotMap.has(key)) {
        snapshotMap.set(key, snapshot);
      }
    }

    return Array.from(snapshotMap.values());
  }

  private resolveOutlineChain(
    repository: OutlineRepository,
    outlineId: number | null
  ): OutlineRecord[] {
    if (outlineId === null) {
      return [];
    }

    const chain: OutlineRecord[] = [];
    let currentId: number | null = outlineId;

    // 从当前节点向上追溯，形成“总纲 -> 分卷 -> 章纲”的稳定上下文顺序。
    while (currentId !== null) {
      const outline = repository.findById(currentId);
      if (!outline) {
        break;
      }
      chain.push(outline);
      currentId = outline.parent_id;
    }

    return chain.reverse();
  }
}
