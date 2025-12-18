document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma a euskera en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'eu' });

  // Botó de donació
  const donateBtn = document.getElementById('donate');
  if (donateBtn) {
    donateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.aixeta.cat/' });
    });
  }
});