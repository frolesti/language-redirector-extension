document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma a català en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'ca' });

  // Botó de donació
  const donateBtn = document.getElementById('donate');
  if (donateBtn) {
    donateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.aixeta.cat/' });
    });
  }
});