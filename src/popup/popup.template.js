document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma en instal·lar/obrir
  chrome.storage.sync.set({ preferredLanguage: '{{PREFERRED_LANGUAGE}}' });

  // Botó de donació
  const donateBtn = document.getElementById('donate');
  if (donateBtn) {
    donateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://frolesti.aixeta.cat/ca' });
    });
  }

  // Botó de reportar error
  const reportBtn = document.getElementById('report');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      chrome.tabs.update({ url: 'mailto:frolesti4@gmail.com?subject={{REPORT_SUBJECT}}' });
    });
  }
});
