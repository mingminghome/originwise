import type { MessageTree } from './en';

export const da = {
  appName: 'OriginWise',
  tabs: {
    check: 'Tjek',
    history: 'Historik',
    about: 'Om',
    settings: 'Indstillinger',
    navMore: 'Menu',
  },
  common: {
    present: 'Ja',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'Nej',
    cancel: 'Annuller',
    confirm: 'Bekræft',
    delete: 'Slet',
    back: 'Tilbage',
    loading: 'Indlæser…',
    optional: 'Valgfrit',
  },
  install: {
    aria: 'Installer OriginWise',
    title: 'Installer OriginWise',
    body: 'Føj til startskærmen for et hurtigt app-agtigt tjek.',
    bodyIos: 'Føj til startskærmen for fuldskærmsbrug.',
    iosStep1: 'Tryk',
    iosStep2: 'Del, og derefter Føj til startskærm.',
    action: 'Installer',
    dismiss: 'Luk installationsprompten',
  },
  support: {
    buyMeAPint: 'Køb mig en pint',
    pintShort: 'Pint',
    thanks: 'Hvis OriginWise hjælper dig, kan du købe mig en pint:',
  },
  welcome: {
    title: 'Velkommen til OriginWise',
    body: 'Hurtigt tjek: er dette produkt eller mærke relateret til Kina? Skriv et navn eller fotografer emballagen. AI kan tage fejl — ikke juridisk rådgivning.',
    accept: 'Forstået — begynd at tjekke',
  },
  check: {
    identifiedAs: 'Genkendt som: {name}',
    chinaLink: {
      title: 'Forbindelse til Kina',
      chinaCompany: 'Kinesisk virksomhed',
      chinaControlled: 'Kinesisk kontrolleret',
      hq: 'Hovedsæde',
      owner: 'Kontrollerende ejer',
      brandOrigin: 'Mærkets oprindelse',
      madeIn: 'Fremstillet i',
      parts: 'Dele',
      china: 'Kina',
      unconfirmed: 'Ikke bekræftet',
      partsChina: 'Nogle dele fremstillet i Kina',
      hqParentNote: 'Hovedsædet i Kina i svaret tilhører moderselskabet',
      madeInBelow: 'Fremstillingslandet afgøres kun i kortet »Fremstillet i« (stregkode eller emballageetiket).',
      madeInChina: 'Fremstillet i Kina',
      footnote: 'Dette kort beskriver kun, hvor virksomheden har hjemme, hvem der ejer den, og hvor produktet fremstilles. Det er ikke en vurdering af produktets kvalitet eller sikkerhed eller af virksomheden.',
      controlling: 'Kontrol',
      reasonParent: 'Det kontrollerende moderselskab ligger i Fastlandskina.',
      reasonBrandOrigin: 'Mærkets oprindelse: {place}.',
      madeInLineBarcode: 'Fremstillet i: {place} (stregkodematch, se kortet »Fremstillet i« nedenfor)',
      madeInLineLabel: 'Fremstillet i: {place} (emballageetiket, se kortet »Fremstillet i« nedenfor)',
    },
    rc: {
      modelRef: 'Modellens angivelse (ubekræftet)',
      modelRefHelp: 'Ikke bekræftet af nogen webside eller emballageetiket; det er kun modellens gæt. Gå efter etiketten på emballagen.',
      moreInfo: 'Mere info',
      notConfirmed: ' (ikke bekræftet)',
      likelyNote: 'Kun matchet via produktnavn – fremstillingsland ikke bekræftet. Behandl det ikke som bekræftet.',
      candidatesTitle: 'Fundne kandidater til fremstillingsland (ikke bekræftet)',
      noCandidates: 'Ingen pålidelige kandidater fundet.',
      noBarcodePage: 'Ingen side viste stregkoden med fremstillingsland',
      sourceCount: 'Kilder: {n}',
      sourceFirst: 'Kilde 1: {label}',
      sourceNth: 'Kilde {n}: {label}',
      sourceCountry: 'fremstillet i {country}',
      labelSource: 'Kilde: foto af emballagens etiket',
      parent: 'Moderselskab',
      tagConfirmed: 'Bekræftet',
      tagLikely: 'Sandsynlig',
      tagMentioned: 'Nævnt',
      tagUnconfirmed: 'Ikke bekræftet',
      foldSources: 'Alle kilder',
      foldAlts: 'Alternative mærker',
      foldAi: 'AI-/søgedetaljer',
      expand: 'Vis',
      collapse: 'Skjul',
    },
    matchBasis: {
      barcode: 'Matchet via stregkode',
      name: 'Matchet via produktnavn',
      label: 'Ifølge emballagens mærkning',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Webundersøgelse — opslag sendt til {name}',
    searchUsage: 'Websøgning: {provider} · antal søgeforespørgsler: {n}',
    knowledgeWebVia:
      'Inkluderer et live-webundersøgelsespass ({provider}) plus modelviden. Stadig ikke et selskabsregister eller en tolddatabase — etiketter og officielle dokumenter kan være uenige med websider. Informativt — ikke juridisk, handels- eller sanktionsrådgivning.',
    title: 'Hurtigt tjek',
    subtitle: 'Er denne vare relateret til Kina? Skriv et navn eller fotografer emballagen.',
    placeholder: 'f.eks. snackmærke, telefon, legetøj…',
    placeholderWithPhoto: 'Valgfrit: hvad er dette produkt?',
    photo: 'Kamera',
    gallery: 'Galleri',
    removePhoto: 'Fjern foto',
    photoLabelHint: 'Vi læser etiketten, hvis teksten er tydelig',
    noteOptional: 'Valgfri note',
    submit: 'Tjek nu',
    submitting: 'Tjekker…',
    needInput: 'Skriv et produktnavn eller tilføj et foto.',
    howLink: 'Sådan virker det',
    newCheck: 'Nyt tjek',
    comingSoon:
      'Tjek-API’et kommer i en senere PR. Historik og indstillinger er klar.',
    photoTooLarge: 'Fotoet er stadig for stort efter komprimering.',
    photoInvalid: 'Kunne ikke læse det billede.',
    dropPhoto: 'Slip foto her',
    unnamedPhoto: '(foto)',
    partsTitle: 'Dele, reservedele og ingredienser',
    partsHint:
      'Isoleret fra dette produkt — vigtige komponenter, reservedele eller ingredienser og om de ser Kina-relaterede ud.',
    partKind: {
      part: 'Del',
      spare: 'Reservedel',
      ingredient: 'Ingrediens',
      component: 'Komponent',
    },
    progressHint: 'Analyserer oprindelse og virksomhed…',
    stepMonolith: 'Indsamler produkt- og virksomhedssignaler',
    answeredBy: 'Hovedsvar via {name}',
    agentsUsed: '{n} agenter',
    agentsTitle: 'Brugt AI-pulje',
    agentsSummary: '{total} kald · {ok} ok · {fail} mislykkede',
    agentsHint:
      'Hver række er et gratis-server-AI-kald. Fejl skyldes ofte kvote, modeladgang eller timeout; vi prøver andre eller et fallback. Live-web kræver Gemini Search grounding (ikke det samme som tekst-RPM).',
    agentOk: 'OK',
    agentFail: 'Mislykkedes ({err})',
    agentSkipped: 'Sprunget over ({err})',
    agentFailUnknown: 'fejl',
    agentError: {
      upstream_quota: 'kvote / hastighedsgrænse',
      upstream_credits: 'AI-kredit brugt op',
      upstream_error: 'upstream-fejl',
      upstream_unavailable: 'tjeneste utilgængelig',
      empty_response: 'tomt svar',
      model_unavailable: 'model ikke tilgængelig på denne API-nøgle',
      search_grounding_unavailable:
        'Google Search grounding ikke tilgængelig på denne nøgle (prøv Default-puljemodeller / slå fakturering til; Gemini 3 Search er ofte 0/0)',
      disabled: 'deaktiveret',
      gemini_not_configured: 'Gemini ikke konfigureret',
      no_entity: 'intet produktnavn',
    },
    agent: {
      identify: 'Læs etiket / navn',
      product: 'Produktsted',
      company: 'Virksomhedslinks',
      verify: 'Dobbeltjek',
      alternatives: 'Alternativer med mindre CN-link',
      monolith: 'Fuldt tjek (ét kald)',
      dual_core: 'Produkt + virksomhed',
      dual_alts: 'Alternativer med mindre CN-link',
      unknownProvider: 'Ukendt AI',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Hvorfor dette niveau',
    reason: {
      made_in_cn: 'Produktet er fremstillet i Fastlandskina.',
      made_in_cn_detail: 'Produktet er fremstillet i {place}.',
      origin_cn: 'Produktets oprindelse er knyttet til Fastlandskina.',
      origin_cn_detail: 'Produktets oprindelse er angivet som {place}.',
      manufacturer_cn: 'Producenten er knyttet til Fastlandskina.',
      manufacturer_cn_detail: 'Producentens sted/link: {place}.',
      hq_cn: 'Virksomhedens hovedsæde ligger i Fastlandskina.',
      hq_cn_detail: 'Virksomhedens hovedsæde ligger i {place}.',
      parent_majority_cn:
        'Et majoritets-/kontrollerende moderselskab er knyttet til Fastlandskina.',
      ownership_strong_cn:
        'Stærke ejerskabs- eller kontrolforbindelser til Fastlandskina blev rapporteret.',
      ownership_weak_cn:
        'Svage forbindelser (f.eks. minoritetsandel, forsyning eller detail) til Fastlandskina blev rapporteret.',
      component_cn:
        'Nogle komponenter eller samling er knyttet til Fastlandskina, uden et fuldt “made in China”-krav.',
      explicit_non_cn_geo:
        'Tydelige stedssignaler peger uden for Fastlandskina (for dette værktøjs omfang).',
      explicit_non_cn_geo_detail:
        'Tydelige stedssignaler uden for Fastlandskina: {places}.',
      verify_conflict:
        'Produkt- og virksomhedssignaler var ikke helt enige (krydstjek fandt konflikter).',
      conflict_no_strong:
        'Signalerne var i konflikt, og der var ingen stærk Fastlandskina-forbindelse — resultatet blev ladet usikkert.',
      insufficient:
        'Ikke nok pålidelig oprindelses- eller ejerskabsinformation til at vurdere Kina-relaterede links.',
      ownership_not_assessed:
        'Virksomhedens ejerskab blev ikke fuldt vurderet i dette tjek.',
      taiwan_as_country:
        'Taiwan behandles som et separat land og tæller ikke som “Kina-relateret” for denne score.',
      taiwan_as_country_detail:
        'Taiwan behandles som et separat land (set i: {places}) og tæller ikke som “Kina-relateret” for denne score.',
    },
    caveats: 'Forbehold',
    disclaimer:
      'Kun til information — modelviden og valgfri live-webundersøgelse, ikke juridisk eller sanktionsrådgivning. AI kan tage fejl.',
    knowledgeModel:
      'Kun baseret på generel modelviden (ingen live-websøgning). Mærkeoprindelse, komponentfabrikker og slutsamling/oprindelsesland kan variere efter SKU/marked — foretræk emballageetiketter. Ikke et selskabsregister eller en tolddatabase. Informativt — ikke juridisk, handels- eller sanktionsrådgivning.',
    knowledgeWeb:
      'Inkluderer et live-webundersøgelsespass (Google Search via Gemini-grounding) plus modelviden. Stadig ikke et selskabsregister eller en tolddatabase — etiketter og officielle dokumenter kan være uenige med websider. Informativt — ikke juridisk, handels- eller sanktionsrådgivning.',
    providerNotConfigured:
      'AI-tjek er ikke konfigureret. Tilføj en nøgle i .dev.vars og kør `npm run pages:dev` (se README).',
    rateLimited:
      'Gratis servergrænse: 1 tjek hver 30. sekund. Vent lidt.',
    rateLimitedDay:
      'Gratis servergrænse: maks. 10 tjek pr. 6 timer. Prøv igen senere.',
    rateLimitBadge: 'Gratis servergrænse',
    rateLimitFreeNote:
      'Gratis server · 1 tjek / 30s · maks. 10 / 6 timer · 1 ad gangen',
    rateLimitRpmTitle: 'Gratis serverhastighedsgrænse (30s)',
    rateLimitedLongTitle: 'Gratis server 6-timersgrænse',
    rateLimitInflightTitle: 'Et tjek er allerede i gang',
    rateLimitShortDetail:
      'Gratis servergrænse: {n} tjek hver {w}s. Vent ca. {s}s, og prøv igen.',
    rateLimitLongDetail:
      'Gratis servergrænse: {n} tjek pr. {h} timer. Prøv igen om ca. {m} minutter.',
    rateLimitMinuteDetail:
      'Gratis servergrænse: {n} tjek hver {w}s. Vent ca. {s}s, og prøv igen.',
    rateLimitDayDetail:
      'Gratis servergrænse: {n} tjek pr. {h} timer. Prøv igen senere.',
    rateLimitInflightDetail:
      'Den gratis server tillader kun 1 tjek ad gangen. Vent, til det aktuelle tjek er færdigt.',
    rateLimitAutoIn: 'Automatisk om {s}s…',
    rateLimitAutoHint:
      'Sendes automatisk om {s}s, når det gratis-servervindue åbner.',
    rateLimitAutoStop: 'Stop',
    rateLimitAutoCancelled:
      'Automatisk indsendelse annulleret. Du kan prøve igen, når du er klar.',
    forbiddenOrigin: 'Anmodning ikke tilladt fra denne origin.',
    badRequest: 'Ugyldig anmodning.',
    parseError: 'Kunne ikke forstå svaret. Prøv igen.',
    upstreamError: 'Svartjenesten mislykkedes. Prøv igen senere.',
    upstreamQuota: 'Svartjenesten er optaget. Prøv igen senere.',
    upstreamUnavailable: 'Svartjenesten er midlertidigt utilgængelig.',
    emptyResponse: 'Intet svar blev returneret. Prøv igen.',
    serverError: 'Noget gik galt. Prøv igen.',
    forceRefresh: 'Tjek igen (spring cache over)',
    forceRefreshHint:
      'Dette svar var cachelagret. Tjek igen kører et nyt AI-gennemløb (tæller stadig med i gratis-servergrænserne).',
    cached: 'cache',
    degraded: 'delvist resultat',
    relationLabel: 'Kina-relation',
    confidence: '{n} % tillid',
    productFacts: 'Produkt',
    companyFacts: 'Virksomhed',
    brand: 'Mærke',
    madeIn: 'Fremstillet i (denne enhed / endeligt oprindelsesland)',
    madeInUnconfirmed: 'Endeligt oprindelsesland ikke bekræftet — se komponenter / global linje',
    originLayersTitle: 'Oprindelseslag',
    originLayersIntro:
      'Adskil brand/drift, ejerskab, endelig COO og dele — ejerskab er ikke made-in.',
    layerBrandOps: 'Brand / drift',
    layerOwnership: 'Ejerskab / moderselskaber',
    layerOwnershipHint: 'Ikke endelig COO / made-in',
    layerOwnershipEmpty: 'Intet ejerskabs-/moderselskabssignal i dette resultat',
    layerFinalCoo: 'Endelig COO',
    layerParts: 'Delekandidater',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'AI-søgekvoten er brugt op — mere præcise oplysninger er ikke tilgængelige lige nu. Prøv igen efter den daglige nulstilling.',
    aiCreditsUsedUp:
      'AI-tjenestens kredit er midlertidigt brugt op — mere præcise oplysninger er ikke tilgængelige lige nu. Prøv igen senere.',
    srv: {
      partOmittedNoEvidence:
        'Delens land udeladt: intet bevis fra søgning/etiket (mærkets hovedkontor er ikke en dels oprindelse).',
      partOmittedUnconfirmed:
        'Delens land udeladt: ikke bekræftet af søgning/etiket for denne del.',
      madeInOmittedBrand:
        'Produktionsland udeladt: det matchede kun mærkets/designets land uden bevis fra fabrik eller oprindelse.',
      madeInOmittedOwnership:
        'Produktionsland udeladt: Kina stammer kun fra ejer-/moderselskabsdata, ikke fra produkt, etiket eller forhandler.',
      cooUnconfirmedSeeParts:
        'Endeligt oprindelsesland ubekræftet – se linjen komponenter/global produktion eller delene for kandidater (produktion ikke bekræftet).',
      cooUnconfirmedNoLabel:
        'Endeligt oprindelsesland ubekræftet – intet oprindelsesland på produkt/etiket; der opfindes ikke et.',
      cooUnconfirmedNoBarcode:
        'Endeligt oprindelsesland ubekræftet – ingen webside viste stregkoden/JAN sammen med et produktionsland; match på produktnavn er kun sandsynlige kandidater.',
      cooUnconfirmedCandidates:
        'Endeligt oprindelsesland ubekræftet – kandidaterne nedenfor er søgesignaler, ikke et trykt „Made in“.',
      distributorOmitted:
        'Lokal distributør / markedsagent udeladt fra moderselskaber (ikke juridisk ejer).',
      chinaLinkUnclear:
        'Forbindelse til Kina uklar – betragt det ikke som bekræftet uden Kina.',
      verifyConflict:
        'Kontrollen fandt modstridende signaler',
      companyNotAssessed:
        'Virksomheds-/ejerdata ikke vurderet',
      taiwanSeparate:
        'Taiwan behandles som et selvstændigt land i forbindelsesniveauerne',
      webUnavailableLabel:
        'Live websøgning utilgængelig – delenes lande kommer fra fotoet af etiketten, ikke fra søgning.',
      altsAim:
        'Alternative mærker/produkter sigter mod mindre kinesisk involvering (ikke kun lighed). Niveauer er skøn; hovedkontoret alene beviser ikke produktion uden for Kina.',
      altsNone:
        'Ingen alternativer med mindre kinesisk involvering fundet med tilstrækkelig sikkerhed.',
      sumCooUnconfirmed:
        'Endeligt oprindelsesland ubekræftet',
      tierUnknown:
        'For lidt bevis til at vurdere forbindelser til Kina.',
      tierNone:
        'Ingen forbindelser til Kina fundet i de tilgængelige signaler.',
      tierDirect:
        'Direkte signaler om forbindelse til Kina fundet.',
      tierIndirect:
        'Indirekte signaler om forbindelse til Kina fundet.',
      cooConflictChina:
        'Endeligt oprindelsesland ubekræftet – {source}-signal ({label}) modsiger „Made in China“; ejer/moderselskab alene fastlægger ikke produktionslandet.',
      cooConflictMadeIn:
        'Endeligt oprindelsesland ubekræftet – {source}-signal ({label}) modsiger produktion i {madeIn}; kun beholdt som kandidat.',
      candidate:
        '{label} ({rating}, {pct} %, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Live-søgemodeller var ikke tilgængelige med denne API-nøgle – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_search_grounding_unavailable:
        'Live Google-søgning var ikke tilgængelig med denne API-nøgle – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_upstream_credits:
        'AI-kredit opbrugt (forudbetalt saldo tom) – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_upstream_quota:
        'Dagens gratis Google-søgekvote er opbrugt – prøv igen efter den daglige nulstilling – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_upstream_unavailable:
        'Live websøgning fik timeout, eller tjenesten var optaget – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_empty_response:
        'Live websøgning returnerede et tomt svar – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_disabled:
        'Live websøgning var slået fra for dette tjek – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_gemini_not_configured:
        'Gemini er ikke sat op til live websøgning – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_no_entity:
        'Intet produktnavn til live websøgning – produktions- og delelande er mere forsigtige (kun modelviden).',
      webFail_default:
        'Ingen live websøgning for dette tjek – produktions- og delelande er mere forsigtige (kun modelviden).',
      sum: {
        madeIn: 'Fremstillet i: {value}',
        candidates: 'Kandidater: {value}',
        brandOrigin: 'Mærkets oprindelse: {value}',
        components: 'Komponenter/global produktion: {value}',
        parts: 'Dele: {value}',
        hq: 'Hovedkontor: {value}',
        company: 'Virksomhed: {value}',
      },
      signal: {
        ocr: 'etiket',
        retailer: 'forhandler',
        manufacturer: 'producent',
        ownership: 'ejerskab',
        unknown: 'ukendt',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Gem billede',
    sectionShareShare: 'Del',
    sectionShareSaved: 'Gemt',
    sectionShareFailed: 'Kunne ikke gemme billedet',
    sectionShareHint: 'Hold musen over et lag for at gemme eller dele',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'webside (navnematch)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'ejerskab / moder',
    },
    origin: 'Oprindelse',
    brandOrigin: 'Mærkeoprindelse',
    componentsOrigin: 'Komponenter / global linje',
    productNotes: 'Oprindelsesnoter',
    manufacturer: 'Producent',
    company: 'Virksomhed',
    hq: 'Hovedsæde',
    parents: 'Moderselskaber',
    graphTitle: 'Relationsgraf',
    graphHint:
      'Pile viser, hvordan produkt, virksomhed, moderselskaber og steder hænger sammen. Udvid eller zoom, hvis etiketter føles trange.',
    graphControls: 'Grafvisning',
    graphZoomIn: 'Zoom ind',
    graphZoomOut: 'Zoom ud',
    graphExpand: 'Udvid',
    graphCollapse: 'Skjul',
    graphRelations: 'Relationer',
    graphNoEdges: 'Ingen relationslinks blev udledt for dette resultat.',
    graphLink: 'relateret',
    graphChinaLinked: 'Kina-knyttet',
    graphLegendCn: 'Kina-knyttet knude/kant',
    graphLegendOther: 'Andet',
    graphEdge: {
      brand: 'mærke',
      brand_company: 'mærke',
      'brand/company': 'mærke',
      made_in: 'fremstillet i',
      hq: 'hovedsæde',
      parent: 'moderselskab',
      majority: 'majoritetsejer',
      wholly: 'fuldt ejet',
      minority: 'minoritetsandel',
      ownership: 'ejerskab',
      affiliation: 'mærke',
      manufacturing: 'fremstillet i',
      part: 'del',
      spare: 'reservedel',
      ingredient: 'ingrediens',
      component: 'komponent',
    },
    regionsTitle: 'Regioner',
    altBrands: 'Mærker med mindre Kinainvolvering (skøn)',
    altProducts: 'Produkter med mindre Kinainvolvering (skøn)',
    altDisclaimer:
      'Kun substitutter skønnet som ikke direkte Kina-knyttede (ingen made-in-China-fyld). Et USA-/EU-hovedsæde alene beviser ikke fremstilling uden for Kina. Uklart fremstillingssted er Ukendt, ikke Urelateret.',
    estimated: 'skøn',
    twNote:
      'Taiwan behandles som et separat land og aldrig som Kina-relateret for niveauerne.',
    region: {
      CN: 'Fastlandskina',
      HK: 'Hongkong',
      TW: 'Taiwan',
      MO: 'Macao',
      OTHER: 'Andet',
      UNKNOWN: 'Ukendt',
    },
    steps: {
      start: 'Starter',
      cache: 'Cache',
      identify: 'Læser etiket',
      web: 'Webundersøgelse',
      monolith: 'Fuld analyse',
      dual_core: 'Produkt og virksomhed',
      product: 'Produktoprindelse',
      company: 'Virksomhedslinks',
      verify: 'Krydstjek',
      alternatives: 'Alternativer med mindre CN-link',
      synthesize: 'Scoring',
    },
  },
  history: {
    title: 'Historik',
    subtitle: 'Tidligere tjek på denne enhed',
    empty: 'Ingen tidligere tjek endnu.',
    withPhoto: 'Foto',
    open: 'Åbn',
    remove: 'Fjern',
  },
  settings: {
    title: 'Indstillinger',
    subtitle: 'Præferencer og data på denne enhed',
    panelDisplay: 'Sprog og tema',
    panelCheck: 'Hvad der skal tjekkes',
    panelData: 'Slet data',
    language: 'Sprog',
    theme: 'Tema',
    themeSystem: 'System',
    themeLight: 'Lyst',
    themeDark: 'Mørkt',
    geoScope: 'Kinaomfang for niveauer',
    geoScopeHint:
      'Taiwan behandles altid som et separat land og styrer aldrig Kina-relationsniveauer. Kun Kina bruger Fastlandskina. Greater China kan valgfrit omfatte Hongkong og Macao (ikke Taiwan).',
    geoScopePrc: 'Kun Kina / fastland (standard)',
    geoScopeGreater: 'CN + Hongkong + Macao (ikke Taiwan)',
    dimensions: 'Hvad der skal tjekkes',
    dimensionsHint:
      'Alternativer med mindre Kinainvolvering er slået fra som standard. Slå mærke- eller produktalternativer til, hvis du vil have substitutter med mindre Kinalink (ekstra AI-kald).',
    dimOrigin: 'Oprindelsessted',
    dimManufacturer: 'Producentens oprindelse',
    dimCompany: 'Virksomhedsrelationer',
    dimAltBrands: 'Mærkealternativer med mindre Kinainvolvering',
    dimAltProducts: 'Produktalternativer med mindre Kinainvolvering',
    howItWorks: 'Sådan virker det',
    about: 'Om OriginWise',
    version: 'Version {v}',
    cleanData: 'Slet lokale data',
    cleanDataHint:
      'Data bliver kun i denne browser. Vælg, hvad der skal fjernes. Dette kan ikke fortrydes.',
    dataSummary: 'På denne enhed',
    dataNone: 'Ingen OriginWise-data gemt.',
    dataHistory: 'Tidligere tjek: {n}',
    dataSettings: 'Egne indstillinger',
    dataDisclaimer: 'Ansvarsfraskrivelse accepteret',
    cleanAll: 'Alt',
    cleanHistory: 'Kun tidligere tjek',
    cleanSettings: 'Kun indstillinger',
    cleanConfirm: 'Slet valgte data?',
    cleanConfirmBtn: 'Slet nu',
    cleanDoneAll: 'Alle lokale OriginWise-data slettet.',
    cleanDoneHistory: 'Tidligere tjek slettet.',
    cleanDoneSettings: 'Indstillinger nulstillet til standard.',
  },
  about: {
    title: 'Om',
    tagline: 'Et enkelt Kina-relateret produkttjek',
    intro:
      'OriginWise hjælper dig hurtigt med at se, om et produkt eller mærke ser Kina-relateret ud — oprindelsessted, producent og virksomhedslinks — med valgfrie alternativer med mindre involvering. Tjek bliver på denne enhed.',
    body: 'OriginWise er et enkelt værktøj til et hurtigt Kina-relateret tjek af hverdagsprodukter og mærker. AI kan være ufuldstændig eller forkert.',
    privacy: 'Ingen konto. Din historik bliver på denne telefon/browser.',
    license: 'MIT-licens',
    licenseShort: 'MIT',
    openSourceTitle: 'Open source · MIT',
    openSourceBody:
      'Dette projekt er fri software under MIT-licensen. Du må bruge, kopiere, ændre, flette, udgive, distribuere og underlicensere det — også til din egen udrulning med dine egne API-nøgler.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Leveres “som den er”, uden garanti. Se den fulde licenstekst på GitHub.',
    linkSource: 'Kildekode',
    linkLicense: 'MIT-licens',
    linkIssues: 'Issues og feedback',
    linkReleases: 'Udgivelser',
    linkSecurity: 'Sikkerhedspolitik',
    privacyTitle: 'Dit privatliv',
    privacyLead:
      'Vi holder det enkelt: ingen konto, og din tjekhistorik bliver på din telefon eller computer.',
    privacyBullet1:
      'Tidligere tjek, indstillinger og præferencer gemmes kun i denne browser på din enhed.',
    privacyBullet2: 'Der er ingen login og ingen cloudkopi af din tjekdagbog.',
    privacyBullet3:
      'Du kan slette alt når som helst med Slet lokale data i Indstillinger.',
    privacyBullet4:
      'Når du kører et tjek, sendes navnet eller fotoet kun til det svar. Vi gemmer ikke emballage som et produktkatalog.',
    privacyBullet5:
      'Fotos komprimeres på din enhed før upload og gemmes ikke som serverposter.',
    privacyBullet6:
      'Når live-webundersøgelse er slået til, sendes produktnavnet (og etiketteksten) også én gang til en søgetjeneste: først Google Search via Gemini, og kun Brave Search eller Firecrawl hvis det fejler. Fremdriftstrinene og resultatet viser den tjeneste, der faktisk blev brugt. Vi gemmer ingen log over søgninger.',
    privacyPolicyLink: 'Privatlivspolitik',
    termsLink: 'Brugsvilkår',
    designTitle: 'Sådan virker det',
    designLead:
      'Hurtigt multiagent-AI-tjek, derefter en fast scoringstabel — ikke en juridisk database.',
    designLocalTitle: 'Hvad der bliver på din enhed',
    designLocalBody:
      'Når appen er indlæst, gemmes historik, sprog, tema og tjekpræferencer kun i denne browser. Ryd webstedsdata eller brug Slet lokale data.',
    designWhyTitle: 'Hvorfor vi byggede det sådan',
    designWhy1: 'Hurtige mobile tjek uden at oprette en konto.',
    designWhy2: 'Historikken bliver hos dig — slet den når som helst.',
    designWhy3:
      'AI kan tage fejl; vi viser forbehold og behandler Taiwan som et separat land for niveauerne.',
    disclaimerTitle: 'Bemærk',
    disclaimerBody:
      'OriginWise er kun informativt — ikke juridisk, told- eller sanktionsrådgivning. AI og niveaumærker kan være ufuldstændige eller forkerte. Verificér altid kritiske beslutninger selv.',
    createdBy: 'Vedligeholdt af',
    contributionsWelcome: 'Issues og pull requests er velkomne på GitHub.',
  },
  how: {
    title: 'Sådan virker det',
    subtitle: 'Hurtigt Kina-relateret tjek — hold det enkelt',
    aimTitle: 'Hvad denne app er til',
    aimBody:
      'Hjælpe dig hurtigt med at se, om et produkt eller mærke ser Kina-relateret ud — fremstillet der, virksomhedslinks osv. Ikke et dybt researchværktøj, ikke et juridisk tjek.',
    stepsTitle: 'Med enkle ord',
    step1Title: 'Du sender noget',
    step1Body: 'Et produktnavn, et mærke eller et foto af emballagen.',
    step2Title: 'Vi slår det op med AI',
    step2Body:
      'Små tjek kører: produktsted og virksomhed (sammen), derefter et hurtigt dobbeltjek. Valgfrit: mærke-/produktalternativer med mindre Kinainvolvering, hvis du slår dem til.',
    step3Title: 'Du får et enkelt resultat',
    step3Body:
      'Et farvemærke: Urelateret, Indirekte, Direkte eller Ukendt — plus et kort hvorfor.',
    graphTitle: 'Fuldt flow',
    graphHint: 'Fra dit input til farvemærket.',
    flowYou: 'Dig (navn / foto)',
    flowAi: 'AI-tjek',
    flowProduct: 'Produktsted',
    flowCompany: 'Virksomhed',
    flowVerify: 'Dobbeltjek',
    flowScore: 'Simpel score',
    flowResult: 'Farveresultat',
    flowAiDetail:
      'Først produktsted + virksomhed, derefter et hurtigt dobbeltjek.',
    flowScoreDetail: 'Vi samler svarene til én simpel score.',
    badgeTitle: 'Hvad farverne betyder',
    badgeNone: 'Urelateret — intet klart Kinalink fundet',
    badgeIndirect: 'Indirekte — svagere eller delvist link',
    badgeDirect: 'Direkte — klart link (f.eks. made in China eller hovedsæde der)',
    badgeUnknown: 'Ukendt — ikke nok klare oplysninger',
    twTitle: 'Taiwan',
    twBody:
      'Taiwan tæller her altid som sit eget land. Det tæller ikke i sig selv som “Kina-relateret”.',
    evidenceTitle:
      'Hvornår et produktionsland tæller som bekræftet',
    evidenceBody:
      'Et produktionsland vises kun som bekræftet (stregkodematch), hvis det kommer fra et foto af emballagens etiket, eller hvis en webside viser samme stregkode (JAN/EAN) ved siden af oprindelsesangivelsen. Et match kun på produktnavn er højst “sandsynligt” (navnematch), og en side med flere størrelser eller varianter forbliver ubekræftet. Hvis live websøgning ikke er tilgængelig, bygger resultatet kun på modelviden og siger det.',
    flowWeb:
      'Websøgning',
    flowWebDetail:
      'Søge websider efter produktnavn eller stregkode og tjekke oprindelsesangivelsen.',
    privacyTitle: 'Dine data',
    privacyBody:
      'Historikken bliver på denne enhed, og fotos gemmes ikke på serveren. Med live websøgning slået til sendes produktnavnet eller stregkoden til søgetjenester. AI kan tage fejl – dobbelttjek altid vigtige beslutninger.',
    tryBtn: 'Prøv et tjek',
  },
  tier: {
    none: 'Urelateret',
    indirect: 'Indirekte',
    direct: 'Direkte',
    unknown: 'Ukendt',
  },
} satisfies MessageTree;
