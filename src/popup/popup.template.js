document.addEventListener('DOMContentLoaded', () => {
  // Forcem l'idioma en instal·lar/obrir (només si no està definit)
  chrome.storage.local.get(['preferredLanguage', 'isEnabled'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error storage:', chrome.runtime.lastError);
        result = {}; // Fallback
      }
      result = result || {};

      if (!result.preferredLanguage) {
          chrome.storage.local.set({ preferredLanguage: '{{PREFERRED_LANGUAGE}}' });
      }
      
      // Gestió del toggle
      const toggle = document.getElementById('toggleExtension');
      const label = document.getElementById('toggleLabel');
      
      // Estat inicial (per defecte activat si no existeix)
      const isEnabled = result.isEnabled !== false; 
      toggle.checked = isEnabled;
      updateLabel(isEnabled);

      toggle.addEventListener('change', () => {
          const newState = toggle.checked;
          chrome.storage.local.set({ isEnabled: newState });
          updateLabel(newState);
          
          // Update icon immediately
          const iconPath = newState ? "/icons/logo.png" : "/icons/logo_disabled.png";
          const actionAPI = chrome.action || chrome.browserAction;
          if (actionAPI) {
            actionAPI.setIcon({ path: iconPath });
          }
      });

      function updateLabel(state) {
          // Aquests textos es reemplaçaran pel build script, però necessitem lògica JS per canviar-los dinàmicament
          // Com que el template és estàtic, farem servir atributs de dades o variables globals injectades
          // Per simplificar, farem servir els textos injectats directament aquí si és possible, 
          // o millor, definim els textos en variables al principi del fitxer.
          
          // Solució: El build script reemplaçarà aquestes constants
          const textEnabled = "{{ENABLE_TEXT}}";
          const textDisabled = "{{DISABLE_TEXT}}";
          label.textContent = state ? textEnabled : textDisabled;
          label.style.color = state ? '#D81E05' : '#777';
      }
  });

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
      chrome.tabs.create({ url: 'mailto:frolesti4@gmail.com?subject={{REPORT_SUBJECT}}' });
    });
  }
});
