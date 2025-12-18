# Auto Language Redirector

Aquesta extensió de navegador detecta automàticament si la pàgina web que estàs visitant té una versió disponible en el teu idioma preferit i et redirigeix.

## Com funciona?

L'extensió busca etiquetes `<link rel="alternate" hreflang="...">` al codi de la pàgina. Si troba una URL que coincideix amb el teu idioma configurat, et redirigeix automàticament.

## Instal·lació (Mode Desenvolupador)

1. Descarrega o clona aquest repositori.
2. Obre Google Chrome i ves a `chrome://extensions`.
3. Activa el "Mode de desenvolupador" (Developer mode) a la cantonada superior dreta.
4. Fes clic a "Carrega sense empaquetar" (Load unpacked).
5. Selecciona la carpeta d'aquest projecte (`language-redirector-extension`).

## Configuració

1. Fes clic a la icona de l'extensió a la barra del navegador.
2. Introdueix el codi del teu idioma preferit (ex: `ca` per català, `en` per anglès).
3. Fes clic a "Guardar".

## Estructura del Projecte

- `manifest.json`: Configuració de l'extensió.
- `src/content.js`: Script que s'executa a les pàgines web per detectar l'idioma.
- `src/popup/`: Interfície d'usuari per configurar l'idioma preferit.
