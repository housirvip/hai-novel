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
    const { ChapterPlanRepository } = await importDist("db/repositories/chapter-plan-repository.js");
    const { ChapterDraftRepository } = await importDist("db/repositories/chapter-draft-repository.js");
    const { GenerationRunRepository } = await importDist(
      "db/repositories/generation-run-repository.js"
    );

    const projectRepository = new ProjectRepository(database);
    const outlineRepository = new OutlineRepository(database);
    const chapterRepository = new ChapterRepository(database);
    const planRepository = new ChapterPlanRepository(database);
    const draftRepository = new ChapterDraftRepository(database);
    const runRepository = new GenerationRunRepository(database);

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

    const draft = draftRepository.create({
      projectId: project.id,
      chapterId: chapter.id,
      planId: secondPlan.id,
      draftText: "初稿内容",
      status: "generated"
    });
    const reviewedDraft = draftRepository.updateReview(draft.id, {
      status: "checked",
      reviewNotes: "发现结构问题",
      reviewReport: "[{\"level\":\"warning\",\"title\":\"节奏偏快\"}]"
    });
    assert.equal(reviewedDraft.status, "checked");
    assert.match(reviewedDraft.review_notes ?? "", /结构问题/);

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
  } finally {
    database.close();
  }
});
