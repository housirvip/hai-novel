import type Database from "better-sqlite3";
import { getPromptTemplateMetadata } from "../../ai/prompts/template-registry.js";
import { ChapterDraftRepository } from "../../db/repositories/chapter-draft-repository.js";
import { ChapterRepository } from "../../db/repositories/chapter-repository.js";
import { GenerationRunRepository } from "../../db/repositories/generation-run-repository.js";
import type { ChapterDraftRecord, DraftReviewIssue } from "../../domain/types/index.js";
import type { RuntimeContext } from "./context-service.js";
import { StateExtractionService } from "./state-extraction-service.js";
import { StateUpdateService } from "./state-update-service.js";

/**
 * 草稿审批服务。
 * 把“抽取正式状态、批准草稿、同步章节状态、写生成记录”统一封装起来。
 */
export class ApprovalService {
  constructor(
    private readonly context: RuntimeContext,
    private readonly database: Database.Database
  ) {}

  async approveDraft(input: {
    draftId: number;
    reviewIssues: DraftReviewIssue[];
    reviewNotes?: string;
    existingReviewNotes?: string | null;
  }): Promise<{
    approvedDraft: ChapterDraftRecord;
    generationRunId: number;
  }> {
    const draftRepository = new ChapterDraftRepository(this.database);
    const chapterRepository = new ChapterRepository(this.database);
    const runRepository = new GenerationRunRepository(this.database);

    const draft = draftRepository.findById(input.draftId);
    if (!draft) {
      throw new Error(`Draft ${input.draftId} not found.`);
    }

    const chapter = chapterRepository.findDetailById(draft.chapter_id);
    if (!chapter) {
      throw new Error(`Chapter ${draft.chapter_id} not found for draft ${input.draftId}.`);
    }

    const reviewReport = JSON.stringify(input.reviewIssues, null, 2);
    const extractionService = new StateExtractionService(this.context, this.database);
    const updateService = new StateUpdateService(this.database);
    const stateTemplateMetadata = getPromptTemplateMetadata("state-extract");
    const extractedState = await extractionService.extractChapterState({
      projectId: draft.project_id,
      chapterId: draft.chapter_id,
      finalText: draft.draft_text
    });

    const approvalResult = this.database.transaction(() => {
      const approvedDraft = draftRepository.updateReview(input.draftId, {
        status: "approved",
        reviewNotes: input.reviewNotes ?? input.existingReviewNotes,
        reviewReport
      });
      chapterRepository.approveDraft(draft.chapter_id, draft.id, approvedDraft.draft_text);
      const stateSyncResult = updateService.applyChapterState({
        projectId: draft.project_id,
        chapterId: draft.chapter_id,
        draftId: draft.id,
        payload: extractedState.payload
      });

      return {
        approvedDraft,
        stateSyncResult
      };
    })();

    runRepository.create({
      projectId: draft.project_id,
      chapterId: draft.chapter_id,
      runType: "state_extract",
      templateKey: stateTemplateMetadata.key,
      templateLabel: stateTemplateMetadata.name,
      templateVersion: stateTemplateMetadata.version,
      templateSummary: stateTemplateMetadata.summary,
      promptText: extractedState.prompt,
      inputContext: draft.draft_text,
      outputText: extractedState.rawOutput,
      model: extractedState.model,
      status: "success"
    });

    const run = runRepository.create({
      projectId: draft.project_id,
      chapterId: draft.chapter_id,
      runType: "draft_review_approve",
      inputContext: approvalResult.approvedDraft.draft_text,
      outputText: [
        reviewReport,
        "",
        `state_sync: chapter_snapshot=${approvalResult.stateSyncResult.chapterSnapshot.id}`,
        `state_sync: characters=${approvalResult.stateSyncResult.characterSnapshotCount}`,
        `state_sync: factions=${approvalResult.stateSyncResult.factionSnapshotCount}`,
        `state_sync: hooks=${approvalResult.stateSyncResult.hookSnapshotCount}`,
        `state_sync: items=${approvalResult.stateSyncResult.itemStateCount}`
      ].join("\n"),
      model: "rule-reviewer-v1",
      status: "success"
    });

    return {
      approvedDraft: approvalResult.approvedDraft,
      generationRunId: run.id
    };
  }
}
