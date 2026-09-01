import { convertFileSrc } from '@tauri-apps/api/core';
import { coerceToRedboxAssetUrl, extractLocalAssetPathCandidate, isLocalAssetSource } from '../../shared/localAsset';
import { isLocalBrowserPreview } from './runtimeMode';

const SAFE_RENDERABLE_PROTOCOL = /^(https?:|data:|blob:|file:)/i;
const IMAGE_FILE_HINT = /\.(png|jpe?g|webp|gif|bmp|svg|avif)(?:[?#].*)?$/i;

function toFileUrl(pathValue: string): string {
    const normalized = String(pathValue || '').trim().replace(/\\/g, '/');
    if (!normalized) return '';
    if (/^[a-zA-Z]:\//.test(normalized)) {
        return `file:///${encodeURI(normalized)}`;
    }
    return `file://${encodeURI(normalized)}`;
}

function toTauriAssetUrl(value: string): string {
    const candidate = extractLocalAssetPathCandidate(value);
    if (!candidate) return '';
    try {
        return convertFileSrc(candidate);
    } catch {
        return toFileUrl(candidate);
    }
}

function toLocalKnowledgeAssetUrl(value: string): string {
    const candidate = extractLocalAssetPathCandidate(value).replace(/\\/g, '/');
    const marker = '/knowledge/redbook/';
    const markerIndex = candidate.indexOf(marker);
    if (markerIndex < 0) return '';
    const relativeParts = candidate.slice(markerIndex + marker.length).split('/').filter(Boolean);
    const [entryId, ...assetParts] = relativeParts;
    if (!entryId || assetParts.length === 0) return '';
    return `http://127.0.0.1:23456/api/local/knowledge/${encodeURIComponent(entryId)}/asset/${assetParts.map(encodeURIComponent).join('/')}`;
}

export function resolveAssetUrl(value: string | null | undefined): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (isLocalAssetSource(raw)) {
        if (typeof window !== 'undefined' && window.__RED_ELECTRON_IPC__) {
            return coerceToRedboxAssetUrl(raw) || raw;
        }
        if (isLocalBrowserPreview()) {
            return toLocalKnowledgeAssetUrl(raw) || raw;
        }
        return toTauriAssetUrl(raw) || raw;
    }
    if (SAFE_RENDERABLE_PROTOCOL.test(raw)) return raw;
    return raw;
}

export function hasRenderableAssetUrl(value: string | null | undefined): boolean {
    const raw = String(value || '').trim();
    if (!raw) return false;
    if (/^javascript:/i.test(raw)) return false;
    if (SAFE_RENDERABLE_PROTOCOL.test(raw)) return true;
    if (isLocalAssetSource(raw)) return true;
    return IMAGE_FILE_HINT.test(raw);
}

export function isLocalAssetUrl(value: string | null | undefined): boolean {
    return isLocalAssetSource(String(value || '').trim());
}
