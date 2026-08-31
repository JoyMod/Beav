const RELEASE_SUFFIX = /-(?:ga-)?\d{6,8}$/i;

function formatModelTail(value: string): string {
  return value
    .replace(/seedream[-_](\d+)[-_](\d+)/i, 'Seedream $1.$2')
    .replace(/seedance[-_](\d+)[-_](\d+)/i, 'Seedance $1.$2')
    .replace(/seed[-_](\d+)[-_](\d+)/i, 'Seed $1.$2')
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (/^v\d/i.test(token)) return token.toUpperCase();
      if (/^\d+k$/i.test(token)) return token.toUpperCase();
      if (/^(pro|flash|turbo|lite|max|mini|reasoner|sonnet|opus|haiku|plus)$/i.test(token)) {
        return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
      }
      return token;
    })
    .join(' ');
}

export function getModelDisplayName(modelName: string): string {
  const raw = String(modelName || '').trim();
  if (!raw) return '默认模型';
  const normalized = raw.replace(RELEASE_SUFFIX, '');
  const knownBrands: Array<[RegExp, string]> = [
    [/^deepseek[-_]?/i, 'DeepSeek'],
    [/^doubao[-_]?/i, '豆包'],
    [/^grok[-_]?/i, 'Grok'],
    [/^claude[-_]?/i, 'Claude'],
    [/^gemini[-_]?/i, 'Gemini'],
    [/^qwen[-_]?/i, 'Qwen'],
    [/^cosyvoice[-_]?/i, 'CosyVoice'],
  ];
  for (const [pattern, brand] of knownBrands) {
    if (pattern.test(normalized)) {
      return `${brand} ${formatModelTail(normalized.replace(pattern, ''))}`.trim();
    }
  }
  if (/^gpt[-_]?/i.test(normalized)) {
    return `GPT-${normalized.replace(/^gpt[-_]?/i, '')}`;
  }
  return formatModelTail(normalized);
}

export function getModelLogo(modelName: string, providerIdentity = ''): string {
  const model = String(modelName || '').toLowerCase();
  const provider = String(providerIdentity || '').toLowerCase();
  if (model.includes('deepseek')) return '/provider-logos/deepseek.svg';
  if (model.includes('grok') || provider.includes('xai')) return '/provider-logos/xai.svg';
  if (model.includes('doubao') || model.includes('seedance') || model.includes('seedream') || provider.includes('ark') || provider.includes('火山')) return '/provider-logos/volcengine.svg';
  if (model.includes('claude') || provider.includes('anthropic')) return '/provider-logos/anthropic.svg';
  if (model.includes('gemini') || provider.includes('gemini')) return '/provider-logos/gemini.svg';
  if (model.includes('qwen') || model.includes('cosyvoice') || provider.includes('dashscope') || provider.includes('通义')) return '/provider-logos/qwen.svg';
  if (model.includes('kimi') || provider.includes('moonshot')) return '/provider-logos/kimi.svg';
  if (model.includes('glm') || provider.includes('zhipu') || provider.includes('智谱')) return '/provider-logos/zhipu.svg';
  if (model.includes('minimax') || provider.includes('minimax')) return '/provider-logos/minimax.png';
  if (model.includes('step') || provider.includes('stepfun')) return '/provider-logos/stepfun.svg';
  if (model.includes('gpt') || model.includes('openai') || provider.includes('openai')) return '/provider-logos/openai.svg';
  return '';
}
