# Auto Language Redirector

**Navega en la teva llengua**

Aquesta extensió de navegador detecta automàticament si la pàgina web que estàs visitant té una versió disponible en el teu idioma preferit i et redirigeix. Per exemple, si tens l'extensió configurada en Català ("En Català, si us plau") i visites `barcelona.cat/es`, et redirigirà automàticament a `barcelona.cat/ca`.

## 📦 Descarregar l'Extensió

Tria la teva variant i instal·la l'extensió al teu navegador preferit:

### 🟡 En Català, si us plau
*Per a usuaris que volen navegar en català.*

| Navegador | Enllaç de descàrrega |
| :--- | :--- |
| ![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png) **Chrome / Brave** | [Chrome Web Store (Pendent)](#) |
| ![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png) **Firefox** | [Firefox Add-ons (Pendent)](#) |
| ![Edge](https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png) **Edge** | [Microsoft Edge Add-ons (Pendent)](#) |

---

### 🟢 Euskaraz Mesedez
*Per a usuaris que volen navegar en euskera.*

| Navegador | Enllaç de descàrrega |
| :--- | :--- |
| ![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png) **Chrome / Brave** | [Chrome Web Store (Pendent)](#) |
| ![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png) **Firefox** | [Firefox Add-ons (Pendent)](#) |
| ![Edge](https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png) **Edge** | [Microsoft Edge Add-ons (Pendent)](#) |

---

### 🔵 En Galego Por Favor
*Per a usuaris que volen navegar en gallec.*

| Navegador | Enllaç de descàrrega |
| :--- | :--- |
| ![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png) **Chrome / Brave** | [Chrome Web Store (Pendent)](#) |
| ![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png) **Firefox** | [Firefox Add-ons (Pendent)](#) |
| ![Edge](https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png) **Edge** | [Microsoft Edge Add-ons (Pendent)](#) |

---

## ⚙️ Com funciona?

L'extensió busca etiquetes invisibles (`<link rel="alternate" hreflang="...">`) al codi de la pàgina que els desenvolupadors web utilitzen per indicar que existeixen traduccions. Si troba una versió en el teu idioma, **obre l'aixeta** i et redirigeix.

També inclou estratègies avançades per detectar la configuració de llocs complexos (com Nike o Mango) i evitar "falsos amics" (com no confondre `/ca` de Canadà amb Català).

## 🛠️ Desenvolupament i Contribució

Si vols executar l'extensió des del codi font o ajudar a millorar-la:

### 1. Generar els paquets
Necessites PowerShell per generar les versions:

```powershell
.\build.ps1
```
Això crearà la carpeta `build/` amb tots els fitxers llestos per carregar.

### 2. Carregar l'extensió al navegador (Mode Desenvolupador)

1.  Obre el teu navegador.
2.  Ves a la pàgina de gestió d'extensions (`chrome://extensions` o `about:debugging`).
3.  Activa el "Mode desenvolupador".
4.  Carrega la carpeta descomprimida des de `build/` (ex: `build/EnCatalaSisplau_chrome`).

### 3. Configuració i Suport

L'extensió ve llesta per utilitzar. Si la vols aturar temporalment, només has de fer clic a la icona i desactivar l'interruptor.

Si t'agrada aquesta eina i vols donar suport al seu desenvolupament, pots fer-ho a través del meu perfil a **l'Aixeta**:
👉 [https://frolesti.aixeta.cat/](https://frolesti.aixeta.cat/)


## 🌍 Estructura del Projecte

El projecte és **multi-idioma i multi-navegador**. Un únic codi base genera extensions per a Català, Euskera i Gallec, i per a Chrome, Firefox, Edge i Safari.

*   `build.ps1`: El "cervell" que cuina totes les versions.
*   `config.json`: On es defineixen els textos i idiomes.
*   `src/`: El codi font real.

## 📄 Llicència

Codi obert per a una web oberta i plurilingüe. Fes-ne ús!
