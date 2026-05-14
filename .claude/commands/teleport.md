# /teleport — pokupi sesiju iz git fajla

Pokreni kad postoji novi fajl u `tasks/teleport/` koji je generirao zatvoreni Claude.

## Koraci

1. Pronađi najnoviji fajl u `tasks/teleport/` koji nije `TEMPLATE.md` i nije u `done/`
2. Pročitaj ga u cijelosti
3. Izvedi redom:
   - Kreiraj ili modificiraj sve navedene fajlove
   - Izvrši git akcije iz sekcije "Git akcije" (osim push — pitaj Nikšu)
4. Preseli fajl u `tasks/teleport/done/` (mkdir ako ne postoji)
5. Nastavi s uputom iz sekcije "Nastavak"
6. Kratko javi što si napravio i gdje si stao

## Ako nema fajla

Reci: "Nema teleport fajla. Zatvoreni Claude treba generirati tasks/teleport/YYYY-MM-DD-HH-MM.md prema TEMPLATE.md."

## Napomena

Push uvijek pita Nikšu — ne radi automatski.
Ako postoji više fajlova, pokupi najnoviji i pitaj je li ostale treba arhivirati.
