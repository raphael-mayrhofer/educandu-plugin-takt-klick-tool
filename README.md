# Rhythmen bauen

Natives React-Plugin für Educandu 4 und die Open Music Academy. Rhythmische Bausteine lassen sich platzieren, verschieben, ersetzen, notieren und als Clap mit Beep-Metronom abspielen. Ausgangspunkt ist das eigene HTML-Tool v1.6.7; der Laufzeitcode verwendet keine iframe-Einbettung.

- Paket: `@raphael-mayrhofer/educandu-plugin-takt-klick-tool`
- Plugin-Typ: `raphael-mayrhofer/educandu-plugin-takt-klick-tool`
- Version: `0.1.0` (lokaler Entwicklungsstand, noch nicht veröffentlicht)
- Vorgesehenes Repository: https://github.com/raphael-mayrhofer/educandu-plugin-takt-klick-tool
- [Benutzungsdokumentation](dokumentation.md), [Prüfstand](TESTING.md), [Lizenzen](THIRD-PARTY.md)

## Entwicklung

Voraussetzungen: Node.js 20 (geprüft mit 20.20.2), Yarn Classic 1.22.22. WebStorm: unter **Settings → Languages & Frameworks → Node.js** Node 20 und Yarn 1 auswählen. `.nvmrc` legt die Hauptversion fest. `yarn.lock` ist Teil des Projekts; direkte Entwicklungsabhängigkeiten sind exakt versioniert. React 18.2.0 wird in der Test-App einheitlich aufgelöst, damit Ant Design keine zweite React-Instanz lädt.

```sh
yarn install
yarn gulp lint
yarn gulp test
yarn gulp build
yarn gulp buildTestApp
```

`build` erzeugt zuerst `src/translations.json` aus YAML und danach `dist`. Die JSON-Datei wird eingecheckt, `dist`, Coverage und Test-App-Builds werden ignoriert. Benötigte Laufzeitbibliotheken kommen als Peer-Abhängigkeiten aus Educandu; es gibt keine zusätzliche Audio-/Notationsbibliothek und keine externen CDN-Ressourcen.

## Lokale Oberflächenprüfung ohne Datenbank

```sh
yarn gulp buildPreview
python3 -m http.server 8765 --bind 127.0.0.1 --directory test-app/preview-dist
```

http://localhost:8765 zeigt dieselben React-Komponenten mit zwei Instanzen, Sprachwechsel, schmalem Container und Redaktionsmodus. Nur diese Prüfansicht speichert Lernendeneingaben in `localStorage`. Sie ersetzt keinen Ende-zu-Ende-Test des Educandu-Servers. Zum Leeren die Reset-Buttons verwenden.

## Vollständige Educandu-Test-App

Zusätzlich Docker mit laufendem Dienst bereitstellen. Einmal `yarn gulp setupTestEnvironment` ausführen. Die Aufgabe erstellt eine private, von Git ausgeschlossene `.env` mit zufälligen lokalen Zugangsdaten und überschreibt keine vorhandene Datei. Anmeldung: Werte unter `TEST_APP_INITIAL_USER` in dieser Datei. Niemals `.env` veröffentlichen.

Danach `yarn gulp serve` (oder `yarn gulp watch`) starten. Educandu ist unter http://localhost:3000 erreichbar. MongoDB, MinIO, Maildev und der lokale Medienproxy verwenden die Vorlage des Referenzprojekts. `yarn gulp down` stoppt/entfernt die Entwicklungscontainer; dabei den Verlust lokaler Testdaten berücksichtigen. Eine fehlende Docker-Installation verhindert den Serverlauf, nicht die Builds oder Komponententests.

## Architektur

- `src/takt-klick-tool-info.js`: Typ, Icon, Gruppe, Default-Content, strikte Joi-Validierung und unabhängige Kopien.
- `src/takt-klick-tool-editor.js`: redaktionelle Ausgangseinstellungen einschließlich Ausgangsrhythmus über dieselbe Bedienoberfläche.
- `src/takt-klick-tool-display.js`: React-Zustand, Eingaben, Pointer-/Tastaturbedienung, ResizeObserver, Cursor, Popups.
- `src/rhythm-model.js`: Platzierung, Überschneidungen, Taktwechsel, Pausen, Balkengruppen und Einzählerzeit.
- `src/notation.js`: aus validierten Zahlen generierte lokale SVGs; keine nutzergelieferten HTML-Fragmente.
- `src/audio-engine.js`: instanzbezogener Web-Audio-Transport und iOS-Medienfreigabe, Abbruch und Freigabe der Ressourcen.
- `src/takt-klick-tool.less`: ausschließlich Plugin-Klassen mit `EP_RaphaelMayrhofer_TaktKlickTool_`.
- `src/takt-klick-tool.yml`: gepflegte deutsche und englische Texte.

`content` enthält Startwerte: Taktart, Taktanzahl, Tempo, Mix, Anzeigeoptionen, Wiederholung, Einzähler und `blocks`. Lernendeneingaben werden als `{ version: 1, state: {...} }` an `onInputChanged` übergeben und aus `input.data` wiederhergestellt. Ungültige gespeicherte Eingaben führen zu einem sichtbaren Hinweis und dem Ausgangsrhythmus. `canModifyInput` schützt Rhythmusänderungen; Anzeige und Wiedergabe bleiben auch lesend bedienbar, ohne Eingaben zu speichern. Das eigentliche Speichern verantwortet Educandu.

Alle Zustände, AudioContext-Instanzen, Timer und Observer gehören einer Komponenteninstanz. Unmount, Stop und Hintergrundwechsel beenden die Wiedergabe. Die optionale browserweite AudioSession wird für Medienwiedergabe angefordert; sie wird nicht durch das Stoppen einer einzelnen Instanz auf ambient zurückgesetzt, was andere gleichzeitig spielende Instanzen stummschalten könnte.

## Responsives Layout

Ein Rasterpunkt bleibt 24 CSS-Pixel breit. Takte fließen in mehrere Zeilen. Ist ein einzelner Takt breiter als der Container, wird er an Zählgruppen auf mehrere beschriftete Fortsetzungszeilen verteilt. Übergreifende Steine erscheinen dort in Teilstücken, behalten aber ihre Dauer und einen einzigen Anschlag. Sehr lange Palettensteine ordnen ihre Punkte in mehreren Reihen an. Es gibt keine eigenen Scrollcontainer mit `overflow: auto` oder `overflow: scroll`; die Seite kann bei großem Inhalt regulär länger werden. Die Notation folgt dem Raster; der Cursor wechselt in die jeweilige Zeile. Das frühere horizontale DAW-Mitscrollen entfällt zugunsten dieser angeforderten Darstellung ohne Scrollbalken.

## Zusammenarbeit in WebStorm

Der lokale Stand wird ohne Commit und Push übergeben. Das GitHub-Repository muss vor dem ersten Push existieren; seine Erstellung und die Paketveröffentlichung sind noch offen.

Für den ersten geprüften Stand:

1. **Commit**-Fenster öffnen.
2. `src`, `test-app/src`, `test-app/preview`, `package.json`, `yarn.lock`, `gulpfile.js`, `vitest.config.js`, Projekt-Konfigurationsdateien, `README.md`, `dokumentation.md`, `TESTING.md`, `THIRD-PARTY.md` und `LICENSE` auswählen. Keine `.idea`, `.env`, `node_modules`, `dist` oder Coverage-Dateien auswählen.
3. Nachricht: **Add native Educandu rhythm bricks plugin**.
4. **Commit** ausführen.
5. **Git → Push…** öffnen.
6. `main → origin/main` und die Repository-Adresse kontrollieren.
7. **Push** ausführen.

Nach diesem Ausgangsstand `main` stabil halten. Neue Funktionen über den Branch-Dialog in einem eigenen Feature-Branch entwickeln und anschließend einen Pull Request öffnen. Es wurde keine automatische Veröffentlichung eingerichtet.

## Spätere OMA-Integration

Erst nach vollständigem Server-/Gerätetest und versionierter npm-Veröffentlichung:

1. In `oma-web/package.json` die geprüfte Paketversion aufnehmen.
2. In `src/custom-resolvers.js` den Default-Export des Pakets unter `resolveCustomPluginInfos` ergänzen.
3. In `src/index.js` `raphael-mayrhofer/educandu-plugin-takt-klick-tool` in der Plugin-Liste und den aufgelösten Paketpfad `translations.json` in den Ressourcen registrieren.
4. In `src/main.less` `@raphael-mayrhofer/educandu-plugin-takt-klick-tool/takt-klick-tool.less` importieren.

Ein eigener Controller, CDN-Einträge und Redaction-Funktionen sind nicht erforderlich. Die Test-App zeigt die Registrierung bereits. OMA wurde nicht verändert.
