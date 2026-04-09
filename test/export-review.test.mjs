import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createWorkspace,
  hasWorkspaceFile,
  importDist,
  initWorkspace,
  openWorkspaceDatabase
} from "./helpers.mjs";

test("ChapterService 与 DraftService 可以完成导出和 review 闭环", async () => {
  const workspace = createWorkspace("hai-novel-export-");
  const context = await initWorkspace(workspace);

  const { ProjectService } = await importDist("app/services/project-service.js");
  const { ChapterService } = await importDist("app/services/chapter-service.js");
  const { DraftService } = await importDist("app/services/draft-service.js");

  const projectService = new ProjectService(context);
  const chapterService = new ChapterService(context);
  const draftService = new DraftService(context);

  const project = projectService.createProject({
    name: "导出测试小说",
    genre: "仙侠",
    premise: "主角卷入宗门纷争",
    style: "热血克制"
  });
  const chapter = chapterService.createChapter({
    projectId: project.id,
    title: "第001章 雨夜入宗",
    summary: "主角带着异物进入宗门"
  });

  const planResult = await chapterService.generatePlan({
    projectId: project.id,
    chapterId: chapter.id,
    intent: "突出悬念与不安感"
  });
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-plan.md"), true);
  assert.equal(planResult.plan.status, "active");
  assert.equal(chapterService.showChapter(chapter.id).chapter.status, "planning");

  const draftWriteResult = await draftService.writeDraft({
    projectId: project.id,
    chapterId: chapter.id
  });
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-draft.md"), true);
  assert.equal(draftWriteResult.draft.plan_id, planResult.plan.id);
  assert.equal(chapterService.showChapter(chapter.id).chapter.status, "drafting");

  const checkResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "check"
  });
  assert.equal(checkResult.action, "check");
  assert.equal(checkResult.issues.length > 0, true);
  assert.equal(chapterService.showChapter(chapter.id).chapter.status, "reviewing");

  const fixResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "fix",
    notes: "增强结尾钩子"
  });
  assert.equal(fixResult.action, "fix");
  assert.equal(fixResult.draft.draft_text.includes("Mock 输出"), false);
  assert.match(fixResult.draft.draft_text, /增强结尾钩子/);
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-draft.md"), true);
  assert.equal(chapterService.showChapter(chapter.id).chapter.status, "reviewing");

  const approveResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "approve"
  });
  assert.equal(approveResult.action, "approve");
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-final.md"), true);

  const chapterDetail = chapterService.showChapter(chapter.id);
  assert.equal(chapterDetail.chapter.approved_draft_id, draftWriteResult.draft.id);
  assert.equal((chapterDetail.chapter.final_text ?? "").length > 0, true);
  assert.equal(chapterDetail.chapter.status, "done");

  const finalExport = await chapterService.exportChapter({
    chapterId: chapter.id,
    source: "final"
  });
  assert.match(finalExport.markdown, /第001章 雨夜入宗/);
});

test("draft fix 在存在更新草稿时仍会导出并标记当前指定 draft", async () => {
  const workspace = createWorkspace("hai-novel-fix-export-");
  const context = await initWorkspace(workspace);

  const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
  const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
  const { ChapterDraftRepository } = await importDist(
    "db/repositories/chapter-draft-repository.js"
  );
  const { DraftService } = await importDist("app/services/draft-service.js");

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const projectRepository = new ProjectRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const draftRepository = new ChapterDraftRepository(database);

    const project = projectRepository.create({
      name: "修稿导出定位测试",
      genre: "仙侠"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章 雨夜入宗",
      summary: "主角在雨夜抵达山门"
    });

    const oldDraft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText: "夜雨很冷，山门很高。",
      status: "generated"
    });
    const newerDraft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText: "这是第二版较新的草稿，不应该被旧稿修订导出覆盖。",
      status: "generated"
    });

    const draftService = new DraftService(context);
    const fixResult = await draftService.reviewDraft({
      draftId: oldDraft.id,
      action: "fix",
      notes: "只修旧稿"
    });

    const exportedMarkdown = readFileSync(fixResult.exportPath, "utf8");
    assert.match(exportedMarkdown, /只修旧稿/);
    assert.doesNotMatch(exportedMarkdown, /第二版较新的草稿/);

    const updatedOldDraft = draftRepository.findById(oldDraft.id);
    const updatedNewerDraft = draftRepository.findById(newerDraft.id);
    assert.equal(updatedOldDraft?.last_exported_at !== null, true);
    assert.equal(updatedNewerDraft?.last_exported_at ?? null, null);
  } finally {
    database.close();
  }
});

test("dropped draft 不会再被默认导出或状态预览选中", async () => {
  const workspace = createWorkspace("hai-novel-drop-preview-");
  const context = await initWorkspace(workspace);

  const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
  const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
  const { ChapterDraftRepository } = await importDist(
    "db/repositories/chapter-draft-repository.js"
  );
  const { ChapterService } = await importDist("app/services/chapter-service.js");
  const { DraftService } = await importDist("app/services/draft-service.js");
  const { StateService } = await importDist("app/services/state-service.js");

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const projectRepository = new ProjectRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const draftRepository = new ChapterDraftRepository(database);

    const project = projectRepository.create({
      name: "丢弃草稿过滤测试",
      genre: "仙侠"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章 雨夜入宗",
      summary: "主角夜入山门"
    });

    const usableDraft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText: "林渡站在雨夜山门前，衣角尽湿，却还是抬头看向灯火深处。",
      status: "generated"
    });
    const droppedDraft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText: "这是被丢弃的草稿，不应该再参与默认导出或预览。",
      status: "generated"
    });

    const draftService = new DraftService(context);
    draftService.dropDraft(droppedDraft.id);

    const chapterService = new ChapterService(context);
    const exportResult = await chapterService.exportChapter({
      chapterId: chapter.id,
      source: "draft"
    });
    assert.match(exportResult.markdown, /林渡站在雨夜山门前/);
    assert.doesNotMatch(exportResult.markdown, /被丢弃的草稿/);

    const stateService = new StateService(context);
    const previewResult = await stateService.previewChapterState({
      chapterId: chapter.id
    });
    assert.equal(previewResult.sourceDraftId, usableDraft.id);
  } finally {
    database.close();
  }
});

test("drop 最后一份可用 draft 后，章节状态会回退到 planning", async () => {
  const workspace = createWorkspace("hai-novel-drop-status-");
  const context = await initWorkspace(workspace);

  const { ProjectService } = await importDist("app/services/project-service.js");
  const { ChapterService } = await importDist("app/services/chapter-service.js");
  const { DraftService } = await importDist("app/services/draft-service.js");

  const projectService = new ProjectService(context);
  const chapterService = new ChapterService(context);
  const draftService = new DraftService(context);

  const project = projectService.createProject({
    name: "drop 状态回退测试",
    genre: "仙侠"
  });
  const chapter = chapterService.createChapter({
    projectId: project.id,
    title: "第001章 雨夜入宗",
    summary: "主角带着异物进入宗门"
  });

  await chapterService.generatePlan({
    projectId: project.id,
    chapterId: chapter.id,
    intent: "突出压迫感"
  });

  const draftResult = await draftService.writeDraft({
    projectId: project.id,
    chapterId: chapter.id
  });
  assert.equal(chapterService.showChapter(chapter.id).chapter.status, "drafting");

  draftService.dropDraft(draftResult.draft.id);

  const chapterAfterDrop = chapterService.showChapter(chapter.id);
  assert.equal(chapterAfterDrop.chapter.status, "planning");

  await assert.rejects(
    () =>
      chapterService.exportChapter({
        chapterId: chapter.id,
        source: "draft"
      }),
    /No draft found/
  );
});

test("DraftService review 会检查主角、势力、钩子和摘要是否真正落地", async () => {
  const workspace = createWorkspace("hai-novel-review-semantic-");
  const context = await initWorkspace(workspace);

  const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
  const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
  const { ChapterDraftRepository } = await importDist(
    "db/repositories/chapter-draft-repository.js"
  );
  const { CharacterRepository } = await importDist("db/repositories/character-repository.js");
  const { ItemRepository } = await importDist("db/repositories/item-repository.js");
  const { CharacterItemRepository } = await importDist(
    "db/repositories/character-item-repository.js"
  );
  const { FactionRepository } = await importDist("db/repositories/faction-repository.js");
  const { CharacterFactionRelationRepository } = await importDist(
    "db/repositories/character-faction-relation-repository.js"
  );
  const { StoryHookRepository } = await importDist("db/repositories/story-hook-repository.js");
  const { HookChapterLinkRepository } = await importDist(
    "db/repositories/hook-chapter-link-repository.js"
  );
  const { DraftService } = await importDist("app/services/draft-service.js");

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const projectRepository = new ProjectRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const draftRepository = new ChapterDraftRepository(database);
    const characterRepository = new CharacterRepository(database);
    const itemRepository = new ItemRepository(database);
    const characterItemRepository = new CharacterItemRepository(database);
    const factionRepository = new FactionRepository(database);
    const characterFactionRelationRepository = new CharacterFactionRelationRepository(database);
    const hookRepository = new StoryHookRepository(database);
    const hookLinkRepository = new HookChapterLinkRepository(database);

    const project = projectRepository.create({
      name: "语义检查测试",
      genre: "仙侠",
      premise: "少年卷入宗门纷争",
      style: "克制"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章 雨夜入宗",
      summary: "林渡携玉佩夜入青岚宗，初见异动"
    });
    const faction = factionRepository.create({
      projectId: project.id,
      name: "青岚宗",
      type: "宗门",
      goal: "扩张山门",
      stance: "正道"
    });
    const protagonist = characterRepository.create({
      projectId: project.id,
      name: "林渡",
      role: "protagonist",
      factionId: faction.id,
      profession: "外门弟子"
    });
    characterFactionRelationRepository.create({
      projectId: project.id,
      characterId: protagonist.id,
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
      plannedNote: "本章埋下玉佩发热的异常",
      status: "planned"
    });
    const item = itemRepository.create({
      projectId: project.id,
      name: "黑玉佩",
      category: "artifact",
      description: "入宗时一直贴身携带的神秘玉佩"
    });
    characterItemRepository.create({
      projectId: project.id,
      characterId: protagonist.id,
      itemId: item.id,
      ownershipType: "carry",
      note: "本章应该表现它的异动"
    });

    const draft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText:
        "夜里风很冷，山路很长。有人在门外停了很久，却始终没有说出真正的来意。",
      status: "generated"
    });

    const draftService = new DraftService(context);
    const checkResult = await draftService.reviewDraft({
      draftId: draft.id,
      action: "check"
    });
    const issueTitles = checkResult.issues.map((issue) => issue.title);

    assert.equal(issueTitles.includes("主角存在感不足"), true);
    assert.equal(issueTitles.includes("章节摘要落地不足"), true);
    assert.equal(issueTitles.includes("势力上下文吸收不足"), true);
    assert.equal(issueTitles.includes("钩子推进不明显"), true);
    assert.equal(issueTitles.includes("关键物品落地不足"), true);

    const fixResult = await draftService.reviewDraft({
      draftId: draft.id,
      action: "fix"
    });
    assert.match(fixResult.draft.draft_text, /林渡/);
    assert.match(fixResult.draft.draft_text, /青岚宗/);
    assert.match(fixResult.draft.draft_text, /黑玉佩|玉佩/);
  } finally {
    database.close();
  }
});

test("plan 和 draft 导出的 Markdown 支持手工修改后回写", async () => {
  const workspace = createWorkspace("hai-novel-markdown-import-");
  const context = await initWorkspace(workspace);

  const { ProjectService } = await importDist("app/services/project-service.js");
  const { ChapterService } = await importDist("app/services/chapter-service.js");
  const { PlanService } = await importDist("app/services/plan-service.js");
  const { DraftService } = await importDist("app/services/draft-service.js");

  const projectService = new ProjectService(context);
  const chapterService = new ChapterService(context);
  const planService = new PlanService(context);
  const draftService = new DraftService(context);

  const project = projectService.createProject({
    name: "Markdown 回写测试",
    genre: "仙侠",
    premise: "主角卷入宗门纷争",
    style: "克制"
  });
  const chapter = chapterService.createChapter({
    projectId: project.id,
    title: "第001章 雨夜入宗",
    summary: "主角夜入山门，局势未明"
  });

  const planResult = await chapterService.generatePlan({
    projectId: project.id,
    chapterId: chapter.id,
    intent: "突出压迫感"
  });

  const exportedPlanMarkdown = readFileSync(planResult.exportPath, "utf8");
  assert.match(exportedPlanMarkdown, /^---\nentity_type: chapter_plan/m);
  const editedPlanMarkdown = exportedPlanMarkdown.replace(
    /## 作者意图[\s\S]*?## 规划正文\n[\s\S]*$/m,
    [
      "## 作者意图",
      "强调宗门门规压力",
      "",
      "## 规划正文",
      "这是作者手工回写后的章节规划。",
      "需要突出雨夜、门规和试探感。",
      ""
    ].join("\n")
  );
  writeFileSync(planResult.exportPath, editedPlanMarkdown, "utf8");

  const importedPlan = await planService.importPlan({
    chapterId: chapter.id,
    inputPath: planResult.exportPath
  });
  assert.equal(importedPlan.plan.source_version, 2);
  assert.equal(importedPlan.plan.updated_from, "manual_import");
  assert.match(importedPlan.plan.plan_text, /作者手工回写后的章节规划/);
  assert.match(importedPlan.plan.author_intent ?? "", /宗门门规压力/);

  const draftWriteResult = await draftService.writeDraft({
    projectId: project.id,
    chapterId: chapter.id
  });

  const exportedDraftMarkdown = readFileSync(draftWriteResult.exportPath, "utf8");
  assert.match(exportedDraftMarkdown, /^---\nentity_type: chapter_draft/m);
  const editedDraftMarkdown = exportedDraftMarkdown.replace(
    /## 草稿正文\n[\s\S]*$/m,
    ["## 草稿正文", "这是作者手工修订后的草稿正文。", "林渡抬头看向雨夜里的山门。", ""].join(
      "\n"
    )
  );
  writeFileSync(draftWriteResult.exportPath, editedDraftMarkdown, "utf8");

  const importedDraft = await draftService.importDraft({
    draftId: draftWriteResult.draft.id,
    inputPath: draftWriteResult.exportPath
  });
  assert.equal(importedDraft.draft.source_version, 2);
  assert.equal(importedDraft.draft.updated_from, "manual_import");
  assert.match(importedDraft.draft.draft_text, /作者手工修订后的草稿正文/);

  const approveResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "approve"
  });
  assert.match(approveResult.draft.draft_text, /作者手工修订后的草稿正文/);

  const chapterDetail = chapterService.showChapter(chapter.id);
  assert.match(chapterDetail.chapter.final_text ?? "", /作者手工修订后的草稿正文/);
});

test("approved draft 会被冻结，不能再 review、drop 或 import", async () => {
  const workspace = createWorkspace("hai-novel-approved-freeze-");
  const context = await initWorkspace(workspace);

  const { ProjectService } = await importDist("app/services/project-service.js");
  const { ChapterService } = await importDist("app/services/chapter-service.js");
  const { DraftService } = await importDist("app/services/draft-service.js");

  const projectService = new ProjectService(context);
  const chapterService = new ChapterService(context);
  const draftService = new DraftService(context);

  const project = projectService.createProject({
    name: "approved 冻结测试",
    genre: "仙侠"
  });
  const chapter = chapterService.createChapter({
    projectId: project.id,
    title: "第001章 雨夜入宗",
    summary: "主角带着异物进入宗门"
  });

  await chapterService.generatePlan({
    projectId: project.id,
    chapterId: chapter.id,
    intent: "突出压迫感"
  });

  const draftResult = await draftService.writeDraft({
    projectId: project.id,
    chapterId: chapter.id
  });

  await draftService.reviewDraft({
    draftId: draftResult.draft.id,
    action: "approve"
  });

  await assert.rejects(
    () =>
      draftService.reviewDraft({
        draftId: draftResult.draft.id,
        action: "fix"
      }),
    /already approved and frozen/i
  );

  assert.throws(
    () => draftService.dropDraft(draftResult.draft.id),
    /already approved and cannot be dropped/i
  );

  await assert.rejects(
    () =>
      draftService.importDraft({
        draftId: draftResult.draft.id,
        inputPath: draftResult.exportPath
      }),
    /approved and frozen/i
  );

  const chapterAfterRejectedOps = chapterService.showChapter(chapter.id);
  assert.equal(chapterAfterRejectedOps.chapter.status, "done");
  assert.equal(chapterAfterRejectedOps.chapter.approved_draft_id, draftResult.draft.id);
});

test("draft approve 后会写入章节、人物、势力和钩子状态快照", async () => {
  const workspace = createWorkspace("hai-novel-state-sync-");
  const context = await initWorkspace(workspace);

  const { DraftService } = await importDist("app/services/draft-service.js");
  const { StateService } = await importDist("app/services/state-service.js");
  const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
  const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
  const { ChapterDraftRepository } = await importDist(
    "db/repositories/chapter-draft-repository.js"
  );
  const { CharacterRepository } = await importDist("db/repositories/character-repository.js");
  const { ItemRepository } = await importDist("db/repositories/item-repository.js");
  const { CharacterItemRepository } = await importDist(
    "db/repositories/character-item-repository.js"
  );
  const { FactionRepository } = await importDist("db/repositories/faction-repository.js");
  const { StoryHookRepository } = await importDist("db/repositories/story-hook-repository.js");
  const { HookChapterLinkRepository } = await importDist(
    "db/repositories/hook-chapter-link-repository.js"
  );

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const projectRepository = new ProjectRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const draftRepository = new ChapterDraftRepository(database);
    const characterRepository = new CharacterRepository(database);
    const itemRepository = new ItemRepository(database);
    const characterItemRepository = new CharacterItemRepository(database);
    const factionRepository = new FactionRepository(database);
    const hookRepository = new StoryHookRepository(database);
    const hookLinkRepository = new HookChapterLinkRepository(database);

    const project = projectRepository.create({
      name: "状态快照测试",
      genre: "仙侠",
      premise: "主角卷入宗门纷争",
      style: "克制"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章 雨夜入宗",
      summary: "林渡夜入青岚宗，黑玉佩出现异动"
    });
    const faction = factionRepository.create({
      projectId: project.id,
      name: "青岚宗",
      type: "宗门",
      stance: "正道"
    });
    const character = characterRepository.create({
      projectId: project.id,
      name: "林渡",
      role: "protagonist",
      factionId: faction.id,
      profession: "外门弟子"
    });
    const hook = hookRepository.create({
      projectId: project.id,
      title: "黑玉佩的来历",
      hookType: "mystery",
      summary: "黑玉佩忽然发热",
      targetChapterId: chapter.id
    });
    hookLinkRepository.create({
      projectId: project.id,
      hookId: hook.id,
      chapterId: chapter.id,
      linkType: "setup",
      plannedNote: "本章通过玉佩异动埋下疑团",
      status: "planned"
    });
    const item = itemRepository.create({
      projectId: project.id,
      name: "黑玉佩",
      category: "artifact",
      description: "会在危险时发热的神秘玉佩"
    });
    characterItemRepository.create({
      projectId: project.id,
      characterId: character.id,
      itemId: item.id,
      ownershipType: "carry",
      note: "林渡一直贴身携带"
    });

    const draft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText:
        "林渡冒雨站在青岚宗山门前，怀里的黑玉佩忽然发热，让他不敢再低头装作无事。",
      status: "generated"
    });

    const draftService = new DraftService(context);
    const approveResult = await draftService.reviewDraft({
      draftId: draft.id,
      action: "approve"
    });
    assert.equal(approveResult.draft.status, "approved");

    const stateService = new StateService(context);
    const stateResult = stateService.showState({
      projectId: project.id,
      chapterId: chapter.id
    });
    assert.equal(stateResult.chapterSnapshots.length, 1);
    assert.equal(stateResult.characterSnapshots.length, 1);
    assert.equal(stateResult.factionSnapshots.length, 1);
    assert.equal(stateResult.hookSnapshots.length, 1);
    assert.equal(stateResult.itemStates.length, 1);
    assert.equal(stateResult.latestCharacterStates.length, 1);
    assert.equal(stateResult.latestFactionStates.length, 1);
    assert.equal(stateResult.latestHookStates.length, 1);
    assert.match(stateResult.chapterSnapshots[0].summary ?? "", /物品提及 1 个/);
    assert.match(stateResult.chapterSnapshots[0].raw_payload ?? "", /"items"/);
    assert.match(stateResult.chapterSnapshots[0].raw_payload ?? "", /黑玉佩|item_id/);
    assert.equal(stateResult.hookSnapshots[0].progress_status, "advanced");
    assert.match(stateResult.characterSnapshots[0].status_summary ?? "", /林渡/);
    assert.equal(stateResult.chapterTitles[chapter.id], "第001章 雨夜入宗");
    assert.equal(stateResult.latestCharacterStates[0].character_name, "林渡");
    assert.equal(stateResult.latestFactionStates[0].faction_name, "青岚宗");
    assert.equal(stateResult.latestHookStates[0].hook_title, "黑玉佩的来历");
    assert.equal(stateResult.itemStates[0].item_name, "黑玉佩");
    assert.equal(stateResult.itemStates[0].chapter_title, "第001章 雨夜入宗");
    assert.equal(stateResult.itemStates[0].item_category, "artifact");
    assert.equal(stateResult.itemStates[0].item_static_status, "normal");
    assert.equal(stateResult.latestItemStates.length, 1);
    assert.equal(stateResult.latestItemStates[0].item_name, "黑玉佩");
    assert.equal(stateResult.itemStates[0].owner_character_name, "林渡");
  } finally {
    database.close();
  }
});

test("approve 过程中若生成记录写入失败，不会留下部分已提交的正式状态", async () => {
  const workspace = createWorkspace("hai-novel-approve-tx-");
  const context = await initWorkspace(workspace);

  const { ProjectRepository } = await importDist("db/repositories/project-repository.js");
  const { ChapterRepository } = await importDist("db/repositories/chapter-repository.js");
  const { ChapterDraftRepository } = await importDist(
    "db/repositories/chapter-draft-repository.js"
  );
  const { ChapterStateSnapshotRepository } = await importDist(
    "db/repositories/chapter-state-snapshot-repository.js"
  );
  const { DraftService } = await importDist("app/services/draft-service.js");

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const projectRepository = new ProjectRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const draftRepository = new ChapterDraftRepository(database);
    const chapterStateSnapshotRepository = new ChapterStateSnapshotRepository(database);

    const project = projectRepository.create({
      name: "审批事务回滚测试",
      genre: "仙侠"
    });
    const chapter = chapterRepository.create({
      projectId: project.id,
      title: "第001章 雨夜入宗",
      summary: "主角夜入山门"
    });
    const draft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      draftText: "林渡站在雨里，抬头望向山门，怀里的玉佩忽然发烫。",
      status: "generated"
    });

    // 人为破坏生成记录表，模拟审批成功落业务数据、但写 run 失败的场景。
    database.exec("DROP TABLE generation_runs;");

    const draftService = new DraftService(context);
    await assert.rejects(
      draftService.reviewDraft({
        draftId: draft.id,
        action: "approve"
      }),
      /generation_runs|no such table/i
    );

    const chapterAfterFailure = chapterRepository.findDetailById(chapter.id);
    const draftAfterFailure = draftRepository.findById(draft.id);
    const snapshots = chapterStateSnapshotRepository.findAllByChapterId(chapter.id);

    assert.equal(chapterAfterFailure?.final_text ?? null, null);
    assert.equal(chapterAfterFailure?.approved_draft_id ?? null, null);
    assert.equal(draftAfterFailure?.status, "generated");
    assert.equal(snapshots.length, 0);
  } finally {
    database.close();
  }
});

test("approve 成功但 final 导出失败时，会返回可区分的错误语义且保留正式结果", async () => {
  const workspace = createWorkspace("hai-novel-approve-export-");
  const context = await initWorkspace(workspace);

  const { ProjectService } = await importDist("app/services/project-service.js");
  const { ChapterService } = await importDist("app/services/chapter-service.js");
  const { DraftService } = await importDist("app/services/draft-service.js");
  const { ChapterStateSnapshotRepository } = await importDist(
    "db/repositories/chapter-state-snapshot-repository.js"
  );

  const projectService = new ProjectService(context);
  const chapterService = new ChapterService(context);
  const draftService = new DraftService(context);

  const project = projectService.createProject({
    name: "审批导出失败语义测试",
    genre: "仙侠"
  });
  const chapter = chapterService.createChapter({
    projectId: project.id,
    title: "第001章 雨夜入宗",
    summary: "林渡夜入山门"
  });

  await chapterService.generatePlan({
    projectId: project.id,
    chapterId: chapter.id
  });
  const draftResult = await draftService.writeDraft({
    projectId: project.id,
    chapterId: chapter.id
  });

  const blockedPath = path.join(workspace, "exports-blocker");
  writeFileSync(blockedPath, "occupied", "utf8");
  context.exportsDir = blockedPath;

  await assert.rejects(
    draftService.reviewDraft({
      draftId: draftResult.draft.id,
      action: "approve"
    }),
    /Approve completed for draft .* final export failed/
  );

  const chapterAfterApprove = chapterService.showChapter(chapter.id);
  assert.equal(chapterAfterApprove.chapter.status, "done");
  assert.equal(chapterAfterApprove.chapter.approved_draft_id, draftResult.draft.id);

  const { database } = await openWorkspaceDatabase(workspace);
  try {
    const snapshotRepository = new ChapterStateSnapshotRepository(database);
    assert.equal(snapshotRepository.findAllByChapterId(chapter.id).length, 1);
  } finally {
    database.close();
  }
});
