import type { MessageTree } from './en';

export const de = {
  appName: 'OriginWise',
  tabs: {
    check: 'Prüfen',
    history: 'Verlauf',
    about: 'Über',
    settings: 'Einstellungen',
    navMore: 'Menü',
  },
  common: {
    present: 'Ja',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'Nein',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    delete: 'Löschen',
    back: 'Zurück',
    loading: 'Laden…',
    optional: 'Optional',
  },
  install: {
    aria: 'OriginWise installieren',
    title: 'OriginWise installieren',
    body: 'Zum Home-Bildschirm hinzufügen, für schnelle App-ähnliche Checks.',
    bodyIos: 'Zum Home-Bildschirm hinzufügen für die Vollbildnutzung.',
    iosStep1: 'Tippe',
    iosStep2: 'Teilen, dann Zum Home-Bildschirm.',
    action: 'Installieren',
    dismiss: 'Installationshinweis schließen',
  },
  support: {
    buyMeAPint: 'Spendier mir ein Pint',
    pintShort: 'Pint',
    thanks: 'Wenn OriginWise dir hilft, kannst du mir ein Pint spendieren:',
  },
  welcome: {
    title: 'Willkommen bei OriginWise',
    body: 'Schneller Check: Ist dieses Produkt oder diese Marke China-bezogen? Namen eingeben oder Verpackung fotografieren. KI kann irren — keine Rechtsberatung.',
    accept: 'Verstanden — jetzt prüfen',
  },
  check: {
    chinaLink: {
      title: 'Bezug zu China',
      chinaCompany: 'Chinesisches Unternehmen',
      chinaControlled: 'Unter chinesischer Kontrolle',
      hq: 'Hauptsitz',
      owner: 'Beherrschender Eigentümer',
      brandOrigin: 'Markenherkunft',
      madeIn: 'Hergestellt in',
      parts: 'Teile',
      china: 'China',
      unconfirmed: 'Nicht bestätigt',
      partsChina: 'Einige Teile in China hergestellt',
    },
    matchBasis: {
      barcode: 'Abgleich per Barcode',
      name: 'Abgleich per Produktname',
      label: 'Laut Verpackungsangabe',
    },
    searchVia: {
      gemini: 'Google-Suche (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Webrecherche — Anfrage gesendet an {name}',
    searchUsage: 'Websuche: {provider} · Suchanfragen: {n}',
    knowledgeWebVia:
      'Enthält eine Live-Webrecherche ({provider}) plus Modellwissen. Weiterhin kein Unternehmensregister oder Zolldatenbank — Etiketten und amtliche Unterlagen können von Webseiten abweichen. Informativ — keine Rechts-, Handels- oder Sanktionsberatung.',
    title: 'Schnellcheck',
    subtitle: 'Ist dieser Artikel China-bezogen? Namen eingeben oder Verpackung fotografieren.',
    placeholder: 'z. B. Snackmarke, Handy, Spielzeug…',
    placeholderWithPhoto: 'Optional: Was ist dieses Produkt?',
    photo: 'Kamera',
    gallery: 'Galerie',
    removePhoto: 'Foto entfernen',
    photoLabelHint: 'Wir lesen das Etikett, wenn der Text klar ist',
    noteOptional: 'Optionale Notiz',
    submit: 'Jetzt prüfen',
    submitting: 'Prüfe…',
    needInput: 'Produktnamen eingeben oder ein Foto hinzufügen.',
    howLink: 'So funktioniert’s',
    newCheck: 'Neuer Check',
    comingSoon:
      'Die Check-API kommt in einem späteren PR. Verlauf und Einstellungen sind bereit.',
    photoTooLarge: 'Foto ist nach der Kompression noch zu groß.',
    photoInvalid: 'Dieses Bild konnte nicht gelesen werden.',
    dropPhoto: 'Foto hier ablegen',
    unnamedPhoto: '(Foto)',
    partsTitle: 'Teile, Ersatzteile & Zutaten',
    partsHint:
      'Aus diesem Produkt isoliert — wichtige Komponenten, Ersatzteile oder Zutaten und ob sie China-bezogen wirken.',
    partKind: {
      part: 'Teil',
      spare: 'Ersatzteil',
      ingredient: 'Zutat',
      component: 'Komponente',
    },
    progressHint: 'Herkunfts- und Unternehmensanalyse läuft…',
    stepMonolith: 'Produkt- und Unternehmenssignale sammeln',
    answeredBy: 'Hauptantwort über {name}',
    agentsUsed: '{n} Agenten',
    agentsTitle: 'Genutzter KI-Pool',
    agentsSummary: '{total} Aufrufe · {ok} ok · {fail} fehlgeschlagen',
    agentsHint:
      'Jede Zeile ist ein kostenloser Server-KI-Aufruf. Fehlschläge bedeuten oft Quota, Modellzugang oder Timeout; wir versuchen andere oder einen Fallback. Live-Web braucht Gemini-Search-Grounding (nicht dasselbe wie Text-RPM).',
    agentOk: 'OK',
    agentFail: 'Fehlgeschlagen ({err})',
    agentSkipped: 'Übersprungen ({err})',
    agentFailUnknown: 'Fehler',
    agentError: {
      upstream_quota: 'Quota / Ratenlimit',
      upstream_credits: 'KI-Guthaben aufgebraucht',
      upstream_error: 'Upstream-Fehler',
      upstream_unavailable: 'Dienst nicht verfügbar',
      empty_response: 'leere Antwort',
      model_unavailable: 'Modell auf diesem API-Schlüssel nicht verfügbar',
      search_grounding_unavailable:
        'Google-Search-Grounding auf diesem Schlüssel nicht verfügbar (Default-Pool-Modelle / Billing aktivieren; Gemini 3 Search oft 0/0)',
      disabled: 'deaktiviert',
      gemini_not_configured: 'Gemini nicht konfiguriert',
      no_entity: 'kein Produktname',
    },
    agent: {
      identify: 'Etikett / Name lesen',
      product: 'Produktort',
      company: 'Unternehmenslinks',
      verify: 'Gegenprüfen',
      alternatives: 'Alternativen mit weniger CN-Bezug',
      monolith: 'Vollcheck (ein Aufruf)',
      dual_core: 'Produkt + Unternehmen',
      dual_alts: 'Alternativen mit weniger CN-Bezug',
      unknownProvider: 'Unbekannte KI',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Warum diese Stufe',
    reason: {
      made_in_cn: 'Das Produkt wird in Festlandchina hergestellt.',
      made_in_cn_detail: 'Das Produkt wird in {place} hergestellt.',
      origin_cn: 'Die Produktherkunft ist mit Festlandchina verknüpft.',
      origin_cn_detail: 'Die Produktherkunft ist als {place} angegeben.',
      manufacturer_cn: 'Der Hersteller ist mit Festlandchina verknüpft.',
      manufacturer_cn_detail: 'Herstellerort/Verknüpfung: {place}.',
      hq_cn: 'Der Unternehmenssitz liegt in Festlandchina.',
      hq_cn_detail: 'Der Unternehmenssitz liegt in {place}.',
      parent_majority_cn:
        'Eine mehrheitlich kontrollierende Muttergesellschaft ist mit Festlandchina verknüpft.',
      ownership_strong_cn:
        'Es wurden starke Eigentums- oder Kontrollverknüpfungen mit Festlandchina gemeldet.',
      ownership_weak_cn:
        'Es wurden schwächere Verknüpfungen (z. B. Minderheitsanteil, Lieferkette oder Handel) mit Festlandchina gemeldet.',
      component_cn:
        'Einige Komponenten oder die Montage sind mit Festlandchina verknüpft, ohne vollständige „Made in China“-Angabe.',
      explicit_non_cn_geo:
        'Klare Ortsangaben zeigen außerhalb Festlandchinas (für den Umfang dieses Tools).',
      explicit_non_cn_geo_detail:
        'Klare Ortsangaben außerhalb Festlandchinas: {places}.',
      verify_conflict:
        'Produkt- und Unternehmenssignale stimmten nicht vollständig überein (Gegenprüfung fand Konflikte).',
      conflict_no_strong:
        'Signale widersprachen sich und es gab keine starke Festlandchina-Verknüpfung — Ergebnis unsicher.',
      insufficient:
        'Nicht genug zuverlässige Herkunfts- oder Eigentumsinformationen, um China-Bezüge zu beurteilen.',
      ownership_not_assessed:
        'Das Unternehmenseigentum wurde für diesen Check nicht vollständig bewertet.',
      taiwan_as_country:
        'Taiwan gilt als eigenständiges Land und zählt für diese Bewertung nicht als „China-bezogen“.',
      taiwan_as_country_detail:
        'Taiwan gilt als eigenständiges Land (gesehen in: {places}) und zählt für diese Bewertung nicht als „China-bezogen“.',
    },
    caveats: 'Hinweise',
    disclaimer:
      'Nur zur Information — Modellwissen und optionale Live-Webrecherche, keine Rechts- oder Sanktionsberatung. KI kann irren.',
    knowledgeModel:
      'Nur auf allgemeinem Modellwissen (keine Live-Websuche). Markenherkunft, Teilewerke und Endmontage/Ursprungsland können je nach SKU/Markt abweichen — Verpackungsetiketten bevorzugen. Kein Unternehmensregister oder Zolldatenbank. Informativ — keine Rechts-, Handels- oder Sanktionsberatung.',
    knowledgeWeb:
      'Enthält eine Live-Webrecherche (Google-Suche über Gemini-Grounding) plus Modellwissen. Weiterhin kein Unternehmensregister oder Zolldatenbank — Etiketten und amtliche Unterlagen können von Webseiten abweichen. Informativ — keine Rechts-, Handels- oder Sanktionsberatung.',
    providerNotConfigured:
      'KI-Check ist nicht konfiguriert. Schlüssel in .dev.vars eintragen und `npm run pages:dev` ausführen (siehe README).',
    rateLimited:
      'Kostenloses Serverlimit: 1 Check alle 30 Sekunden. Bitte kurz warten.',
    rateLimitedDay:
      'Kostenloses Serverlimit: max. 10 Checks pro 6 Stunden. Bitte später erneut versuchen.',
    rateLimitBadge: 'Kostenloses Serverlimit',
    rateLimitFreeNote:
      'Kostenloser Server · 1 Check / 30s · max. 10 / 6 Stunden · 1 gleichzeitig',
    rateLimitRpmTitle: 'Kostenloses Server-Ratenlimit (30s)',
    rateLimitedLongTitle: 'Kostenloses 6-Stunden-Limit',
    rateLimitInflightTitle: 'Check läuft bereits',
    rateLimitShortDetail:
      'Kostenloses Serverlimit: {n} Check(s) alle {w}s. Etwa {s}s warten, dann erneut versuchen.',
    rateLimitLongDetail:
      'Kostenloses Serverlimit: {n} Checks pro {h} Stunden. In etwa {m} Minuten erneut versuchen.',
    rateLimitMinuteDetail:
      'Kostenloses Serverlimit: {n} Check(s) alle {w}s. Etwa {s}s warten, dann erneut versuchen.',
    rateLimitDayDetail:
      'Kostenloses Serverlimit: {n} Checks pro {h} Stunden. Später erneut versuchen.',
    rateLimitInflightDetail:
      'Der kostenlose Server erlaubt nur 1 Check gleichzeitig. Warte, bis der aktuelle Check fertig ist.',
    rateLimitAutoIn: 'Automatisch in {s}s…',
    rateLimitAutoHint:
      'Wird in {s}s automatisch gesendet, wenn das kostenlose Zeitfenster offen ist.',
    rateLimitAutoStop: 'Stopp',
    rateLimitAutoCancelled:
      'Autosenden abgebrochen. Du kannst es erneut versuchen, wenn du bereit bist.',
    forbiddenOrigin: 'Anfrage von diesem Ursprung nicht erlaubt.',
    badRequest: 'Ungültige Anfrage.',
    parseError: 'Antwort konnte nicht verstanden werden. Bitte erneut versuchen.',
    upstreamError: 'Der Antwortdienst ist fehlgeschlagen. Bitte später erneut versuchen.',
    upstreamQuota: 'Der Antwortdienst ist ausgelastet. Bitte später erneut versuchen.',
    upstreamUnavailable: 'Der Antwortdienst ist vorübergehend nicht verfügbar.',
    emptyResponse: 'Keine Antwort erhalten. Bitte erneut versuchen.',
    serverError: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
    forceRefresh: 'Erneut prüfen (Cache überspringen)',
    forceRefreshHint:
      'Diese Antwort war zwischengespeichert. Erneut prüfen startet einen frischen KI-Lauf (zählt weiter zum kostenlosen Limit).',
    cached: 'Cache',
    degraded: 'Teilergebnis',
    relationLabel: 'China-Bezug',
    confidence: '{n}% Konfidenz',
    productFacts: 'Produkt',
    companyFacts: 'Unternehmen',
    brand: 'Marke',
    madeIn: 'Hergestellt in (diese Einheit / finales Ursprungsland)',
    madeInUnconfirmed: 'Endgültiges Ursprungsland unbestätigt — siehe Komponenten/globale Linie',
    originLayersTitle: 'Herkunftsschichten',
    originLayersIntro:
      'Marke/Betrieb, Eigentum, endgültiger COO und Teile getrennt — Eigentum ist kein Made-in.',
    layerBrandOps: 'Marke / Betrieb',
    layerOwnership: 'Eigentum / Muttergesellschaften',
    layerOwnershipHint: 'Kein endgültiger COO / Made-in',
    layerOwnershipEmpty: 'Kein Eigentums-/Muttergesellschaftssignal in diesem Ergebnis',
    layerFinalCoo: 'Endgültiger COO',
    layerParts: 'Teile-Kandidaten',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'KI-Suchkontingent aufgebraucht — genauere Informationen sind gerade nicht verfügbar. Bitte nach dem täglichen Reset erneut prüfen.',
    aiCreditsUsedUp:
      'KI-Dienstguthaben vorübergehend aufgebraucht — genauere Informationen sind gerade nicht verfügbar. Bitte später erneut versuchen.',
    srv: {
      partOmittedNoEvidence:
        'Teileland weggelassen: kein Beleg aus Suche/Etikett (Marken-HQ ist kein Teile-Herkunftsland).',
      partOmittedUnconfirmed:
        'Teileland weggelassen: für dieses Teil nicht durch Suche/Etikett bestätigt.',
      madeInOmittedBrand:
        'Herstellungsland weggelassen: entsprach nur dem Marken-/Designland, ohne Werks- oder Herkunftsbeleg.',
      madeInOmittedOwnership:
        'Herstellungsland weggelassen: China stammt nur aus Eigentümer-/Mutterkonzern-Angaben, nicht von Produkt, Etikett oder Händler.',
      cooUnconfirmedSeeParts:
        'Endgültiges Herkunftsland unbestätigt – Kandidaten siehe Komponenten/globale Linie oder Teile (kein bestätigtes Herstellungsland).',
      cooUnconfirmedNoLabel:
        'Endgültiges Herkunftsland unbestätigt – kein Herkunftsland auf Produkt/Etikett; es wird keins erfunden.',
      cooUnconfirmedNoBarcode:
        'Endgültiges Herkunftsland unbestätigt – keine Webseite zeigte den Barcode/JAN zusammen mit einem Herstellungsland; Treffer nur über den Produktnamen sind lediglich wahrscheinliche Kandidaten.',
      cooUnconfirmedCandidates:
        'Endgültiges Herkunftsland unbestätigt – die Kandidaten unten sind Suchsignale, kein aufgedrucktes „Made in“.',
      distributorOmitted:
        'Lokaler Händler/Marktvertreter aus den Mutterkonzernen entfernt (kein rechtlicher Eigentümer).',
      chinaLinkUnclear:
        'China-Bezug unklar – nicht als bestätigt China-frei werten.',
      verifyConflict:
        'Die Prüfung meldete widersprüchliche Signale',
      companyNotAssessed:
        'Unternehmens-/Eigentümerdaten nicht bewertet',
      taiwanSeparate:
        'Taiwan gilt für die Bezugsstufen als eigenständiges Land',
      webUnavailableLabel:
        'Live-Webrecherche nicht verfügbar – Teileländer stammen vom Foto des Verpackungsetiketts, nicht aus der Suche.',
      altsAim:
        'Alternative Marken/Produkte zielen auf geringeren China-Bezug (nicht nur Ähnlichkeit). Stufen sind Schätzungen; der Firmensitz allein beweist keine Fertigung außerhalb Chinas.',
      altsNone:
        'Keine Alternativen mit geringerem China-Bezug mit ausreichender Sicherheit gefunden.',
      sumCooUnconfirmed:
        'Endgültiges Herkunftsland unbestätigt',
      tierUnknown:
        'Zu wenige Belege, um China-Bezüge zu bewerten.',
      tierNone:
        'Aus den verfügbaren Signalen keine China-Bezüge gefunden.',
      tierDirect:
        'Direkte China-Bezüge gefunden.',
      tierIndirect:
        'Indirekte China-Bezüge gefunden.',
      cooConflictChina:
        'Endgültiges Herkunftsland unbestätigt – {source}-Signal ({label}) widerspricht „Made in China“; Eigentümer/Mutterkonzern allein reichen nicht als Herstellungsland.',
      cooConflictMadeIn:
        'Endgültiges Herkunftsland unbestätigt – {source}-Signal ({label}) widerspricht dem Herstellungsland {madeIn}; nur als Kandidaten behalten.',
      candidate:
        '{label} ({rating}, {pct} %, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Live-Suchmodelle waren mit diesem API-Schlüssel nicht verfügbar – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_search_grounding_unavailable:
        'Live-Google-Suche war mit diesem API-Schlüssel nicht verfügbar – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_upstream_credits:
        'KI-Guthaben aufgebraucht (Prepaid-Guthaben leer) – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_upstream_quota:
        'Tägliches kostenloses Google-Suchkontingent aufgebraucht – nach dem täglichen Reset erneut versuchen – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_upstream_unavailable:
        'Live-Webrecherche hat das Zeitlimit überschritten oder der Dienst war ausgelastet – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_empty_response:
        'Live-Webrecherche lieferte eine leere Antwort – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_disabled:
        'Live-Webrecherche war für diese Prüfung deaktiviert – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_gemini_not_configured:
        'Gemini ist für die Live-Websuche nicht eingerichtet – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_no_entity:
        'Kein Produktname für die Live-Webrecherche – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      webFail_default:
        'Keine Live-Webrecherche für diese Prüfung – Herstellungs- und Teileländer sind vorsichtiger (nur Modellwissen).',
      sum: {
        madeIn: 'Hergestellt in: {value}',
        candidates: 'Kandidaten: {value}',
        brandOrigin: 'Markenherkunft: {value}',
        components: 'Komponenten/globale Linie: {value}',
        parts: 'Teile: {value}',
        hq: 'Hauptsitz: {value}',
        company: 'Unternehmen: {value}',
      },
      signal: {
        ocr: 'Etikett',
        retailer: 'Händler',
        manufacturer: 'Hersteller',
        ownership: 'Eigentümer',
        unknown: 'unbekannt',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Bild speichern',
    sectionShareShare: 'Teilen',
    sectionShareSaved: 'Gespeichert',
    sectionShareFailed: 'Bild konnte nicht gespeichert werden',
    sectionShareHint: 'Layer antippen/hover: Bild speichern oder teilen',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'Webseite (Namensabgleich)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'Eigentum / Mutter',
    },
    origin: 'Herkunft',
    brandOrigin: 'Markenherkunft',
    componentsOrigin: 'Komponenten / globale Linie',
    productNotes: 'Herkunftshinweise',
    manufacturer: 'Hersteller',
    company: 'Unternehmen',
    hq: 'Sitz',
    parents: 'Muttergesellschaften',
    graphTitle: 'Beziehungsgraph',
    graphHint:
      'Pfeile zeigen, wie Produkt, Unternehmen, Muttergesellschaften und Orte zusammenhängen. Bei engen Labels erweitern oder zoomen.',
    graphControls: 'Graph-Ansicht',
    graphZoomIn: 'Vergrößern',
    graphZoomOut: 'Verkleinern',
    graphExpand: 'Erweitern',
    graphCollapse: 'Einklappen',
    graphRelations: 'Beziehungen',
    graphNoEdges: 'Für dieses Ergebnis wurden keine Beziehungslinks abgeleitet.',
    graphLink: 'verbunden',
    graphChinaLinked: 'China-verknüpft',
    graphLegendCn: 'China-verknüpfter Knoten/Kante',
    graphLegendOther: 'Andere',
    graphEdge: {
      brand: 'Marke',
      brand_company: 'Marke',
      'brand/company': 'Marke',
      made_in: 'hergestellt in',
      hq: 'Sitz',
      parent: 'Mutter',
      majority: 'Mehrheitseigner',
      wholly: '100 % im Besitz',
      minority: 'Minderheitsanteil',
      ownership: 'Eigentum',
      affiliation: 'Marke',
      manufacturing: 'hergestellt in',
      part: 'Teil',
      spare: 'Ersatzteil',
      ingredient: 'Zutat',
      component: 'Komponente',
    },
    regionsTitle: 'Regionen',
    altBrands: 'Marken mit geringerem China-Bezug (geschätzt)',
    altProducts: 'Produkte mit geringerem China-Bezug (geschätzt)',
    altDisclaimer:
      'Nur Ersatzschätzungen ohne direkten China-Bezug (keine „Made in China“-Lückenfüller). Ein US-/EU-Sitz allein belegt keine Nicht-China-Fertigung. Unklares Ursprungsland ist Unbekannt, nicht Unabhängig.',
    estimated: 'geschätzt',
    twNote:
      'Taiwan gilt als eigenständiges Land und nie als China-bezogen für die Stufen.',
    region: {
      CN: 'Festlandchina',
      HK: 'Hongkong',
      TW: 'Taiwan',
      MO: 'Macau',
      OTHER: 'Andere',
      UNKNOWN: 'Unbekannt',
    },
    steps: {
      start: 'Start',
      cache: 'Cache',
      identify: 'Etikett lesen',
      web: 'Webrecherche',
      monolith: 'Vollanalyse',
      dual_core: 'Produkt & Unternehmen',
      product: 'Produktherkunft',
      company: 'Unternehmenslinks',
      verify: 'Gegenprüfung',
      alternatives: 'Alternativen mit weniger CN-Bezug',
      synthesize: 'Bewertung',
    },
  },
  history: {
    title: 'Verlauf',
    subtitle: 'Frühere Checks auf diesem Gerät',
    empty: 'Noch keine früheren Checks.',
    withPhoto: 'Foto',
    open: 'Öffnen',
    remove: 'Entfernen',
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Präferenzen & Daten auf diesem Gerät',
    panelDisplay: 'Sprache & Thema',
    panelCheck: 'Was prüfen',
    panelData: 'Daten löschen',
    language: 'Sprache',
    theme: 'Thema',
    themeSystem: 'System',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    geoScope: 'China-Umfang für Stufen',
    geoScopeHint:
      'Taiwan gilt immer als eigenständiges Land und steuert nie China-Bezugsstufen. Nur VR China nutzt Festlandchina. Greater China kann optional Hongkong und Macau einschließen (nicht Taiwan).',
    geoScopePrc: 'Nur VR China / Festland (Standard)',
    geoScopeGreater: 'CN + Hongkong + Macau (nicht Taiwan)',
    dimensions: 'Was prüfen',
    dimensionsHint:
      'Alternativen mit geringerem China-Bezug sind standardmäßig aus. Marken- oder Produktalternativen einschalten, wenn du Ersatz mit weniger China-Bezug willst (zusätzlicher KI-Aufruf).',
    dimOrigin: 'Herkunftsort',
    dimManufacturer: 'Herstellerherkunft',
    dimCompany: 'Unternehmensbeziehungen',
    dimAltBrands: 'Markenalternativen mit geringerem China-Bezug',
    dimAltProducts: 'Produktalternativen mit geringerem China-Bezug',
    howItWorks: 'So funktioniert’s',
    about: 'Über OriginWise',
    version: 'Version {v}',
    cleanData: 'Lokale Daten löschen',
    cleanDataHint:
      'Daten bleiben nur in diesem Browser. Wähle, was entfernt wird. Das kann nicht rückgängig gemacht werden.',
    dataSummary: 'Auf diesem Gerät',
    dataNone: 'Keine OriginWise-Daten gespeichert.',
    dataHistory: 'Frühere Checks: {n}',
    dataSettings: 'Eigene Einstellungen',
    dataDisclaimer: 'Hinweis akzeptiert',
    cleanAll: 'Alles',
    cleanHistory: 'Nur frühere Checks',
    cleanSettings: 'Nur Einstellungen',
    cleanConfirm: 'Ausgewählte Daten löschen?',
    cleanConfirmBtn: 'Jetzt löschen',
    cleanDoneAll: 'Alle lokalen OriginWise-Daten gelöscht.',
    cleanDoneHistory: 'Frühere Checks gelöscht.',
    cleanDoneSettings: 'Einstellungen auf Standard zurückgesetzt.',
  },
  about: {
    title: 'Über',
    tagline: 'Ein einfacher China-bezogener Produktcheck',
    intro:
      'OriginWise hilft dir schnell zu sehen, ob ein Produkt oder eine Marke China-bezogen wirkt — Herkunftsort, Hersteller und Unternehmenslinks — mit optionalen Alternativen geringeren Bezugs. Checks bleiben auf diesem Gerät.',
    body: 'OriginWise ist ein einfaches Tool für einen schnellen China-bezogenen Check alltäglicher Produkte und Marken. KI kann unvollständig oder falsch sein.',
    privacy: 'Kein Konto. Dein Verlauf bleibt auf diesem Telefon/Browser.',
    license: 'MIT-Lizenz',
    licenseShort: 'MIT',
    openSourceTitle: 'Open Source · MIT',
    openSourceBody:
      'Dieses Projekt ist freie Software unter der MIT-Lizenz. Du darfst es nutzen, kopieren, ändern, zusammenführen, veröffentlichen, verbreiten und unterlizenzieren — auch für eigene Deployments mit eigenen API-Schlüsseln.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Bereitgestellt „wie besehen“, ohne Gewähr. Vollständiger Lizenztext auf GitHub.',
    linkSource: 'Quellcode',
    linkLicense: 'MIT-Lizenz',
    linkIssues: 'Issues & Feedback',
    linkReleases: 'Releases',
    linkSecurity: 'Sicherheitsrichtlinie',
    privacyTitle: 'Deine Privatsphäre',
    privacyLead:
      'Wir halten es einfach: kein Konto, und dein Check-Verlauf bleibt auf deinem Telefon oder Computer.',
    privacyBullet1:
      'Frühere Checks, Einstellungen und Präferenzen werden nur in diesem Browser auf deinem Gerät gespeichert.',
    privacyBullet2: 'Es gibt kein Login und keine Cloud-Kopie deines Check-Tagebuchs.',
    privacyBullet3:
      'Du kannst jederzeit alles mit „Lokale Daten löschen“ in den Einstellungen entfernen.',
    privacyBullet4:
      'Beim Check wird Name oder Foto nur für diese Antwort gesendet. Wir speichern Verpackungen nicht als Produktkatalog.',
    privacyBullet5:
      'Fotos werden auf deinem Gerät vor dem Upload komprimiert und nicht als Serverdatensätze gespeichert.',
    privacyBullet6:
      'Bei aktiver Live-Webrecherche wird der Produktname (und der Etikettentext) zusätzlich einmal an einen Suchdienst gesendet: zuerst Google-Suche über Gemini, nur bei einem Fehler Brave Search oder Firecrawl. Fortschrittsschritte und Ergebnis nennen den tatsächlich genutzten Dienst. Suchanfragen werden nicht protokolliert.',
    privacyPolicyLink: 'Datenschutz',
    termsLink: 'Nutzungsbedingungen',
    designTitle: 'So funktioniert’s',
    designLead:
      'Schneller Multi-Agent-KI-Check, dann eine feste Bewertungstabelle — keine Rechtsdatenbank.',
    designLocalTitle: 'Was auf deinem Gerät bleibt',
    designLocalBody:
      'Nach dem Laden werden Verlauf, Sprache, Thema und Check-Präferenzen nur in diesem Browser gespeichert. Website-Daten löschen oder „Lokale Daten löschen“ verwenden.',
    designWhyTitle: 'Warum so gebaut',
    designWhy1: 'Schnelle Mobile-Checks ohne Konto.',
    designWhy2: 'Der Verlauf bleibt bei dir — jederzeit löschbar.',
    designWhy3:
      'KI kann irren; wir zeigen Hinweise und behandeln Taiwan für die Stufen als eigenständiges Land.',
    disclaimerTitle: 'Bitte beachten',
    disclaimerBody:
      'OriginWise dient nur der Information — keine Rechts-, Zoll- oder Sanktionsberatung. KI und Stufenlabels können unvollständig oder falsch sein. Kritische Entscheidungen immer selbst prüfen.',
    createdBy: 'Betreut von',
    contributionsWelcome: 'Issues und Pull Requests sind auf GitHub willkommen.',
  },
  how: {
    title: 'So funktioniert’s',
    subtitle: 'Schneller China-bezogener Check — einfach halten',
    aimTitle: 'Wofür diese App ist',
    aimBody:
      'Hilft dir schnell zu sehen, ob ein Produkt oder eine Marke China-bezogen wirkt — dort hergestellt, Unternehmenslinks und so weiter. Kein tiefes Recherchetool, keine Rechtsprüfung.',
    stepsTitle: 'In einfachen Worten',
    step1Title: 'Du sendest etwas',
    step1Body: 'Einen Produktnamen, eine Marke oder ein Foto der Verpackung.',
    step2Title: 'Wir schauen mit KI nach',
    step2Body:
      'Kleine Checks laufen: Produktort und Unternehmen (zusammen), dann eine schnelle Gegenprüfung. Optional: Marken-/Produktalternativen mit geringerem China-Bezug, wenn du das einschaltest.',
    step3Title: 'Du bekommst ein einfaches Ergebnis',
    step3Body:
      'Ein Farbbadge: Unabhängig, Indirekt, Direkt oder Unbekannt — plus ein kurzes Warum.',
    graphTitle: 'Gesamter Ablauf',
    graphHint: 'Von deiner Eingabe zum Farbbadge.',
    flowYou: 'Du (Name / Foto)',
    flowAi: 'KI-Checks',
    flowProduct: 'Produktort',
    flowCompany: 'Unternehmen',
    flowVerify: 'Gegenprüfung',
    flowScore: 'Einfache Bewertung',
    flowResult: 'Farbergebnis',
    flowAiDetail:
      'Zuerst Produktort + Unternehmen, dann eine schnelle Gegenprüfung.',
    flowScoreDetail: 'Wir fassen die Antworten zu einer einfachen Bewertung zusammen.',
    badgeTitle: 'Was die Farben bedeuten',
    badgeNone: 'Unabhängig — kein klarer China-Bezug gefunden',
    badgeIndirect: 'Indirekt — schwächerer oder teilweiser Bezug',
    badgeDirect: 'Direkt — klarer Bezug (z. B. Made in China oder Sitz dort)',
    badgeUnknown: 'Unbekannt — nicht genug klare Infos',
    twTitle: 'Taiwan',
    twBody:
      'Taiwan zählt hier immer als eigenes Land. Es zählt nicht von selbst als „China-bezogen“.',
    evidenceTitle:
      'Wann ein Herstellungsland als bestätigt gilt',
    evidenceBody:
      'Ein Herstellungsland gilt nur dann als bestätigt (Barcode-Abgleich), wenn es von einem Foto des Verpackungsetiketts stammt oder eine Webseite denselben Barcode (JAN/EAN) neben der Herkunftsangabe zeigt. Ein Treffer nur über den Produktnamen ist höchstens „wahrscheinlich“ (Namensabgleich), und eine Seite mit mehreren Größen oder Varianten bleibt unbestätigt. Ist die Live-Websuche nicht verfügbar, beruht das Ergebnis nur auf Modellwissen und wird so gekennzeichnet.',
    flowWeb:
      'Websuche',
    flowWebDetail:
      'Webseiten nach Produktname oder Barcode durchsuchen und die Herkunftsangabe prüfen.',
    privacyTitle: 'Deine Daten',
    privacyBody:
      'Der Verlauf bleibt auf diesem Gerät, Fotos werden nicht auf dem Server gespeichert. Ist die Live-Websuche an, werden Produktname oder Barcode an Suchdienste gesendet. KI kann sich irren – prüfe wichtige Entscheidungen immer nach.',
    tryBtn: 'Check ausprobieren',
  },
  tier: {
    none: 'Unabhängig',
    indirect: 'Indirekt',
    direct: 'Direkt',
    unknown: 'Unbekannt',
  },
} satisfies MessageTree;
