# Com provar l'extensió Auto Language Redirector

Aquesta extensió està dissenyada per a navegadors basats en Chromium (Google Chrome, Microsoft Edge, Brave, etc.).

## 1. Carregar l'extensió al navegador

1.  Obre el teu navegador (Chrome o Edge).
2.  Ves a la pàgina de gestió d'extensions:
    *   **Chrome:** Escriu `chrome://extensions` a la barra d'adreces.
    *   **Edge:** Escriu `edge://extensions` a la barra d'adreces.
3.  Activa el **"Mode de desenvolupador"** (Developer mode). Sol ser un interruptor a la part superior dreta (Chrome) o esquerra (Edge).
4.  Fes clic al botó **"Carrega descomprimida"** (Load unpacked).
5.  Selecciona la carpeta d'aquest projecte: `c:\Users\USER\language-redirector-extension`.

L'extensió hauria d'aparèixer ara a la llista amb el nom "Auto Language Redirector".

## 2. Configurar l'idioma preferit

1.  Fes clic a la icona de l'extensió a la barra d'eines del navegador (potser l'has de fixar primer).
2.  S'obrirà un popup.
3.  Escriu el codi del teu idioma preferit (per defecte és `ca` per català).
4.  Fes clic a "Guardar".

## 3. Provar amb els fitxers de test

Aquest projecte inclou fitxers de prova locals per verificar que funciona sense necessitat de navegar per internet.

### Prova 1: Detecció estàndard (Hreflang)
Aquesta prova simula una pàgina que utilitza les etiquetes correctes per indicar idiomes alternatius.

1.  Obre el fitxer `test/index_es.html` al navegador.
    *   Pots arrossegar el fitxer des de l'explorador de fitxers cap a una pestanya del navegador.
    *   O copiar el path complet: `file:///C:/Users/USER/language-redirector-extension/test/index_es.html`
2.  **Resultat esperat:** Hauries de ser redirigit automàticament a `index_ca.html`.

### Prova 2: Detecció per estructura d'URL (Fallback)
Aquesta prova simula una pàgina que NO té etiquetes d'idioma, però té l'idioma a la URL (ex: `/es/`).

1.  Obre el fitxer `test/structure/es/index.html` al navegador.
    *   Path: `file:///C:/Users/USER/language-redirector-extension/test/structure/es/index.html`
2.  **Resultat esperat:** Hauries de ser redirigit automàticament a `../ca/index.html`.

## 4. Provar amb webs reals

Prova de navegar a la versió en castellà o anglès de webs que tinguin versió en català.

*   **Ajuntament de Barcelona:** Entra a [https://www.barcelona.cat/es](https://www.barcelona.cat/es). Hauria de redirigir a `/ca`.
*   **Viquipèdia:** Entra a un article que existeixi en català, però en versió espanyola (si té l'enllaç interwiki definit).

## Solució de problemes

*   **No fa res?**
    *   Assegura't que l'idioma de la pàgina no és ja el que tens configurat.
    *   Obre la consola del navegador (F12 -> Console) per veure els missatges de log: `Auto Language Redirector: ...`.
    *   Si has fet canvis al codi, recorda fer clic al botó de "Recarregar" (fletxa circular) a la targeta de l'extensió a la pàgina `chrome://extensions`.
