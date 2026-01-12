function updateIcon(isEnabled) {
  const path = isEnabled ? "/icons/logo.png" : "/icons/logo_disabled.png";
  chrome.action.setIcon({ path: path });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['isEnabled'], (result) => {
    if (chrome.runtime.lastError) return; // Ignorar errors
    const isEnabled = result && result.isEnabled !== false;
    updateIcon(isEnabled);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['isEnabled'], (result) => {
    if (chrome.runtime.lastError) return;
    const isEnabled = result && result.isEnabled !== false;
    updateIcon(isEnabled);
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.isEnabled) {
    updateIcon(changes.isEnabled.newValue);
  }
});
