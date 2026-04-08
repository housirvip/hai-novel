import type Database from "better-sqlite3";
import { CharacterFactionRelationRepository } from "../../db/repositories/character-faction-relation-repository.js";
import { CharacterRelationRepository } from "../../db/repositories/character-relation-repository.js";
import { CharacterRepository } from "../../db/repositories/character-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { ChapterStateSnapshotRepository } from "../../db/repositories/chapter-state-snapshot-repository.js";
import { CharacterItemRepository } from "../../db/repositories/character-item-repository.js";
import { FactionRepository } from "../../db/repositories/faction-repository.js";
import { FactionStateSnapshotRepository } from "../../db/repositories/faction-state-snapshot-repository.js";
import { HookChapterLinkRepository } from "../../db/repositories/hook-chapter-link-repository.js";
import { HookStateSnapshotRepository } from "../../db/repositories/hook-state-snapshot-repository.js";
import { ItemRepository } from "../../db/repositories/item-repository.js";
import { LoreRepository } from "../../db/repositories/lore-repository.js";
import { OutlineRepository } from "../../db/repositories/outline-repository.js";
import { ProjectRepository } from "../../db/repositories/project-repository.js";
import { StoryHookRepository } from "../../db/repositories/story-hook-repository.js";
import { CharacterStateSnapshotRepository } from "../../db/repositories/character-state-snapshot-repository.js";
import { runtimeEnv } from "../../config/runtime-env.js";
import type {
  BuildChapterContextInput,
  ChapterGenerationContext,
  CharacterListItem,
  CharacterStateSnapshotRecord,
  ChapterHookLinkListItem,
  CharacterItemListItem,
  FactionRecord,
  FactionStateSnapshotRecord,
  HookStateSnapshotRecord,
  ItemListItem,
  OutlineRecord,
  StoryHookListItem
} from "../../domain/types/index.js";

const CHARACTER_RELEVANCE = runtimeEnv.relevance.character;
const FACTION_RELEVANCE = runtimeEnv.relevance.faction;
const HOOK_RELEVANCE = runtimeEnv.relevance.hook;
const SNAPSHOT_BASE_SCORE = runtimeEnv.relevance.snapshotBaseScore;
const HOOK_STATE_RESOLVED_BONUS = runtimeEnv.relevance.hookStateResolvedBonus;
const HOOK_STATE_ADVANCED_BONUS = runtimeEnv.relevance.hookStateAdvancedBonus;
const MAX_ITEM_CONTEXT_ITEMS = 5;

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
    const itemRepository = new ItemRepository(this.database);
    const characterItemRepository = new CharacterItemRepository(this.database);

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
    const items = itemRepository.findAllByProjectId(input.projectId);
    const activeCharacterItems = characterItemRepository.findAllByProjectId(input.projectId, {
      activeOnly: true
    });
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
    const relevanceInput = {
      chapter,
      outlineChain,
      characters,
      factions,
      hookLinks,
      targetHooks,
      activeHooks,
      latestCharacterStates,
      latestFactionStates,
      latestHookStates
    };
    const sortedCharacters = this.sortCharactersByRelevance(relevanceInput);
    const sortedFactions = this.sortFactionsByRelevance(relevanceInput);
    const sortedItems = this.sortItemsByRelevance(relevanceInput, items, activeCharacterItems);
    const sortedActiveCharacterItems = this.sortActiveCharacterItemsByRelevance(
      relevanceInput,
      activeCharacterItems
    );
    const sortedActiveHooks = this.sortHooksByRelevance(relevanceInput, activeHooks);
    const sortedTargetHooks = this.sortHooksByRelevance(relevanceInput, targetHooks);
    const sortedLatestCharacterStates = this.sortCharacterStatesByRelevance(
      relevanceInput,
      latestCharacterStates
    );
    const sortedLatestFactionStates = this.sortFactionStatesByRelevance(
      relevanceInput,
      latestFactionStates
    );
    const sortedLatestHookStates = this.sortHookStatesByRelevance(
      relevanceInput,
      latestHookStates
    );

    return {
      project,
      chapter,
      outline_chain: outlineChain,
      root_outlines: rootOutlines,
      lore_entries: loreEntries,
      characters: sortedCharacters,
      factions: sortedFactions,
      items: sortedItems,
      active_character_items: sortedActiveCharacterItems,
      character_relations: characterRelations,
      character_faction_relations: characterFactionRelations,
      hook_links: hookLinks,
      target_hooks: sortedTargetHooks,
      active_hooks: sortedActiveHooks,
      latest_chapter_snapshot: latestChapterSnapshot,
      latest_character_states: sortedLatestCharacterStates,
      latest_faction_states: sortedLatestFactionStates,
      latest_hook_states: sortedLatestHookStates
    };
  }

  private sortItemsByRelevance(
    input: {
      chapter: ChapterGenerationContext["chapter"];
      outlineChain: OutlineRecord[];
      characters: CharacterListItem[];
      factions: FactionRecord[];
      hookLinks: ChapterHookLinkListItem[];
      targetHooks: StoryHookListItem[];
      activeHooks: StoryHookListItem[];
      latestCharacterStates: CharacterStateSnapshotRecord[];
      latestFactionStates: FactionStateSnapshotRecord[];
      latestHookStates: HookStateSnapshotRecord[];
    },
    items: ItemListItem[],
    activeCharacterItems: CharacterItemListItem[]
  ): ItemListItem[] {
    const textSignals = this.buildTextSignals(input);
    const mentionedCharacterIds = new Set(
      input.characters
        .filter((character) => this.textSignalsContain(textSignals, character.name))
        .map((character) => character.id)
    );
    const activeItemIds = new Set(activeCharacterItems.map((link) => link.item_id));
    const activeItemByMentionedOwnerIds = new Set(
      activeCharacterItems
        .filter((link) => mentionedCharacterIds.has(link.character_id))
        .map((link) => link.item_id)
    );

    return this.sortByScore(items, (item) => {
      let score = 0;

      if (this.textSignalsContain(textSignals, item.name)) {
        // 物品名直接命中章节材料时，说明它就是本章显式道具。
        score += 100;
      }

      if (
        (item.description && this.textSignalsContain(textSignals, item.description)) ||
        (item.origin && this.textSignalsContain(textSignals, item.origin))
      ) {
        // 描述或来源被命中时，通常代表这件道具和本章语义已经靠近。
        score += 30;
      }

      if (activeItemByMentionedOwnerIds.has(item.id)) {
        // 已被本章关键人物持有的道具，优先级略高于普通活跃物品。
        score += 25;
      } else if (activeItemIds.has(item.id)) {
        // 当前仍在流转中的道具，比纯背景物更值得被看见。
        score += 10;
      }

      return score;
    });
  }

  private sortActiveCharacterItemsByRelevance(
    input: {
      chapter: ChapterGenerationContext["chapter"];
      outlineChain: OutlineRecord[];
      characters: CharacterListItem[];
      factions: FactionRecord[];
      hookLinks: ChapterHookLinkListItem[];
      targetHooks: StoryHookListItem[];
      activeHooks: StoryHookListItem[];
      latestCharacterStates: CharacterStateSnapshotRecord[];
      latestFactionStates: FactionStateSnapshotRecord[];
      latestHookStates: HookStateSnapshotRecord[];
    },
    activeCharacterItems: CharacterItemListItem[]
  ): CharacterItemListItem[] {
    const itemOrder = new Map(
      this.sortItemsByRelevance(input, this.pickDistinctItems(activeCharacterItems), activeCharacterItems)
        .map((item, index) => [item.id, index])
    );

    return this.sortByScore(activeCharacterItems, (link) => {
      const order = itemOrder.get(link.item_id);
      // 人物持有关系优先跟随“物品本体”的顺序，避免上下文里道具和持有人关系脱节。
      return order !== undefined ? SNAPSHOT_BASE_SCORE - order : 0;
    });
  }

  private pickDistinctItems(activeCharacterItems: CharacterItemListItem[]): ItemListItem[] {
    const seen = new Set<number>();
    const result: ItemListItem[] = [];

    for (const link of activeCharacterItems) {
      if (seen.has(link.item_id)) {
        continue;
      }

      seen.add(link.item_id);
      result.push({
        id: link.item_id,
        project_id: link.project_id,
        name: link.item_name,
        category: null,
        rarity: null,
        description: null,
        origin: null,
        status: "normal",
        created_at: link.created_at,
        updated_at: link.updated_at,
        active_holder_count: 1
      });
    }

    return result;
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

  private sortCharactersByRelevance(input: {
    chapter: ChapterGenerationContext["chapter"];
    outlineChain: OutlineRecord[];
    characters: CharacterListItem[];
    factions: FactionRecord[];
    hookLinks: ChapterHookLinkListItem[];
    targetHooks: StoryHookListItem[];
    activeHooks: StoryHookListItem[];
    latestCharacterStates: CharacterStateSnapshotRecord[];
    latestFactionStates: FactionStateSnapshotRecord[];
    latestHookStates: HookStateSnapshotRecord[];
  }): CharacterListItem[] {
    const textSignals = this.buildTextSignals(input);
    const chapterFactionIds = new Set(
      input.factions
        .filter((faction) => this.textSignalsContain(textSignals, faction.name))
        .map((faction) => faction.id)
    );
    const latestCharacterStateIds = new Set(
      input.latestCharacterStates.map((snapshot) => snapshot.character_id)
    );

    return this.sortByScore(input.characters, (character) => {
      let score = 0;

      // 主角和主要视角人物始终保底靠前，避免被大项目里的边缘人物挤掉。
      if (character.role === "protagonist") {
        score += CHARACTER_RELEVANCE.protagonistBonus;
      } else if (character.role === "antagonist") {
        // 反派核心往往决定本章冲突压力，通常也应该比普通配角更早进入上下文。
        score += CHARACTER_RELEVANCE.antagonistBonus;
      }

      if (this.textSignalsContain(textSignals, character.name)) {
        // 当前章节摘要、章纲或钩子描述里直接出现名字，说明该人物和本章显式相关。
        score += CHARACTER_RELEVANCE.nameMatchBonus;
      }

      if (character.goal && this.textSignalsContain(textSignals, character.goal)) {
        // 角色目标如果被当前章节文本命中，往往意味着这章会直接推进他的行动线。
        score += CHARACTER_RELEVANCE.goalMatchBonus;
      }

      if (character.conflict && this.textSignalsContain(textSignals, character.conflict)) {
        // 角色冲突被命中，说明本章可能会消耗或激化这条人物矛盾线。
        score += CHARACTER_RELEVANCE.conflictMatchBonus;
      }

      if (character.faction_id !== null && chapterFactionIds.has(character.faction_id)) {
        // 本章已明显关联到该人物所属势力时，这个人物更可能参与本章局势。
        score += CHARACTER_RELEVANCE.factionMatchBonus;
      }

      if (latestCharacterStateIds.has(character.id)) {
        // 最近正式状态里刚出现过的人物，通常说明这条人物线仍处于连续推进中。
        score += CHARACTER_RELEVANCE.latestStateBonus;
      }

      return score;
    });
  }

  private sortFactionsByRelevance(input: {
    chapter: ChapterGenerationContext["chapter"];
    outlineChain: OutlineRecord[];
    characters: CharacterListItem[];
    factions: FactionRecord[];
    hookLinks: ChapterHookLinkListItem[];
    targetHooks: StoryHookListItem[];
    activeHooks: StoryHookListItem[];
    latestCharacterStates: CharacterStateSnapshotRecord[];
    latestFactionStates: FactionStateSnapshotRecord[];
    latestHookStates: HookStateSnapshotRecord[];
  }): FactionRecord[] {
    const textSignals = this.buildTextSignals(input);
    const relevantCharacterFactionIds = new Set(
      input.characters
        .filter(
          (character) =>
            character.faction_id !== null && this.textSignalsContain(textSignals, character.name)
        )
        .map((character) => character.faction_id as number)
    );
    const latestFactionStateIds = new Set(
      input.latestFactionStates.map((snapshot) => snapshot.faction_id)
    );

    return this.sortByScore(input.factions, (faction) => {
      let score = 0;

      if (this.textSignalsContain(textSignals, faction.name)) {
        // 当前章节文本直接提到势力名，说明它是本章显式舞台或压力来源。
        score += FACTION_RELEVANCE.nameMatchBonus;
      }

      if (faction.goal && this.textSignalsContain(textSignals, faction.goal)) {
        // 势力目标被命中，说明本章可能正在兑现或阻断这条组织行动线。
        score += FACTION_RELEVANCE.goalMatchBonus;
      }

      if (faction.stance && this.textSignalsContain(textSignals, faction.stance)) {
        // 势力立场被命中时，通常意味着本章阵营对抗或价值取向很重要。
        score += FACTION_RELEVANCE.stanceMatchBonus;
      }

      if (relevantCharacterFactionIds.has(faction.id)) {
        // 已命中的关键人物隶属该势力时，这个势力通常也应进入核心上下文。
        score += FACTION_RELEVANCE.relatedCharacterBonus;
      }

      if (latestFactionStateIds.has(faction.id)) {
        // 最近正式状态里出现过的势力，往往仍处于持续变化或持续施压阶段。
        score += FACTION_RELEVANCE.latestStateBonus;
      }

      return score;
    });
  }

  private sortHooksByRelevance(
    input: {
      chapter: ChapterGenerationContext["chapter"];
      outlineChain: OutlineRecord[];
      characters: CharacterListItem[];
      factions: FactionRecord[];
      hookLinks: ChapterHookLinkListItem[];
      targetHooks: StoryHookListItem[];
      activeHooks: StoryHookListItem[];
      latestCharacterStates: CharacterStateSnapshotRecord[];
      latestFactionStates: FactionStateSnapshotRecord[];
      latestHookStates: HookStateSnapshotRecord[];
    },
    hooks: StoryHookListItem[]
  ): StoryHookListItem[] {
    const textSignals = this.buildTextSignals(input);
    const directHookIds = new Set(input.hookLinks.map((link) => link.hook_id));
    const targetHookIds = new Set(input.targetHooks.map((hook) => hook.id));
    const latestAdvancedHookIds = new Set(
      input.latestHookStates
        .filter((snapshot) => snapshot.progress_status !== "pending")
        .map((snapshot) => snapshot.hook_id)
    );

    return this.sortByScore(hooks, (hook) => {
      let score = 0;

      if (directHookIds.has(hook.id)) {
        // 本章直接绑定的钩子一定是最强相关项，应优先保留。
        score += HOOK_RELEVANCE.directLinkBonus;
      }

      if (targetHookIds.has(hook.id)) {
        // 本章是目标回收章时，说明该钩子在本章天然具有高优先级。
        score += HOOK_RELEVANCE.targetChapterBonus;
      }

      if (this.textSignalsContain(textSignals, hook.title)) {
        // 钩子标题被当前章节文本命中，说明作者已经在本章材料里显式关注它。
        score += HOOK_RELEVANCE.titleMatchBonus;
      }

      if (hook.summary && this.textSignalsContain(textSignals, hook.summary)) {
        // 钩子摘要被命中，说明本章内容和这条伏笔的语义方向已经靠近。
        score += HOOK_RELEVANCE.summaryMatchBonus;
      }

      if (latestAdvancedHookIds.has(hook.id)) {
        // 最近正式状态中刚被推进过的钩子，更容易在下一章继续承接。
        score += HOOK_RELEVANCE.latestAdvancedBonus;
      }

      return score;
    });
  }

  private sortCharacterStatesByRelevance(
    input: {
      chapter: ChapterGenerationContext["chapter"];
      outlineChain: OutlineRecord[];
      characters: CharacterListItem[];
      factions: FactionRecord[];
      hookLinks: ChapterHookLinkListItem[];
      targetHooks: StoryHookListItem[];
      activeHooks: StoryHookListItem[];
      latestCharacterStates: CharacterStateSnapshotRecord[];
      latestFactionStates: FactionStateSnapshotRecord[];
      latestHookStates: HookStateSnapshotRecord[];
    },
    states: CharacterStateSnapshotRecord[]
  ): CharacterStateSnapshotRecord[] {
    const characterOrder = new Map(
      this.sortCharactersByRelevance(input).map((character, index) => [character.id, index])
    );

    return this.sortByScore(states, (snapshot) => {
      const order = characterOrder.get(snapshot.character_id);
      // 这里给一个很高的基础分，不是因为快照“更重要”，而是为了让它稳定继承人物本体的排序结果。
      // 这样 prompt 里会先看到高相关人物，再看到这些人物对应的最近状态，阅读上更连贯。
      // 快照本身不单独重算语义分，而是复用“人物本体”的相关性顺序，保证状态和人物排序一致。
      return order !== undefined ? SNAPSHOT_BASE_SCORE - order : 0;
    });
  }

  private sortFactionStatesByRelevance(
    input: {
      chapter: ChapterGenerationContext["chapter"];
      outlineChain: OutlineRecord[];
      characters: CharacterListItem[];
      factions: FactionRecord[];
      hookLinks: ChapterHookLinkListItem[];
      targetHooks: StoryHookListItem[];
      activeHooks: StoryHookListItem[];
      latestCharacterStates: CharacterStateSnapshotRecord[];
      latestFactionStates: FactionStateSnapshotRecord[];
      latestHookStates: HookStateSnapshotRecord[];
    },
    states: FactionStateSnapshotRecord[]
  ): FactionStateSnapshotRecord[] {
    const factionOrder = new Map(
      this.sortFactionsByRelevance(input).map((faction, index) => [faction.id, index])
    );

    return this.sortByScore(states, (snapshot) => {
      const order = factionOrder.get(snapshot.faction_id);
      // 同样给高基础分，是为了让势力状态严格跟着势力本体走，而不是和其他状态条目混排。
      // 势力状态快照跟随势力本体排序，避免“势力在后，状态在前”的阅读割裂。
      return order !== undefined ? SNAPSHOT_BASE_SCORE - order : 0;
    });
  }

  private sortHookStatesByRelevance(
    input: {
      chapter: ChapterGenerationContext["chapter"];
      outlineChain: OutlineRecord[];
      characters: CharacterListItem[];
      factions: FactionRecord[];
      hookLinks: ChapterHookLinkListItem[];
      targetHooks: StoryHookListItem[];
      activeHooks: StoryHookListItem[];
      latestCharacterStates: CharacterStateSnapshotRecord[];
      latestFactionStates: FactionStateSnapshotRecord[];
      latestHookStates: HookStateSnapshotRecord[];
    },
    states: HookStateSnapshotRecord[]
  ): HookStateSnapshotRecord[] {
    const hookOrder = new Map(
      this.sortHooksByRelevance(input, [...input.targetHooks, ...input.activeHooks]).map(
        (hook, index) => [hook.id, index]
      )
    );

    return this.sortByScore(states, (snapshot) => {
      const order = hookOrder.get(snapshot.hook_id);
      // 先继承钩子本体的相关性顺位，保证“高相关钩子”和“它的最新推进状态”在上下文里彼此靠近。
      let score = order !== undefined ? SNAPSHOT_BASE_SCORE - order : 0;
      if (snapshot.progress_status === "resolved") {
        // 已解决的钩子虽然重要，但通常不如正在推进中的钩子更需要占用 prompt 空间。
        score += HOOK_STATE_RESOLVED_BONUS;
      } else if (snapshot.progress_status === "advanced") {
        // 刚刚推进过的钩子最容易在当前章继续承接，所以略高于普通状态。
        score += HOOK_STATE_ADVANCED_BONUS;
      }

      return score;
    });
  }

  private buildTextSignals(input: {
    chapter: ChapterGenerationContext["chapter"];
    outlineChain: OutlineRecord[];
    hookLinks: ChapterHookLinkListItem[];
    targetHooks: StoryHookListItem[];
    activeHooks: StoryHookListItem[];
  }): string[] {
    const signals = [
      // 章节自身的标题/摘要/章纲标题是最直接的当前任务信号。
      input.chapter.title,
      input.chapter.summary ?? "",
      input.chapter.outline_title ?? "",
      // 大纲链路同时覆盖总纲、分卷纲、章纲，能把当前章节放回更大的叙事意图里判断相关性。
      ...input.outlineChain.flatMap((outline) => [
        outline.title,
        outline.summary ?? "",
        outline.goal ?? "",
        outline.conflict ?? "",
        outline.outcome ?? ""
      ]),
      // 章节已绑定钩子的计划说明与实际说明，通常代表作者本章明确想处理的伏笔。
      ...input.hookLinks.flatMap((link) => [
        link.hook_title,
        link.planned_note ?? "",
        link.actual_note ?? ""
      ]),
      // 目标钩子除了标题摘要，还要纳入埋设/回收文本，因为它们本身就是高价值剧情关键词。
      ...input.targetHooks.flatMap((hook) => [
        hook.title,
        hook.summary ?? "",
        hook.setup_text ?? "",
        hook.payoff_text ?? ""
      ]),
      // 活跃钩子保留标题和摘要即可，用来感知哪些长期伏笔仍在本章语义范围内。
      ...input.activeHooks.flatMap((hook) => [hook.title, hook.summary ?? ""])
    ];

    return signals
      .map((signal) => signal.trim())
      .filter((signal) => signal.length > 0);
  }

  private textSignalsContain(textSignals: string[], value: string): boolean {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return false;
    }

    return textSignals.some((signal) => signal.includes(normalized));
  }

  private sortByScore<T>(items: T[], getScore: (item: T) => number): T[] {
    // 这里显式保留原始索引，保证同分对象仍按原始顺序输出，避免每次构建上下文的结果抖动。
    return items
      .map((item, index) => ({
        item,
        index,
        score: getScore(item)
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.index - right.index;
      })
      .map((entry) => entry.item);
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
