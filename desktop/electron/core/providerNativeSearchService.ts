import { normalizeApiBaseUrl, safeUrlJoin } from './urlUtils';

export interface NativeSearchModelConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface NativeSearchRequest {
  query: string;
  source?: 'auto' | 'web' | 'x';
  fromDate?: string;
  toDate?: string;
}

export interface NativeSearchResult {
  provider: 'xai' | 'ark';
  answer: string;
  citations: string[];
}

type FetchLike = typeof fetch;

const detectNativeSearchProvider = (config: NativeSearchModelConfig): NativeSearchResult['provider'] | null => {
  const model = String(config.model || '').toLowerCase();
  const baseURL = normalizeApiBaseUrl(config.baseURL).toLowerCase();
  if (model.includes('grok') || baseURL.includes('api.x.ai')) return 'xai';
  if (baseURL.includes('ark.cn-beijing.volces.com') || baseURL.includes('volcengine.com/api/v3')) return 'ark';
  return null;
};

const collectResponseText = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text.trim();
  if (!Array.isArray(record.output)) return '';

  const chunks: string[] = [];
  for (const item of record.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) chunks.push(text.trim());
    }
  }
  return chunks.join('\n\n');
};

const collectCitationUrls = (payload: unknown): string[] => {
  const urls = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value)) urls.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.url === 'string' && /^https?:\/\//i.test(record.url)) urls.add(record.url);
    if (Array.isArray(record.citations)) record.citations.forEach(visit);
    if (Array.isArray(record.annotations)) record.annotations.forEach(visit);
    if (Array.isArray(record.content)) record.content.forEach(visit);
    if (Array.isArray(record.output)) record.output.forEach(visit);
  };
  visit(payload);
  return [...urls];
};

const parseProviderError = async (response: Response): Promise<string> => {
  const raw = (await response.text().catch(() => '')).slice(0, 3000);
  let message = raw;
  try {
    const payload = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    message = typeof payload.error === 'string'
      ? payload.error
      : String(payload.error?.message || payload.message || raw);
  } catch {
    // Keep the provider response text when it is not JSON.
  }
  if (/has not activated web search/i.test(message)) {
    return '当前火山方舟账号尚未开通原生 Web Search。请先在 https://console.volcengine.com/common-buy/CC_content_plugin 开通联网搜索权益；Agent Plan 模型额度不能替代该权益。';
  }
  return message.slice(0, 1200);
};

const buildNativeTools = (
  provider: NativeSearchResult['provider'],
  request: NativeSearchRequest,
): Array<Record<string, unknown>> => {
  const source = request.source || 'auto';
  if (provider === 'ark') {
    if (source === 'x') {
      throw new Error('当前火山方舟模型不提供 X 专属搜索；请切换 Grok，或改用 Web 搜索。');
    }
    return [{ type: 'web_search' }];
  }

  const tools: Array<Record<string, unknown>> = [];
  if (source === 'auto' || source === 'web') tools.push({ type: 'web_search' });
  if (source === 'auto' || source === 'x') {
    tools.push({
      type: 'x_search',
      ...(request.fromDate ? { from_date: request.fromDate } : {}),
      ...(request.toDate ? { to_date: request.toDate } : {}),
      enable_image_understanding: true,
      enable_video_understanding: true,
    });
  }
  return tools;
};

export const requiresProviderNativeSearch = (input: string): boolean => {
  const text = String(input || '').trim().toLowerCase();
  if (!text) return false;
  return /(搜索|搜一下|查一下|查询|联网|最新|今天|今日|实时|刚刚|新闻|热搜|趋势|推特|twitter|\bx\b|官网|现价|价格|天气|政策|规则|赛程|比分)/i.test(text);
};

export const searchWithProviderNativeTools = async (
  config: NativeSearchModelConfig,
  request: NativeSearchRequest,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<NativeSearchResult> => {
  const provider = detectNativeSearchProvider(config);
  if (!provider) {
    throw new Error(`模型 ${config.model} 的供应商没有配置可验证的原生搜索协议。`);
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 120000);
  let response: Response;
  try {
    response = await fetchImpl(safeUrlJoin(normalizeApiBaseUrl(config.baseURL), '/responses'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        input: request.query,
        tools: buildNativeTools(provider, request),
        tool_choice: 'auto',
      }),
    });
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error('供应商原生搜索超过 120 秒，已停止等待。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }

  if (!response.ok) {
    const detail = await parseProviderError(response);
    const providerName = provider === 'xai' ? 'Grok/xAI' : '火山方舟';
    throw new Error(`${providerName} 原生搜索不可用（HTTP ${response.status}）${detail ? `：${detail}` : ''}`);
  }

  const payload = await response.json() as unknown;
  const answer = collectResponseText(payload);
  if (!answer) throw new Error('供应商原生搜索已返回，但没有生成可读答案。');

  const citations = new Set(collectCitationUrls(payload));
  for (const match of answer.matchAll(/https?:\/\/[^\s)\]<>"']+/g)) citations.add(match[0]);

  return {
    provider,
    answer,
    citations: [...citations],
  };
};
