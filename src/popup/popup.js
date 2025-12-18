document.addEventListener('DOMContentLoaded', () => {
  const langInput = document.getElementById('language');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  // Carregar configuració actual
  chrome.storage.sync.get(['preferredLanguage'], (result) => {
    langInput.value = result.preferredLanguage || 'ca';
  });

  // Guardar configuració
  saveBtn.addEventListener('click', () => {
    const lang = langInput.value.trim().toLowerCase();
    if (lang) {
      chrome.storage.sync.set({ preferredLanguage: lang }, () => {
        status.textContent = 'Configuració guardada!';
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
      });
    }
  });
});