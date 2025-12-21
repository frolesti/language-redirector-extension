// src/content.js

function checkAndRedirect() {
  // Recuperem l'idioma preferit i l'estat d'activació
  chrome.storage.sync.get(['preferredLanguage', 'isEnabled'], function(result) {
    // Si està desactivat explícitament, no fem res
    if (result.isEnabled === false) {
        console.log('Auto Language Redirector: Extensió desactivada per l\'usuari.');
        return;
    }

    const preferredLang = result.preferredLanguage || 'ca';
    
    console.log('Auto Language Redirector: Idioma preferit és', preferredLang);

    // Obtenim l'idioma actual de la pàgina (atribut lang del tag html)
    const currentLang = document.documentElement.lang || '';

    // Normalitzem per comparar només el codi d'idioma principal (ex: 'ca-ES' -> 'ca')
    const simplePreferred = preferredLang.split('-')[0].toLowerCase();
    const simpleCurrent = currentLang.split('-')[0].toLowerCase();

    // Si ja estem en l'idioma preferit, no fem res.
    if (simpleCurrent === simplePreferred) {
        return;
    }

    let targetUrl = null;

    // 1. Estratègia Hreflang (Mètode estàndard i més fiable)
    // Busquem els tags <link rel="alternate" hreflang="...">
    const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
    
    if (alternates.length > 0) {
        // Iterem per trobar si hi ha una versió en el nostre idioma
        alternates.forEach(link => {
            const hreflang = link.getAttribute('hreflang').toLowerCase();
            
            // Comprovem si el hreflang coincideix amb la preferència
            if (hreflang === preferredLang.toLowerCase() || hreflang.startsWith(preferredLang.toLowerCase() + '-')) {
                targetUrl = link.href;
            }
        });
    }

    // 2. Estratègia de Reemplaçament d'URL o Injecció de Prefix (Fallback)
    // Si no hem trobat hreflang, intentem deduir la URL.
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
                // CAS A: Reemplaçament (ex: /es/hola -> /ca/hola)
                pathSegments[langIndex] = simplePreferred;
                currentUrl.pathname = pathSegments.join('/');
                if (currentUrl.href !== window.location.href) {
                    potentialUrl = currentUrl.href;
                }
            } else {
                // CAS B: Injecció de Prefix (ex: /hola -> /ca/hola)
                // Això passa quan la URL base no té codi d'idioma (sol ser l'idioma per defecte)
                // Evitem bucles infinits: si el primer segment ja és l'idioma preferit, no fem res.
                if (pathSegments[1] !== simplePreferred) {
                    const newPathSegments = ['', simplePreferred, ...pathSegments.slice(1)];
                    currentUrl.pathname = newPathSegments.join('/');
                    potentialUrl = currentUrl.href;
                }
            }

            if (potentialUrl) {
                console.log('Auto Language Redirector: URL deduïda (' + (langIndex !== -1 ? 'reemplaçament' : 'injecció') + '): ' + potentialUrl + '. Verificant existència...');
                
                // Verifiquem si la URL existeix abans de redirigir (HEAD request)
                // IMPORTANT: Comprovem que no sigui una redirecció (3xx) que ens torni a la pàgina original
                fetch(potentialUrl, { method: 'HEAD', redirect: 'manual' })
                    .then(response => {
                        // Si rebem un 200 OK, és perfecte.
                        // Si rebem un 301/302 (type 'opaqueredirect' o status 3xx), vol dir que la URL redirigeix.
                        // En aquest cas, NO hem de redirigir nosaltres, perquè podríem causar un bucle.
                        if (response.ok && response.status === 200) {
                            console.log(`Auto Language Redirector: URL verificada (${response.status}). Redirigint...`);
                            window.location.href = potentialUrl;
                        } else if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
                             console.log(`Auto Language Redirector: La URL deduïda redirigeix (${response.status} / ${response.type}). Evitem bucle infinit.`);
                        } else {
                            console.log(`Auto Language Redirector: La URL deduïda no existeix o no és vàlida (${response.status}). S'avorta la redirecció.`);
                        }
                    })
                    .catch(err => {
                        console.log('Auto Language Redirector: Error verificant URL (CORS o xarxa).', err);
                    });
            }
        } catch (e) {
            console.error("Error intentant deduir la URL:", e);
        }
    } else if (targetUrl && targetUrl !== window.location.href) {
      console.log('Auto Language Redirector: Pàgina detectada per hreflang en ' + preferredLang + '. Redirigint...');
      window.location.href = targetUrl;
    }
  });
}

// Executem la comprovació
checkAndRedirect();