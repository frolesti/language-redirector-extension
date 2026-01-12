document.addEventListener('DOMContentLoaded', () => {
  // Check both extension state and excluded domains
  chrome.storage.local.get(['preferredLanguage', 'isEnabled', 'excludedDomains'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error storage:', chrome.runtime.lastError);
        result = {}; // Fallback
      }
      result = result || {};

      if (!result.preferredLanguage) {
          chrome.storage.local.set({ preferredLanguage: '{{PREFERRED_LANGUAGE}}' });
      }
      
      // --- MAIN TOGGLE LOGIC ---
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

      // --- EXCLUSION LOGIC ---
      const excludeCheckbox = document.getElementById('excludeDomain');
      const domainLabel = document.getElementById('domainName');
      
      // Get current tab domain
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].url) {
              try {
                  const url = new URL(tabs[0].url);
                  // We use hostname (subdomain.domain.com) or just domain?
                  // Let's use hostname to be safe and specific.
                  const hostname = url.hostname;
                  
                  // Ignore if it's not strictly a web page (e.g. settings, extensions, internal)
                  if (!hostname || url.protocol === 'chrome:' || url.protocol === 'edge:' || url.protocol === 'about:') {
                      excludeCheckbox.disabled = true;
                      domainLabel.textContent = "Pàgina no vàlida";
                      return;
                  }

                  domainLabel.textContent = hostname;
                  const excludedList = result.excludedDomains || [];
                  excludeCheckbox.checked = excludedList.includes(hostname);

                  excludeCheckbox.addEventListener('change', () => {
                      // Re-read storage to avoid race conditions
                      chrome.storage.local.get(['excludedDomains'], (r2) => {
                          const currentList = r2.excludedDomains || [];
                          let newList;
                          
                          if (excludeCheckbox.checked) {
                              // Add if not present
                              if (!currentList.includes(hostname)) {
                                  newList = [...currentList, hostname];
                              } else {
                                  newList = currentList;
                              }
                          } else {
                              // Remove
                              newList = currentList.filter(d => d !== hostname);
                          }
                          
                          chrome.storage.local.set({ excludedDomains: newList }, () => {
                              console.log('Updated excluded domains:', newList);
                              // Optional: reloading the tab might be annoyance, so we just save.
                              // If user wants to see changes, they will reload.
                          });
                      });
                  });

              } catch (e) {
                  console.error("Invalid URL", e);
                  excludeCheckbox.disabled = true;
              }
          } else {
              excludeCheckbox.disabled = true;
          }
      });
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
