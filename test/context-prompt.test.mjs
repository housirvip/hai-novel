import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  initWorkspace,
  openWorkspaceDatabase,
  importDist
} from "./helpers.mjs";

test("ChapterContextBuilder 能聚合章节所需核心上下文", async () => {
  const workspace = createWorkspace("hai-novel-context-");
  await initWorkspace(workspace);

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
    const { OutlineRepository } = await importDist("db/repositories/outline-repository.js");
    const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
    const { CharacterRepository } = await importDist("db/repositories/character-repository.js");
    const { FactionRepository } = await importDist("db/repositories/faction-repository.js");
    const { LoreRepository } = await importDist("db/repositories/lore-repository.js");
    const { CharacterRelationRepository } = await importDist(
      "db/repositories/character-relation-repository.js"
    );
    const { CharacterFactionRelationRepository } = await importDist(
      "db/repositories/character-faction-relation-repository.js"
    );
    const { StoryHookRepository } = await importDist("db/repositories/story-hook-repository.js");
    const { HookChapterLinkRepository } = await importDist(
      "db/repositories/hook-chapter-link-repository.js"
    );
    const { ChapterStateSnapshotRepository } = await importDist(
      "db/repositories/chapter-state-snapshot-repository.js"
    );
    const { CharacterStateSnapshotRepository } = await importDist(
      "db/repositories/character-state-snapshot-repository.js"
    );
    const { FactionStateSnapshotRepository } = await importDist(
      "db/repositories/faction-state-snapshot-repository.js"
    );
    const { HookStateSnapshotRepository } = await importDist(
      "db/repositories/hook-state-snapshot-repository.js"
    );
    const { ChapterContextBuilder } = await importDist(
      "app/services/chapter-context-builder.js"
    );

    const projectRepository = new ProjectRepository(database);
    const outlineRepository = new OutlineRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const characterRepository = new CharacterRepository(database);
    const factionRepository = new FactionRepository(database);
    const loreRepository = new LoreRepository(database);
    const characterRelationRepository = new CharacterRelationRepository(database);
    const characterFactionRelationRepository = new CharacterFactionRelationRepository(database);
    const hookRepository = new StoryHookRepository(database);
    const hookLinkRepository = new HookChapterLinkRepository(database);
    const chapterStateSnapshotRepository = new ChapterStateSnapshotRepository(database);
    const characterStateSnapshotRepository = new CharacterStateSnapshotRepository(database);
    const factionStateSnapshotRepository = new FactionStateSnapshotRepository(database);
    const hookStateSnapshotRepository = new HookStateSnapshotRepository(database);

    const project = projectRepository.create({
      name: "上下文测试小说",
      genre: "仙侠",
      premise: "主角卷入宗门纷争",
      style: "克制"
    });
    const story = outlineRepository.create({
      projectId: project.id,
      nodeType: "story",
      title: "总纲",
      summary: "整体总纲",
      position: 0
    });
    const volume = outlineRepository.create({
      projectId: project.id,
      parentId: story.id,
      nodeType: "volume",
      title: "第一卷",
      summary: "分卷摘要",
      position: 1
    });
    const chapterOutline = outlineRepository.create({
      projectId: project.id,
      parentId: volume.id,
      nodeType: "chapter",
      title: "第001章章纲",
      summary: "章纲摘要",
      position: 1
    });
    const previousChapter = chapterRepository.create({
      projectId: project.id,
      title: "第000章",
      summary: "前情章节"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      outlineId: chapterOutline.id,
      title: "第001章",
      summary: "章节摘要"
    });
    const faction = factionRepository.create({
      projectId: project.id,
      name: "青岚宗",
      type: "宗门",
      goal: "扩张山门",
      stance: "正道"
    });
    const hero = characterRepository.create({
      projectId: project.id,
      name: "林渡",
      role: "protagonist",
      factionId: faction.id,
      profession: "外门弟子",
      goal: "查清真相"
    });
    const villain = characterRepository.create({
      projectId: project.id,
      name: "夜无声",
      role: "antagonist",
      profession: "刺客",
      goal: "夺取秘卷"
    });
    loreRepository.create({
      projectId: project.id,
      type: "profession_system",
      title: "外门规则",
      details: "每三月一考。"
    });
    characterRelationRepository.create({
      projectId: project.id,
      characterId: hero.id,
      relatedCharacterId: villain.id,
      relationType: "enemy",
      summary: "宿敌"
    });
    characterFactionRelationRepository.create({
      projectId: project.id,
      characterId: hero.id,
      factionId: faction.id,
      relationType: "member",
      title: "外门弟子",
      stance: "loyal",
      isPrimary: true
    });
    const hook = hookRepository.create({
      projectId: project.id,
      title: "黑玉佩的来历",
      hookType: "mystery",
      summary: "玉佩来源成谜",
      targetChapterId: chapter.id
    });
    hookRepository.update({
      hookId: hook.id,
      status: "active",
      targetChapterId: chapter.id
    });
    hookLinkRepository.create({
      projectId: project.id,
      hookId: hook.id,
      chapterId: chapter.id,
      linkType: "setup",
      plannedNote: "埋下发热异常",
      status: "planned"
    });

    const chapterSnapshot = chapterStateSnapshotRepository.create({
      projectId: project.id,
      chapterId: previousChapter.id,
      status: "applied",
      summary: "林渡已经注意到黑玉佩异动",
      rawPayload: "{\"chapter_summary\":\"前情已生效\"}",
      applied: true
    });
    characterStateSnapshotRepository.create({
      projectId: project.id,
      characterId: hero.id,
      chapterId: previousChapter.id,
      chapterSnapshotId: chapterSnapshot.id,
      statusSummary: "林渡已经起疑"
    });
    characterStateSnapshotRepository.create({
      projectId: project.id,
      characterId: villain.id,
      chapterId: previousChapter.id,
      chapterSnapshotId: chapterSnapshot.id,
      statusSummary: "夜无声暂时潜伏"
    });
    factionStateSnapshotRepository.create({
      projectId: project.id,
      factionId: faction.id,
      chapterId: previousChapter.id,
      chapterSnapshotId: chapterSnapshot.id,
      statusSummary: "青岚宗对外收紧山门"
    });
    hookStateSnapshotRepository.create({
      projectId: project.id,
      hookId: hook.id,
      chapterId: previousChapter.id,
      chapterSnapshotId: chapterSnapshot.id,
      progressStatus: "advanced",
      progressNote: "黑玉佩异动已经发生"
    });

    const builder = new ChapterContextBuilder(database);
    const context = builder.build({
      projectId: project.id,
      chapterId: chapter.id
    });

    assert.deepEqual(
      context.outline_chain.map((item) => item.title),
      ["总纲", "第一卷", "第001章章纲"]
    );
    assert.equal(context.characters.length, 2);
    assert.equal(context.factions.length, 1);
    assert.equal(context.lore_entries.length, 1);
    assert.equal(context.character_relations.length, 1);
    assert.equal(context.character_faction_relations.length, 1);
    assert.equal(context.hook_links.length, 1);
    assert.equal(context.target_hooks.length, 1);
    assert.equal(context.active_hooks.length, 1);
    assert.equal(context.latest_chapter_snapshot?.chapter_id, previousChapter.id);
    assert.equal(context.latest_character_states.length, 2);
    assert.equal(context.latest_faction_states.length, 1);
    assert.equal(context.latest_hook_states.length, 1);
    assert.equal(context.latest_character_states[0].character_id, hero.id);
  } finally {
    database.close();
  }
});

test("PromptService 能输出带模板元数据的 plan / draft prompt", async () => {
  const workspace = createWorkspace("hai-novel-prompt-");
  const context = await initWorkspace(workspace);

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
    const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
    const { ChapterPlanRepository } = await importDist(
      "db/repositories/chapter-plan-repository.js"
    );
    const { ChapterDraftRepository } = await importDist(
      "db/repositories/chapter-draft-repository.js"
    );
    const { CharacterRepository } = await importDist("db/repositories/character-repository.js");
    const { ChapterStateSnapshotRepository } = await importDist(
      "db/repositories/chapter-state-snapshot-repository.js"
    );
    const { CharacterStateSnapshotRepository } = await importDist(
      "db/repositories/character-state-snapshot-repository.js"
    );
    const { PromptService } = await importDist("app/services/prompt-service.js");

    const projectRepository = new ProjectRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const planRepository = new ChapterPlanRepository(database);
    const draftRepository = new ChapterDraftRepository(database);
    const characterRepository = new CharacterRepository(database);
    const chapterStateSnapshotRepository = new ChapterStateSnapshotRepository(database);
    const characterStateSnapshotRepository = new CharacterStateSnapshotRepository(database);

    const project = projectRepository.create({
      name: "提示词测试小说",
      genre: "仙侠",
      premise: "主角卷入宗门纷争",
      style: "克制"
    });
    const previousChapter = chapterRepository.create({
      projectId: project.id,
      title: "第000章",
      summary: "前情摘要"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章",
      summary: "章节摘要"
    });
    const plan = planRepository.createActive({
      projectId: project.id,
      chapterId: chapter.id,
      sourceType: "outline_with_intent",
      authorIntent: "突出悬念",
      planText: "这是章节计划。"
    });
    const draft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      planId: plan.id,
      draftText: "这是草稿正文。",
      status: "generated"
    });
    const hero = characterRepository.create({
      projectId: project.id,
      name: "林渡",
      role: "protagonist",
      goal: "查清真相"
    });
    const chapterSnapshot = chapterStateSnapshotRepository.create({
      projectId: project.id,
      chapterId: previousChapter.id,
      status: "applied",
      summary: "上一章正式状态已经生效",
      applied: true
    });
    characterStateSnapshotRepository.create({
      projectId: project.id,
      characterId: hero.id,
      chapterId: previousChapter.id,
      chapterSnapshotId: chapterSnapshot.id,
      statusSummary: "林渡已经察觉异常"
    });

    const service = new PromptService(context);
    const planBundle = service.buildChapterPlanPrompt({
      projectId: project.id,
      chapterId: chapter.id,
      intent: "突出悬念"
    });
    const draftBundle = service.buildDraftWritePrompt({
      projectId: project.id,
      chapterId: chapter.id
    });
    const fixBundle = service.buildDraftFixPrompt({
      draftId: draft.id,
      notes: "修一下节奏"
    });

    assert.equal(planBundle.template.key, "chapter-plan");
    assert.equal(draftBundle.template.key, "draft-write");
    assert.equal(fixBundle.template.key, "draft-fix");
    assert.match(planBundle.prompt, /突出悬念/);
    assert.match(draftBundle.prompt, /这是章节计划/);
    assert.match(fixBundle.prompt, /修一下节奏/);
    assert.match(planBundle.contextText, /最近正式状态/);
    assert.match(planBundle.contextText, /上一章正式状态已经生效/);
    assert.match(planBundle.contextText, /林渡已经察觉异常/);
  } finally {
    database.close();
  }
});
