document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma en instalÂ·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: 'eu' });

  // BotÃ³ de donaciÃ³
  const donateBtn = document.getElementById('donate');
  if (donateBtn) {
    donateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://frolesti.aixeta.cat/ca' });
    });
  }

  // BotÃ³ de reportar error
  const reportBtn = document.getElementById('report');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      chrome.tabs.update({ url: 'mailto:frolesti4@gmail.com?subject=Errorea%20-%20Euskaraz%20Mesedez' });
    });
  }
});

