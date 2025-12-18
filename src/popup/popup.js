document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma a euskera en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'eu' });
});