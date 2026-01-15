// src/content.js

function checkAndRedirect(attempt = 1) {
  // Recuperem l'estat d'activació i la llista d'exclusions
  chrome.storage.local.get(['isEnabled', 'excludedDomains'], function(result) {
    // Gestió d'errors de lectura (defensa contra errors a Firefox)
    if (chrome.runtime.lastError) {
      console.warn('Auto Language Redirector: Error llegint configuració:', chrome.runtime.lastError);
      // Si falla, continuem assumint que està activat
      result = { isEnabled: true, excludedDomains: [] };
    }
    
    // Si result és undefined per algun motiu estrany
    if (!result) {
      result = { isEnabled: true, excludedDomains: [] };
    }

    // 0. CHECK EXCLUSIONS
    const hostname = window.location.hostname;
    const excludedList = result.excludedDomains || [];
    
    // Check if hostname matches any excluded domain (exact match or subdomain)
    // Example: if 'wikipedia.org' is excluded, 'es.wikipedia.org' (endsWith .wikipedia.org) should be skipped.
    const isExcluded = excludedList.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
    );

    if (isExcluded) {
        console.log(`Auto Language Redirector: Domain ${hostname} is excluded (matched: ${excludedList.find(d => hostname === d || hostname.endsWith('.' + d))}). Skipping.`);
        return;
    }

    // Si està desactivat explícitament, no fem res
    if (result.isEnabled === false) {
        console.log('Auto Language Redirector: Extensió desactivada per l\'usuari.');
        return;
    }

    // --- SAFETY CHECK: LOOP DETECTION ---
    const MAX_REDIRECTS = 3;
    const TIME_WINDOW = 10000; // 10 seconds
    const STORAGE_KEY_COUNT = 'alr_redirect_count';
    const STORAGE_KEY_TIME = 'alr_last_redirect_time';

    const now = Date.now();
    let redirectCount = parseInt(sessionStorage.getItem(STORAGE_KEY_COUNT) || '0');
    const lastRedirectTime = parseInt(sessionStorage.getItem(STORAGE_KEY_TIME) || '0');

    // Reset count if time window passed
    if (now - lastRedirectTime > TIME_WINDOW) {
        redirectCount = 0;
        sessionStorage.setItem(STORAGE_KEY_COUNT, '0');
    }

    if (redirectCount >= MAX_REDIRECTS) {
        console.log('Auto Language Redirector: Too many redirects detected. Pausing for safety.');
        
        // Show UI Warning
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 999999;
            font-family: sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        warningDiv.innerHTML = `
            <strong>⚠️ {{NAME}}</strong><br>
            S'han detectat massa redireccions.<br>
            L'extensió s'ha aturat temporalment en aquesta pàgina per evitar problemes.<br>
            <button style="margin-top:10px; float:right; cursor:pointer; background:transparent; border:none; color:#856404; font-weight:bold;">✕ Tancar</button>
        `;
        
        warningDiv.querySelector('button').onclick = () => warningDiv.remove();
        document.body.appendChild(warningDiv);
        
        return;
    }
    // ------------------------------------

    // L'idioma ve definit pel build (hardcoded per a cada versió de l'extensió)
    const preferredLang = '{{PREFERRED_LANGUAGE}}';
    console.log(`Auto Language Redirector (Attempt ${attempt}): Preferred=${preferredLang}`);

    // Obtenim l'idioma actual de la pàgina (atribut lang del tag html)
    const currentLang = document.documentElement.lang || '';

    // normalitzem per comparar
    const simplePreferred = preferredLang.split('-')[0].toLowerCase();
    const simpleCurrent = currentLang.split('-')[0].toLowerCase();

    // Check False Positives (Irisana.com case):
    // If URL already contains the preferred language segment but content is NOT in that language.
    // This implies the site is broken or serverside redirected back to wrong content.
    // We should STOP to avoid loops.
    const urlHasLang = window.location.pathname.split('/').map(s => s.toLowerCase()).includes(simplePreferred);
    if (urlHasLang && simpleCurrent !== simplePreferred) {
         console.log('Auto Language Redirector: URL contains preferred lang but content does not. Site might be misconfigured. Stopping to avoid loop.');
         return;
    }

    // Si ja estem en l'idioma preferit, no fem res.
    if (simpleCurrent === simplePreferred) {
        console.log('Auto Language Redirector: Already in preferred language.');
        return;
    }

    let targetUrl = null;

    // Helper function to find target URL
    function findTargetUrl() {
        let url = null;

        // 0. Custom Rules (Specific Sites)
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        // LA VANGUARDIA (Homepage ONLY)
        // Articles use different IDs (e.g., 11429543 vs 11429700) and translated slugs.
        // There are no 'hreflang' tags and no direct links in the DOM to the translated article.
        // Therefore, we can ONLY safe-redirect the homepage.
        if (hostname.includes('lavanguardia.com') && (pathname === '/' || pathname === '/index.html' || pathname === '')) {
            // Ensure we don't loop if we are already there (though 'encatala' changes pathname)
            url = 'https://www.lavanguardia.com/encatala';
        }

        // 1. Strategy Hreflang (Head)
        const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
        alternates.forEach(link => {
            const hreflang = link.getAttribute('hreflang').toLowerCase();
            if (hreflang === preferredLang.toLowerCase() || hreflang.startsWith(preferredLang.toLowerCase() + '-')) {
                url = link.href;
            }
        });

        if (url) {
            // Increment redirect count before redirecting
            sessionStorage.setItem(STORAGE_KEY_COUNT, (redirectCount + 1).toString());
            sessionStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
            return url;
        }

        // 1.5. Strategy Anchor Hreflang (Body)
        const anchorAlternates = document.querySelectorAll('a[hreflang]');
        anchorAlternates.forEach(link => {
            const hreflang = link.getAttribute('hreflang').toLowerCase();
            if (hreflang === preferredLang.toLowerCase() || hreflang.startsWith(preferredLang.toLowerCase() + '-')) {
                url = link.href;
            }
        });
        
        if (url) {
            // Increment redirect count before redirecting
            sessionStorage.setItem(STORAGE_KEY_COUNT, (redirectCount + 1).toString());
            sessionStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
            return url;
        }
        
        // 1.6. Strategy Anchor Lang (Body) - Restricted
        // Only if text content matches language code or name, or class indicates language switcher
        const langAnchors = document.querySelectorAll('a[lang]');
        langAnchors.forEach(link => {
             const langAttr = link.getAttribute('lang').toLowerCase();
             if (langAttr === preferredLang.toLowerCase() || langAttr.startsWith(preferredLang.toLowerCase() + '-')) {
                 // Check if it looks like a switcher
                 const text = link.textContent.trim().toLowerCase();
                 // Common language names and codes
                 const validTexts = ['eu', 'es', 'en', 'ca', 'gl', 'euskara', 'español', 'english', 'català', 'galego', 'eus', 'cat', 'gal'];
                 
                 if (validTexts.includes(text) || link.className.toLowerCase().includes('lang') || link.className.toLowerCase().includes('switcher')) {
                     url = link.href;
                 }
             }
        });

        // 1.7. Strategy Text Content (Fallback for missing metadata)
        // Busca enllaços que es diguin exactament "Català", "Galego", etc.
        // MODIFICAT: Prioritzem "Català" per sobre de "Valencià" si tots dos existeixen.
        if (!url) {
             const allLinks = document.querySelectorAll('a');
             
             let highPriorityTexts = [];
             let lowPriorityTexts = [];

             if (simplePreferred === 'ca') {
                 highPriorityTexts = ['català', 'cat'];
                 lowPriorityTexts = ['valencià'];
             } else if (simplePreferred === 'gl') {
                  highPriorityTexts = ['galego', 'gal'];
             } else if (simplePreferred === 'eu') {
                  highPriorityTexts = ['euskara', 'eus', 'euskera'];
             }

             const allTargetTexts = [...highPriorityTexts, ...lowPriorityTexts];
             let bestMatchUrl = null;
             let matchPriority = 0; // 0=none, 1=low, 2=high

             for (const link of allLinks) {
                 const text = link.textContent.trim().toLowerCase();
                 
                 // Evitem falsos positius verificant que el text sigui curt (només l'idioma)
                 if (allTargetTexts.includes(text)) {
                     if (link.href && !link.href.startsWith('javascript') && !link.href.includes('#')) {
                         
                         let currentPriority = 0;
                         if (highPriorityTexts.includes(text)) {
                             currentPriority = 2;
                         } else if (lowPriorityTexts.includes(text)) {
                             currentPriority = 1;
                         }

                         // Si trobem una coincidència millor que l'actual, l'agafem.
                         if (currentPriority > matchPriority) {
                             bestMatchUrl = link.href;
                             matchPriority = currentPriority;
                             
                             // Si ja hem trobat una de prioritat màxima (Català), parem. 
                             // Assumim que el primer "Català" que trobem és el bo (header sol anar abans que footer).
                             if (matchPriority === 2) {
                                 console.log(`Auto Language Redirector: Found HIGH PRIORITY link by text "${text}": ${link.href}`);
                                 break;
                             }
                             console.log(`Auto Language Redirector: Found LOW PRIORITY link by text "${text}": ${link.href}`);
                         }
                     }
                 }
             }

             if (bestMatchUrl) {
                 url = bestMatchUrl;
             }
        }

        return url;
    }

    targetUrl = findTargetUrl();

    // Helper: Show Notice with Home Link
    function showLanguageStructureNotice(homeLink) {
         // Check session key
         const NOTICE_KEY = 'alr_structure_notice_shown_' + window.location.hostname;
         if (sessionStorage.getItem(NOTICE_KEY)) return;

         const noticeDiv = document.createElement('div');
         noticeDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #e3f2fd;
                color: #0d47a1;
                border: 1px solid #90caf9;
                padding: 15px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 999999;
                font-family: sans-serif;
                font-size: 14px;
                max-width: 320px;
         `;
         noticeDiv.textContent = ''; // Clear content safely
         
         const title = document.createElement('strong');
         title.textContent = 'ℹ️ {{NAME}}';
         noticeDiv.appendChild(title);
         noticeDiv.appendChild(document.createElement('br'));
         
         const text1 = document.createTextNode("Sembla que la traducció d'aquest article/pàgina no està disponible directament.");
         noticeDiv.appendChild(text1);
         noticeDiv.appendChild(document.createElement('br'));
         
         const text2 = document.createTextNode("Pots provar de visitar la ");
         noticeDiv.appendChild(text2);
         
         const link = document.createElement('a');
         link.href = homeLink;
         link.style.color = '#0d47a1';
         link.style.textDecoration = 'underline';
         link.textContent = `Portada en ${preferredLang === 'ca' ? 'Català' : preferredLang.toUpperCase()}`;
         noticeDiv.appendChild(link);
         
         noticeDiv.appendChild(document.createElement('br'));

         const btn = document.createElement('button');
         btn.style.cssText = "margin-top:10px; float:right; cursor:pointer; background:transparent; border:none; color:#0d47a1; font-weight:bold;";
         btn.textContent = "✕ Tancar";
         btn.onclick = () => noticeDiv.remove();
         noticeDiv.appendChild(btn);
         
         document.body.appendChild(noticeDiv);
         sessionStorage.setItem(NOTICE_KEY, 'true');
    }

    // Specific alert for La Vanguardia Articles (Hardcoded rule)
    if (!targetUrl && window.location.hostname.includes('lavanguardia.com') && preferredLang === 'ca') {
         const path = window.location.pathname;
         if (path !== '/' && path !== '/index.html' && path !== '') {
            showLanguageStructureNotice('https://www.lavanguardia.com/encatala');
         }
    }

    // 2. Estratègia de Widgets JS (ex: Google Language Translator)
    // Alguns llocs (WordPress) fan servir plugins que no canvien la URL però usen cookies/JS.
    // Busquem elements amb classes típiques de plugins de traducció (ex: .nturl.ca)
    if (!targetUrl) {
        const widgetSelector = `a.nturl.${simplePreferred}, a.glt-elm.${simplePreferred}, a[data-lang="${simplePreferred}"]`;
        const widgetLink = document.querySelector(widgetSelector);

        if (widgetLink) {
            // Comprovem si ja s'ha aplicat la traducció via cookie (típic de Google Translate)
            // La cookie sol ser 'googtrans=/es/ca'
            const cookies = document.cookie;
            const isTranslated = cookies.includes('googtrans=') && cookies.includes(`/${simplePreferred}`);

            if (!isTranslated) {
                console.log('Auto Language Redirector: Widget detected. Clicking...');
                // Increment redirect count before clicking widget (which causes reload/redirect)
                sessionStorage.setItem(STORAGE_KEY_COUNT, (redirectCount + 1).toString());
                sessionStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
                
                widgetLink.click();
                return; // Sortim, ja que el click hauria de gestionar el canvi
            }
        }
    }

    // 3. Estratègia de Reemplaçament d'URL o Injecció de Prefix (Fallback)
    // Si no hem trobat hreflang ni widget, intentem deduir la URL.
    if (!targetUrl) {
        // EXCEPTION: Domains known to interpret '/ca/' as Canada (ISO 3166) instead of Catalan (ISO 639)
        // These sites have English/French content at /ca/ and should NOT be redirected to automatically if the user wants Catalan.
        const FALSE_FRIENDS_CA = ['filmaffinity.com', 'adobe.com', 'hp.com', 'dell.com', 'apple.com', 'microsoft.com', 'amazon.com', 'nike.com', 'mango.com', 'adidas.com', 'adidas.es', 'stradivarius.com', 'pullandbear.com', 'zara.com', 'bershka.com'];
        const isFalseFriend = simplePreferred === 'ca' && FALSE_FRIENDS_CA.some(domain => window.location.hostname.includes(domain));

        if (isFalseFriend) {
             console.log('Auto Language Redirector: Domain is a False Friend (uses /ca/ for Canada). Attempting Generalized Nested Strategy...');
             
             let nestedUrl = null;
             const currentPath = window.location.pathname;
             
             // GENERALIZED NESTED STRATEGY (e.g. /es/ -> /es/ca/)
             // Pattern: /{region_or_lang}/{lang}/ 
             // We look for the current path starting with a known major language code (es, en, fr)
             
             const pathParts = currentPath.split('/'); 
             const firstSegment = pathParts[1] ? pathParts[1].toLowerCase() : '';
             
             // If first segment is a 2-letter code AND not our target (e.g. 'es')
             if (firstSegment && firstSegment.length === 2 && firstSegment !== simplePreferred) {
                 const secondSegment = pathParts[2] ? pathParts[2].toLowerCase() : '';
                 
                 // If the second segment is SAME as first (e.g. /es/es like Mango), or just plain /es/...
                 // We want to inject 'ca' as the second segment.
                 // Case 1: /es/es -> we want /es/ca. (Replace second segment)
                 // Case 2: /es/any -> we want /es/ca/any. (Insert segment)
                 
                 const newParts = [...pathParts];
                 
                 if (secondSegment === firstSegment) {
                     // Mango style: /es/es -> /es/ca
                     newParts[2] = simplePreferred;
                 } else if (secondSegment !== simplePreferred) {
                     // Nike style: /es/products -> /es/ca/products
                     newParts.splice(2, 0, simplePreferred);
                 }
                 
                 const newPath = newParts.join('/');
                 if (newPath !== currentPath) {
                    const u = new URL(window.location.href);
                    u.pathname = newPath;
                    nestedUrl = u.href;
                    console.log(`Auto Language Redirector: Generalized Nested Strategy proposed: ${nestedUrl}`);
                 }
             }

             if (nestedUrl) {
                 // Verify URL before redirecting
                 fetch(nestedUrl, { method: 'HEAD', redirect: 'manual' })
                    .then(response => {
                        if (response.ok && response.status === 200) {
                             console.log(`Auto Language Redirector: Nested URL verified. Redirecting...`);
                             sessionStorage.setItem(STORAGE_KEY_COUNT, (redirectCount + 1).toString());
                             sessionStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
                             window.location.href = nestedUrl;
                        } else {
                             console.log('Auto Language Redirector: Nested URL invalid or redirecting. Skipping.');
                        }
                    }).catch(e => console.log('Verification failed', e));
             } else {
                console.log('Auto Language Redirector: No valid generalized nested path found for False Friend.');
             }
        } else {
            try {
                const currentUrl = new URL(window.location.href);
            const pathSegments = currentUrl.pathname.split('/');
            
            // Busquem si algun segment del path coincideix amb l'idioma actual (ex: 'es' o 'es-ES')
            const langIndex = pathSegments.findIndex(segment => 
                (currentLang && segment.toLowerCase() === currentLang.toLowerCase()) || 
                (simpleCurrent && segment.toLowerCase() === simpleCurrent)
            );

            let potentialUrl = null;

            if (langIndex !== -1) {
                // CAS A: Reemplaçament de segment complet (ex: /es/hola -> /ca/hola)
                pathSegments[langIndex] = simplePreferred;
                currentUrl.pathname = pathSegments.join('/');
                if (currentUrl.href !== window.location.href) {
                    potentialUrl = currentUrl.href;
                }
            } else {
                // CAS A.2: Reemplaçament dins del nom del fitxer (ex: index.es.html -> index.ca.html)
                // Això és típic de Booking.com i altres llocs estàtics.
                const newSegments = [...pathSegments];
                let changed = false;
                
                newSegments.forEach((segment, index) => {
                     // Busquem el patró .idioma. (ex: .es.)
                     if (simpleCurrent && segment.includes(`.${simpleCurrent}.`)) {
                         const newSegment = segment.replace(`.${simpleCurrent}.`, `.${simplePreferred}.`);
                         if (newSegment !== segment) {
                             newSegments[index] = newSegment;
                             changed = true;
                         }
                     }
                });

                if (changed) {
                    currentUrl.pathname = newSegments.join('/');
                    if (currentUrl.href !== window.location.href) {
                        potentialUrl = currentUrl.href;
                    }
                }

                // CAS B: Injecció de Prefix (ex: /hola -> /ca/hola)
                // DESACTIVAT: Aquesta estratègia és massa agressiva i trenca llocs com YouTube (ex: youtube.com/watch -> youtube.com/ca/watch).
                // Només farem servir reemplaçament si detectem un codi d'idioma existent a la URL.
                
                /*
                if (!potentialUrl && pathSegments[1] !== simplePreferred) {
                    const newPathSegments = ['', simplePreferred, ...pathSegments.slice(1)];
                    currentUrl.pathname = newPathSegments.join('/');
                    potentialUrl = currentUrl.href;
                }
                */
            }

            if (potentialUrl) {
                console.log('Auto Language Redirector: Deduced URL: ' + potentialUrl);
                
                // Verifiquem si la URL existeix abans de redirigir (HEAD request)
                // IMPORTANT: Comprovem que no sigui una redirecció (3xx) que ens torni a la pàgina original
                fetch(potentialUrl, { method: 'HEAD', redirect: 'manual' })
                    .then(response => {
                        // Si rebem un 200 OK, és perfecte.
                        // Si rebem un 301/302 (type 'opaqueredirect' o status 3xx), vol dir que la URL redirigeix.
                        // En aquest cas, NO hem de redirigir nosaltres, perquè podríem causar un bucle.
                        if (response.ok && response.status === 200) {
                            console.log(`Auto Language Redirector: URL verified (${response.status}). Redirecting...`);
                            // Increment redirect count before redirecting
                            sessionStorage.setItem(STORAGE_KEY_COUNT, (redirectCount + 1).toString());
                            sessionStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
                            
                            window.location.href = potentialUrl;
                        } else if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
                             console.log(`Auto Language Redirector: URL redirects (${response.status}). Avoiding loop.`);
                        } else {
                            console.log(`Auto Language Redirector: URL invalid (${response.status}).`);
                            
                            // START STRATEGY: REMOVE LANGUAGE SEGMENT (Root Fallback)
                            // Valid for sites where Root is default Lang (e.g. irta.cat: /es/ -> / )
                            if (langIndex !== -1) {
                                try {
                                    const rawUrl = new URL(window.location.href);
                                    const rawSegments = rawUrl.pathname.split('/');
                                    
                                    // Ensure we are removing the correct segment
                                    if (rawSegments.length > langIndex) {
                                         rawSegments.splice(langIndex, 1);
                                         rawUrl.pathname = rawSegments.join('/');
                                         const removalUrl = rawUrl.href;
                                         
                                         if (removalUrl !== window.location.href) {
                                             console.log(`Auto Language Redirector: Attempting Removal Strategy: ${removalUrl}`);
                                             fetch(removalUrl, { method: 'HEAD', redirect: 'manual' })
                                                .then(res2 => {
                                                    if (res2.ok && res2.status === 200) {
                                                         console.log(`Auto Language Redirector: Removal URL verified. Redirecting...`);
                                                         sessionStorage.setItem(STORAGE_KEY_COUNT, (redirectCount + 1).toString());
                                                         sessionStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
                                                         window.location.href = removalUrl;
                                                    }
                                                }).catch(() => {});
                                         }
                                    }
                                } catch (err) { console.error(err); }
                            }

                            // Start GENERALIZED Fallback for News/Broken Sites (Issue 1)
                            // If correct URL is 404, check if Root Hompage exists and warn
                            // ONLY if we haven't found anything else.
                            const rootCandidates = [
                                `https://${window.location.hostname}/${simplePreferred}/`,
                                `https://${window.location.hostname}/${simplePreferred}`,
                                `https://${window.location.hostname}/en${simplePreferred}/`, // encatala
                                `https://${window.location.hostname}/en${simplePreferred}` 
                            ];
                            
                            // We test just one common candidate for now to avoid spamming requests
                            // Try '/ca/' first (or equivalent preferred)
                            let fallbackHome = `https://${window.location.hostname}/${simplePreferred}/`;
                            if (window.location.hostname.includes('lavanguardia.com')) fallbackHome = ''; // Already handled specific rule
                            
                            if (fallbackHome) {
                                fetch(fallbackHome, { method: 'HEAD' }).then(rHome => {
                                    if (rHome.ok && rHome.status === 200) {
                                         // If Homepage exists, show Alert
                                         if (typeof showLanguageStructureNotice === 'function') {
                                             showLanguageStructureNotice(fallbackHome);
                                         }
                                    }
                                }).catch(() => {}); 
                            }
                        }
                    })
                    .catch(err => {
                        console.log('Auto Language Redirector: Error verifying URL.', err);
                    });
            } else {
                // Retry logic if no URL found and attempts < 3
                if (attempt < 3) {
                    console.log(`Auto Language Redirector: No target found. Retrying in 1s (Attempt ${attempt + 1})...`);
                    setTimeout(() => checkAndRedirect(attempt + 1), 1000);
                }
            }
        } catch (e) {
            console.error("Error deducing URL:", e);
        }
        } // End else !isFalseFriend
    } else if (targetUrl && targetUrl !== window.location.href) {
      console.log('Auto Language Redirector: Target found via hreflang/lang. Redirecting to ' + targetUrl);
      window.location.href = targetUrl;
    }
  });
}

// Executem la comprovació
checkAndRedirect();
