# Prüfstand · 0.1.0

Stand: 15. Oktober 2026. Geprüft unter Node.js 20.20.2 und Yarn 1.22.22 auf macOS.

## Erfolgreich

- `yarn install` (abschließende Installation aus dem bereits gefüllten Cache mit `--offline`): erfolgreich; Lockfile aktualisiert.
- `yarn gulp lint`: ohne Fehler oder Warnungen des Linters.
- `yarn gulp test`: 34 bestandene Tests. Default-Content, strikte Validierung, Kopieren, Überlappung/Ersetzen, Taktgrenzen, Taktwechsel, Pausensummen, Balkengruppen, alle neun Taktarten bei drei Tempi, zwei Komponenteninstanzen, Wiederherstellen serialisierter Eingaben, Tastaturbedienung, Drag-and-drop, Löschen, Abbruch, Lesemodus, Redaktion, Audio-Start, Timeout, Stop und iPhone-Medienstream mit simulierten APIs.
- `yarn gulp build`: erfolgreich; Übersetzungen werden vor dem Kopieren nach dist erzeugt.
- `yarn gulp buildTestApp`: erfolgreich.
- `yarn gulp buildPreview`: erfolgreich.
- Eingebetteter Desktop-Browser: Baustein setzen, Notenanzeige, Einzähler, Wiedergabestart, unabhängige zweite Instanz, Wiederherstellung nach Neuladen, Redaktionsansicht und Englisch geprüft. Keine Browserfehler oder Warnungen im geprüften Ablauf.
- Schmaler 280-Pixel-Container: clientWidth und scrollWidth jeweils 278 Pixel; kein horizontaler Überlauf. Takte umbrechen in Fortsetzungen, Raster bleibt 24 Pixel pro Punkt.
- Quellprüfung: keine verbliebenen fachlichen Funktionen des Referenztools, keine zusätzlichen Controller, keine externen Audio-/Bild-/Schrift-/CDN-Aufrufe, keine globalen Plugin-DOM-IDs. SVG-Namespace-URLs sind keine Netzwerkanfragen.
- Git ignoriert IDE-Dateien, lokale Zugangsdaten, node_modules, dist, Coverage und gebaute Test-App-Dateien. Keine Commits oder Pushes ausgeführt.

## Grenzen und nächste Abnahme

Docker ist auf diesem Rechner nicht verfügbar. Deshalb wurde die vollständige Educandu-Test-App gebaut, aber nicht mit MongoDB/MinIO gestartet. Die Browser-Prüfansicht verwendet die echten React-Komponenten mit einem lokalen Host für `content` und `input`; sie ist kein Nachweis für serverseitiges Speichern, Anmeldung oder Berechtigungen. Diese Abläufe vor Veröffentlichung in der vollständigen Test-App prüfen.

Ein iPhone/iPad-Hörtest (insbesondere Klingelton-Stummmodus, Hintergrundwechsel, Bluetooth und Kopfhörer) steht aus. Die simulierten Medientests prüfen Start und Aufräumen, nicht das Verhalten physischer Hardware. Separate reale Tests unter Safari, Firefox, Edge und Android sind ebenfalls noch offen.

Die Installation meldet zwei aus Educandu stammende Abhängigkeitswarnungen: die bestehende `gl`-Resolution und die veraltete React-Peer-Angabe von `react-region-select`. Keine eigenen Lint-/Buildfehler; beide Warnungen sind vor einer späteren Aktualisierung des Educandu-Unterbaus erneut zu bewerten.

Das npm-Paket wurde nicht veröffentlicht, das GitHub-Repository nicht angelegt oder gepusht und die OMA-Installation nicht geändert. Die Versionsnummer 0.1.0 bezeichnet den lokalen Entwicklungsstand.
