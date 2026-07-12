# Flegma tabulky

Staticka lokalna PWA aplikacia pre:

- kaloricke tabulky a denny zapis jedal
- bio profil
- databazu jedal
- treningovy kalendar
- FIT import a parovanie s treningom/sutazou
- GPX/FIT analyzu v detaile treningu
- grafy pre cyklistiku/triatlon
- export/import lokalnych dat

## Spustenie lokalne

Otvor cez XAMPP:

```text
http://localhost/flegma_tabulky/
```

## GitHub Pages

1. Vytvor prazdny GitHub repository.
2. Nahraj do neho vsetky subory z tohto priecinka.
3. V GitHube otvor `Settings` -> `Pages`.
4. Source nastav na `Deploy from a branch`.
5. Branch nastav na `main` a folder `/root`.
6. Otvor vygenerovanu GitHub Pages URL v mobile.

## Instalacia do mobilu

### iPhone

1. Otvor GitHub Pages URL v Safari.
2. Daj `Share`.
3. Daj `Add to Home Screen`.

### Android

1. Otvor GitHub Pages URL v Chrome.
2. Daj menu.
3. Daj `Install app` alebo `Add to Home screen`.

## Prenos dat

GitHub prenasa kod aplikacie, nie lokalne data z prehliadaca. Data su v `localStorage`, preto treba pouzit stranku:

```text
data.html
```

Postup:

1. Na Macu otvor `Data`.
2. Daj `Vytvorit export`.
3. Stiahni alebo skopiruj JSON.
4. Na mobile otvor GitHub Pages appku.
5. Otvor `Data`.
6. Importuj JSON.

## Offline rezim

Aplikacia ma `manifest.webmanifest` a `sw.js`, takze po otvoreni cez GitHub Pages sa vie ulozit do cache a fungovat ako PWA. Po vacsej zmene kodu obnov stranku, aby sa nacitala nova verzia cache.
