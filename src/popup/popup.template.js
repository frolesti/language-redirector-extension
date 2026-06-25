document.addEventListener('DOMContentLoaded', () => {
  // Check both extension state and excluded domains
  chrome.storage.local.get(['preferredLanguage', 'isEnabled', 'excludedDomains'], (result) => {
      if (chrome.runtime.lastError) {
        // console.error('Error storage:', chrome.runtime.lastError);
        return;
      }

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
          const textEnabled = "{{ENABLE_TEXT}}";
          const textDisabled = "{{DISABLE_TEXT}}";
          label.textContent = state ? textEnabled : textDisabled;
          label.style.color = state ? '#F2EB6B' : 'rgba(255,255,255,0.45)';
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
                              // console.log('Updated excluded domains:', newList);
                              renderExclusionsList(newList); // Update list UI
                          });
                      });
                  });

              } catch (e) {
                  // console.error("Invalid URL", e);
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
      chrome.tabs.create({ url: 'mailto:suport.encatala@gmail.com?subject={{REPORT_SUBJECT}}' });
    });
  }

  // --- BROWSER LANGUAGE CHECK (Digital Activism) ---
  // We can only directly read Chrome's accept-languages list. The Google
  // Account language is a separate setting that the extension cannot read
  // (no OAuth scopes here), so we show it as "unknown" and link the user
  // to the right settings page.
  chrome.storage.local.get(['langWarnMinimized'], (storageResult) => {
    const isMinimized = storageResult.langWarnMinimized === true;

    chrome.i18n.getAcceptLanguages((languages) => {
        const targetLang = '{{PREFERRED_LANGUAGE}}';
        if (!languages || languages.length === 0) return;

        const firstLang = languages[0].toLowerCase();
        const browserOk = firstLang.startsWith(targetLang);

        // Update the "detected" labels regardless of state — useful when expanded.
        const browserDetectedEl = document.getElementById('langBrowserDetected');
        const accountDetectedEl = document.getElementById('langAccountDetected');
        if (browserDetectedEl) {
            browserDetectedEl.textContent = languages.join(', ');
            browserDetectedEl.classList.toggle('lang-ok', browserOk);
            browserDetectedEl.classList.toggle('lang-bad', !browserOk);
        }
        if (accountDetectedEl) {
            // We genuinely cannot read this; tell the user honestly.
            accountDetectedEl.textContent = 'cal comprovar-ho manualment';
        }

        // Only show the warning when the browser's first language doesn't match.
        if (browserOk) return;

        const container = document.getElementById('langWarningContainer');
        const contentBox = document.getElementById('langWarningContent');
        const minimizedBox = document.getElementById('langWarningMinimized');

        if (!container || !contentBox || !minimizedBox) return;

        container.style.display = 'block';

        const setUIState = (minimized) => {
            if (minimized) {
                contentBox.style.display = 'none';
                minimizedBox.style.display = 'block';
            } else {
                contentBox.style.display = 'block';
                minimizedBox.style.display = 'none';
            }
        };

        setUIState(isMinimized);

        const closeBtn = document.getElementById('closeLangWarning');
        if (closeBtn) {
            closeBtn.onclick = () => {
                setUIState(true);
                chrome.storage.local.set({ langWarnMinimized: true });
            };
        }

        minimizedBox.onclick = () => {
            setUIState(false);
            chrome.storage.local.set({ langWarnMinimized: false });
        };

        // Wire up links. chrome:// URLs cannot be opened via a normal
        // anchor click, so we intercept and use chrome.tabs.create.
        const moreInfoLink = document.getElementById('langMoreInfoLink');
        const fixBrowserLink = document.getElementById('langFixBrowserLink');
        const fixAccountLink = document.getElementById('langFixAccountLink');

        // Per-browser settings URL. Detect by user agent. Firefox/Safari
        // do not allow opening internal pages from extensions, so we fall
        // back to a help URL.
        function getBrowserLangSettingsUrl() {
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('firefox')) {
                return 'about:preferences#general';
            }
            if (ua.includes('edg/') || ua.includes('edge/')) {
                return 'edge://settings/languages';
            }
            if (ua.includes('opr/') || ua.includes('opera')) {
                return 'opera://settings/languages';
            }
            // Chrome, Brave, Ecosia, Vivaldi, etc.
            return 'chrome://settings/languages';
        }

        function openInternal(url) {
            // chrome.tabs.create supports chrome://, edge://, about:, etc.
            chrome.tabs.create({ url });
        }

        if (targetLang === 'ca') {
            if (moreInfoLink) {
                moreInfoLink.href = 'https://configura.cat/';
                moreInfoLink.target = '_blank';
            }
        } else if (moreInfoLink) {
            moreInfoLink.style.display = 'none';
        }

        if (fixBrowserLink) {
            fixBrowserLink.href = '#';
            fixBrowserLink.addEventListener('click', (e) => {
                e.preventDefault();
                openInternal(getBrowserLangSettingsUrl());
            });
        }

        if (fixAccountLink) {
            fixAccountLink.href = '#';
            fixAccountLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Google Account language settings (works for any logged-in
                // Google account). Opens in a new tab.
                chrome.tabs.create({ url: 'https://myaccount.google.com/language' });
            });
        }
    });
  });

});
