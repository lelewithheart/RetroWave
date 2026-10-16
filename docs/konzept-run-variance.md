# RogueWave — Gameplay-Update Konzept ("Run Variance")

Status: KONZEPT — wartet auf Freigabe
Datum: 2026-10-16
Autor: Hermes (für Lele)

---

## 1. Problem

Ein Run in RogueWave läuft aktuell deterministisch ab:

- **Wellen sind identisch aufgebaut.** `startNextWave()` zählt einen Zähler hoch;
  Welle 1 und Welle 17 unterscheiden sich nur in HP/Speed/Damage-Skalierung und
  der Gegnertyp-Mischung (`typePool` ab Welle 3/5/7/9/12). Der Ablauf selbst ist
  immer gleich: spawne bis Kill-Ziel erreicht, Pause, nächste Welle.
- **Bosse sind fix.** `isBossWave()` und feste Zuordnung: Miniboss auf 5/15,
  Iron Tyrant auf 10, Abyss Colossus auf 20, Endboss auf 25. Ein Boss hat immer
  exakt dasselbe Verhalten. Der zweite Iron Tyrant fühlt sich an wie der erste.
- **Elite-Gegner fehlen.** Alle Gegner eines Typs sind identisch. Nichts
  sticht heraus, nichts belohnt gezieltes Spiel.
- **Events sind tot.** `activeEventId` / `activeEventLabel` existieren seit
  Version 27.04:1 im State (`game.js:4697`) und werden bei jedem Run-Reset
  geleert (`game.js:4811`), aber **nie befüllt**. Der Changelog nennt das
  "event placeholders for future event routing" — die Infrastruktur liegt
  brach.

**Konsequenz:** Kein Run erzählt eine eigene Geschichte. Nach zwei, drei Runs
hat man alles gesehen, was das Spiel an Varianz zu bieten hat.

---

## 2. Ziel

Jeder Run soll eine eigene Form haben. Nicht durch mehr Gegner-Menge, sondern
durch **Variation der Regeln** zwischen den Wellen. Der Spieler trifft
Entscheidungen, die innerhalb eines Runs unterschiedlich ausfallen — und kann
dadurch Strategien entwickeln statt nur durchzuhalten.

**Erfolgskriterium:** Zwei aufeinanderfolgende Runs auf derselben
Schwierigkeit fühlen sich unterschiedlich an — messbar daran, dass mindestens
3 der 4 folgenden Systeme in einem Run feuern und sich kein Run wie der
vorherige anfühlt.

---

## 3. Die vier Systeme

### 3.1 Zwischenwellen-Events (Kern)

Alle N Wellen wählt das Spiel **ein** Event aus einem Pool und zeigt es im
Wellen-Pausenfenster an (Banner + Toast + kurze Erklärung). Während des Events
gelten geänderte Regeln.

| Event | Wirkung | Warum es Spaß macht |
|---|---|---|
| **Elite-Welle** | Alle Gegner der Welle sind Elite-Varianten (stärker, mehr XP/Shards) | Belohnung für gutes Spiel, hoher Druck |
| **Shard-Cache** | 1 zufälliger Gegner droppt bei Tod eine Shard-Kiste (viele Shards auf einmal) | Ziel musst du finden bevor er stirbt / früh töten |
| **Sturm** | Gegner schneller, dafür weniger HP; Sicht leicht eingeschränkt | Wechsel des Spielgefühls |
| **Heilbrunnen** | Passives HP-Regen für die Dauer der Welle, aber keine XP-Orbs | Ressourcen-Puzzle: XP gegen Sicherheit |
| **Ambush** | Alle Gegner kommen aus einer Richtung, alle auf einmal statt getaktet | Positionsspiel statt Dauerfeuer |
| **Jagd** | Ein markierter Elite-Gegner, Rest der Welle normal; Kill = garantierter Bonus | Fokus-Ziel |

**Design-Regeln:**
- Nie dasselbe Event zweimal in Folge.
- Kein Event in der Endboss-Vorbereitung (Wellen 24/25 ruhen).
- Events skalieren mit der Welle: Elite-Welle auf Welle 3 ist einfacher als auf Welle 18.
- Sichtbar machen, was passiert: Banner-Text + Toast + dauerhafte HUD-Anzeige
  des aktiven Events (`activeEventId` endlich befüllen).

### 3.2 Boss-Modifier

Bosse behalten ihr Grundverhalten, bekommen aber **1–2 zufällige Modifier** aus
einem Pool. Der Spieler muss sich pro Boss anpassen.

| Modifier | Wirkung |
|---|---|
| **Schildwall** | Reduziert eingehenden Schaden von vorne stark; von hinten/seitlich voll |
| **Berserker** | Unter 40% HP +50% Speed, +30% Kontaktschaden |
| **Beschwörer** | Spawnt alle ~8s zwei normale Adds |
| **Siphon** | Heilt sich langsam, solange der Spieler im Nahbereich ist |
| **Brutal** | Keine Adds, dafür deutlich mehr HP und Kontaktschaden |
| **Zerbrechlich** | -35% HP, dafür viel mehr Shards/XP (Risiko-Belohnung für Gierige) |

**Design-Regeln:**
- Der erste Boss (Miniboss Welle 5) bekommt genau 1 Modifier, damit es nicht
  überfordert. Spätere Bosse bis zu 2.
- Endboss (Welle 25) behält seine 3 Phasen, bekommt aber einen sichtbaren
  Modifier als "These".
- Modifier müssen am Boss sichtbar sein (Aura-Farbe/Icon/Label über der
  HP-Leiste), sonst wirken sie unfair.

### 3.3 Elite-Gegner

Standard-Gegner können als **Elite** spawnen. Elite = sichtbar markiert
(Aura-Ring + anderer Farbton), mit:
- deutlich mehr HP
- einem verstärkten Verhalten (schneller ODER mehr Kontaktschaden ODER schießt)
- garantiertem XP-Multiplikator + Chance auf Shard-Drop

**Design-Regeln:**
- Kein Elite innerhalb der ersten 2 Wellen (Einstieg darf nicht hart sein).
- Elite in der Nähe von Events bevorzugt (z.B. Elite-Welle = alle Elite).
- Elites dürfen nicht einfach Zähes-Fleisch sein: sie müssen eine spürbare
  andere Bedrohung bilden, nicht nur mehr HP.

### 3.4 Neue Gegnertypen

2 neue Typen, die Lücken im aktuellen Set füllen (aktuell: normal, tank,
speedy, ranged, phaser, exploder):

| Typ | Verhalten |
|---|---|
| **Splitter** | Zerfällt beim Tod in 2 kleinere, schwächere Gegner |
| **Wächter** | Bewegt sich nicht, projiziert einen Schadensstrahl der rotiert |

**Design-Regeln:**
- Einer davon muss bestehende Spielweise brechen (Splitter bestraft
  Flächenschaden falsch eingesetzt, Wächter bestraft Stillstehen).
- Beide brauchen Eintrag in `ENEMY_TYPES` + Spawn-Pool ab passender Welle.

---

## 4. Technische Einordnung

### Berührte Stellen (bestandsnah, kein Rewrite)

| Ort | Änderung |
|---|---|
| `config.js` | Neue Blöcke `events`, `bossModifiers`, `elites`, `newEnemyTypes` |
| `game.js` §1 | `EVENT_DEFS`, `BOSS_MODIFIER_DEFS`, `ELITE_*` Konstanten |
| `game.js` §10 `Enemy` | Elite-Flag, `eliteMods`, Splitter-Split-Logik, Wächter-Strahl |
| `game.js` `ENEMY_TYPES` | 2 neue Einträge |
| `game.js` `manageWaves` | Event-Lifecycle: starten, während Welle laufen, beenden |
| `game.js` `startNextWave` | Event-Auswahl + Boss-Modifier-Zuweisung |
| `game.js` `spawnWaveEnemy` | Elite-Chance, Event-Modifikatoren anwenden |
| `game.js` `onEnemyKilled` | Shard-Cache-Drop, Splitter-Split, Event-Zähler |
| `game.js` HUD/draw | Aktives Event anzeigen, Elite-Aura, Boss-Modifier-Label |
| `changelogs.txt` | Neuer Versionseintrag |
| `README.md` | Feature-Tabelle ergänzen |

### Bewusste Architektur-Entscheidungen

- **Config-driven wie der Rest.** Alle Zahlen in `config.js`, nicht hardcoded im
  Logik-Pfad. Der vorhandene Stil (z.B. `replay.challengeModes`) wird
  übernommen, damit später Balancing ohne Codeänderung möglich ist.
- **Event ist ein Zustandsobjekt, kein Sonderfall überall.** Ein zentrales
  `game.activeEvent = { id, def, endsAtWave, payload }`. Alle Systeme fragen
  dieses Objekt, statt überall `if (event === "storm")` zu streuen.
- **Determinismus bleibt testbar.** Event-Auswahl über seeded RNG-Pfad
  optional, damit ein Run reproduzierbar ist (nützlich zum Debuggen).

### Risiken

| Risiko | Umgang |
|---|---|
| Kombinatorische Explosion führt zu unfairen Wellen (Elite-Welle + Sturm auf Welle 20) | Event-Modifikatoren werden multiplikativ gedeckelt; Balance-Formel auf Testbasis prüfen |
| Performance: Elites + Bosse + Adds sprengen `MAX_ENEMIES` | `dynamicCap()` gilt weiter; Events, die Gegnerzahl erhöhen, reduzieren Spawn-Rate entsprechend |
| Spieler versteht nicht, was passiert | Jedes Event hat Banner + Toast + HUD-Anzeige + Erklärtext im Pausenfenster |
| Alter Save-Stand verträgt neue Felder nicht | Neue Felder sind optional beim Laden; `Progression`-Normalisierung prüfen |

---

## 5. Vorgeschlagene Reihenfolge

Das ist bewusst so geschnitten, dass nach **jedem** Schritt etwas Spielbares
und Testbares existiert.

1. **Fundament + Events** — `activeEvent`-Zustand, Event-Auswahl, 3 der 6 Events
   (Elite-Welle, Sturm, Heilbrunnen), HUD-Anzeige. Größter Hebel, sofort spürbar.
2. **Restliche Events** — Ambush, Shard-Cache, Jagd + Balancing-Pass.
3. **Elite-Gegner** — unabhängig vom Event-System nutzbar, baut auf Elite-Welle auf.
4. **Boss-Modifier** — 3 Modifier, dann der Rest; Sichtbarkeit im HUD.
5. **Neue Gegnertypen** — Splitter, Wächter; Spawn-Pools anpassen.
6. **Polish** — Balance-Pass über echte Runs, Changelog, README, Telemetrie-Sicht.

---

## 6. Offene Fragen an dich

Bevor ich das in einen Task-Plan übersetze:

1. **Umfang bestätigen:** Alle vier Systeme (Events + Boss-Modifier + Elites +
   2 neue Gegnertypen), oder erst Teilmenge?
2. **Schwierigkeits-Anspruch:** Sollen Events das Spiel im Schnitt **schwerer**
   machen (mehr Varianz = mehr Bedrohung), **neutral** bleiben (nur anders), oder
   **belohnender** (mehr Belohnung für Risiko)? Aktuell tendiere ich zu
   "anders + leicht belohnender", damit es sich lohnt, Events mitzunehmen.
3. **Neue Gegnertypen:** Splitter + Wächter ok, oder hast du eine andere Idee,
   was fehlt?
4. **Zahlen-Tuning:** Soll ich Startwerte in `config.js` setzen, die du dann
   per Spielgefühl nachjustierst, oder direkt konservativ balancen?
5. **Versionsschema:** Der Changelog nutzt `{day}.{month}:{n}-{hotfix}`. Für
   ein Gameplay-Update wäre ein eigener Minor-Sprung sinnvoll (z.B. ein
   Eintrag `beta 16.10:1` mit "Gameplay-Update: Run Variance Phase 1").
   Einverstanden?
