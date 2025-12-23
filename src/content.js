// src/content.js

function checkAndRedirect(attempt = 1) {
  // Recuperem l'idioma preferit i l'estat d'activació
  chrome.storage.sync.get(['preferredLanguage', 'isEnabled'], function(result) {
    // Si està desactivat explícitament, no fem res
    if (result.isEnabled === false) {
        console.log('Auto Language Redirector: Extensió desactivada per l\'usuari.');
        return;
    }

    const preferredLang = result.preferredLanguage || 'ca';
    console.log(`Auto Language Redirector (Attempt ${attempt}): Preferred=${preferredLang}`);

    // Obtenim l'idioma actual de la pàgina (atribut lang del tag html)
    const currentLang = document.documentElement.lang || '';

    // Normalitzem per comparar només el codi d'idioma principal (ex: 'ca-ES' -> 'ca')
    const simplePreferred = preferredLang.split('-')[0].toLowerCase();
    const simpleCurrent = currentLang.split('-')[0].toLowerCase();

    // Si ja estem en l'idioma preferit, no fem res.
    if (simpleCurrent === simplePreferred) {
        console.log('Auto Language Redirector: Already in preferred language.');
        return;
    }

    let targetUrl = null;

    // Helper function to find target URL
    function findTargetUrl() {
        let url = null;
        
        // 1. Strategy Hreflang (Head)
        const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
        alternates.forEach(link => {
            const hreflang = link.getAttribute('hreflang').toLowerCase();
            if (hreflang === preferredLang.toLowerCase() || hreflang.startsWith(preferredLang.toLowerCase() + '-')) {
                url = link.href;
            }
        });

        if (url) return url;

        // 1.5. Strategy Anchor Hreflang (Body)
        const anchorAlternates = document.querySelectorAll('a[hreflang]');
        anchorAlternates.forEach(link => {
            const hreflang = link.getAttribute('hreflang').toLowerCase();
            if (hreflang === preferredLang.toLowerCase() || hreflang.startsWith(preferredLang.toLowerCase() + '-')) {
                url = link.href;
            }
        });
        
        if (url) return url;
        
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

        return url;
    }

    targetUrl = findTargetUrl();

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
                widgetLink.click();
                return; // Sortim, ja que el click hauria de gestionar el canvi
            }
        }
    }

    // 3. Estratègia de Reemplaçament d'URL o Injecció de Prefix (Fallback)
    // Si no hem trobat hreflang ni widget, intentem deduir la URL.
    if (!targetUrl) {
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
                            window.location.href = potentialUrl;
                        } else if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
                             console.log(`Auto Language Redirector: URL redirects (${response.status}). Avoiding loop.`);
                        } else {
                            console.log(`Auto Language Redirector: URL invalid (${response.status}).`);
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
    } else if (targetUrl && targetUrl !== window.location.href) {
      console.log('Auto Language Redirector: Target found via hreflang/lang. Redirecting to ' + targetUrl);
      window.location.href = targetUrl;
    }
  });
}

// Executem la comprovació
checkAndRedirect();