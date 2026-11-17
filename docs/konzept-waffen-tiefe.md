# Konzept: Waffen-Tiefe (Update nach beta 10.11:2)

Stand 2026-11-17. Entwurf, noch nicht gebaut. Punkt 8 der CrazyGames-Achterliste.

## Ist-Stand

Vier Waffen (Orbit Shield, Lightning Aura, Frost Nova, Flame Trail), eine davon
gratis zu Run-Beginn. Jede Stufe erhoeht nur Zahlen (Schaden, Reichweite, Takt,
Anzahl). Es gibt keine Stufenobergrenze, keine neue Verhaltensweise ab einer
Stufe und keine Wechselwirkung zwischen Waffen oder zwischen Waffe und Stat.
Die Entscheidung im Level-Up-Bild ist darum immer dieselbe: "noch ein +1".

Richtwerte heute auf Stufe 5 (Code in `updateWeapons`):

| Waffe | Stufe 5 | Grobe Wirkung |
|---|---|---|
| Orbit Shield | 6 Kugeln, Radius 140, 38 Schaden alle 0,3 s pro beruehrtem Gegner | ~125 DPS pro Kontakt, blockt Kugeln |
| Lightning Aura | 6 Ziele, 50 Schaden alle 0,2 s, Reichweite 270 | bis 1500 DPS in Flaeche, staerkste Waffe |
| Frost Nova | 25 Schaden alle 1,5 s, Reichweite 255, Slow 3 s auf 35 % | ~17 DPS, reine Kontrolle |
| Flame Trail | Flecken 24 Schaden alle 0,3 s, 3,5 s lang, Radius 31 | ~80 DPS pro Fleck, nur wenn man sich bewegt |

Gegner-HP: 30 x 1,18^(Welle-1), also Welle 10 etwa 133, Welle 20 etwa 690,
Welle 25 etwa 1590 (Tank x3,5).

## Konzept in einem Satz

Jede Waffe bekommt auf Stufe 5 eine **Entwicklung** mit neuem Verhalten, die
nur angeboten wird, wenn der Spieler vorher einen bestimmten **Schluessel-Stat**
genommen hat; dazu drei **Synergien** zwischen Waffenpaaren, die von selbst
greifen, sobald beide Waffen Stufe 3 haben.

Damit entstehen Builds: "Ich nehme Bullet Size, weil ich den Orbit entwickeln
will", "Ich nehme Frost dazu, weil der Blitz dann haerter trifft".

## Teil 1: Entwicklungen

Angebot als eigene Karte (Seltenheit epic, Kategorie weapon), einmal pro Waffe.
Bedingung: Waffe Stufe 5 oder hoeher UND Schluessel-Stat mindestens einmal
genommen. Weitere +1 nach der Entwicklung skalieren die entwickelte Form
weiter. Obergrenze Stufe 8, danach verlaesst die +1-Karte den Pool (wie die
Deckel bei Feuerrate und Multi-Shot).

| Waffe | Schluessel | Entwicklung | Neues Verhalten |
|---|---|---|---|
| Orbit Shield | Bullet Size | **Singularity** | Die Kugeln verschmelzen zu einer grossen Kugel (Radius 26), die Gegner in 90 px Umkreis zu sich zieht und dauerhaft trifft. Geblockte Gegnerkugeln werden als eigene Kugeln zurueckgeworfen. |
| Lightning Aura | Crit Chance | **Storm Chain** | Jeder Blitz springt bis zu 3-mal weiter (Reichweite 110 pro Sprung, je Sprung 75 % Schaden). Blitze koennen kritisch treffen und nutzen Crit-Chance und Crit-Schaden des Spielers. |
| Frost Nova | Range | **Absolute Zero** | Reichweite folgt der Spieler-Range. Gegner, die ein zweites Mal verlangsamt werden, frieren 1,5 s ein (Geschwindigkeit 0). Stirbt ein eingefrorener Gegner, zerspringt er: 60 % seiner Max-HP als Flaechenschaden im Radius 70. Bosse frieren nicht, zerspringen nicht. |
| Flame Trail | Move Speed | **Inferno** | Flecken halten doppelt so lang und zuenden Gegner an: 3 s Brand mit 40 % des Fleckschadens pro Sekunde. Brennende Gegner stecken Gegner an, die sie beruehren (einmal weitergeben, nicht endlos). |

Warum diese Schluessel: Bullet Size hat sonst nur eine Karte und keine
Verwendung im Build; Crit ist am Blitz heute wirkungslos; Range ist bei
Auto-Aim oft unattraktiv; Move Speed passt zum Trail, der Bewegung braucht.
Jeder Schluessel ist ein common-Stat, also erreichbar, aber eine bewusste Wahl.

## Teil 2: Synergien

Passiv, ohne Karte. Greifen, sobald beide Waffen mindestens Stufe 3 haben.
Werden im Build-Overview als eigene Zeile "SYNERGY" angezeigt und auf der
Karte der zweiten Waffe vorher angekuendigt ("Lv 3: Supraleiter mit Frost").

| Paar | Name | Wirkung |
|---|---|---|
| Frost Nova + Lightning Aura | **Supraleiter** | Blitze auf verlangsamte Gegner machen +50 % Schaden. |
| Flame Trail + Frost Nova | **Thermoschock** | Ein verlangsamter Gegner, der einen Flammenfleck betritt, nimmt einmalig 3x Fleckschaden und verliert den Slow. |
| Orbit Shield + Flame Trail | **Brennende Bahn** | Jede Kugel hinterlaesst alle 0,5 s einen kleinen Flammenfleck (halber Radius, halbe Dauer). |

Bewusst keine Synergie Orbit + Lightning: der Blitz ist heute schon die
staerkste Waffe, er bekommt mit Storm Chain genug.

## Teil 3: Overdrive und Waffen

Das Power-up Overdrive beschleunigt heute nur das Hauptgeschuetz (x1,8).
Neu: Waffen-Timer laufen waehrend Overdrive mit x1,5. Billig zu bauen, macht
Overdrive fuer Waffen-Builds spuerbar.

## Anzeige

- Level-Up-Karte der Entwicklung: eigener Rahmen in epic-Lila, Name, zwei
  Zeilen Beschreibung, Hover zeigt die geaenderten Zahlen wie bisher.
- Waffen-Karte vor Stufe 5 zeigt unten klein: "Lv 5 + Bullet Size -> Singularity".
  So weiss der Spieler, wofuer er sammelt.
- Build-Overview (Pause und Level-Up): Waffenzeile zeigt "Lv 6 - Singularity",
  neue Zeile "SYNERGY" mit aktiven Paaren.
- HUD-Waffenicons rechts unten: entwickelte Waffen bekommen einen goldenen Ring.
- Cheat-Menue: Zeile pro Waffe bekommt einen Schalter "entwickelt" zum Testen.

## Balance-Vorgehen

Wie abgemacht: erst rechnen, dann Bot-Simulation, dann bauen, nie blind.

1. Headless-Simulation (Node fehlt am PC, also im Browser ueber den
   roguewave-Launch-Eintrag, Spielschleife per setInterval angetrieben):
   Bot steht mittig, bewegt sich im Kreis, nimmt feste Build-Reihen.
   Gemessen wird pro Welle 5/10/15/20/25: Kills pro Sekunde, erlittener
   Schaden, Zeit bis Wellenende.
2. Vergleich je Waffe: Stufe 5 ohne Entwicklung, mit Entwicklung, mit
   Synergie. Ziel: Entwicklung bringt +25 bis +40 % Kill-Rate und eine
   Komfortverbesserung, keine Verdopplung. Synergie +10 bis +20 %.
3. Blitz bleibt Referenz oben, Frost darf durch Absolute Zero von reiner
   Kontrolle auf etwa Flame-Niveau Schaden kommen.
4. Lag-Grenzen pruefen: Inferno-Ansteckung und Brennende Bahn erzeugen
   Flecken, MAX_FLAME_PATCHES (50) und dynamicCap muessen halten; Storm Chain
   erzeugt bis zu 4x so viele Blitzlinien, MAX_LIGHTNING_BOLTS (20) ebenso.

## Messung (2026-11-17, tools/weapon_sim.js im Browser)

Bot mit etwa zwei Stat-Karten pro Welle, 45 s pro Lauf, drei Laeufe gemittelt,
Kills pro ueberlebter Sekunde. Vergleich jeweils gleicher Build mit und ohne
Entwicklung (Waffe Stufe 5 plus Schluessel-Stat) bzw. mit und ohne Synergie
(beide Waffen Stufe 3). Streuung etwa plus/minus 10 Prozent.

| Was | Welle 10 | Welle 15 | Welle 20 | Zahlen am Ende |
|---|---|---|---|---|
| Singularity | +63 % | +35 % | Bot stirbt | eine Kugel, Bahnradius 200, 1,2 rad/s, Sog 230 px mit 380 px/s, Schaden x1,8 alle 0,12 s |
| Storm Chain | +5 % | +36 % | +49 % | 3 Spruenge, 110 px, je Sprung 70 % |
| Absolute Zero | +32 % | +6 % | +25 % | Reichweite max(Basis, 85 % Spieler-Range), Frost 1,5 s, danach 3 s nicht einfrierbar, Zersplittern 60 % Max-HP im Radius 70 |
| Inferno | +25 % | +31 % | Bot stirbt | Flecken doppelt so lang, Brand 3 s mit 40 % Fleckschaden pro Sekunde, einmal weitergegeben |
| Superconductor | +30 % | +5 % | +11 % | +50 % Blitzschaden auf kalte Gegner |
| Thermal Shock | +27 % | +14 % | 0 % | kalte Gegner nehmen 2,5x Feuerschaden (erste Fassung mit Auftauen war -10 %, verworfen) |
| Burning Orbit | +42 % | -2 % | -2 % | pro Kugel alle 0,4 s ein Fleck, Radius 12 + 2,5/Stufe, Dauer 1 + 0,3/Stufe s |

Erste Singularity-Fassung (eine Kugel auf der alten Bahn, Sog 90 px zum
Spieler hin) war -8 % und zog die Gegner zum Spieler; verworfen. Obergrenze
Flammenflecken von 50 auf 110 angehoben, Burning Orbit und Inferno stossen
sonst an. Blitzlinien bleiben bei 20 (nur Optik).

## Umfang und Reihenfolge

1. Datenmodell: `evolved`, `burnT`, `frozenT`, `slowStacks` an Gegnern,
   `evolved` und Cap an Waffen, Synergie-Pruefung als Funktion.
2. Vier Entwicklungen im Code (`updateWeapons`, Enemy-Status, Projektil-Rueckwurf).
3. Drei Synergien und Overdrive-Takt.
4. Karten, Pool-Filter, Build-Overview, HUD-Ringe, Cheat-Menue.
5. Simulation und Zahlen festziehen.
6. Changelog beta 17.11:1 (oder Datum des Pushes), Lenny spielt, dann main.

Geschaetzt zwei bis drei Arbeitsrunden plus Lennys Spieltest. Arbeit in einem
frischen Clone auf Branch `weapon-depth`, Test im Browser, Push auf main erst
nach Lennys Okay (deployt sofort auf itch). Die CrazyGames-Zip wird danach
neu gebaut, da die Neueinreichung noch aussteht.

## Entscheidungen (Lenny, 2026-11-17)

1. Entwicklung ist an den Schluessel-Stat gebunden.
2. Entwicklungen, alle drei Synergien und der Overdrive-Takt kommen zusammen ins Update.
3. Stufenobergrenze 8 fuer jede Waffe.
4. Namen im Spiel auf Englisch wie der Rest der Texte.
