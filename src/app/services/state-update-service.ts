import type Database from "better-sqlite3";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import { StoryHookRepository } from "../../db/repositories/story-hook-repository.js";
import type {
  ChapterStateSnapshotRecord,
  ExtractedChapterStatePayload,
  HookProgressStatus,
  StoryHookRecord
} from "../../domain/types/index.js";

/**
 * 正式状态落库服务。
 * 在写快照前会先把提取到的新人物 / 势力 / 钩子补入主档案，并为钩子补齐章节关联。
 */
export class StateUpdateService {
  constructor(private readonly database: Database.Database) {}

  applyChapterState(input: {
    projectId: number;
    chapterId: number;
    draftId?: number;
    payload: ExtractedChapterStatePayload;
  }): {
    chapterSnapshot: ChapterStateSnapshotRecord;
    characterSnapshotCount: number;
    factionSnapshotCount: number;
    hookSnapshotCount: number;
    itemStateCount: number;
  } {
    const normalizedPayload = this.materializePayload(input);
    const chapterSnapshotRepository = new ChapterStateSnapshotRepository(this.database);
    const chapterSnapshot = chapterSnapshotRepository.create({
      projectId: input.projectId,
      chapterId: input.chapterId,
      sourceDraftId: input.draftId,
      status: "applied",
      applied: true,
      summary: normalizedPayload.chapter_summary,
      rawPayload: JSON.stringify(normalizedPayload, null, 2)
    });

    const characterSnapshotRepository = new CharacterStateSnapshotRepository(this.database);
    for (const character of normalizedPayload.characters) {
      if (!character.character_id) {
        continue;
      }

      characterSnapshotRepository.create({
        projectId: input.projectId,
        characterId: character.character_id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        statusSummary: this.normalizeOptionalText(character.status_summary),
        location: this.normalizeOptionalText(character.location),
        goal: this.normalizeOptionalText(character.goal),
        publicImpression: this.normalizeOptionalText(character.public_impression),
        internalState: this.normalizeOptionalText(character.internal_state)
      });
    }

    const factionSnapshotRepository = new FactionStateSnapshotRepository(this.database);
    for (const faction of normalizedPayload.factions) {
      if (!faction.faction_id) {
        continue;
      }

      factionSnapshotRepository.create({
        projectId: input.projectId,
        factionId: faction.faction_id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        statusSummary: this.normalizeOptionalText(faction.status_summary),
        powerShift: this.normalizeOptionalText(faction.power_shift),
        externalRelationSummary: this.normalizeOptionalText(faction.external_relation_summary)
      });
    }

    const hookSnapshotRepository = new HookStateSnapshotRepository(this.database);
    for (const hook of normalizedPayload.hooks) {
      if (!hook.hook_id) {
        continue;
      }

      hookSnapshotRepository.create({
        projectId: input.projectId,
        hookId: hook.hook_id,
        chapterId: input.chapterId,
        chapterSnapshotId: chapterSnapshot.id,
        progressStatus: hook.progress_status,
        progressNote: this.normalizeOptionalText(hook.progress_note)
      });
    }

    return {
      chapterSnapshot,
      characterSnapshotCount: normalizedPayload.characters.filter((item) => item.character_id).length,
      factionSnapshotCount: normalizedPayload.factions.filter((item) => item.faction_id).length,
      hookSnapshotCount: normalizedPayload.hooks.filter((item) => item.hook_id).length,
      itemStateCount: normalizedPayload.items.length
    };
  }

  private materializePayload(input: {
    projectId: number;
    chapterId: number;
    payload: ExtractedChapterStatePayload;
  }): ExtractedChapterStatePayload {
    const chapterRepository = new ChapterRepository(this.database);
    const factionRepository = new FactionRepository(this.database);
    const characterRepository = new CharacterRepository(this.database);
    const storyHookRepository = new StoryHookRepository(this.database);
    const hookChapterLinkRepository = new HookChapterLinkRepository(this.database);

    const factionIdByName = new Map(
      factionRepository
        .findAllByProjectId(input.projectId)
        .map((faction) => [this.normalizeName(faction.name), faction.id])
    );
    const resolvedFactions: ExtractedChapterStatePayload["factions"] = [];
    const seenFactionKeys = new Set<string>();
    for (const faction of input.payload.factions) {
      const fallbackId =
        faction.faction_id ??
        (faction.name ? factionIdByName.get(this.normalizeName(faction.name)) : undefined);
      const factionId =
        fallbackId ??
        (faction.name
          ? factionRepository.create({
              projectId: input.projectId,
              name: faction.name,
              type: this.normalizeOptionalText(faction.type),
              leader: this.normalizeOptionalText(faction.leader),
              goal: this.normalizeOptionalText(faction.goal),
              stance: this.normalizeOptionalText(faction.stance),
              summary:
                this.normalizeOptionalText(faction.summary) ??
                this.normalizeOptionalText(faction.status_summary),
              details: this.normalizeOptionalText(faction.details)
            }).id
          : undefined);

      if (!factionId) {
        continue;
      }

      if (faction.name) {
        factionIdByName.set(this.normalizeName(faction.name), factionId);
      }

      const dedupeKey = `faction:${factionId}`;
      if (seenFactionKeys.has(dedupeKey)) {
        continue;
      }
      seenFactionKeys.add(dedupeKey);

      resolvedFactions.push({
        ...faction,
        faction_id: factionId,
        name: undefined
      });
    }

    const characterIdByName = new Map(
      characterRepository
        .findAllByProjectId(input.projectId)
        .map((character) => [this.normalizeName(character.name), character.id])
    );
    const resolvedCharacters: ExtractedChapterStatePayload["characters"] = [];
    const seenCharacterKeys = new Set<string>();
    for (const character of input.payload.characters) {
      const resolvedFactionId =
        character.faction_id ??
        (character.faction_name
          ? factionIdByName.get(this.normalizeName(character.faction_name))
          : undefined);
      const fallbackId =
        character.character_id ??
        (character.name ? characterIdByName.get(this.normalizeName(character.name)) : undefined);
      const characterId =
        fallbackId ??
        (character.name
          ? characterRepository.create({
              projectId: input.projectId,
              name: character.name,
              role: this.normalizeOptionalText(character.role),
              factionId: resolvedFactionId,
              profession: this.normalizeOptionalText(character.profession),
              profile: this.normalizeOptionalText(character.profile),
              goal: this.normalizeOptionalText(character.goal),
              notes: this.normalizeOptionalText(character.status_summary)
            }).id
          : undefined);

      if (!characterId) {
        continue;
      }

      if (character.name) {
        characterIdByName.set(this.normalizeName(character.name), characterId);
      }

      const dedupeKey = `character:${characterId}`;
      if (seenCharacterKeys.has(dedupeKey)) {
        continue;
      }
      seenCharacterKeys.add(dedupeKey);

      resolvedCharacters.push({
        ...character,
        character_id: characterId,
        faction_id: resolvedFactionId,
        name: undefined,
        faction_name: undefined
      });
    }

    const validTargetChapterIds = new Set<number>();
    for (const hook of input.payload.hooks) {
      if (
        typeof hook.target_chapter_id === "number" &&
        chapterRepository.findById(hook.target_chapter_id)?.project_id === input.projectId
      ) {
        validTargetChapterIds.add(hook.target_chapter_id);
      }
    }

    const hookIdByTitle = new Map(
      storyHookRepository
        .findAllByProjectId(input.projectId)
        .map((hook) => [this.normalizeName(hook.title), hook.id])
    );
    const chapterHookIds = new Set(
      hookChapterLinkRepository
        .findAllByChapterId(input.chapterId)
        .map((link) => link.hook_id)
    );
    const resolvedHooks: ExtractedChapterStatePayload["hooks"] = [];
    const seenHookKeys = new Set<string>();
    for (const hook of input.payload.hooks) {
      const targetChapterId =
        typeof hook.target_chapter_id === "number" && validTargetChapterIds.has(hook.target_chapter_id)
          ? hook.target_chapter_id
          : undefined;
      const fallbackId =
        hook.hook_id ?? (hook.title ? hookIdByTitle.get(this.normalizeName(hook.title)) : undefined);
      const existingHook = fallbackId ? storyHookRepository.findById(fallbackId) : undefined;
      const hookId =
        existingHook?.id ??
        (hook.title
          ? storyHookRepository.create({
              projectId: input.projectId,
              title: hook.title,
              hookType: this.normalizeOptionalText(hook.hook_type) ?? "mystery",
              summary:
                this.normalizeOptionalText(hook.summary) ??
                this.normalizeOptionalText(hook.progress_note),
              setupText: this.normalizeOptionalText(hook.setup_text),
              payoffText: this.normalizeOptionalText(hook.payoff_text),
              priority: hook.priority,
              targetChapterId
            }).id
          : undefined);

      if (!hookId) {
        continue;
      }

      const storedHook = storyHookRepository.findById(hookId);
      if (!storedHook) {
        continue;
      }

      if (hook.title) {
        hookIdByTitle.set(this.normalizeName(hook.title), hookId);
      }

      this.syncHookLifecycle(storyHookRepository, storedHook, input.chapterId, {
        progressStatus: hook.progress_status,
        linkType: this.resolveHookLinkType(hook.link_type, hook.progress_status),
        targetChapterId
      });

      if (!chapterHookIds.has(hookId)) {
        hookChapterLinkRepository.create({
          projectId: input.projectId,
          hookId,
          chapterId: input.chapterId,
          linkType: this.resolveHookLinkType(hook.link_type, hook.progress_status),
          actualNote: this.normalizeOptionalText(hook.progress_note),
          status: "done"
        });
        chapterHookIds.add(hookId);
      }

      const dedupeKey = `hook:${hookId}`;
      if (seenHookKeys.has(dedupeKey)) {
        continue;
      }
      seenHookKeys.add(dedupeKey);

      resolvedHooks.push({
        ...hook,
        hook_id: hookId,
        title: undefined,
        target_chapter_id: targetChapterId
      });
    }

    return {
      chapter_summary: input.payload.chapter_summary,
      characters: resolvedCharacters,
      factions: resolvedFactions,
      hooks: resolvedHooks,
      items: input.payload.items
    };
  }

  private syncHookLifecycle(
    repository: StoryHookRepository,
    hook: StoryHookRecord,
    chapterId: number,
    input: {
      progressStatus: HookProgressStatus;
      linkType: string;
      targetChapterId?: number;
    }
  ): void {
    const nextStatus =
      hook.status === "closed"
        ? "closed"
        : input.progressStatus === "resolved"
          ? "closed"
          : input.progressStatus === "started" || input.progressStatus === "advanced"
            ? "active"
            : hook.status;
    const nextStartChapterId =
      input.progressStatus === "started" ||
      input.progressStatus === "advanced" ||
      input.progressStatus === "resolved" ||
      input.linkType === "setup"
        ? hook.start_chapter_id ?? chapterId
        : hook.start_chapter_id ?? undefined;
    const nextEndChapterId =
      input.progressStatus === "resolved" ? chapterId : hook.end_chapter_id ?? undefined;

    repository.update({
      hookId: hook.id,
      status: nextStatus,
      startChapterId: nextStartChapterId,
      targetChapterId: input.targetChapterId ?? hook.target_chapter_id ?? undefined,
      endChapterId: nextEndChapterId
    });
  }

  private resolveHookLinkType(
    value: string | undefined,
    progressStatus: HookProgressStatus
  ): string {
    if (value && ["setup", "advance", "reveal", "close"].includes(value)) {
      return value;
    }

    if (progressStatus === "resolved") {
      return "close";
    }

    if (progressStatus === "advanced") {
      return "advance";
    }

    return "setup";
  }

  private normalizeOptionalText(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private normalizeName(value: string): string {
    return value.trim().toLocaleLowerCase("zh-Hans-CN");
  }
}
