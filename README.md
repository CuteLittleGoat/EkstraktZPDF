# EkstraktZPDF

Interaktywna checklista przejścia **Dark Souls II: Scholar of the First Sin**.

## Uruchamianie strony

Jako punkt wejścia należy udostępniać i otwierać `index.html`, a nie bezpośrednio `DS2.html`.

`index.html`:

- wyświetla właściwą checklistę z `DS2.html`;
- dodaje układ zoptymalizowany pod tablet w orientacji poziomej;
- zapisuje stan checkboxów równolegle w `localStorage` i IndexedDB;
- rejestruje service workera, dzięki czemu po pierwszym poprawnym uruchomieniu strona może działać także bez połączenia z internetem;
- udostępnia manifest aplikacji PWA z preferowaną orientacją poziomą.

Stan checkboxów przetrwa odświeżenie strony, zamknięcie karty oraz ponowne uruchomienie przeglądarki. Nie można zagwarantować zachowania danych po ręcznym usunięciu danych witryny, użyciu trybu prywatnego albo wyczyszczeniu profilu przeglądarki.

Service worker działa podczas udostępniania strony przez HTTPS albo `localhost`. Przy otwieraniu plików bezpośrednio z dysku (`file://`) podstawowa checklista nadal działa, ale funkcje PWA i cache offline mogą być niedostępne.

## Pliki

- `01.docx`, `02.docx` — źródłowe pliki danych; nie są modyfikowane przez aplikację.
- `DS2.html` — wygenerowana checklista i jej podstawowa logika.
- `index.html` — punkt wejścia, trwały zapis i optymalizacje tabletowe.
- `manifest.webmanifest` — konfiguracja instalowalnej aplikacji internetowej.
- `sw.js` — cache offline aplikacji.
