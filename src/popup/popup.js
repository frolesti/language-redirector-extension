document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma a català en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'ca' });
});