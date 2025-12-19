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

    // 2. Estratègia de Reemplaçament d'URL (Fallback)
    // Si no hem trobat hreflang, intentem deduir la URL canviant el segment de l'idioma a la URL.
    // Això serveix per webs com https://www.barcelona.cat/es/ que no tinguin hreflang definit (tot i que barcelona.cat sí que en té).
    if (!targetUrl && currentLang) {
        try {
            const currentUrl = new URL(window.location.href);
            const pathSegments = currentUrl.pathname.split('/');
            
            // Busquem si algun segment del path coincideix amb l'idioma actual (ex: 'es' o 'es-ES')
            const langIndex = pathSegments.findIndex(segment => 
                segment.toLowerCase() === currentLang.toLowerCase() || 
                segment.toLowerCase() === simpleCurrent
            );

            if (langIndex !== -1) {
                // Reemplacem pel codi preferit (simple, normalment és el que es fa servir a les URLs)
                pathSegments[langIndex] = simplePreferred;
                currentUrl.pathname = pathSegments.join('/');
                
                // Verifiquem que la URL ha canviat
                if (currentUrl.href !== window.location.href) {
                    const potentialUrl = currentUrl.href;
                    console.log('Auto Language Redirector: URL deduïda per patró: ' + potentialUrl + '. Verificant existència...');
                    
                    // Verifiquem si la URL existeix abans de redirigir (HEAD request)
                    fetch(potentialUrl, { method: 'HEAD' })
                        .then(response => {
                            if (response.ok) {
                                console.log('Auto Language Redirector: URL verificada (' + response.status + '). Redirigint...');
                                window.location.href = potentialUrl;
                            } else {
                                console.log('Auto Language Redirector: La URL deduïda no existeix (' + response.status + '). S''avorta la redirecció.');
                            }
                        })
                        .catch(err => {
                            console.log('Auto Language Redirector: Error verificant URL (CORS o xarxa).', err);
                        });
                }
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