function updateIcon(isEnabled) {
  const path = isEnabled ? "/icons/logo.png" : "/icons/logo_disabled.png";
  chrome.action.setIcon({ path: path });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['isEnabled'], (result) => {
    const isEnabled = result.isEnabled !== false;
    updateIcon(isEnabled);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['isEnabled'], (result) => {
    const isEnabled = result.isEnabled !== false;
    updateIcon(isEnabled);
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.isEnabled) {
    updateIcon(changes.isEnabled.newValue);
  }
});
