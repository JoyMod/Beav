export const PLUGIN_DIAGNOSTICS_QUEUE_KEY = 'redboxPluginDiagnosticsQueue';
export const PLUGIN_DIAGNOSTICS_RECENT_KEY = 'redboxPluginDiagnosticsRecent';
export const PLUGIN_DIAGNOSTICS_RETRY_ALARM = 'redbox-plugin-diagnostics-retry';
export const PLUGIN_FEEDBACK_ENDPOINT = '';

export async function reportPluginError(error, options = {}) {
  void error;
  void options;
  return { success: true, skipped: true, reason: 'local_only', queued: 0 };
}

export async function drainPluginDiagnostics() {
  const stored = await chrome.storage.local.get([PLUGIN_DIAGNOSTICS_QUEUE_KEY]);
  const dropped = Array.isArray(stored?.[PLUGIN_DIAGNOSTICS_QUEUE_KEY])
    ? stored[PLUGIN_DIAGNOSTICS_QUEUE_KEY].length
    : 0;
  await chrome.storage.local.set({
    [PLUGIN_DIAGNOSTICS_QUEUE_KEY]: [],
    [PLUGIN_DIAGNOSTICS_RECENT_KEY]: {},
  });
  await chrome.alarms.clear(PLUGIN_DIAGNOSTICS_RETRY_ALARM).catch(() => {});
  return { success: true, sent: 0, dropped, queued: 0, reason: 'local_only' };
}
