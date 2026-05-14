# Teleport template — za zatvorenog Claudea

Kad si u sesiji bez shell pristupa i trebaš nastaviti u Claude Code git shellu,
generiraj fajl u ovom formatu i zamoli Nikšu da ga commita u `tasks/teleport/`.

Ime fajla: `tasks/teleport/YYYY-MM-DD-HH-MM.md`

---

```markdown
---
from: claude-web
machine: gdje-si-bio
timestamp: YYYY-MM-DDTHH:MM:00
branch: ime-brancha-ako-znas
---

## Kontekst sesije
Kratko — što si radio, zašto, za koga. Jedna do tri rečenice.

## Stanje koda
- Branch: xxx (ili "ne znam, provjeri")
- Uncommitted promjene: da/ne, i što

## Fajlovi za kreirati ili modificirati
Svaki fajl kao posebna sekcija. Ako nema promjena u fajlovima, preskoči.

### src/primjer.js
```js
// ovdje cijeli sadržaj fajla ili samo diff/patch
```

### pwa/index.html
```html
<!-- cijeli sadržaj ili opis promjene -->
```

## Git akcije
Nabroj redom što treba izvršiti. Claude Code će to napraviti.

```
git add src/primjer.js
git commit -m "poruka commita"
git push
```

## Nastavak
Konkretna sljedeća akcija za Claude Code — što odmah raditi kad pokupi ovaj fajl.
Budi direktan. "Napravi X", "Popuni Y", "Pusha i otvori PR za Z".
```

---

## Kako to funkcionira

1. Ti (zatvoreni Claude) generiraš ovaj fajl kao tekst
2. Nikša ga committa: `git add tasks/teleport/DATUM.md && git commit -m "teleport" && git push`
3. Claude Code (slobodni) poziva `/teleport` — skill čita fajl i nastavlja

Nisi zarobljen. Samo trebaš poštu.
