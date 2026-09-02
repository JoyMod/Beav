import { z } from 'zod';
import {
  DeclarativeTool,
  ToolKind,
  type ToolResult,
  createErrorResult,
  createSuccessResult,
} from '../toolRegistry';
import {
  completeRedClawStyleDefinition,
  updateRedClawCreatorProfile,
  updateRedClawProfileDocument,
  type RedClawProfileDocType,
} from '../redclawProfileStore';

const UpdateProfileDocParamsSchema = z.object({
  docType: z.enum(['agent', 'soul', 'user', 'creator_profile']).describe('Which long-term RedClaw profile document to update.'),
  markdown: z.string().min(1).describe('The full updated markdown content for the target profile document.'),
  reason: z.string().optional().describe('Why this profile document is being updated.'),
});

type UpdateProfileDocParams = z.infer<typeof UpdateProfileDocParamsSchema>;

const UpdateCreatorProfileParamsSchema = z.object({
  markdown: z.string().min(1).describe('The full updated markdown content for CreatorProfile.md.'),
  reason: z.string().optional().describe('Why this creator strategy document is being updated.'),
});

type UpdateCreatorProfileParams = z.infer<typeof UpdateCreatorProfileParamsSchema>;

const CompleteStyleDefinitionParamsSchema = z.object({
  summary: z.string().min(1),
  creatorProfileMarkdown: z.string().min(1),
  soulMarkdown: z.string().min(1),
  userMarkdown: z.string().min(1),
  writingStyleSkillMarkdown: z.string().min(1),
  answers: z.record(z.string(), z.unknown()).optional(),
});

type CompleteStyleDefinitionParams = z.infer<typeof CompleteStyleDefinitionParamsSchema>;

const profileDocLabel = (docType: RedClawProfileDocType): string => {
  switch (docType) {
    case 'agent': return 'Agent.md';
    case 'soul': return 'Soul.md';
    case 'user': return 'user.md';
    case 'creator_profile': return 'CreatorProfile.md';
    default: return docType;
  }
};

export class RedClawUpdateProfileDocTool extends DeclarativeTool<typeof UpdateProfileDocParamsSchema> {
  readonly name = 'redclaw_update_profile_doc';
  readonly displayName = 'RedClaw Update Profile Document';
  readonly description =
    'Update one of RedClaw’s core long-term profile documents: Agent.md, Soul.md, user.md, or CreatorProfile.md. Use the correct document based on whether the user changed RedClaw operating rules, collaboration style, stable user profile, or long-term creator strategy.';
  readonly kind = ToolKind.Edit;
  readonly parameterSchema = UpdateProfileDocParamsSchema;
  readonly requiresConfirmation = false;

  getDescription(params: UpdateProfileDocParams): string {
    return `Update ${profileDocLabel(params.docType)}${params.reason ? ` (${params.reason})` : ''}`;
  }

  async execute(params: UpdateProfileDocParams): Promise<ToolResult> {
    try {
      const result = await updateRedClawProfileDocument(params.docType, params.markdown);
      return createSuccessResult(
        `Profile document updated: ${result.path}\nDocType: ${params.docType}\nReason: ${params.reason || 'unspecified'}`,
        `${profileDocLabel(params.docType)} 已更新`
      );
    } catch (error) {
      return createErrorResult(`Failed to update profile document: ${String(error)}`);
    }
  }
}

export class RedClawUpdateCreatorProfileTool extends DeclarativeTool<typeof UpdateCreatorProfileParamsSchema> {
  readonly name = 'redclaw_update_creator_profile';
  readonly displayName = 'RedClaw Update Creator Profile';
  readonly description =
    'Update the long-term CreatorProfile.md document that stores the user\'s self-media positioning, target audience, style, business goals, and operating constraints. Use this when the user provides durable creator strategy information.';
  readonly kind = ToolKind.Edit;
  readonly parameterSchema = UpdateCreatorProfileParamsSchema;
  readonly requiresConfirmation = false;

  getDescription(params: UpdateCreatorProfileParams): string {
    return `Update CreatorProfile.md${params.reason ? ` (${params.reason})` : ''}`;
  }

  async execute(params: UpdateCreatorProfileParams): Promise<ToolResult> {
    try {
      const result = await updateRedClawCreatorProfile(params.markdown);
      return createSuccessResult(
        `Creator profile updated: ${result.path}\nReason: ${params.reason || 'unspecified'}`,
        'CreatorProfile.md 已更新'
      );
    } catch (error) {
      return createErrorResult(`Failed to update creator profile: ${String(error)}`);
    }
  }
}

export class RedClawCompleteStyleDefinitionTool extends DeclarativeTool<typeof CompleteStyleDefinitionParamsSchema> {
  readonly name = 'redclaw_complete_style_definition';
  readonly displayName = '完成风格定义';
  readonly description = 'Persist the user-confirmed RedClaw profile and workspace writing-style skill, then mark onboarding complete.';
  readonly kind = ToolKind.Edit;
  readonly parameterSchema = CompleteStyleDefinitionParamsSchema;
  readonly requiresConfirmation = false;

  getDescription(): string {
    return '保存已确认的创作者定位与写作风格';
  }

  async execute(params: CompleteStyleDefinitionParams): Promise<ToolResult> {
    try {
      await completeRedClawStyleDefinition(params);
      return createSuccessResult(params.summary, '风格定义已保存');
    } catch (error) {
      return createErrorResult(`Failed to complete style definition: ${String(error)}`);
    }
  }
}
