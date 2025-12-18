document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma a gallec en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'gl' });
});