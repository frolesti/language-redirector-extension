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

  // Botó de reportar error.
  // Use Gmail's compose URL directly instead of mailto: — many browsers no
  // longer have a default mail handler registered, so a plain mailto: opens
  // an empty tab. The Gmail composer works regardless of OS/browser config
  // for any user logged into a Google account (our main audience).
  const reportBtn = document.getElementById('report');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      const to = 'suport.encatala@gmail.com';
      const subject = '{{REPORT_SUBJECT}}';
      const composeUrl = 'https://mail.google.com/mail/?view=cm&fs=1'
        + '&to=' + encodeURIComponent(to)
        + '&su=' + encodeURIComponent(subject);
      chrome.tabs.create({ url: composeUrl });
    });
  }

    // --- BROWSER LANGUAGE CHECK (Digital Activism) ---
    // We can reliably detect the browser language, but not the Google account
    // language without extra auth/API work. So the popup shows:
    // - Browser warning only when the browser is not configured in Catalan.
    // - Google warning only on Chrome builds (always visible there).
  chrome.storage.local.get(['langWarnMinimized', 'googleWarnMinimized'], (storageResult) => {
    const browserWarnMinimized = storageResult.langWarnMinimized === true;
    const googleWarnMinimized = storageResult.googleWarnMinimized === true;

    chrome.i18n.getAcceptLanguages((languages) => {
        const buildBrowser = '{{BROWSER_NAME}}';
        const isChromeBuild = buildBrowser === 'chrome';
        const targetLang = '{{PREFERRED_LANGUAGE}}';
        if (!languages || languages.length === 0) return;

        const firstLang = languages[0].toLowerCase();
        const browserNeedsFix = !firstLang.startsWith(targetLang);

        function languageCodeToName(code) {
            const normalized = code.toLowerCase();
            if (normalized.startsWith('ca')) return 'català';
            if (normalized.startsWith('es')) return 'espanyol';
            if (normalized.startsWith('en')) return 'anglès';
            if (normalized.startsWith('gl')) return 'gallec';
            if (normalized.startsWith('eu')) return 'basc';
            if (normalized.startsWith('fr')) return 'francès';
            if (normalized.startsWith('pt')) return 'portuguès';
            return normalized;
        }

        function buildLanguageSentence(list) {
            const names = list.map(languageCodeToName);
            if (names.length === 1) return names[0];
            if (names.length === 2) return names[0] + ' i ' + names[1];
            return names.slice(0, -1).join(', ') + ' i ' + names[names.length - 1];
        }

        function getBrowserLangSettingsUrl(browser) {
            switch ((browser || '').toLowerCase()) {
                case 'chrome':  return 'chrome://settings/languages';
                case 'edge':    return 'edge://settings/languages';
                case 'brave':   return 'brave://settings/languages';
                case 'opera':   return 'opera://settings/languages';
                case 'ecosia':  return 'chrome://settings/languages';
                case 'firefox': return 'about:preferences#general';
                case 'safari':  return 'https://support.apple.com/guide/safari/change-the-language-ibrw1001/mac';
                default:        return 'chrome://settings/languages';
            }
        }

        function getBrowserDisplayName(browser) {
            switch ((browser || '').toLowerCase()) {
                case 'chrome':  return 'Chrome';
                case 'edge':    return 'Edge';
                case 'brave':   return 'Brave';
                case 'opera':   return 'Opera';
                case 'ecosia':  return 'Ecosia';
                case 'firefox': return 'Firefox';
                case 'safari':  return 'Safari';
                default:        return 'el navegador';
            }
        }

        const browserContainer = document.getElementById('browserWarningContainer');
        const browserContent = document.getElementById('browserWarningContent');
        const browserMinimized = document.getElementById('browserWarningMinimized');
        const browserClose = document.getElementById('closeBrowserWarning');
        const browserDetected = document.getElementById('browserDetectedLang');
        const browserFixLink = document.getElementById('langFixBrowserLink');
        const browserWarningText = document.getElementById('browserWarningText');

        if (browserContainer && browserContent && browserMinimized) {
            if (browserNeedsFix) {
                browserContainer.style.display = 'block';
                browserContent.style.display = browserWarnMinimized ? 'none' : 'block';
                browserMinimized.style.display = browserWarnMinimized ? 'block' : 'none';

                if (browserWarningText) {
                    browserWarningText.textContent = 'L\'idioma principal del teu navegador no és el català.';
                }
                if (browserDetected) {
                    browserDetected.textContent = 'Idiomes detectats al navegador: ' + buildLanguageSentence(languages);
                }

                if (browserClose) {
                    browserClose.onclick = () => {
                        browserContent.style.display = 'none';
                        browserMinimized.style.display = 'block';
                        chrome.storage.local.set({ langWarnMinimized: true });
                    };
                }

                browserMinimized.onclick = () => {
                    browserContent.style.display = 'block';
                    browserMinimized.style.display = 'none';
                    chrome.storage.local.set({ langWarnMinimized: false });
                };

                if (browserFixLink) {
                    const browserSettingsUrl = getBrowserLangSettingsUrl(buildBrowser);
                    browserFixLink.title = 'Obre la configuració d\'idioma de ' + getBrowserDisplayName(buildBrowser);
                    browserFixLink.setAttribute('aria-label', browserFixLink.title);
                    browserFixLink.onclick = (ev) => {
                        ev.preventDefault();
                        if (browserSettingsUrl.startsWith('http')) {
                            chrome.tabs.create({ url: browserSettingsUrl });
                        } else {
                            // chrome://, edge://, about:, brave://, opera://
                            // anchor href can't navigate to these; use tabs API
                            chrome.tabs.create({ url: browserSettingsUrl });
                        }
                    };
                }
            } else {
                browserContainer.style.display = 'none';
            }
        }

        const googleContainer = document.getElementById('googleWarningContainer');
        const googleContent = document.getElementById('googleWarningContent');
        const googleMinimized = document.getElementById('googleWarningMinimized');
        const googleClose = document.getElementById('closeGoogleWarning');
        const googleFixLink = document.getElementById('langFixAccountLink');
        const googleWarningText = document.getElementById('googleWarningText');

        if (googleContainer && googleContent && googleMinimized) {
            if (isChromeBuild && targetLang === 'ca') {
                googleContainer.style.display = 'block';
                googleContent.style.display = googleWarnMinimized ? 'none' : 'block';
                googleMinimized.style.display = googleWarnMinimized ? 'block' : 'none';

                if (googleWarningText) {
                    googleWarningText.textContent = 'Revisa l\'idioma del teu compte de Google.';
                }

                if (googleClose) {
                    googleClose.onclick = () => {
                        googleContent.style.display = 'none';
                        googleMinimized.style.display = 'block';
                        chrome.storage.local.set({ googleWarnMinimized: true });
                    };
                }

                googleMinimized.onclick = () => {
                    googleContent.style.display = 'block';
                    googleMinimized.style.display = 'none';
                    chrome.storage.local.set({ googleWarnMinimized: false });
                };

                if (googleFixLink) {
                    googleFixLink.href = 'https://myaccount.google.com/language';
                    googleFixLink.target = '_blank';
                    googleFixLink.rel = 'noopener';
                }
            } else {
                googleContainer.style.display = 'none';
            }
        }
    });
  });

});
