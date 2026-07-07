# Changelog & Roadmap

## 📦 Històric de Versions

### v2.0.2 - Correcció d'icones i enllaços de compte (07/07/2026)
- **Per què es puja versió:** Release de correcció per garantir comportament coherent i accionable del bloc de compte a tots els navegadors.
- **Branding (Popup):** Substitució d'icones simplificades per logos de marca reals (Simple Icons) i selecció d'icona de Firefox recognoscible a mida petita.
- **Enllaç de compte (Firefox):** Eliminat l'enllaç a configuració no útil; ara apunta a documentació oficial per canviar idioma de Firefox, que és el que governa l'idioma del compte Mozilla.
- **Enllaç de compte (Edge):** Ajust de destí a perfil de compte Microsoft (punt real de gestió de regió/idioma disponible).
- **Coherència multi-navegador:** Validat build i injecció d'icones per Chrome, Edge, Brave, Opera, Ecosia, Firefox i Safari.

### v2.0.1 - Ajustos de publicació i coherència visual (06/07/2026)
- **Per què es puja versió:** Release de manteniment per corregir comportaments entre navegadors i consolidar canvis de publicació sense alterar el core de redirecció.
- **UX (Popup):** Reordenació de seccions (exclusions, notificació i footer) i separadors per millorar la lectura.
- **Contingut (Popup):** Enllaç d'ajuda sota "Idiomes detectats" cap a configura.cat perquè l'usuari tingui context i instruccions.
- **Branding/Footer:** Conversió de "Fes clic aquí" en enllaç real; reubicació del logo de configura.cat al peu en format més discret.
- **Coherència entre navegadors:** Ajust específic de tipografia per Firefox per aproximar proporcions visuals a Chrome sense forçar la mida base de Chrome.
- **Publicació Firefox (AMO):** Ajustos de manifest i empaquetat per complir validacions (ID immutable, consentiment de dades i compatibilitat de versions mínimes).

### v1.6.0 - Correccions "False Friends" i Canadà (12/01/2026)
- **Fix (FilmAffinity):** S'ha afegit una llista d'excepció per a dominis "False Friends" (`filmaffinity.com`, `adobe.com`, etc.) on el prefix `/ca/` correspon a Canadà i no a Català.
- **Logic:** L'extensió ara ignora la deducció d'URL en aquests dominis per prevenir redireccions errònies a versions angleses/franceses.

### v1.5.0 - Millores d'Estabilitat i Diaris (12/01/2026)
- **Fix:** Estandardització de la lògica per a diaris i llocs amb estructures separades (La Vanguardia, institucionals).
- **New:** Sistema d'avisos (*Toasts*) quan la redirecció automàtica no és possible però existeix una portada en l'idioma preferit.
- **Fix (Irisana.com):** Detecció de bucles infinits quan l'URL conté l'idioma correcte (`/ca/`) però el servidor retorna contingut en l'idioma incorrecte (`lang="es"`).

### v1.4.0 - Unificació de Build i Manifest v3 (Estable)
- **Refactor:** Reempaquetat complet del sistema de construcció (`build.ps1`) per generar versions per a tots els navegadors (Chrome, Firefox, Safari) des d'un sol codi font.
- **Core:** Migració a `chrome.storage.local` per millorar la persistència de la configuració.
- **Docs:** Eliminació de fitxers temporals del control de versions.

### v1.3.0 - Millores de Seguretat i UX
- **Feat:** Implementació de detecció de bucles infinits (Safety Check).
- **Style:** Redisseny visual del Popup amb icones en escala de grisos per a l'estat desactivat.
- **Feat:** Afegits tests locals per validar el comportament abans de publicar.

### v1.2.0 - Optimització d'Icones i Fallbacks
- **Fix:** Correcció d'icones tallades (redimensionades a 128x128).
- **Feat:** Suport per a `Booking.com` (detecció de codi d'idioma en noms de fitxer `index.es.html`).
- **Fix:** Desactivació de la injecció agressiva de prefixos per solucionar errors a YouTube.

### v1.1.0 - Suport Multi-Estratègia
- **Feat:** Afegit suport per a Widgets de traducció (Google Language Translator, WordPress).
- **Fix:** Correcció d'errors de codificació UTF-8 en llegir fitxers de configuració.
- **Feat:** Primera implementació de l'estratègia `hreflang` en elements `<a>` (body) i `<link>` (head).

### v1.0.0 - Alliberament Inicial
- Unificació de les tres versions (Català, Gallec, Euskera) en un sol repositori amb sistema de build paramètric.
- Funcionalitat bàsica de redirecció.

---

## 🐛 Problemes Coneguts i Pendents (Issue Tracker)

### 🔴 Pendents
1. **La Vanguardia (Articles):** Tècnicament impossible de redirigir automàticament (IDs diferents). S'ha solucionat amb un avís, però l'ideal seria tenir un diccionari de mapeig (molt costós de mantenir).
2. **Safari:** La publicació requereix compte de desenvolupador Apple (99$/any). Pendent de valorar si val la pena.
3. **Reconeixement de Veu:** VS Code Speech no suporta català *offline*. S'ha de pressionar Microsoft via GitHub Issues.

### 🟢 Solucionats
- [x] **Redireccions infinites:** Solucionat a v1.5 amb comprovació de contingut real vs URL.
- [x] **Confusió CA (Català) vs CA (Canadà):** Solucionat a v1.6 amb llista negra d'excepcions.
- [x] **404 a Diaris sense traducció directa:** Solucionat a v1.5 amb fallback a la portada + avís.

---

## 📝 Notes de Desenvolupament

- **Build System:** `build.ps1` genera paquets per a tots els navegadors basats en una configuració central (`config.json`).
- **Templates:** El codi font es troba a `src/content.template.js`. No editar `src/content.js` directament, ja que es sobreescriu en cada build.
