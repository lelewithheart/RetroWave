# Devlog — RogueWave

Ein ehrliches Entwicklungstagebuch. Was gebaut wurde, was kaputt war, was
schiefging und warum. Nicht die Marketing-Version.

**Projekt:** RogueWave — Survivor-Roguelite, Vanilla JS + HTML5 Canvas
**Repo:** github.com/lelewithheart/RetroWave
**Version:** beta 17.10:4
**Umfang:** ~10.600 Zeilen `game.js`, 416 Zeilen `config.js`, 94 Commits

---

## Eintrag 1 — Der große Gameplay-Umbau (beta 16.10:1)

Bis hierhin lief jeder Run gleich ab: dieselben Wellen, dieselben Gegner,
dasselbe Tempo. Nach drei Runs hatte man alles gesehen. Das ist der Tod eines
Roguelites.

Also: **Run Variance**. Jede dritte Welle (ab Welle 3, nie auf Boss-Wellen)
bekommt jetzt ein zufälliges Event, das die Welle verändert:

| Event | Wirkung |
|---|---|
| Elite Wave | Gegner-HP runter, aber jeder dritte ist ein Elite |
| Ion Storm | Mehr Gegner, dafür weniger HP und schneller |
| Repair Fountain | Keine Spawns, man heilt sich |
| Ambush | Alle Gegner kommen aus einer Richtung |
| Shard Cache | Ein Träger-Gegner lässt sich finden und bringt Shards |
| Bounty Hunt | Ein markiertes Ziel, mehr Shards als Belohnung |

Der Trick war, das Ganze nicht als `if (event === "storm")` über den halben
Code zu verteilen. Stattdessen hat jede Event-Definition dieselbe kleine
Schnittstelle:

```js
{
  id: "storm",
  enemyHpMult: 0.75,
  enemySpeedMult: 1.3,
  killTargetMult: 1.25,
  // ...
}
```

Der Wave- und Spawn-Code kennt nur diese Felder — er weiß nicht, welches Event
gerade läuft. Ein neues Event hinzufügen heißt: einen Eintrag in `config.js`
schreiben. Kein Code anfassen.

Dazu kamen Elite-Gegner (goldener Ring, dicke HP, viel XP), Boss-Modifier
(Bosse würfeln bis zu 2 Eigenschaften wie Schildwall oder Berserker) und zwei
neue Gegnertypen: **Splitter** (zerfällt beim Tod in zwei kleinere Kopien) und
**Wächter** (stationärer Turm mit rotierendem Strahl).

**Was ich verifiziert habe:** Die Event-Verteilung über 4.000 simulierte Züge
weicht maximal 0,5 % von den Config-Gewichten ab. Ein Skripted Run bis Welle
14 ohne einen einzigen JS-Fehler.

---

## Eintrag 2 — „Niemand schafft Welle 25" (beta 16.10:1-hotfix1)

Nach dem Update: „Es ist immer noch zu schwer. Ich schaffe es kaum über Welle
20."

Ich hatte angenommen, ein Spieler hat bei Welle 20 etwa 4.000 DPS. Das war
geraten. Also hab ich es simuliert — und die echte Zahl war **500 DPS**.

Der Grund war nicht die Gegner-HP. Es war das XP-System:

```
XP pro Kill wuchs LINEAR      (10 + wave×2)
Gegner-HP wuchs EXPONENTIELL  (1.18^Welle)
Level-Anforderung ×1.40 pro Level
```

Ein kompletter Run gab **19 Upgrade-Wählungen**. Das ist nichts. Der Build kam
nie zustande, weil man nie genug Upgrades bekam, um ihn zu bauen.

Und daraus folgte das eigentliche Todesurteil:

```
Welle 20: Spieler killt 1,7 Gegner/s — es spawnen 3,3/s  (Ratio 0,51)
Welle 25: Spieler killt ein Drittel dessen, was kommt    (Ratio 0,36)
```

Man wurde nicht von starken Gegnern getötet. Man wurde **überrannt**.

**Fix:** Level-Kurve 1.40 → 1.20, XP wächst jetzt mit der Welle (×1.11/Welle),
Spawn-Rampe entschärft. Ergebnis: 42 statt 19 Upgrades, Ratio 1,52–3,91.

**Lehre:** Ich habe zweimal an der Gegner-HP gedreht, bevor ich das XP-System
überhaupt angeschaut habe. Das eigentliche Problem lag zwei Ebenen tiefer.

---

## Eintrag 3 — Das Inventar-System (beta 17.10:1)

Kisten kaufen, Gear rollen, Loadout bauen. Das übliche Roguelite-Futter.

**Design-Entscheidungen, die ich mit dem Auftraggeber geklärt habe:**

1. Items sind **permanent** — aber beim Tod wird zerstört, was du *ausgerüstet*
   hattest. Nicht ausgerüstetes Gear im Inventar bleibt sicher. Damit ist
   Ausrüsten eine echte Risiko-Entscheidung und kein Auto-Pilot.
2. Verzauberungen gibt es auf zwei Wegen: als Glücks-Drop **und** gezielt
   kaufbar (120 Shards).
3. **Afterlife** schützt ein einzelnes Item vor dem Todes-Penalty.

6 Slots, 4 Seltenheiten, 12 Affix-Typen, 3 Sets mit 2/4/6-Teile-Boni,
6 Verzauberungen. Alles in `config.js` — ein Item hinzufügen ist ein
Config-Eintrag, kein Code.

**Nicht gebaut:** die „Supporter-Kiste für 1,99 €". Der Button war fertig
verdrahtet, aber es gibt keinen Weg, in einem Browser-Spiel einzelne Kisten zu
verkaufen — itch.io kann nur den Spielkauf abwickeln, keine In-Game-Käufe. Ohne
Server mit Nutzerkonten und Kaufprüfung geht das nicht. Button wieder entfernt.

---

## Eintrag 4 — Die Kisten-Animation (beta 17.10:1)

Feedback zum ersten Wurf: „die animationen sind ur scheiße".

Berechtigt. Es war ein statisches Popup, das einfach da war. Der Moment, in dem
eine Kiste aufgeht, ist der emotionalste Punkt des ganzen Loops — der muss
sitzen.

Jetzt läuft eine Sequenz in drei Phasen:

1. **shake** — die Kiste rüttelt, ein Glow baut sich dahinter auf
2. **burst** — sie platzt auf: expandierender Lichtring, 40 Partikel, der
   Deckel kippt hoch
3. **cards** — die Item-Karten fliegen einzeln rein, von 0,72× hochskalierend,
   die neueste bekommt eine pulsierende Seltenheits-Aura

Der „Click to continue"-Hinweis blinkt erst, wenn alle Karten da sind, und ESC
kann die Sequenz nicht mehr mittendrin abbrechen.

---

## Eintrag 5 — Was ich beim Testen gefunden habe (beta 17.10:2/3)

### Der `+0`-Bug

Im Screenshot des Auftraggebers stand auf einer Karte „+0 Move Speed". Kein
Wert, ein Nichts.

Ursache: Ein Affix speichert den **Config-Schlüssel** (`moveSpeed`), aber die
Prozent-Erkennung prüfte gegen den **Stat-Namen** (`speedMult`). Dadurch fielen
Move Speed, Fire Rate, Crit Damage und XP Gain durch den Prozent-Zweig und
wurden als absolute Zahl gerundet:

```
0.034 Move Speed → Math.round(0.034) → "+0 Move Speed"
```

Zusätzlich stand in meiner Liste `xpGain` statt `xpGainMult` — deshalb war auch
XP Gain betroffen.

**Fix:** Die Anzeige löst erst über `def.stat` auf, dann wird formatiert.
Ergebnis: `+3% Move Speed` statt `+0 Move Speed`.

Zweiter Fehler aus demselben Screenshot: Beide Karten hießen „Common Augment".
Der Fallback-Name war `<Seltenheit> <Slot>` — zwei Augments waren damit
ununterscheidbar. Jetzt hat jeder Slot einen Namenspool:

```js
augment: ["Neural Spike", "Cortex Chip", "Reflex Node", "Shard Core", ...]
```

### Der Prestige-Bug

Meldung: „ich hab kein prestige bekommen nachdem ich den boss gekilled hab"

Der Endboss hat `xpMult: 100`. Beim Tod droppte er einen XP-Orb mit **73.434
XP**. Bei der Level-Kurve auf Welle 25 sind das ~150 Level-Ups auf einen Schlag.

Und so biss sich das mit dem Victory-Flow:

1. Boss stirbt → `pendingVictory = true` + Victory-Timer (1,5 s)
2. Der XP-Orb wird eingesammelt → Dutzende Upgrade-Screens
3. In `UPGRADE_SCREEN` läuft `manageWaves` **nicht** → der Victory-Timer steht
4. Die Gegner töten dich währenddessen → **Game Over statt Victory**
5. Kein Victory → kein Prestige

Live reproduziert: `state: GAME_OVER`, `pendingVictory: true` (hing fest),
Prestige unverändert.

**Drei Absicherungen:**
- Der Endboss droppt keinen XP-Orb mehr (der Run ist vorbei, die XP sinnlos)
- `triggerUpgrade` bricht ab, sobald `pendingVictory` gesetzt ist
- Ein offener Upgrade-Screen schließt sich selbst, wenn der Boss stirbt

### Der Spawn-Cap, der alles plattmachte

Beim Nachrechnen der Balance fand ich: `minSpawnCd = 0.30` greift ab Welle 19.
Jede Änderung an der Spawn-Kurve danach war wirkungslos — der Deckel saß drauf.
Deshalb kam jede Balance-Änderung im Endgame nicht an. Deckel auf 0.25 gesenkt.

---

## Eintrag 6 — Überkorrigiert (beta 17.10:3)

Zwischenstand der Balance, alle Werte aus der Simulation:

| | Original | Nach meinem Fix | Problem |
|---|---|---|---|
| Upgrades bis W25 | 19 | 42 | +121 % |
| Gegner-HP-Kurve | 1.22 | 1.18 | viel flacher |
| Spawn-Rampe | 0.92 | 0.94 | flacher |
| Kontaktschaden | 1.10 | 1.07 | flacher |

Ich hatte **vier Hebel gleichzeitig** aufgedreht. Ergebnis: Kill-Rate war
**3–4× so hoch wie die Spawnrate** ab Welle 10. Kein Druck, keine Gefahr,
Welle 25: Kontaktschaden nur noch 51 pro Treffer.

Von „unmöglich" auf „trivial" in einem Schritt. Die richtige Antwort lag
dazwischen:

```
Spawn-Rampe:      0.94 → 0.91
Spawn-Deckel:     0.30 → 0.25
Kontaktschaden:   1.07 → 1.12   (Welle 25: 51 → 151)
```

Ratio jetzt 0,48–1,29 ohne Gear, 0,72 mit. Echter Druck.

**Lehre:** Vier Hebel auf einmal zu drehen heißt, den Effekt nicht mehr zu
verstehen. Beim nächsten Mal einer nach dem anderen.

---

## Eintrag 7 — Endless Mode (beta 17.10:4)

Feedback: „es is immer noch bissl easy, und bounties sollten schwerer sein."

Und dann der Satz, der alles erklärte: **„ABER es sind alle meine upgrades auf
max, also vielleicht gehört das so"**

Genau das war es. Das Spiel ist auf einen frischen Account getunt. Ein voll
geskillter Account hat:

- **+16 Damage** auf 15 Basis = **+107 % Schaden**, permanent
- **+80 % XP** → ~50 % mehr Upgrades
- **+80 HP** → doppelte Überlebenskraft

Klassisches Problem: Die Kurve passt für neue Spieler, aber wer alles
freigeschaltet hat, langweilt sich.

**Zwei Optionen, die ich verworfen habe:**

- Meta-Boni abschwächen → bestraft genau die Spieler, die Zeit investiert haben
- Normale Schwierigkeit anheben → ruiniert das Spiel für jeden Neuling

**Gewählt:** Nach dem Endboss auf Welle 25 kommt ein Button **„♾ ENDLESS"**.
Victory und Prestige werden ganz normal vergeben — Endless ist freiwillig, man
verliert nichts. Ab Welle 26 stapelt eine zweite Kurve auf die normale:

```
Gegner-HP:      ×1.10 pro Welle
Kontaktschaden: ×1.06 pro Welle
Spawns:         enger
Kill-Ziel:      +6 pro Welle
```

Ergebnis:

| Welle | HP | Kontaktschaden | vs. W25 |
|---|---|---|---|
| 25 | 1.593 | 152 | 1,0× |
| 30 | 5.870 | 358 | 3,7× |
| 35 | 21.629 | 844 | 13,6× |
| 40 | 79.691 | 1.991 | 50× |

Ein maxed Account trifft auf eine Wand, die immer weiter wandert. Jede 5.
Endless-Welle ist ein weiterer Endboss mit Bonus-Shards, der Bestwert wird
gespeichert.

**Bounties** waren praktisch Freeloot — kaum zäher als normale Elites:
HP ×2,2 → ×3,4, Speed ×1,15 → ×1,3, Reward 8 → 12.

---

## Was noch offen ist

Ehrlich, nicht geschönt:

- **CrazyGames-Submit:** `LEADERBOARD_ENCRYPTION_KEY` ist noch Doku-Platzhalter,
  Thumbnails fehlen
- **Balance nach Endless:** Die neue Kurve ist berechnet, aber noch nicht
  wirklich durchgespielt. Ob Welle 35 die Wand ist oder schon 30, muss sich
  zeigen
- **Upgrade-Screens stapeln sich** bei x10-Speed. Vielleicht gehört die
  Level-Kurve im späten Spiel steiler (weniger, aber bedeutungsvollere Upgrades)
- **Item-Namen alter Saves** bleiben generisch — nur neue Rolls bekommen die
  konkreten Namen
- **Kein Audio-Devlog-Eintrag**, weil ich daran noch nichts gemacht habe

---

## Werkzeuge, die ich mir gebaut habe

- `tools/gen_skins.py` — PixArt-Generator für die fehlenden Skins
- `tools/loot_selftest.js` — 15 Assertions über das Loot-System (Rarity-Verteilung,
  Set-Tiers, Enchant-Slots, Save/Load-Roundtrip, Afterlife-Schutz)
- `_verify_all.py` (in `dsai/Notebooks`) — prüft alle Notebooks auf leere Zellen
  und führt sie durch

Der Loot-Selbsttest läuft bei jedem Commit. Er hat mir beim Aufräumen zwei
kaputte Funktionen gefangen, die ich beim Umbau versehentlich gelöscht hatte.

---

## Zahlen

- **94 Commits** über das Projekt
- **~11.000 Zeilen** Code (ohne Assets)
- **0 Abhängigkeiten** im Spiel selbst
- **15/15** Loot-Tests grün
- Diese Session: 13 Commits, 3 echte Bugs gefunden, 2 Balance-Iterationen

---

## Die ehrlichste Lehre aus dieser Session

Ich habe dreimal an der falschen Stelle gedreht:

1. Gegner-HP gesenkt, statt das XP-System anzuschauen
2. Vier Balance-Hebel gleichzeitig aufgedreht
3. Beim Layout-Fix eine 18px-Überlappung erzeugt, die ich erst im Browser sah

Jedes Mal lautete die Lösung: **nachrechnen statt schätzen.** Als ich angefangen
habe, die echten Werte zu simulieren (DPS, Kill-Rate, Ratio, XP-Kurve), waren
die Fixes sofort offensichtlich. Vorher habe ich geraten, und dreimal daneben
gegriffen.

Und einmal war die beste Antwort, *nicht* zu tun, was gefragt war: „Mach es
härter" hätte das Spiel für neue Spieler ruiniert. Der Endless-Modus löst
dasselbe Problem, ohne jemandem etwas wegzunehmen.
