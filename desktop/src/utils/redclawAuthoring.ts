export type AuthoringPlatform = 'xiaohongshu' | 'wechat_official_account';
export type AuthoringTaskType = 'direct_write' | 'expand_from_xhs';
export type AuthoringSourceMode = 'manual' | 'knowledge' | 'manuscript';
export type AuthoringFormatTarget = 'markdown' | 'wechat_rich_text';

export interface AuthoringTaskHints {
    intent?: string;
    forceMultiAgent?: boolean;
    forceLongRunningTask?: boolean;
    activeSkills?: string[];
    executionProfile?: 'artifact-authoring';
    artifactType?: 'manuscript';
    writeTarget?: 'manuscripts://current';
    requiredSkill?: string | string[];
    allowedTools?: string[];
    allowedAppCliActions?: string[];
    allowedOperateActions?: string[];
    allowedWriteTargets?: string[];
    requireSourceRead?: boolean;
    requireProfileRead?: boolean;
    requireSave?: boolean;
    requireTaskBrief?: boolean;
    requireSkillInvocations?: string[];
    taskBrief?: TaskBriefSeed;
    forbiddenFinalPhrases?: string[];
    deferredDiscovery?: boolean;
    teamEscalation?: 'disabled' | 'allowed';
    saveArtifact?: 'folder';
    saveSubdir?: string;
    platform?: AuthoringPlatform;
    taskType?: AuthoringTaskType;
    formatTarget?: AuthoringFormatTarget;
    sourcePlatform?: AuthoringPlatform;
    sourceNoteId?: string;
    sourceMode?: AuthoringSourceMode;
    sourceTitle?: string;
    sourceManuscriptPath?: string;
}

export interface TaskBriefItem {
    id: string;
    text: string;
    status?: 'todo' | 'doing' | 'done' | 'blocked';
}

export interface TaskBriefContextItem {
    kind: 'constraint' | 'source' | 'finding' | 'decision' | 'risk' | 'validation';
    text: string;
}

export interface TaskBriefArticleStrategy {
    articleStyle: string;
    readerQuestion: string;
    corePromise: string;
    titleDirection: string;
    openingDirection: string;
    structureDirection: string;
    avoidDirection: string[];
}

export interface TaskBriefTitleCandidate {
    title: string;
    style: string;
    score: number;
    reason: string;
}

export interface TaskBriefSeed {
    taskType: string;
    goal: string;
    currentStage: string;
    todo: TaskBriefItem[];
    importantContext: TaskBriefContextItem[];
    articleStrategy?: TaskBriefArticleStrategy;
    titleCandidates?: TaskBriefTitleCandidate[];
    domain?: Record<string, unknown>;
}

interface BuildAuthoringMessageInput {
    platform: AuthoringPlatform;
    taskType: AuthoringTaskType;
    brief?: string;
    sourceMode?: AuthoringSourceMode;
    sourcePlatform?: AuthoringPlatform;
    sourceNoteId?: string;
    sourceTitle?: string;
    sourceManuscriptPath?: string;
    sourceContent?: string;
}

const PLATFORM_LABEL: Record<AuthoringPlatform, string> = {
    xiaohongshu: '小红书',
    wechat_official_account: '公众号',
};

const TASK_LABEL: Record<AuthoringTaskType, string> = {
    direct_write: '直接写稿',
    expand_from_xhs: '小红书扩写公众号',
};

export const AUTHORING_ALLOWED_TOOLS = ['app_cli', 'skill', 'provider_search'];

export const AUTHORING_ALLOWED_APP_CLI_ACTIONS = [
    'help.list',
    'help.show',
    'knowledge.get',
    'knowledge.search',
    'manuscripts.create',
    'manuscripts.write',
    'redclaw.get',
    'skills.list',
];

export function buildTaskBriefPromptSection(seed: TaskBriefSeed) {
    return [
        '## 工作 Brief（长步骤任务状态）',
        '请在当前执行上下文中持续维护这份结构化 Brief，用它承接调研结论、文章打法、标题决策、写作约束和最终校验；不需要把 Brief 另存为文件。',
        '后续标题和正文必须沿用 Brief 里的 `articleStrategy`、`importantContext` 和领域字段。',
        '初始 Brief：',
        '```json',
        JSON.stringify(seed, null, 2),
        '```',
    ].join('\n');
}

const PLATFORM_SAVE_RULE: Record<AuthoringPlatform, string> = {
    xiaohongshu: '必须用 `app_cli(command="manuscripts write --path \\"drafts/<简短文件名>.md\\"", payload={ "content": "<完整正文>" })` 保存，并等待工具返回 Manuscript saved successfully。正文只保留正常内容结构。',
    wechat_official_account: '必须用 `app_cli(command="manuscripts write --path \\"drafts/<简短文件名>.md\\"", payload={ "content": "<完整正文>" })` 保存，并等待工具返回 Manuscript saved successfully。正文只保留正常内容结构。',
};

export function buildRedClawAuthoringMessage(input: BuildAuthoringMessageInput) {
    const brief = String(input.brief || '').trim();
    const sourceTitle = String(input.sourceTitle || '').trim();
    const sourceContent = String(input.sourceContent || '').trim();
    const sourceBlocks: string[] = [];

    if (sourceTitle) {
        sourceBlocks.push(`来源标题：${sourceTitle}`);
    }
    if (input.sourceNoteId) {
        sourceBlocks.push(`来源ID：${input.sourceNoteId}`);
    }
    if (input.sourceManuscriptPath) {
        sourceBlocks.push(`来源稿件：${input.sourceManuscriptPath}`);
    }
    if (sourceContent) {
        sourceBlocks.push('来源内容：');
        sourceBlocks.push(sourceContent);
    }

    const content = [
        brief || `请为${PLATFORM_LABEL[input.platform]}启动一个新的创作任务。`,
        `保存规则：${PLATFORM_SAVE_RULE[input.platform]}`,
        sourceBlocks.length > 0 ? ['\n参考素材：', ...sourceBlocks].join('\n') : '',
    ].filter(Boolean).join('\n\n').trim();

    const displayContent = `${PLATFORM_LABEL[input.platform]} · ${TASK_LABEL[input.taskType]}${sourceTitle ? ` · ${sourceTitle}` : ''}`;

    return {
        content,
        displayContent,
        sessionRouting: 'new' as const,
        taskHints: {
            intent: 'manuscript_creation',
            executionProfile: 'artifact-authoring',
            artifactType: 'manuscript',
            writeTarget: 'manuscripts://current',
            requiredSkill: 'writing-style',
            activeSkills: ['writing-style'],
            allowedTools: AUTHORING_ALLOWED_TOOLS,
            allowedAppCliActions: AUTHORING_ALLOWED_APP_CLI_ACTIONS,
            requireSourceRead: Boolean(input.sourceMode && input.sourceMode !== 'manual'),
            requireProfileRead: true,
            requireSave: true,
            deferredDiscovery: false,
            teamEscalation: 'disabled',
            saveArtifact: 'folder',
            platform: input.platform,
            taskType: input.taskType,
            formatTarget: 'markdown' as const,
            sourceMode: input.sourceMode,
            sourcePlatform: input.sourcePlatform,
            sourceNoteId: input.sourceNoteId,
            sourceTitle: sourceTitle || undefined,
            sourceManuscriptPath: input.sourceManuscriptPath,
        } satisfies AuthoringTaskHints,
    };
}
