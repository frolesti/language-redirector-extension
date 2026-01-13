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
      
      // Helper to render the list of excluded domains
      function renderExclusionsList(list) {
          const ul = document.getElementById('excludedList');
          if (!ul) return;
          ul.innerHTML = '';
          
          if (!list || list.length === 0) {
              const li = document.createElement('li');
              li.textContent = "{{NO_EXCLUSIONS_TEXT}}";
              li.style.fontStyle = 'italic';
              li.style.color = '#999';
              ul.appendChild(li);
              return;
          }

          list.forEach(domain => {
              const li = document.createElement('li');
              li.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px dotted #ccc;";
              
              const span = document.createElement('span');
              span.textContent = domain;
              
              const btn = document.createElement('button');
              btn.textContent = '✕';
              // Reset global button styles and apply custom minimalist style
              btn.style.cssText = "width: auto; margin: 0; border: none; background: transparent; color: #aaa; cursor: pointer; font-weight: bold; padding: 2px 8px; font-size: 1.1em; line-height: 1; margin-left: auto; transition: color 0.2s;";
              btn.title = "Eliminar";
              
              btn.onmouseover = () => btn.style.color = '#d9534f';
              btn.onmouseout = () => btn.style.color = '#aaa';

              btn.onclick = (e) => {
                  e.preventDefault();
                  // Remove this domain
                  chrome.storage.local.get(['excludedDomains'], (r3) => {
                      const oldList = r3.excludedDomains || [];
                      const newList = oldList.filter(d => d !== domain);
                      chrome.storage.local.set({ excludedDomains: newList }, () => {
                          renderExclusionsList(newList);
                          // Update checkbox if the removed domain is current
                          if (domainLabel.textContent === domain) {
                              excludeCheckbox.checked = false;
                          }
                      });
                  });
              };

              li.appendChild(span);
              li.appendChild(btn);
              ul.appendChild(li);
          });
      }

      // Helper to calculate effective/root domain
      function getEffectiveDomain(hostname) {
          const parts = hostname.split('.');
          if (parts.length <= 2) return hostname;
          
          const tld = parts[parts.length - 1];
          const secondLast = parts[parts.length - 2];
          
          // Generic TLDs where we always crave just 2 parts (example.com, example.cat)
          const genericTLDs = ['com', 'org', 'net', 'int', 'edu', 'gov', 'mil', 'cat', 'eu', 'info', 'io', 'ai', 'app', 'dev', 'biz', 'name', 'xyz', 'online', 'site', 'tech', 'store'];
          
          if (genericTLDs.includes(tld)) {
              return parts.slice(-2).join('.');
          }
          
          // ccTLDs logic (e.g. .uk, .jp, .es)
          // If the second level is short (like co.uk, com.es, gob.es), we likely have a 3-part domain.
          // Heuristic: if 2nd part is <= 3 chars, assume it's a SLD (Second Level Domain), so take 3 parts.
          if (secondLast.length <= 3) {
             return parts.slice(-3).join('.');
          }
          
          // Otherwise (e.g. google.es), take 2 parts.
          return parts.slice(-2).join('.');
      }

      // Initial load of the list
      renderExclusionsList(result.excludedDomains || []);

      // Get current tab domain
      // Use currentWindow: true for standard popup behavior.
      // Permissions (tabs + <all_urls>) should ensure we get the URL.
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
              domainLabel.textContent = "Error: " + chrome.runtime.lastError.message;
              return;
          }

          if (tabs && tabs[0] && tabs[0].url) {
              try {
                  const url = new URL(tabs[0].url);
                  let hostname = url.hostname;
                  
                  // START EDIT: Use Effective Domain
                  hostname = getEffectiveDomain(hostname);
                  // END EDIT
                  
                  // Ignore if it's not strictly a web page (e.g. settings, extensions, internal)
                  if (!hostname || url.protocol === 'chrome:' || url.protocol === 'edge:' || url.protocol === 'about:' || url.protocol === 'moz-extension:') {
                      excludeCheckbox.disabled = true;
                      domainLabel.textContent = "Pàgina no vàlida";
                      return;
                  }

                  excludeCheckbox.disabled = false;
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
                              renderExclusionsList(newList); // Update list UI
                          });
                      });
                  });

              } catch (e) {
                  console.error("Invalid URL", e);
                  excludeCheckbox.disabled = true;
              }
          } else {
              excludeCheckbox.disabled = true;
              domainLabel.textContent = "No s'ha detectat cap web";
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
