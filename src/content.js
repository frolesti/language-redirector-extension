// src/content.js

function checkAndRedirect() {
  // Recuperem l'idioma preferit de la configuració (per defecte 'ca')
  chrome.storage.sync.get(['preferredLanguage'], function(result) {
    const preferredLang = result.preferredLanguage || 'ca';
    
    console.log('Auto Language Redirector: Idioma preferit és', preferredLang);

    // Obtenim l'idioma actual de la pàgina (atribut lang del tag html)
    const currentLang = document.documentElement.lang || '';

    // Si ja estem en l'idioma preferit, no fem res.
    // Utilitzem startsWith per cobrir casos com 'ca-ES' quan busquem 'ca'
    if (currentLang.toLowerCase().startsWith(preferredLang.toLowerCase())) {
        return;
    }

    // Busquem els tags <link rel="alternate" hreflang="...">
    const alternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
    
    if (alternates.length === 0) return;

    let targetUrl = null;

    // Iterem per trobar si hi ha una versió en el nostre idioma
    alternates.forEach(link => {
      const hreflang = link.getAttribute('hreflang').toLowerCase();
      
      // Comprovem si el hreflang coincideix amb la preferència
      // Acceptem coincidència exacta o prefix (ex: 'en' accepta 'en-US')
      if (hreflang === preferredLang.toLowerCase() || hreflang.startsWith(preferredLang.toLowerCase() + '-')) {
        targetUrl = link.href;
      }
    });

    // Si hem trobat una URL i és diferent de l'actual, redirigim
    if (targetUrl && targetUrl !== window.location.href) {
      console.log(`Auto Language Redirector: Pàgina detectada en ${preferredLang}. Redirigint...`);
      window.location.href = targetUrl;
    }
  });
}

// Executem la comprovació
checkAndRedirect();
