document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma a gallec en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'gl' });

  // Botó de donació
  const donateBtn = document.getElementById('donate');
  if (donateBtn) {
    donateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.aixeta.cat/' });
    });
  }
});