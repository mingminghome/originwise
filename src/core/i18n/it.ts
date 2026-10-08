import type { MessageTree } from './en';

export const it = {
  appName: 'OriginWise',
  tabs: {
    check: 'Verifica',
    history: 'Cronologia',
    about: 'Info',
    settings: 'Impostazioni',
    navMore: 'Menu',
  },
  common: {
    present: 'Sì',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'No',
    cancel: 'Annulla',
    confirm: 'Conferma',
    delete: 'Elimina',
    back: 'Indietro',
    loading: 'Caricamento…',
    optional: 'Facoltativo',
  },
  install: {
    aria: 'Installa OriginWise',
    title: 'Installa OriginWise',
    body: 'Aggiungi alla schermata Home per un controllo rapido simile a un’app.',
    bodyIos: 'Aggiungi alla schermata Home per l’uso a schermo intero.',
    iosStep1: 'Tocca',
    iosStep2: 'Condividi, poi Aggiungi a Home.',
    action: 'Installa',
    dismiss: 'Chiudi il prompt di installazione',
  },
  support: {
    buyMeAPint: 'Offrimi una birra',
    pintShort: 'Birra',
    thanks: 'Se OriginWise ti è utile, puoi offrirmi una birra:',
  },
  welcome: {
    title: 'Benvenuto in OriginWise',
    body: 'Controllo rapido: questo prodotto o marchio è legato alla Cina? Digita un nome o fotografa la confezione. L’IA può sbagliare — non è consulenza legale.',
    accept: 'Capito — inizia a verificare',
  },
  check: {
    identifiedAs: 'Identificato come: {name}',
    chinaLink: {
      title: 'Legame con la Cina',
      chinaCompany: 'Azienda cinese',
      chinaControlled: 'A controllo cinese',
      hq: 'Sede',
      owner: 'Proprietario di controllo',
      brandOrigin: 'Origine del marchio',
      madeIn: 'Prodotto in',
      parts: 'Componenti',
      china: 'Cina',
      unconfirmed: 'Non confermato',
      partsChina: 'Alcuni componenti prodotti in Cina',
      hqParentNote: 'La sede in Cina indicata è quella della società madre',
      madeInBelow: 'Il paese di produzione si stabilisce solo nella scheda «Prodotto in» (codice a barre, etichetta o corrispondenza del modello).',
      madeInChina: 'Prodotto in Cina',
      footnote: 'Questa scheda descrive solo dove ha sede l’azienda, chi la possiede e dove viene prodotto il prodotto. Non è un giudizio sulla qualità o sulla sicurezza del prodotto né sull’azienda.',
      controlling: 'Controllo',
      reasonParent: 'La società madre che la controlla si trova nella Cina continentale.',
      reasonBrandOrigin: 'Origine del marchio: {place}.',
      madeInLineBarcode: 'Prodotto in: {place} (corrispondenza del codice a barre, vedi la scheda «Prodotto in» qui sotto)',
      madeInLineLabel: 'Prodotto in: {place} (etichetta della confezione, vedi la scheda «Prodotto in» qui sotto)',
      madeInLineModel: 'Prodotto in: {place} (corrispondenza del modello esatto, vedi la scheda «Prodotto in» qui sotto)',
    },
    rc: {
      modelRef: 'Riferimento del modello (non confermato)',
      modelRefHelp: 'Non confermato da alcuna pagina web né dall’etichetta della confezione; è solo un’ipotesi del modello. Fate fede all’etichetta sulla confezione.',
      moreInfo: 'Maggiori informazioni',
      candidatesTitle: 'Paesi di produzione candidati (non confermati)',
      noCandidates: 'Nessun candidato affidabile trovato.',
      sourceCount: 'Fonti: {n}',
      sourceFirst: 'Fonte 1: {label}',
      sourceNth: 'Fonte {n}: {label}',
      sourceAiAnswer: 'Risposta dell’IA',
      oneExactModelPage: '1 pagina con il modello esatto',
      dispute: 'Contestato: {sides}',
      disputeSideExact: '{country} (pagine con il modello esatto: {n})',
      disputeSideMixed: '{country} (pagine: {n}, con il modello esatto: {e})',
      disputeSidePages: '{country} (pagine: {n})',
      disputeSideLabel: '{country} (etichetta della confezione)',
      disputeSideLabelPages: '{country} (etichetta della confezione; pagine: {n})',
      disputeSep: '; ',
      designInfo: 'Informazioni aggiuntive: progettazione / ingegneria secondo il marchio: {country}. Non è il luogo di produzione.',
      brandInfo: 'Informazioni aggiuntive: origine del marchio indicata: {country}. Non è il luogo di produzione.',
      infoSource: 'Fonte: {label}',
      foldUnconfirmed: 'Paese di produzione finale non confermato: {reason}. Gli altri paesi sono solo candidati.',
      citedUnverified: 'Citato dall’IA, non verificato',
      excludedOtherModel: 'Altro modello ({model}), non conteggiato',
      reason: {
        aiOnly: 'Solo la risposta dell’IA, nessuna pagina web la conferma',
        pagesDisagree: 'Le pagine web non concordano',
        aiCitedUnverified: 'Link citato dall’IA non verificabile',
        onePageOnly: 'Lo cita una sola pagina web',
      },
      sourceCountry: 'prodotto in {country}',
      labelSource: 'Fonte: foto dell’etichetta della confezione',
      parent: 'Società madre',
      tagConfirmed: 'Confermato',
      tagLikely: 'Probabile',
      tagMentioned: 'Menzionato',
      tagUnconfirmed: 'Non confermato',
      foldSources: 'Tutte le fonti',
      foldAlts: 'Marchi alternativi',
      foldAi: 'Dettagli IA / ricerca',
      expand: 'Mostra',
      collapse: 'Nascondi',
    },
    matchBasis: {
      barcode: 'Corrispondenza per codice a barre',
      name: 'Corrispondenza per nome del prodotto',
      label: 'Secondo l’etichetta della confezione',
      model: 'Corrispondenza del modello esatto',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Ricerca web — richiesta inviata a {name}',
    searchUsage: 'Ricerca web: {provider} · richieste di ricerca: {n}',
    knowledgeWebVia:
      'Include una ricerca web in tempo reale ({provider}) più la conoscenza del modello. Non è comunque un registro societario né una banca dati doganale — etichette e atti ufficiali possono divergere dalle pagine web. Informativo — non consulenza legale, commerciale o sulle sanzioni.',
    title: 'Controllo rapido',
    subtitle: 'Questo articolo è legato alla Cina? Digita un nome o fotografa la confezione.',
    placeholder: 'es. marchio di snack, telefono, giocattolo…',
    placeholderWithPhoto: 'Facoltativo: che prodotto è?',
    photo: 'Fotocamera',
    gallery: 'Galleria',
    removePhoto: 'Rimuovi foto',
    photoLabelHint: 'Leggiamo l’etichetta se il testo è chiaro',
    noteOptional: 'Nota facoltativa',
    submit: 'Verifica ora',
    submitting: 'Verifica in corso…',
    needInput: 'Digita un nome di prodotto o aggiungi una foto.',
    howLink: 'Come funziona',
    newCheck: 'Nuova verifica',
    comingSoon:
      'L’API di verifica arriverà in una PR successiva. Cronologia e impostazioni sono pronte.',
    photoTooLarge: 'La foto è ancora troppo grande dopo la compressione.',
    photoInvalid: 'Impossibile leggere questa immagine.',
    dropPhoto: 'Rilascia la foto qui',
    unnamedPhoto: '(foto)',
    partsTitle: 'Parti, ricambi e ingredienti',
    partsHint:
      'Isolato da questo prodotto — componenti, ricambi o ingredienti principali e se sembrano legati alla Cina.',
    partKind: {
      part: 'Parte',
      spare: 'Ricambio',
      ingredient: 'Ingrediente',
      component: 'Componente',
    },
    progressHint: 'Analisi di origine e azienda…',
    stepMonolith: 'Raccolta segnali di prodotto e azienda',
    answeredBy: 'Risposta principale via {name}',
    agentsUsed: '{n} agenti',
    agentsTitle: 'Pool IA usato',
    agentsSummary: '{total} chiamate · {ok} ok · {fail} non riuscite',
    /** Strength of a company–country relation (所有權 rows). */
    relStrength: {
      strong: 'legame forte',
      moderate: 'legame moderato',
      weak: 'legame debole',
    },
    agentsHint:
      'Ogni riga è una chiamata IA del server gratuito. I fallimenti spesso dipendono da quota, accesso al modello o timeout; proviamo altri modelli o un fallback. Il web in tempo reale richiede Gemini Search grounding (non è lo stesso RPM del testo).',
    agentsHintVia:
      'Ogni riga è una chiamata IA del server gratuito. I fallimenti spesso dipendono da quota, accesso al modello o timeout; proviamo altri modelli o un fallback. La ricerca web in tempo reale è stata eseguita con {provider}.',
    agentOk: 'OK',
    agentFail: 'Non riuscito ({err})',
    agentSkipped: 'Saltato ({err})',
    agentFailUnknown: 'errore',
    agentError: {
      upstream_quota: 'quota / limite di frequenza',
      upstream_credits: 'credito IA esaurito',
      upstream_error: 'errore a monte',
      upstream_unavailable: 'servizio non disponibile',
      empty_response: 'risposta vuota',
      model_unavailable: 'modello non disponibile su questa chiave API',
      search_grounding_unavailable:
        'Google Search grounding non disponibile su questa chiave (prova i modelli del pool predefinito / abilita la fatturazione; Gemini 3 Search è spesso 0/0)',
      disabled: 'disattivato',
      gemini_not_configured: 'Gemini non configurato',
      no_entity: 'nessun nome prodotto',
    },
    agent: {
      identify: 'Leggi etichetta / nome',
      product: 'Luogo del prodotto',
      company: 'Legami aziendali',
      verify: 'Doppia verifica',
      alternatives: 'Alternative con minor legame CN',
      monolith: 'Verifica completa (una chiamata)',
      dual_core: 'Prodotto + azienda',
      dual_alts: 'Alternative con minor legame CN',
      web: 'Ricerca web',
      unknownProvider: 'IA sconosciuta',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Perché questo livello',
    reason: {
      made_in_cn: 'Il prodotto è fabbricato nella Cina continentale.',
      made_in_cn_detail: 'Il prodotto è fabbricato in {place}.',
      origin_cn: 'L’origine del prodotto è collegata alla Cina continentale.',
      origin_cn_detail: 'L’origine del prodotto è indicata come {place}.',
      manufacturer_cn: 'Il produttore è collegato alla Cina continentale.',
      manufacturer_cn_detail: 'Luogo/legame del produttore: {place}.',
      hq_cn: 'La sede dell’azienda è nella Cina continentale.',
      hq_cn_detail: 'La sede dell’azienda è in {place}.',
      parent_majority_cn:
        'Una società madre di controllo/maggioranza è collegata alla Cina continentale.',
      ownership_strong_cn:
        'Sono stati segnalati forti legami di proprietà o controllo con la Cina continentale.',
      ownership_weak_cn:
        'Sono stati segnalati legami più deboli (es. quota di minoranza, fornitura o vendita) con la Cina continentale.',
      component_cn:
        'Alcuni componenti o l’assemblaggio sono collegati alla Cina continentale, senza una piena affermazione «made in China».',
      explicit_non_cn_geo:
        'Segnali di luogo chiari indicano fuori dalla Cina continentale (per l’ambito di questo strumento).',
      explicit_non_cn_geo_detail:
        'Segnali di luogo chiari fuori dalla Cina continentale: {places}.',
      verify_conflict:
        'I segnali di prodotto e azienda non concordavano del tutto (la verifica incrociata ha trovato conflitti).',
      conflict_no_strong:
        'I segnali erano in conflitto e non c’era un legame forte con la Cina continentale — risultato incerto.',
      insufficient:
        'Non ci sono abbastanza informazioni affidabili su origine o proprietà per giudicare i legami con la Cina.',
      ownership_not_assessed:
        'La proprietà aziendale non è stata valutata appieno in questa verifica.',
      taiwan_as_country:
        'Taiwan è trattato come un paese distinto e non conta come «legato alla Cina» per questo punteggio.',
      taiwan_as_country_detail:
        'Taiwan è trattato come un paese distinto (visto in: {places}) e non conta come «legato alla Cina» per questo punteggio.',
    },
    caveats: 'Avvertenze',
    disclaimer:
      'Solo informativo — conoscenze del modello e ricerca web opzionale, non consulenza legale o sulle sanzioni. L’IA può sbagliare.',
    knowledgeModel:
      'Basato solo sulla conoscenza generale del modello (nessuna ricerca web in tempo reale). Origine del marchio, impianti dei componenti e assemblaggio finale/paese d’origine possono differire per SKU/mercato — dai priorità alle etichette. Non è un registro societario né una banca dati doganale. Informativo — non consulenza legale, commerciale o sulle sanzioni.',
    knowledgeWeb:
      'Include una ricerca web in tempo reale (Google Search tramite grounding Gemini) più la conoscenza del modello. Non è comunque un registro societario né una banca dati doganale — etichette e atti ufficiali possono divergere dalle pagine web. Informativo — non consulenza legale, commerciale o sulle sanzioni.',
    providerNotConfigured:
      'La verifica IA non è configurata. Aggiungi una chiave in .dev.vars ed esegui `npm run pages:dev` (vedi README).',
    rateLimited:
      'Limite del server gratuito: 1 verifica ogni 30 secondi. Attendi un attimo.',
    rateLimitedDay:
      'Limite del server gratuito: max 10 verifiche ogni 6 ore. Riprova più tardi.',
    rateLimitBadge: 'Limite del server gratuito',
    rateLimitFreeNote:
      'Server gratuito · 1 verifica / 30 s · max 10 / 6 ore · 1 alla volta',
    rateLimitRpmTitle: 'Limite di frequenza del server gratuito (30 s)',
    rateLimitedLongTitle: 'Limite 6 ore del server gratuito',
    rateLimitInflightTitle: 'Verifica già in corso',
    rateLimitShortDetail:
      'Limite del server gratuito: {n} verifica/e ogni {w} s. Attendi circa {s} s, poi riprova.',
    rateLimitLongDetail:
      'Limite del server gratuito: {n} verifiche ogni {h} ore. Riprova tra circa {m} minuti.',
    rateLimitMinuteDetail:
      'Limite del server gratuito: {n} verifica/e ogni {w} s. Attendi circa {s} s, poi riprova.',
    rateLimitDayDetail:
      'Limite del server gratuito: {n} verifiche ogni {h} ore. Riprova più tardi.',
    rateLimitInflightDetail:
      'Il server gratuito consente solo 1 verifica alla volta. Attendi che finisca quella in corso.',
    rateLimitAutoIn: 'Automatico tra {s} s…',
    rateLimitAutoHint:
      'Invio automatico tra {s} s quando si apre la finestra del server gratuito.',
    rateLimitAutoStop: 'Ferma',
    rateLimitAutoCancelled:
      'Invio automatico annullato. Potrai riprovare quando sei pronto.',
    forbiddenOrigin: 'Richiesta non consentita da questa origine.',
    badRequest: 'Richiesta non valida.',
    parseError: 'Impossibile comprendere la risposta. Riprova.',
    upstreamError: 'Il servizio di risposta non è riuscito. Riprova più tardi.',
    upstreamQuota: 'Il servizio di risposta è occupato. Riprova più tardi.',
    upstreamUnavailable: 'Il servizio di risposta è temporaneamente non disponibile.',
    emptyResponse: 'Nessuna risposta restituita. Riprova.',
    serverError: 'Qualcosa è andato storto. Riprova.',
    forceRefresh: 'Verifica di nuovo (salta la cache)',
    forceRefreshHint:
      'Questa risposta era in cache. Verificare di nuovo avvia un nuovo passaggio IA (conta comunque nei limiti del server gratuito).',
    cached: 'cache',
    degraded: 'risultato parziale',
    relationLabel: 'Legame con la Cina',
    confidence: '{n}% di confidenza',
    productFacts: 'Prodotto',
    companyFacts: 'Azienda',
    brand: 'Marchio',
    madeIn: 'Prodotto in (questa unità / paese d’origine finale)',
    madeInUnconfirmed: 'Paese di origine finale non confermato — vedi componenti / linea globale',
    originLayersTitle: 'Livelli di origine',
    originLayersIntro:
      'Separa brand/ops, proprietà, COO finale e parti — la proprietà non è made-in.',
    layerBrandOps: 'Brand / ops',
    layerOwnership: 'Proprietà / società madri',
    layerOwnershipHint: 'Non è COO finale / made-in',
    layerOwnershipEmpty: 'Nessun segnale di proprietà/società madre in questo risultato',
    layerFinalCoo: 'COO finale',
    layerParts: 'Candidati parti',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'Quota di ricerca IA esaurita — al momento non sono disponibili informazioni più precise. Riprova dopo il reset giornaliero.',
    aiCreditsUsedUp:
      'Credito del servizio IA temporaneamente esaurito — al momento non sono disponibili informazioni più precise. Riprova più tardi.',
    srv: {
      partOmittedNoEvidence:
        'Paese del componente omesso: nessuna prova da ricerca/etichetta (la sede del marchio non è l’origine di un componente).',
      partOmittedUnconfirmed:
        'Paese del componente omesso: non confermato da ricerca/etichetta per questo componente.',
      madeInOmittedBrand:
        'Paese di fabbricazione omesso: corrispondeva solo al paese del marchio/design, senza prove di stabilimento o origine.',
      madeInOmittedOwnership:
        'Paese di fabbricazione omesso: la Cina deriva solo da dati di proprietà/capogruppo, non dal prodotto, dall’etichetta o da un rivenditore.',
      cooUnconfirmedSeeParts:
        'Origine finale non confermata – vedi la linea componenti/produzione globale o i componenti per i candidati (fabbricazione non confermata).',
      cooUnconfirmedNoLabel:
        'Origine finale non confermata – nessun paese d’origine sul prodotto/etichetta; non ne viene inventato uno.',
      cooUnconfirmedNoBarcode:
        'Paese di produzione finale non confermato; gli altri paesi sono solo candidati.',
      cooUnconfirmedCandidates:
        'Origine finale non confermata – i candidati qui sotto sono segnali di ricerca, non un «Made in» stampato.',
      distributorOmitted:
        'Distributore locale / agente di mercato escluso dalle capogruppo (non è un proprietario legale).',
      chinaLinkUnclear:
        'Legame con la Cina non chiaro – non considerarlo confermato privo di legami con la Cina.',
      verifyConflict:
        'La verifica ha segnalato indicazioni contrastanti',
      companyNotAssessed:
        'Dati su azienda/proprietà non valutati',
      taiwanSeparate:
        'Taiwan è trattata come paese distinto per i livelli di relazione',
      webUnavailableLabel:
        'Ricerca web in tempo reale non disponibile – i paesi dei componenti provengono dalla foto dell’etichetta, non dalla ricerca.',
      altsAim:
        'I marchi/prodotti alternativi puntano a un minore coinvolgimento della Cina (non solo somiglianza). I livelli sono stime; la sede da sola non prova una produzione fuori dalla Cina.',
      altsNone:
        'Nessuna alternativa con minore coinvolgimento della Cina trovata con sufficiente certezza.',
      sumCooUnconfirmed:
        'Origine finale non confermata',
      tierUnknown:
        'Prove insufficienti per valutare i legami con la Cina.',
      tierNone:
        'Nessun legame con la Cina trovato nei segnali disponibili.',
      tierDirect:
        'Trovati segnali di legame diretto con la Cina.',
      tierIndirect:
        'Trovati segnali di legame indiretto con la Cina.',
      cooConflictChina:
        'Origine finale non confermata – il segnale {source} ({label}) contraddice «Made in China»; proprietà/capogruppo da sole non bastano a stabilire il paese di fabbricazione.',
      cooConflictMadeIn:
        'Origine finale non confermata – il segnale {source} ({label}) contraddice la fabbricazione in {madeIn}; mantenuto solo come candidato.',
      candidate:
        '{label} ({rating}, {pct}%, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'I modelli di ricerca in tempo reale non erano disponibili con questa chiave API – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_search_grounding_unavailable:
        'La ricerca Google in tempo reale non era disponibile con questa chiave API – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_upstream_credits:
        'Crediti del servizio IA esauriti (saldo prepagato vuoto) – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_upstream_quota:
        'Quota giornaliera gratuita di ricerca Google esaurita – riprova dopo il ripristino giornaliero – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_upstream_unavailable:
        'La ricerca web in tempo reale è scaduta o il servizio era sovraccarico – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_empty_response:
        'La ricerca web in tempo reale ha restituito una risposta vuota – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_disabled:
        'La ricerca web in tempo reale era disattivata per questa verifica – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_gemini_not_configured:
        'Gemini non è configurato per la ricerca web in tempo reale – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_no_entity:
        'Nessun nome di prodotto per la ricerca web in tempo reale – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      webFail_default:
        'Nessuna ricerca web in tempo reale per questa verifica – i paesi di fabbricazione e dei componenti sono più prudenti (solo conoscenza del modello).',
      sum: {
        madeIn: 'Prodotto in: {value}',
        candidates: 'Candidati: {value}',
        brandOrigin: 'Origine del marchio: {value}',
        components: 'Componenti/produzione globale: {value}',
        parts: 'Componenti: {value}',
        hq: 'Sede: {value}',
        company: 'Azienda: {value}',
      },
      signal: {
        ocr: 'etichetta',
        retailer: 'rivenditore',
        manufacturer: 'produttore',
        ownership: 'proprietà',
        unknown: 'sconosciuto',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Salva immagine',
    sectionShareShare: 'Condividi',
    sectionShareSaved: 'Salvato',
    sectionShareFailed: "Impossibile salvare l'immagine",
    sectionShareHint: 'Passa su un livello per salvare o condividere',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'pagina web (corrispondenza del nome)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'proprietà / madre',
    },
    origin: 'Origine',
    brandOrigin: 'Origine del marchio',
    componentsOrigin: 'Componenti / linea globale',
    productNotes: 'Note di origine',
    manufacturer: 'Produttore',
    company: 'Azienda',
    hq: 'Sede',
    parents: 'Società madri',
    graphTitle: 'Grafo delle relazioni',
    graphHint:
      'Le frecce mostrano come si collegano prodotto, azienda, società madri e luoghi. Espandi o zoom se le etichette sono strette.',
    graphControls: 'Controlli del grafo',
    graphZoomIn: 'Ingrandisci',
    graphZoomOut: 'Riduci',
    graphExpand: 'Espandi',
    graphCollapse: 'Comprimi',
    graphRelations: 'Relazioni',
    graphNoEdges: 'Nessun collegamento di relazione è stato inferito per questo risultato.',
    graphLink: 'collegato',
    graphChinaLinked: 'Legato alla Cina',
    graphLegendCn: 'Nodo/arco legato alla Cina',
    graphLegendOther: 'Altro',
    graphEdge: {
      brand: 'marchio',
      brand_company: 'marchio',
      'brand/company': 'marchio',
      made_in: 'prodotto in',
      hq: 'sede',
      parent: 'società madre',
      majority: 'proprietario di maggioranza',
      wholly: 'interamente posseduto',
      minority: 'quota di minoranza',
      ownership: 'proprietà',
      affiliation: 'marchio',
      manufacturing: 'prodotto in',
      part: 'parte',
      spare: 'ricambio',
      ingredient: 'ingrediente',
      component: 'componente',
    },
    regionsTitle: 'Regioni',
    altBrands: 'Marchi con minor coinvolgimento cinese (stimato)',
    altProducts: 'Prodotti con minor coinvolgimento cinese (stimato)',
    altDisclaimer:
      'Solo sostituti stimati come non Directamente legati alla Cina (niente riempitivi «made in China»). Una sede USA/UE da sola non prova una produzione extra-Cina. Un made-in poco chiaro è Sconosciuto, non Non correlato.',
    estimated: 'stima',
    twNote:
      'Taiwan è trattato come un paese distinto e mai come legato alla Cina per i livelli.',
    region: {
      CN: 'Cina continentale',
      HK: 'Hong Kong',
      TW: 'Taiwan',
      MO: 'Macao',
      OTHER: 'Altro',
      UNKNOWN: 'Sconosciuto',
    },
    steps: {
      start: 'Avvio',
      cache: 'Cache',
      identify: 'Lettura etichetta',
      web: 'Ricerca web',
      monolith: 'Analisi completa',
      dual_core: 'Prodotto e azienda',
      product: 'Origine del prodotto',
      company: 'Legami aziendali',
      verify: 'Verifica incrociata',
      alternatives: 'Alternative con minor legame CN',
      synthesize: 'Punteggio',
    },
  },
  history: {
    title: 'Cronologia',
    subtitle: 'Verifiche precedenti su questo dispositivo',
    empty: 'Nessuna verifica precedente.',
    withPhoto: 'Foto',
    open: 'Apri',
    remove: 'Rimuovi',
  },
  settings: {
    title: 'Impostazioni',
    subtitle: 'Preferenze e dati su questo dispositivo',
    panelDisplay: 'Lingua e tema',
    panelCheck: 'Cosa verificare',
    panelData: 'Elimina dati',
    language: 'Lingua',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Chiaro',
    themeDark: 'Scuro',
    geoScope: 'Ambito Cina per i livelli',
    geoScopeHint:
      'Taiwan è sempre trattato come un paese distinto e non determina mai i livelli di legame con la Cina. Solo RPC usa la Cina continentale. Greater China può includere Hong Kong e Macao (non Taiwan).',
    geoScopePrc: 'Solo RPC / continente (predefinito)',
    geoScopeGreater: 'CN + Hong Kong + Macao (non Taiwan)',
    dimensions: 'Cosa verificare',
    dimensionsHint:
      'Le alternative con minor coinvolgimento cinese sono disattivate per impostazione predefinita. Attiva alternative di marchio o prodotto se vuoi sostituti con meno legame cinese (usa una chiamata IA extra).',
    dimOrigin: 'Luogo di origine',
    dimManufacturer: 'Origine del produttore',
    dimCompany: 'Relazioni aziendali',
    dimAltBrands: 'Alternative di marchio con minor coinvolgimento cinese',
    dimAltProducts: 'Alternative di prodotto con minor coinvolgimento cinese',
    howItWorks: 'Come funziona',
    about: 'Info su OriginWise',
    version: 'Versione {v}',
    cleanData: 'Elimina dati locali',
    cleanDataHint:
      'I dati restano solo in questo browser. Scegli cosa rimuovere. L’operazione non è reversibile.',
    dataSummary: 'Su questo dispositivo',
    dataNone: 'Nessun dato OriginWise memorizzato.',
    dataHistory: 'Verifiche precedenti: {n}',
    dataSettings: 'Impostazioni personalizzate',
    dataDisclaimer: 'Avviso accettato',
    cleanAll: 'Tutto',
    cleanHistory: 'Solo verifiche precedenti',
    cleanSettings: 'Solo impostazioni',
    cleanConfirm: 'Eliminare i dati selezionati?',
    cleanConfirmBtn: 'Elimina ora',
    cleanDoneAll: 'Tutti i dati locali OriginWise sono stati eliminati.',
    cleanDoneHistory: 'Verifiche precedenti eliminate.',
    cleanDoneSettings: 'Impostazioni ripristinate ai valori predefiniti.',
  },
  about: {
    title: 'Info',
    tagline: 'Un semplice controllo del legame con la Cina',
    intro:
      'OriginWise ti aiuta a vedere in fretta se un prodotto o un marchio sembra legato alla Cina — luogo di origine, produttore e legami aziendali — con alternative facoltative a minor coinvolgimento. Le verifiche restano su questo dispositivo.',
    body: 'OriginWise è uno strumento semplice per un controllo rapido del legame con la Cina su prodotti e marchi di tutti i giorni. L’IA può essere incompleta o sbagliata.',
    privacy: 'Nessun account. La cronologia resta su questo telefono/browser.',
    license: 'Licenza MIT',
    licenseShort: 'MIT',
    openSourceTitle: 'Open source · MIT',
    openSourceBody:
      'Questo progetto è software libero sotto licenza MIT. Puoi usarlo, copiarlo, modificarlo, unirlo, pubblicarlo, distribuirlo e concederlo in sublicenza — anche per un tuo deployment con le tue chiavi API.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Fornito «così com’è», senza garanzia. Vedi il testo completo della licenza su GitHub.',
    linkSource: 'Codice sorgente',
    linkLicense: 'Licenza MIT',
    linkIssues: 'Segnalazioni e feedback',
    linkReleases: 'Release',
    linkSecurity: 'Politica di sicurezza',
    privacyTitle: 'La tua privacy',
    privacyLead:
      'Teniamo le cose semplici: nessun account, e la cronologia delle verifiche resta sul tuo telefono o computer.',
    privacyBullet1:
      'Verifiche precedenti, impostazioni e preferenze sono salvate solo in questo browser sul tuo dispositivo.',
    privacyBullet2: 'Non c’è login né una copia cloud del tuo diario di verifiche.',
    privacyBullet3:
      'Puoi cancellare tutto in qualsiasi momento con «Elimina dati locali» nelle Impostazioni.',
    privacyBullet4:
      'Quando avvii una verifica, il nome o la foto vengono inviati solo per quella risposta. Non conserviamo le confezioni come catalogo prodotti.',
    privacyBullet5:
      'Le foto vengono compresse sul tuo dispositivo prima del caricamento e non sono memorizzate come record del server.',
    privacyBullet6:
      'Con la ricerca web in tempo reale attiva, il nome del prodotto (e il testo dell’etichetta) viene inviato anche una volta a un servizio di ricerca: prima Google Search tramite Gemini e, solo se non riesce, Brave Search o Firecrawl. I passaggi di avanzamento e il risultato indicano il servizio effettivamente usato. Non conserviamo alcun registro delle ricerche.',
    privacyPolicyLink: 'Informativa sulla privacy',
    termsLink: 'Termini d’uso',
    designTitle: 'Come funziona',
    designLead:
      'Controllo IA multi-agente rapido, poi una tabella di punteggio fissa — non una banca dati legale.',
    designLocalTitle: 'Cosa resta sul tuo dispositivo',
    designLocalBody:
      'Dopo il caricamento, cronologia, lingua, tema e preferenze di verifica sono salvati solo in questo browser. Cancella i dati del sito o usa «Elimina dati locali».',
    designWhyTitle: 'Perché l’abbiamo fatto così',
    designWhy1: 'Controlli mobili rapidi senza creare un account.',
    designWhy2: 'La cronologia resta con te — cancellala quando vuoi.',
    designWhy3:
      'L’IA può sbagliare; mostriamo avvertenze e trattiamo Taiwan come un paese distinto per i livelli.',
    disclaimerTitle: 'Nota bene',
    disclaimerBody:
      'OriginWise è solo informativo — non consulenza legale, doganale o sulle sanzioni. IA e etichette di livello possono essere incomplete o sbagliate. Verifica sempre tu le decisioni critiche.',
    createdBy: 'Mantenuto da',
    contributionsWelcome: 'Issue e pull request sono benvenute su GitHub.',
  },
  how: {
    title: 'Come funziona',
    subtitle: 'Controllo rapido del legame con la Cina — restare semplici',
    aimTitle: 'A cosa serve questa app',
    aimBody:
      'Aiutarti a vedere in fretta se un prodotto o un marchio sembra legato alla Cina — fabbricato lì, legami aziendali e così via. Non è uno strumento di ricerca approfondita né un controllo legale.',
    stepsTitle: 'In parole semplici',
    step1Title: 'Invii qualcosa',
    step1Body: 'Un nome di prodotto, un marchio o una foto della confezione.',
    step2Title: 'Cerchiamo con l’IA',
    step2Body:
      'Partono piccoli controlli: luogo del prodotto e azienda (insieme), poi una doppia verifica rapida. Facoltativo: alternative di marchio/prodotto con minor coinvolgimento cinese se le attivi.',
    step3Title: 'Ottieni un risultato semplice',
    step3Body:
      'Un badge colorato: Non correlato, Indiretto, Diretto o Sconosciuto — più un breve perché.',
    graphTitle: 'Flusso completo',
    graphHint: 'Dal tuo input al badge colorato.',
    flowYou: 'Tu (nome / foto)',
    flowAi: 'Controlli IA',
    flowProduct: 'Luogo del prodotto',
    flowCompany: 'Azienda',
    flowVerify: 'Doppia verifica',
    flowScore: 'Punteggio semplice',
    flowResult: 'Risultato a colori',
    flowAiDetail:
      'Prima luogo del prodotto + azienda, poi una doppia verifica rapida.',
    flowScoreDetail: 'Combiniamo le risposte in un punteggio semplice.',
    badgeTitle: 'Cosa significano i colori',
    badgeNone: 'Non correlato — nessun chiaro legame con la Cina trovato',
    badgeIndirect: 'Indiretto — legame più debole o parziale',
    badgeDirect: 'Diretto — legame chiaro (es. made in China o sede lì)',
    badgeUnknown: 'Sconosciuto — informazioni non abbastanza chiare',
    twTitle: 'Taiwan',
    twBody:
      'Taiwan conta sempre qui come un paese a sé. Non conta da solo come «legato alla Cina».',
    evidenceTitle:
      'Quando un paese di fabbricazione è confermato',
    evidenceBody:
      'Un paese di fabbricazione risulta confermato in tre modi. Il più forte: una foto dell’etichetta della confezione, o una pagina web che mostra lo stesso codice a barre (JAN/EAN) accanto all’indicazione di origine (corrispondenza del codice a barre). Poi la corrispondenza del modello esatto: la risposta dell’IA e almeno una pagina web con marca e modello esatti indicano lo stesso paese, oppure due o più pagine di questo tipo su siti diversi concordano; la risposta dell’IA compare allora come una delle fonti. In entrambi i casi nessuna pagina con il modello esatto deve indicare un altro paese. La sola risposta dell’IA non conferma mai e resta un riferimento del modello; se le pagine con il modello esatto non concordano, il paese resta non confermato con i candidati elencati. Un link citato dall’IA conta solo dopo un controllo: la pagina (restituita dalla ricerca web o caricata) deve indicare il modello esatto e lo stesso paese, e non essere stata esclusa come altro modello; altrimenti compare come «Citato dall’IA, non verificato» e non conta. Una corrispondenza generica sul nome del prodotto compare solo come candidato sotto «Non confermato», e una pagina con più taglie o varianti resta non confermata. Se la ricerca web in tempo reale non è disponibile, il risultato si basa solo sulle conoscenze del modello e lo indica.',
    flowWeb:
      'Ricerca web',
    flowWebDetail:
      'Cercare pagine web per nome del prodotto o codice a barre e controllare l’indicazione di origine.',
    privacyTitle: 'I tuoi dati',
    privacyBody:
      'La cronologia resta su questo dispositivo e le foto non vengono salvate sul server. Con la ricerca web in tempo reale attiva, il nome del prodotto o il codice a barre viene inviato ai servizi di ricerca. L’IA può sbagliare: verifica sempre le decisioni importanti.',
    tryBtn: 'Prova una verifica',
  },
  tier: {
    none: 'Non correlato',
    indirect: 'Indiretto',
    direct: 'Diretto',
    unknown: 'Sconosciuto',
  },
} satisfies MessageTree;
