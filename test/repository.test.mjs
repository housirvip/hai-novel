import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace, initWorkspace, openWorkspaceDatabase, importDist } from "./helpers.mjs";

test("repository 可以完成大纲更新、plan 归档、draft 更新和生成记录写入", async () => {
  const workspace = createWorkspace("hai-novel-repo-");
  await initWorkspace(workspace);

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
    const { OutlineRepository } = await importDist("db/repositories/outline-repository.js");
    const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
    const { CharacterRepository } = await importDist("db/repositories/character-repository.js");
    const { ChapterPlanRepository } = await importDist("db/repositories/chapter-plan-repository.js");
    const { ChapterDraftRepository } = await importDist("db/repositories/chapter-draft-repository.js");
    const { GenerationRunRepository } = await importDist(
      "db/repositories/generation-run-repository.js"
    );
    const { ItemRepository } = await importDist("db/repositories/item-repository.js");
    const { CharacterItemRepository } = await importDist(
      "db/repositories/character-item-repository.js"
    );

    const projectRepository = new ProjectRepository(database);
    const outlineRepository = new OutlineRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const characterRepository = new CharacterRepository(database);
    const planRepository = new ChapterPlanRepository(database);
    const draftRepository = new ChapterDraftRepository(database);
    const runRepository = new GenerationRunRepository(database);
    const itemRepository = new ItemRepository(database);
    const characterItemRepository = new CharacterItemRepository(database);

    const project = projectRepository.create({
      name: "仓储测试小说",
      genre: "仙侠",
      premise: "测试 premise",
      style: "克制"
    });

    const story = outlineRepository.create({
      projectId: project.id,
      nodeType: "story",
      title: "总纲初版",
      summary: "旧摘要",
      position: 0
    });
    const updatedStory = outlineRepository.update({
      id: story.id,
      title: "总纲终版",
      summary: "新摘要",
      goal: "总目标",
      conflict: "总冲突",
      outcome: "总结果",
      position: 0
    });
    assert.equal(updatedStory.title, "总纲终版");

    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章",
      summary: "章节摘要"
    });

    const secondChapter = chapterRepository.create({
      projectId: project.id,
      title: "第002章",
      summary: "章节摘要二"
    });

    const character = characterRepository.create({
      projectId: project.id,
      name: "林渡",
      role: "protagonist",
      profession: "外门弟子"
    });

    const firstPlan = planRepository.createActive({
      projectId: project.id,
      chapterId: chapter.id,
      sourceType: "outline_only",
      planText: "第一版计划"
    });
    const secondPlan = planRepository.createActive({
      projectId: project.id,
      chapterId: chapter.id,
      sourceType: "outline_with_intent",
      authorIntent: "突出冲突",
      planText: "第二版计划"
    });

    assert.equal(planRepository.findById(firstPlan.id)?.status, "archived");
    assert.equal(planRepository.findActiveByChapterId(chapter.id)?.id, secondPlan.id);
    assert.equal(secondPlan.source_version, 1);
    assert.equal(secondPlan.updated_from, "ai_generate");

    const exportedPlan = planRepository.markExported(secondPlan.id, "exports/chapter-001-plan.md");
    assert.equal(exportedPlan.last_export_path, "exports/chapter-001-plan.md");

    const importedPlan = planRepository.updateImportedContent({
      planId: secondPlan.id,
      planText: "第二版计划-手工修订",
      authorIntent: "强化冲突",
      expectedSourceVersion: 1
    });
    assert.equal(importedPlan.source_version, 2);
    assert.equal(importedPlan.updated_from, "manual_import");
    assert.match(importedPlan.plan_text, /手工修订/);

    const draft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      planId: secondPlan.id,
      draftText: "初稿内容",
      status: "generated"
    });
    assert.equal(draft.source_version, 1);
    assert.equal(draft.updated_from, "ai_generate");

    const reviewedDraft = draftRepository.updateReview(draft.id, {
      status: "checked",
      reviewNotes: "发现结构问题",
      reviewReport: "[{\"level\":\"warning\",\"title\":\"节奏偏快\"}]"
    });
    assert.equal(reviewedDraft.status, "checked");
    assert.match(reviewedDraft.review_notes ?? "", /结构问题/);

    const fixedDraft = draftRepository.updateReview(draft.id, {
      status: "generated",
      draftText: "修订后草稿",
      updatedFrom: "ai_fix"
    });
    assert.equal(fixedDraft.source_version, 2);
    assert.equal(fixedDraft.updated_from, "ai_fix");

    const exportedDraft = draftRepository.markExported(draft.id, "exports/chapter-001-draft.md");
    assert.equal(exportedDraft.last_export_path, "exports/chapter-001-draft.md");

    const importedDraft = draftRepository.updateImportedContent({
      draftId: draft.id,
      draftText: "手工修订后的最终草稿",
      expectedSourceVersion: 2
    });
    assert.equal(importedDraft.status, "generated");
    assert.equal(importedDraft.source_version, 3);
    assert.equal(importedDraft.updated_from, "manual_import");
    assert.equal(importedDraft.review_notes, null);
    assert.equal(importedDraft.review_report, null);
    assert.match(importedDraft.draft_text, /手工修订后的最终草稿/);

    const run = runRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      runType: "chapter_plan",
      templateKey: "chapter-plan",
      templateLabel: "章节规划模板",
      templateVersion: "1.0.0",
      templateSummary: "测试摘要",
      promptText: "prompt",
      inputContext: "{}",
      outputText: "output",
      model: "rule-planner-v1",
      status: "success"
    });
    const loadedRun = runRepository.findById(run.id);
    assert.equal(loadedRun?.template_key, "chapter-plan");
    assert.equal(loadedRun?.template_version, "1.0.0");

    const item = itemRepository.create({
      projectId: project.id,
      name: "黑玉佩",
      category: "artifact",
      rarity: "rare",
      description: "可引发异动的玉佩",
      origin: "主角旧物",
      status: "sealed"
    });
    assert.equal(item.name, "黑玉佩");

    const itemList = itemRepository.findAllByProjectId(project.id);
    assert.equal(itemList.length, 1);
    assert.equal(itemList[0]?.active_holder_count, 0);

    const characterItem = characterItemRepository.create({
      projectId: project.id,
      characterId: character.id,
      itemId: item.id,
      ownershipType: "carry",
      quantity: 1,
      isEquipped: true,
      note: "入宗前一直贴身携带",
      startChapterId: chapter.id
    });
    assert.equal(characterItem.is_equipped, 1);

    const links = characterItemRepository.findAllByProjectId(project.id, {
      characterId: character.id,
      activeOnly: true
    });
    assert.equal(links.length, 1);
    assert.equal(links[0]?.character_name, "林渡");
    assert.equal(links[0]?.item_name, "黑玉佩");
    assert.equal(links[0]?.start_chapter_title, "第001章");

    const endedLink = characterItemRepository.endOwnership({
      linkId: characterItem.id,
      endChapterId: secondChapter.id,
      note: "暂时交给宗门长老保管"
    });
    assert.equal(endedLink.end_chapter_id, secondChapter.id);
    assert.match(endedLink.note ?? "", /宗门长老/);

    const inactiveLinks = characterItemRepository.findAllByProjectId(project.id, {
      itemId: item.id,
      activeOnly: false
    });
    assert.equal(inactiveLinks.length, 1);
    assert.equal(inactiveLinks[0]?.end_chapter_title, "第002章");

    const refreshedItemList = itemRepository.findAllByProjectId(project.id);
    assert.equal(refreshedItemList[0]?.active_holder_count, 0);
  } finally {
    database.close();
  }
});
