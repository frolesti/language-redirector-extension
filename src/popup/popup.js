document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma en instalÂ·lar/obrir (nomÃ©s si no estÃ  definit)
  chrome.storage.sync.get(['preferredLanguage', 'isEnabled'], (result) => {
      if (!result.preferredLanguage) {
          chrome.storage.sync.set({ preferredLanguage: 'eu' });
      }
      
      // GestiÃ³ del toggle
      const toggle = document.getElementById('toggleExtension');
      const label = document.getElementById('toggleLabel');
      
      // Estat inicial (per defecte activat si no existeix)
      const isEnabled = result.isEnabled !== false; 
      toggle.checked = isEnabled;
      updateLabel(isEnabled);

      toggle.addEventListener('change', () => {
          const newState = toggle.checked;
          chrome.storage.sync.set({ isEnabled: newState });
          updateLabel(newState);
      });

      function updateLabel(state) {
          // Aquests textos es reemplaÃ§aran pel build script, perÃ² necessitem lÃ²gica JS per canviar-los dinÃ micament
          // Com que el template Ã©s estÃ tic, farem servir atributs de dades o variables globals injectades
          // Per simplificar, farem servir els textos injectats directament aquÃ­ si Ã©s possible, 
          // o millor, definim els textos en variables al principi del fitxer.
          
          // SoluciÃ³: El build script reemplaÃ§arÃ  aquestes constants
          const textEnabled = "Aktibatuta";
          const textDisabled = "Desaktibatuta";
          label.textContent = state ? textEnabled : textDisabled;
          label.style.color = state ? '#2196F3' : '#777';
      }
  });

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

