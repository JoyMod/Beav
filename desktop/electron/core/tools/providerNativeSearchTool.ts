import { z } from 'zod';
import {
  DeclarativeTool,
  ToolKind,
  type ToolResult,
  createErrorResult,
  createSuccessResult,
  ToolErrorType,
} from '../toolRegistry';
import {
  searchWithProviderNativeTools,
  type NativeSearchModelConfig,
} from '../providerNativeSearchService';

const ProviderNativeSearchParamsSchema = z.object({
  query: z.string().min(1).describe('要检索的完整问题或关键词'),
  source: z.enum(['auto', 'web', 'x']).optional().describe('Grok 查询 X 内容时用 x；普通网页用 web；不确定用 auto'),
  fromDate: z.string().optional().describe('X 搜索开始日期，格式 YYYY-MM-DD'),
  toDate: z.string().optional().describe('X 搜索结束日期，格式 YYYY-MM-DD'),
});

type ProviderNativeSearchParams = z.infer<typeof ProviderNativeSearchParamsSchema>;

export class ProviderNativeSearchTool extends DeclarativeTool<typeof ProviderNativeSearchParamsSchema> {
  readonly name = 'provider_search';
  readonly displayName = '模型原生联网搜索';
  readonly description = '使用当前大模型供应商自己的服务端搜索能力获取实时信息。Grok 使用 xAI Web Search/X Search；火山方舟使用 Ark Web Search。遇到今天、最新、新闻、X/Twitter、价格、政策等时效问题必须先调用本工具，禁止凭训练数据猜测。';
  readonly kind = ToolKind.Search;
  readonly parameterSchema = ProviderNativeSearchParamsSchema;
  readonly requiresConfirmation = false;

  constructor(private readonly getModelConfig: () => NativeSearchModelConfig | null) {
    super();
  }

  getDescription(params: ProviderNativeSearchParams): string {
    return `使用当前模型供应商搜索：${params.query}`;
  }

  isConcurrencySafe(): boolean {
    return true;
  }

  async execute(params: ProviderNativeSearchParams, signal: AbortSignal): Promise<ToolResult> {
    if (signal.aborted) return createErrorResult('搜索已取消', ToolErrorType.CANCELLED);
    const config = this.getModelConfig();
    if (!config?.apiKey || !config.baseURL || !config.model) {
      return createErrorResult('当前模型没有完整的供应商连接配置。');
    }

    try {
      const result = await searchWithProviderNativeTools(config, params, signal);
      const providerName = result.provider === 'xai' ? 'Grok/xAI' : '火山方舟';
      const citations = result.citations.length
        ? `\n\n来源：\n${result.citations.map((url, index) => `${index + 1}. ${url}`).join('\n')}`
        : '\n\n供应商未返回可展示的来源链接。';
      return createSuccessResult(
        `${result.answer}${citations}`,
        `已使用 ${providerName} 原生搜索 · ${result.citations.length} 个来源`,
      );
    } catch (error) {
      return createErrorResult(error instanceof Error ? error.message : String(error));
    }
  }
}

