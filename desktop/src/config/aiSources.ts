import { REDBOX_OFFICIAL_VIDEO_BASE_URL } from '../../shared/redboxVideo';
import { APP_BRAND } from './brand';

export interface AiSourcePreset {
  id: string;
  label: string;
  baseURL: string;
  protocol: 'openai' | 'anthropic' | 'gemini';
  group: 'popular' | 'china' | 'global' | 'local' | 'coding-plan';
}

export interface AiSourceConfig {
  id: string;
  name: string;
  presetId: string;
  baseURL: string;
  apiKey: string;
  models?: string[];
  modelsMeta?: Array<{
    id: string;
    capabilities?: string[];
  }>;
  model: string;
  protocol?: 'openai' | 'anthropic' | 'gemini';
}

export const DEFAULT_AI_PRESET_ID = 'openai';

// Stable persisted/runtime contract. Display branding can vary, but the backend
// official auth/model pipeline still uses this source id as the canonical key.
export const OFFICIAL_AUTO_SOURCE_ID = 'redbox_official_auto';

export const LEGACY_OFFICIAL_AUTO_SOURCE_IDS = Array.from(new Set([
  OFFICIAL_AUTO_SOURCE_ID,
  `${APP_BRAND.variant}_official_auto`,
]));

export const isOfficialAutoSourceId = (sourceId: string): boolean => {
  const normalized = String(sourceId || '').trim().toLowerCase();
  return LEGACY_OFFICIAL_AUTO_SOURCE_IDS.some((id) => id.toLowerCase() === normalized);
};

export const canonicalizeOfficialAutoSourceId = (sourceId: string): string => {
  const normalized = String(sourceId || '').trim();
  return isOfficialAutoSourceId(normalized) ? OFFICIAL_AUTO_SOURCE_ID : normalized;
};

export const OFFICIAL_AI_SOURCE_DISPLAY_NAME = `${APP_BRAND.displayName}官方`;

export const createOfficialAiSource = (overrides: Partial<AiSourceConfig> = {}): AiSourceConfig => {
  const { id: _ignoredId, presetId: _ignoredPresetId, ...rest } = overrides;
  return {
    id: OFFICIAL_AUTO_SOURCE_ID,
    name: OFFICIAL_AI_SOURCE_DISPLAY_NAME,
    presetId: 'redbox-official',
    baseURL: REDBOX_OFFICIAL_VIDEO_BASE_URL,
    apiKey: '',
    models: [],
    modelsMeta: [],
    model: '',
    protocol: 'openai',
    ...rest,
  };
};

// Presets aligned with common OpenAI-compatible providers (referencing AionUi design).
export const AI_SOURCE_PRESETS: AiSourcePreset[] = [
  { id: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1', protocol: 'openai', group: 'popular' },
  { id: 'anthropic', label: 'Anthropic Claude', baseURL: 'https://api.anthropic.com/v1', protocol: 'anthropic', group: 'popular' },
  { id: 'gemini', label: 'Google Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta', protocol: 'gemini', group: 'popular' },
  { id: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', protocol: 'openai', group: 'popular' },
  { id: 'openrouter', label: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', protocol: 'openai', group: 'popular' },
  { id: 'dashscope', label: '通义千问 / 阿里百炼', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', protocol: 'openai', group: 'popular' },
  { id: 'moonshot-cn', label: 'Kimi / Moonshot（中国）', baseURL: 'https://api.moonshot.cn/v1', protocol: 'openai', group: 'popular' },
  { id: 'xai', label: 'Grok（xAI）', baseURL: 'https://api.x.ai/v1', protocol: 'openai', group: 'popular' },
  { id: 'ark', label: '豆包 / 火山方舟', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', protocol: 'openai', group: 'popular' },
  { id: 'zhipu', label: '智谱 GLM', baseURL: 'https://open.bigmodel.cn/api/paas/v4', protocol: 'openai', group: 'china' },
  { id: 'minimax-cn', label: 'MiniMax（中国）', baseURL: 'https://api.minimaxi.com/v1', protocol: 'openai', group: 'china' },
  { id: 'siliconflow-cn', label: '硅基流动（中国）', baseURL: 'https://api.siliconflow.cn/v1', protocol: 'openai', group: 'china' },
  { id: 'qianfan', label: '百度千帆', baseURL: 'https://qianfan.baidubce.com/v2', protocol: 'openai', group: 'china' },
  { id: 'hunyuan', label: '腾讯混元', baseURL: 'https://api.hunyuan.cloud.tencent.com/v1', protocol: 'openai', group: 'china' },
  { id: 'lingyi', label: '零一万物', baseURL: 'https://api.lingyiwanwu.com/v1', protocol: 'openai', group: 'china' },
  { id: 'ppio', label: 'PPIO 派欧云', baseURL: 'https://api.ppinfra.com/v3/openai', protocol: 'openai', group: 'china' },
  { id: 'modelscope', label: '魔搭 ModelScope', baseURL: 'https://api-inference.modelscope.cn/v1', protocol: 'openai', group: 'china' },
  { id: 'infiniai', label: '无问芯穹 InfiniAI', baseURL: 'https://cloud.infini-ai.com/maas/v1', protocol: 'openai', group: 'china' },
  { id: 'ctyun', label: '天翼云', baseURL: 'https://wishub-x1.ctyun.cn/v1', protocol: 'openai', group: 'china' },
  { id: 'stepfun', label: '阶跃星辰 StepFun', baseURL: 'https://api.stepfun.com/v1', protocol: 'openai', group: 'china' },
  { id: 'moonshot-global', label: 'Moonshot（国际）', baseURL: 'https://api.moonshot.ai/v1', protocol: 'openai', group: 'global' },
  { id: 'minimax-global', label: 'MiniMax（国际）', baseURL: 'https://api.minimax.io/v1', protocol: 'openai', group: 'global' },
  { id: 'siliconflow', label: 'SiliconFlow（国际）', baseURL: 'https://api.siliconflow.com/v1', protocol: 'openai', group: 'global' },
  { id: 'poe', label: 'Poe', baseURL: 'https://api.poe.com/v1', protocol: 'openai', group: 'global' },
  { id: 'groq', label: 'Groq', baseURL: 'https://api.groq.com/openai/v1', protocol: 'openai', group: 'global' },
  { id: 'together', label: 'Together AI', baseURL: 'https://api.together.ai/v1', protocol: 'openai', group: 'global' },
  { id: 'mistral', label: 'Mistral AI', baseURL: 'https://api.mistral.ai/v1', protocol: 'openai', group: 'global' },
  { id: 'fireworks', label: 'Fireworks AI', baseURL: 'https://api.fireworks.ai/inference/v1', protocol: 'openai', group: 'global' },
  { id: 'nvidia-nim', label: 'NVIDIA NIM', baseURL: 'https://integrate.api.nvidia.com/v1', protocol: 'openai', group: 'global' },
  { id: 'ollama-local', label: 'Ollama（本地）', baseURL: 'http://127.0.0.1:11434/v1', protocol: 'openai', group: 'local' },
  { id: 'lmstudio-local', label: 'LM Studio（本地）', baseURL: 'http://127.0.0.1:1234/v1', protocol: 'openai', group: 'local' },
  { id: 'vllm-local', label: 'vLLM（本地）', baseURL: 'http://127.0.0.1:8000/v1', protocol: 'openai', group: 'local' },
  { id: 'localai-local', label: 'LocalAI（本地）', baseURL: 'http://127.0.0.1:8080/v1', protocol: 'openai', group: 'local' },
  { id: 'llama-cpp-local', label: 'llama.cpp Server（本地）', baseURL: 'http://127.0.0.1:8080/v1', protocol: 'openai', group: 'local' },
  { id: 'dashscope-coding-openai', label: 'Alibaba Bailian Coding Plan (OpenAI)', baseURL: 'https://coding.dashscope.aliyuncs.com/v1', protocol: 'openai', group: 'coding-plan' },
  { id: 'dashscope-coding-anthropic', label: 'Alibaba Bailian Coding Plan (Anthropic)', baseURL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'zhipu-coding-openai', label: 'Zhipu Coding Plan (OpenAI)', baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4', protocol: 'openai', group: 'coding-plan' },
  { id: 'zhipu-coding-anthropic', label: 'Zhipu Coding Plan (Anthropic)', baseURL: 'https://open.bigmodel.cn/api/anthropic', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'kimi-coding-openai', label: 'Kimi Code (OpenAI)', baseURL: 'https://api.kimi.com/coding/v1', protocol: 'openai', group: 'coding-plan' },
  { id: 'kimi-coding-anthropic', label: 'Kimi Code (Anthropic)', baseURL: 'https://api.kimi.com/coding', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'minimax-coding-openai', label: 'MiniMax Token Plan (OpenAI)', baseURL: 'https://api.minimaxi.com/v1', protocol: 'openai', group: 'coding-plan' },
  { id: 'minimax-coding-anthropic', label: 'MiniMax Token Plan (Anthropic)', baseURL: 'https://api.minimaxi.com/anthropic', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'ark-coding-openai', label: 'Volcengine Coding Plan (OpenAI)', baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3', protocol: 'openai', group: 'coding-plan' },
  { id: 'ark-coding-anthropic', label: 'Volcengine Coding Plan (Anthropic)', baseURL: 'https://ark.cn-beijing.volces.com/api/coding', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'qianfan-coding-openai', label: 'Qianfan Coding Plan (OpenAI)', baseURL: 'https://qianfan.baidubce.com/v2/coding', protocol: 'openai', group: 'coding-plan' },
  { id: 'qianfan-coding-anthropic', label: 'Qianfan Coding Plan (Anthropic)', baseURL: 'https://qianfan.baidubce.com/anthropic/coding', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'tencent-coding-openai', label: 'Tencent Coding Plan (OpenAI)', baseURL: 'https://api.lkeap.cloud.tencent.com/coding/v3', protocol: 'openai', group: 'coding-plan' },
  { id: 'tencent-coding-anthropic', label: 'Tencent Coding Plan (Anthropic)', baseURL: 'https://api.lkeap.cloud.tencent.com/coding/anthropic', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'stepfun-coding-openai', label: 'StepFun Step Plan (OpenAI)', baseURL: 'https://api.stepfun.com/step_plan/v1', protocol: 'openai', group: 'coding-plan' },
  { id: 'stepfun-coding-anthropic', label: 'StepFun Step Plan (Anthropic)', baseURL: 'https://api.stepfun.com/step_plan', protocol: 'anthropic', group: 'coding-plan' },
  { id: 'custom', label: '自定义 OpenAI 兼容接口', baseURL: '', protocol: 'openai', group: 'global' },
];

const normalizeEndpoint = (endpoint: string): string => {
  const value = endpoint.trim().replace(/\/+$/, '');
  return value.toLowerCase();
};

export const findAiPresetById = (presetId: string): AiSourcePreset | undefined => {
  return AI_SOURCE_PRESETS.find((preset) => preset.id === presetId);
};

export const inferPresetIdByEndpoint = (endpoint: string): string => {
  const normalized = normalizeEndpoint(endpoint);
  if (!normalized) return DEFAULT_AI_PRESET_ID;

  const exact = AI_SOURCE_PRESETS.find((preset) => {
    if (!preset.baseURL) return false;
    return normalizeEndpoint(preset.baseURL) === normalized;
  });
  if (exact) return exact.id;

  const prefixMatches = AI_SOURCE_PRESETS
    .map((preset) => {
      if (!preset.baseURL) return null;
      const presetBase = normalizeEndpoint(preset.baseURL);
      if (!presetBase) return null;
      return normalized.startsWith(presetBase)
        ? { id: preset.id, baseLength: presetBase.length }
        : null;
    })
    .filter((item): item is { id: string; baseLength: number } => Boolean(item))
    .sort((a, b) => b.baseLength - a.baseLength);

  if (prefixMatches.length > 0) {
    return prefixMatches[0].id;
  }

  const fuzzyMatches = AI_SOURCE_PRESETS
    .map((preset) => {
      if (!preset.baseURL) return null;
      const presetHost = normalizeEndpoint(preset.baseURL)
        .replace(/^https?:\/\//, '')
        .split('/')[0];
      if (!presetHost || !normalized.includes(presetHost)) return null;
      return { id: preset.id, hostLength: presetHost.length };
    })
    .filter((item): item is { id: string; hostLength: number } => Boolean(item))
    .sort((a, b) => b.hostLength - a.hostLength);

  return fuzzyMatches[0]?.id || 'custom';
};
