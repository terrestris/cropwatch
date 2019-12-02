# cropwatch

### Requirements
  - npm > v8.3
  - Postgres-Database with schema `auswertung`
    - Configuration at `./backend/config/database.json`
  - Create `./backend/config/database.js` with the following content: And change the password for production!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains database credentials!
   */
  const config = {
    "development": {
      "database": "cropwatch",
      "username": "cropwatch",
      "password": "cropwatch",
      "dialect": "postgres",
      "host": "localhost",
      "port": 5555,
      "protocol": "postgres",
      "schema": "auswertung",
      "logging": false
    },
    "production": {
      "database": "cropwatch",
      "username": "cropwatch",
      "password": "cropwatch",
      "dialect": "postgres",
      "host": "localhost",
      "port": 5432,
      "protocol": "postgres",
      "schema": "auswertung",
      "logging": false
    }
  };

  module.exports = config;
  ```

  - Create `./backend/config/passport.js` with the following content: And change the password!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains the
   * jwt secret!
   */
  module.exports = {
    'secretOrKey': 'My5UPERsecr3tPassw0rd'
  }
  ```
  - Create `./backend/config/projectPassword.js` with the following content: And change the password!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains the
   * project password!
   */
  module.exports = "PR0JECTPA55W0RD";
  ```
  - Create `./backend/config/upload.js` with the following content: And change the credentials!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains the
   * geoserver credentials!
   */
  module.exports = {
    uploadPath: '/data/tractor_images',
    geoserverPath: 'http://USER:PASSWORD@localhost/geoserver/',
    geoserverWorkspace: 'import'
  }
  ```

### Setup
  - Run `npm install` in `./frontend` and `./backend`.

### Development
  - Development with VisualStudio Code (recommended)
    - Run backend in debug mode with `F5`
      - `debugger` can be used
      - Configuration at `./.vsccode/launch.json`
    - Run frontend with `Ctrl + Shift + B` --> `Start frontend`
  - Alternative:
    - Run `npm run start:dev`  in `./backend` and `./frontend`
      - No backend debugging

# Datenmodell (german)

## Merkmal (Trait)

Merkmale sind Metadaten zu Messungen und beschreiben wie diese zu interpretieren
sind.

**Properties** (* = Fremdschlüssel):
* Name (name)
* Deutsche Bezeichnung (german)
* Bemerkungen (remarks)
* Einheit (unit)
* Typ (type) ['VARCHAR', 'TIMESTAMP', 'INTEGER', 'DOUBLE PRECISION', 'DATE', 'TIME']
* Merkmalsammlung (Traitcollections [through Trait_TraitCollection])

## Merkmalssammlung (Traitcollection)

Mermalssammlungen enthalten N Merkmale.

**Properties** (* = Fremdschlüssel):
* Name (title)
* Merkmale (Traits [through Trait_TraitCollection])

## Messungen (Measurement)

Alle Arten von Messdaten, die sich als Repräsentativwert auf flächenmäßige Versuchsparzellen, Wetterstationen oder Koordinaten beziehen.

Messungen haben daher genau einen räumlichen Bezug. Dieser kann durch eine Parzelle, eine Wetterstation ODER eine Geometrie hergestellt werden.

**Properties** (* = Fremdschlüssel):
* Zeitpunkt (timestamp)
* Merkmal (TraitID*)
* Wert (value)
* Benutzername (username)
* Geometrie (geom)
* Parzelle (PlotID*)
* WetterStation (WeatherStationID*)

## Versuch (Experiment)

Meist rechteckige Flächen, die in kleine Parzellen aufgeteilt sind, und auf denen agrarwissenschaftliche oder landwirtschaftliche Experimente durchgeführt werden (mit Rand). Auf jeder Parzelle wird eine Versuchsvariante geprüft. Die gleiche Variante gibt es in mehreren Wiederholungen, meistens 4 x. Die einzelne Parzelle ist gekennzeichnet durch ihre Wiederholungsnummer (1-4) und durch ihre Variante (Kombination aus den Versuchsfaktoren z.B. Erntejahr 2016 (2017, 2018). Ort Bornheim (Klein-Altendorf), Anbausystem Intensiv (Extensiv), Sorte Julius (Diplomat ...).

**Properties** (* = Fremdschlüssel):
* Titel (title)
* Code (expcode)
* Bemerkung (remarks)
* Geometrie (geom)
* …
* Feld (FieldID*)
* Parzelle (ExperimentID* in Plot)
* Manager (Manager* [through Manager_Experiment])
* Versuchsfaktoren (ExperimentalFactors* [through Experiment_ExperimentalFactor])

## Versuchsfaktoren / Faktorlevel (Experimentalfactor)

Versuchsfaktoren stehen für die verschiedenen möglichen Faktoren, die einen Versuch charakterisieren, z. B.:

Bei einem Versuch, bei dem 12 verschiedene Weizensorten auf ihre Eigenschaften (z.B. ihren Ertrag) geprüft werden sollen, ist das erste Faktorlevel die "Sorte".

Findet dieser Versuch zusätzlich auf mehreren Standorten statt, so ist das zweite Faktorlevel der "Standort".

Werden nun weiterhin unterschiedliche Dünge- oder Pflanzenschutzstrategien getestet, sind die weiteren Faktorlevel "Pflanzenschutz" und "Düngung".

Daraus resultiert die Verwendung. Um die Daten in den Kontext einordnen zu können, muss man wissen, um welche Sorte es sich bei den vorliegenden Daten handelt, an welchem Standort sie angebaut und mit welcher Düngemenge sie versorgt wurde.

Die vorhandenen Faktorstufen müssen also in der Client-Datentabelle zwingend angezeigt werden. Nicht belegte Faktorstufen enthalten keine Informationen und würden in der Datentabelle nur stören. Insofern es umsetzbar ist, wäre es wünschenswert, dass die nicht belegten Faktorstufen bei der Datenauswahl nicht angezeigt werden.

Hinsichtlich der Datenauswertung sind die Faktorlevel wie beschrieben unerlässlich, da etwa Mittelwerte der Sorten etc. nur durch Kenntnis der genauen Zuordnung berechnet werden können. Dies ist auch Vorraussetzung für die Ergebnisdarstellung.

Weiterhin soll es möglich sein, beispielsweise nur drei der 12 Sorten angezeigt bekommen, oder nur das Düngesystem mit mehr Input. Dafür müsste man innerhalb der Faktorlevel filtern können, um die dann vorhandenen Daten exportieren zu können.

**Properties** (* = Fremdschlüssel):
* Name (name)
* Deutsche Bezeichnung (german)
* Bemerkungen (remarks)
* Einheit (unit)
* Typ (type) ['VARCHAR', 'TIMESTAMP', 'INTEGER', 'DOUBLE PRECISION', 'DATE', 'TIME']

## Wetterstation (WeatherStation)

Stehen an einem Punkt und sind repräsentativ für ein gewisses Gebiet rund um die Station und damit für die umliegenden Felder und Versuche.

**Properties** (* = Fremdschlüssel):
* Name (name)
* Geometrie (geom [point])
* Erntejahr (harvestyear)
* Feld (FieldID*)

## Bild-/Rasterdaten (RasterFile)

Zahlreiche georeferenzierte oder noch nicht georefenzierte Bilder eines Versuches, Feldes oder einer Parzelle, aufgenommen zu einem bestimmten Zeitpunkt (immer thematisch und zeitpunktmäßig zusammen in einem Verzeichnis abgespeichert und gepackt).

**Properties** (* = Fremdschlüssel):
* Dateipfad (path)
* Benutzername (username)
* Typ (type ['PhotosTractor', 'PhotosCopter'])
* Experiment (ExperimentID*)

## Parzelle (Plot)

Immer jahresspezifisch mit dem jeweiligen Anbau wie Fruchtart, Sorte, Düngung ...) Ganze homogene gleich bewirtschaftete Felder, Bewirtschaftungszonen auf inhomogenen Feldern, Versuchsparzellen

**Properties** (* = Fremdschlüssel):
* Bezeichnung (name)
* Bemerkungen (remarks)
* Geometrie (geom [polygon])
* Erntejahr (harvestyear)
* Frucht (crop)
* Vorfrucht (precrop)
* Fruchtfolge (croprotation)
* Wiederholungsnummer (replicationlevel)
* Versuchsfaktoren (factors [JSONB])
* Versuch (ExperimentID*)
* Feld (FieldID*)

## Manager (Manager)

Landwirt, Lohnunternehmer, Landwirtschaftlicher Berater, Pflanzenzüchter, Wissenschaftler, Versuchsverwalter, Technischer Mitarbeiter

**Properties** (* = Fremdschlüssel):
* Vorname (firstname)
* Nachname (lastname)
* Titel (title)
* Straße (street)
* Hausnummer (housenumber)
* Postleitzahl (zip)
* Stadt (City)
* Telefonnummer (phone)
* Handynummer (mobile)
* E-Mail Adresse (email)
* Fax (fax)
* Betrieb (FarmID*)
* Versuche (Experiments* [through Manager_Experiment])

## Feld (Field)

Auf der Karte und im Luftbild sichtbare und bestimmten Personen "gehörende" Acker- oder Grünlandflächen.

**Properties** (* = Fremdschlüssel):
* Name (name)
* Ortsbezeichnung (location)
* Geometrie (geom [polygon])
* Betrieb (FarmID*)
* Versuche (FieldID* in Experiment)
* Parzellen (FieldID* in Plot)
* Wetterstationen (FieldID* in WeatherStations)

## Betrieb (Farm)

Landwirtschaftliche Betriebe, Versuchsbetriebe.

**Properties** (* = Fremdschlüssel):
* Name (name)
* Manager (FarmID* in Manager)
* Felder (FarmID* in Field)

