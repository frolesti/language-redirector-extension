# Auto Language Redirector

Aquesta extensió de navegador detecta automàticament si la pàgina web que estàs visitant té una versió disponible en el teu idioma preferit i et redirigeix. Per exemple, si tens l'extensió configurada en Català i visites `barcelona.cat/es`, et redirigirà automàticament a `barcelona.cat/ca`.

##  Com funciona?

L'extensió busca etiquetes `<link rel="alternate" hreflang="...">` al codi de la pàgina. Si troba una URL que coincideix amb el teu idioma configurat (`ca`, `es`, `en`, `eu`, `gl`), et redirigeix automàticament.

##  Guia d'Instal·lació i Proves (Testing)

### 1. Generar els paquets
Abans d'instal·lar, has de generar els paquets per a cada navegador executant el script de build:

```powershell
.\build.ps1
```
Això crearà la carpeta `build/` amb tots els fitxers necessaris.

### 2. Carregar l'extensió al navegador

1.  Obre el teu navegador.
2.  Ves a la pàgina de gestió d'extensions:
    *   **Chrome/Brave/Edge/Opera/Ecosia:** `chrome://extensions` (o equivalent) -> Activa "Mode desenvolupador" -> "Load Unpacked" (Carregar descomprimit).
    *   **Firefox:** `about:debugging` -> "Aquest Firefox" -> "Carrega un complement temporal".
3.  Selecciona la carpeta corresponent dins de `build/` (ex: `build/EnCatalaSisplau_chrome` o `build/EnCatalaSisplau_firefox`).

### 3. Configurar l'idioma preferit

1.  Fes clic a la icona de l'extensió (la bombolla de diàleg).
2.  Selecciona el teu idioma preferit al desplegable.
3.  Assegura't que l'interruptor està activat.

### 4. Provar amb webs reals

*   **Ajuntament de Barcelona:** Entra a [https://www.barcelona.cat/es](https://www.barcelona.cat/es). Hauria de redirigir a `/ca`.
*   **Viquipèdia:** Entra a un article que existeixi en el teu idioma, però en una altra versió (ex: versió anglesa).
*   **Generalitat de Catalunya:** [https://web.gencat.cat/es](https://web.gencat.cat/es).

### Solució de problemes comuns

*   **Firefox no guarda la configuració:** Assegura't de fer servir la versió generada pel script (dins la carpeta `build/`), ja que utilitza `storage.local` per evitar problemes en mode temporal.
*   **Massa redireccions:** L'extensió té un mecanisme de seguretat que s'atura si detecta un bucle infinit (més de 3 redireccions en 10 segons).

---

##  Guia de Publicació Multi-Navegador

El script `build.ps1` automatitza la creació de paquets per a tots els navegadors, gestionant les diferències entre Manifest V2 i V3.

### Ús del Script de Build

```powershell
# Generar per tots els idiomes i tots els navegadors
.\build.ps1

# Generar només per català i tots els navegadors
.\build.ps1 -Language ca

# Generar per tots els idiomes però només Firefox
.\build.ps1 -Browser firefox
```

Els fitxers generats es guarden a `build/` en dos formats:
1. **Carpetes descomprimides:** Per carregar fàcilment en mode desenvolupador (`build/EnCatalaSisplau_chrome/`).
2. **Fitxers .zip:** Per pujar a les botigues d'extensions (`build/EnCatalaSisplau_chrome.zip`).

### Detalls per Navegador

####  Google Chrome / Ecosia / Opera / Brave
*   **Manifest:** V3 (Service Worker)
*   **Store:** [Chrome Web Store](https://chrome.google.com/webstore/devconsole/)
*   **Cost:** 5 USD (únic)
*   **Nota:** Brave, Opera i Ecosia (basats en Chromium) accepten generalment la versió de Chrome o tenen processos similars.

####  Mozilla Firefox
*   **Manifest:** V2 (Background Scripts)
*   **Store:** [Firefox Add-ons](https://addons.mozilla.org/developers/)
*   **Cost:** Gratuït
*   **Requisit:** Inclou automàticament l'ID `encatalasisplau@extension` al manifest per passar la validació.

####  Microsoft Edge
*   **Manifest:** V3
*   **Store:** [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/)
*   **Cost:** Gratuït

####  Safari
*   **Manifest:** V2
*   **Store:** App Store (via Xcode)
*   **Cost:** 99 USD/any (Apple Developer Program)
*   **Procés:** 
    1. Generar el zip de Safari.
    2. Executar `xcrun safari-web-extension-converter build/EnCatalaSisplau_safari.zip` en un Mac.
    3. Això crea un projecte Xcode per compilar i pujar.

---

##  Estructura del Projecte

*   `build.ps1`: Script mestre que genera totes les versions.
*   `config.json`: Configuració de textos i idiomes.
*   `src/`: Codi font base.
    *   `*.template.js`: Plantilles que s'omplen amb la configuració durant el build.
*   `manifest.template.json`: Plantilla Manifest V3 (Chrome/Edge).
*   `manifest.firefox.json`: Plantilla Manifest V2 (Firefox).
*   `manifest.safari.json`: Plantilla Manifest V2 (Safari).
*   `build/`: Carpeta de sortida (ignorada per git).

## Diferències Tècniques Clau

*   **Manifest V3 (Chrome, Edge, etc):** Utilitza `service_worker`. No persistent.
*   **Manifest V2 (Firefox, Safari):** Utilitza `background.scripts`. Persistent o non-persistent.
*   **Emmagatzematge:** Utilitzem `chrome.storage.local` en lloc de `sync` per garantir persistència en sessions temporals de Firefox i evitar problemes de sincronització no configurats.
