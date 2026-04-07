import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  hasWorkspaceFile,
  importDist,
  initWorkspace
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
