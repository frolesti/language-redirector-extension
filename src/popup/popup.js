document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('language');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  // Populate dropdown
  if (typeof languages !== 'undefined') {
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = `${lang.name} (${lang.code})`;
      langSelect.appendChild(option);
    });
  }

  // Carregar configuració actual
  chrome.storage.sync.get(['preferredLanguage'], (result) => {
    langSelect.value = result.preferredLanguage || 'ca';
  });

  // Guardar configuració
  saveBtn.addEventListener('click', () => {
    const lang = langSelect.value;
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