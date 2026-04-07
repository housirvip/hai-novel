import test from "node:test";
import assert from "node:assert/strict";
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

  const draftWriteResult = await draftService.writeDraft({
    projectId: project.id,
    chapterId: chapter.id
  });
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-draft.md"), true);
  assert.equal(draftWriteResult.draft.plan_id, planResult.plan.id);

  const checkResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "check"
  });
  assert.equal(checkResult.action, "check");
  assert.equal(checkResult.issues.length > 0, true);

  const fixResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "fix",
    notes: "增强结尾钩子"
  });
  assert.equal(fixResult.action, "fix");
  assert.equal(fixResult.draft.draft_text.includes("Mock 输出"), false);
  assert.match(fixResult.draft.draft_text, /增强结尾钩子/);
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-draft.md"), true);

  const approveResult = await draftService.reviewDraft({
    draftId: draftWriteResult.draft.id,
    action: "approve"
  });
  assert.equal(approveResult.action, "approve");
  assert.equal(hasWorkspaceFile(workspace, "exports", "chapter-001-final.md"), true);

  const chapterDetail = chapterService.showChapter(chapter.id);
  assert.equal(chapterDetail.chapter.approved_draft_id, draftWriteResult.draft.id);
  assert.equal((chapterDetail.chapter.final_text ?? "").length > 0, true);

  const finalExport = await chapterService.exportChapter({
    chapterId: chapter.id,
    source: "final"
  });
  assert.match(finalExport.markdown, /第001章 雨夜入宗/);
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
