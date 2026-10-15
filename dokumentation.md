# Takt-Klick-Tool

## Rhythmen bauen · Educandu-Plugin v0.1.0

Mit diesem Tool legst du einen Rhythmus aus farbigen Bausteinen. Die Breite der Steine bleibt bei jeder Fenstergröße und Taktanzahl gleich (24 CSS-Pixel pro Punkt). Takte werden auf mehrere Zeilen verteilt. Auf sehr schmalen Flächen wird ein Takt in beschrifteten Fortsetzungszeilen dargestellt; breite Palettensteine zeigen ihre Punkte in mehreren Reihen. Die Länge eines Steins zeigt seine Dauer: Ein Punkt entspricht einer Sechzehntelnote. Jeder Stein erzeugt beim Abspielen genau einen Klatschlaut an seinem Anfang.

### Bausteine und Notenwerte

| Notenwert | Punkte | Farbe |
| --- | ---: | --- |
| Ganze | 16 | Weiß |
| Punktierte Halbe | 12 | Orange |
| Halbe | 8 | Gelb |
| Punktierte Viertel | 6 | Lila |
| Viertel | 4 | Rot |
| Punktierte Achtel | 3 | Türkis |
| Achtel | 2 | Blau |
| Sechzehntel | 1 | Grün |

**Punktierte Noten anzeigen** blendet die punktierten Bausteine in der Sammlung ein. Erneutes Drücken blendet sie aus. Bereits platzierte Steine bleiben dabei erhalten.

### Einen Rhythmus bauen

1. Wähle oben die **Taktart** und unter **Takte** die Anzahl: 1, 2, 4 oder 8. Alle Takte haben dieselbe Taktart.
2. Ziehe einen Baustein aus der Sammlung an die gewünschte Stelle. Während des Ziehens folgt der Stein dem Cursor; das Raster zeigt die mögliche Platzierung. Alternativ: Stein anklicken, dann eine freie Position im Takt anklicken.
3. Verschiebe platzierte Steine durch Ziehen, auch zwischen den Takten. Jeder Stein muss vollständig in einen einzelnen Takt passen.

Ziehst du einen Stein auf belegte Plätze, ersetzt er alle Steine, die er dort überlappt, jeweils vollständig. Ziehst du einen platzierten Stein nach unten aus der Taktzeile, wird er gelöscht. Auch ein Doppelklick, Entf oder Rücktaste entfernt ihn. Mit den Pfeiltasten links/rechts lässt sich ein fokussierter Stein auf freie Nachbarpositionen verschieben.

Bei einer ungültigen Platzierung erscheint ein auffälliger Hinweis an der betreffenden Stelle. Er verschwindet nach kurzer Zeit oder mit Escape.

### Mehrere Takte und automatische Pausen

Die Takte bilden eine zusammenhängende Folge und werden passend zur verfügbaren Breite umgebrochen. Fortsetzungszeilen gehören weiterhin zum selben Takt.

Freie Plätze bleiben mit Steinen belegbar. Bei eingeschalteter Notenanzeige ergänzt das Tool dort automatisch passende **Pausenzeichen**. Sobald du einen Stein setzt, verschiebst oder löschst, werden die Pausen angepasst. Pausen erzeugen keinen Klatschlaut; ein zugemischtes Metronom läuft weiter.

Wenn du die Taktanzahl verringerst, werden die entfernten Takte samt Inhalt gelöscht. Beim Wechsel zu einer kürzeren Taktart werden überstehende Steine entfernt. Das Tool zeigt jeweils eine Meldung an. Passende Steine behalten ihren Takt und ihre Position innerhalb des Taktes.

**Reset** leert alle Takte und stoppt die Wiedergabe. Taktart, Taktanzahl, Tempo, Mix und Anzeigeeinstellungen bleiben erhalten.

### Noten und Balkengruppen

**Noten anzeigen/ausblenden** schaltet die Notenzeile unter den Bausteinen um. Gleichzeitig erscheinen bei den Beschriftungen der Bausteinsammlung die passenden Notensymbole, einschließlich der Punktierungen. Beim Ausblenden verschwinden auch diese Symbole.

**Balken/Fähnchen** wechselt die Darstellung kurzer Noten und blendet bei Bedarf die Notenzeile ein. Zusammenhängende kurze Noten werden abhängig von der Taktart gruppiert:

- **6/8, 9/8 und 12/8:** Gruppen über jeweils drei Achtel.
- **2/2:** Gruppen über jeweils eine halbe Note.
- **Übrige angebotene Taktarten:** Gruppen über jeweils eine Viertelnote.

Lücken trennen Balkengruppen. Allein stehende Achtel und Sechzehntel behalten ihre Fähnchen. Punktierungen erscheinen als Punkt neben dem Notenkopf.

### Abspielen, Cursor und Wiederholung

**Abspielen** spielt alle Takte nacheinander, einschließlich der Pausen. **Stoppen** beendet die Wiedergabe. **Wiederholen** wiederholt die gesamte Taktfolge.

**Einzähler: an/aus** schaltet einen vollständigen Takt zum Vorzählen ein. Standardmäßig ist er aus. Der Einzähler verwendet Tempo und Taktart der Folge und bleibt auch bei der Mix-Einstellung „Nur Rhythmus“ hörbar. Die aktuelle Zählzeit erscheint groß in einem mittigen Popup (zum Beispiel „2 von 4“). Das Popup verschwindet automatisch beim Beginn des Rhythmus oder beim Stoppen. Danach beginnen Rhythmus und Cursor. Bei Wiederholungen wird nicht erneut eingezählt. Stoppen bricht auch den Einzähler ab; eine Änderung des Buttons stoppt die laufende Wiedergabe.

Eine **rote senkrechte Linie** zeigt die Abspielposition. Sie wechselt beim Zeilenwechsel in die nächste Zeile. Auch während Pausen läuft sie weiter. Bei Wiederholung beginnt sie am Anfang; beim Stoppen verschwindet sie.

### Tempo und Lautstärke-Mix

Das Tempo reicht von **40 bis 200 Vierteln pro Minute**. Dieser Bezug bleibt auch bei Taktarten mit anderem Nenner gleich.

Der Schieberegler zwischen **Metronom** und **Rhythmus** mischt zwei Klänge:

- Ganz links: nur das Metronom als Beep.
- Mitte: gleiche Mischpegel für Metronom und Rhythmus.
- Ganz rechts: nur den Rhythmus als Clap.

Der Mix lässt sich während der Wiedergabe verändern. Ohne Bausteine kannst du das Tool als Metronom nutzen, solange dessen Anteil nicht auf null steht. Das Metronom schlägt auf jedem Nennerwert der Taktart: bei 6/8 also sechsmal pro Takt. Der erste Schlag jedes Taktes klingt höher.

Änderungen am Rhythmus, an Taktart, Taktanzahl oder Tempo stoppen die Wiedergabe. Auch das Umschalten der Wiederholung stoppt eine laufende Wiedergabe; anschließend erneut Abspielen drücken.

Der Rhythmus wird nicht dauerhaft gespeichert. Beim Neuladen der Seite beginnt das Tool wieder mit einem leeren Takt.

## Technische Details

Das Tool ist ein natives React-Plugin für Educandu 4. Der Typ lautet `raphael-mayrhofer/educandu-plugin-takt-klick-tool`. Es benötigt keine externe Notations- oder Klangquelle.

### Redaktion und gespeicherte Eingaben

Im Bearbeitungsmodus werden Taktart, Taktanzahl, Tempo, Mix, Anzeigeoptionen, Einzähler, Wiederholung und ein optionaler Ausgangsrhythmus festgelegt. Die Lernenden bearbeiten ihre eigene Fassung. In Kontexten mit aktivierter Eingabespeicherung speichert Educandu diese Änderungen und stellt sie beim erneuten Öffnen wieder her. Im Lesemodus sind Änderungen am Rhythmus gesperrt; Anzeige und Wiedergabe bleiben bedienbar.

### Darstellung und Klänge

Noten und Pausen werden als lokale SVG-Grafiken erzeugt. Ein Punkt entspricht einer Sechzehntelnote. Die Gruppierung folgt Vierteln, in 6/8, 9/8 und 12/8 drei Achteln und in 2/2 einer Halben. Der Mix verläuft linear; in der Mitte sind Metronom und Rhythmus gleich gewichtet.

Web Audio erzeugt Clap und Beep. Der Einzähler dauert einen Takt und bleibt unabhängig vom Mix hörbar. Auf iPhone/iPad ergänzt ein lokal erzeugter lautloser Medienstream die Freigabe beim Start. Medienlautstärke und Ausgabegerät bleiben maßgeblich. Die Funktion bei eingeschaltetem Klingelton-Stummmodus muss auf dem jeweiligen Gerät geprüft werden.

### Schmale Ansichten

Rasterpunkte behalten ihre Breite. Ganze Takte werden möglichst zusammen dargestellt. Reicht die Breite nicht, erscheinen Fortsetzungszeilen. Ein dort aufgeteilter Stein bleibt musikalisch ein einziger Ton. Breite Steine in der Sammlung zeigen ihre Punkte gegebenenfalls in mehreren Reihen. Es gibt keine internen Scrollbalken.

### Entwicklung und Prüfung

Die README beschreibt Einrichtung, Quelldateien, Tests und spätere OMA-Integration. `TESTING.md` nennt bestandene Prüfungen und verbleibende Gerätetests.
