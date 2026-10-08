import type { MessageTree } from './en';

export const hu = {
  appName: 'OriginWise',
  tabs: {
    check: 'Ellenőrzés',
    history: 'Előzmények',
    about: 'Névjegy',
    settings: 'Beállítások',
    navMore: 'Menü',
  },
  common: {
    present: 'Igen',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'Nem',
    cancel: 'Mégse',
    confirm: 'Megerősítés',
    delete: 'Törlés',
    back: 'Vissza',
    loading: 'Betöltés…',
    optional: 'Opcionális',
  },
  install: {
    aria: 'OriginWise telepítése',
    title: 'OriginWise telepítése',
    body: 'Add hozzá a kezdőképernyőhöz a gyors, alkalmazásszerű ellenőrzéshez.',
    bodyIos: 'Add hozzá a Kezdőképernyőhöz a teljes képernyős használathoz.',
    iosStep1: 'Koppints',
    iosStep2: 'Megosztás, majd Hozzáadás a Kezdőképernyőhöz.',
    action: 'Telepítés',
    dismiss: 'Telepítési felhívás bezárása',
  },
  support: {
    buyMeAPint: 'Hívj meg egy korsóra',
    pintShort: 'Korsó',
    thanks: 'Ha az OriginWise segít, meghívhatsz egy korsóra:',
  },
  welcome: {
    title: 'Üdvözöl az OriginWise',
    body: 'Gyors ellenőrzés: ez a termék vagy márka Kínához kapcsolódik? Írj be egy nevet, vagy fotózd le a csomagolást. A mesterséges intelligencia tévedhet — nem jogi tanács.',
    accept: 'Értem — kezdjük az ellenőrzést',
  },
  check: {
    chinaLink: {
      title: 'Kapcsolat Kínával',
      chinaCompany: 'Kínai vállalat',
      chinaControlled: 'Kínai irányítás alatt',
      hq: 'Székhely',
      owner: 'Irányító tulajdonos',
      brandOrigin: 'Márka eredete',
      madeIn: 'Gyártási hely',
      parts: 'Alkatrészek',
      china: 'Kína',
      unconfirmed: 'Nincs megerősítve',
      partsChina: 'Egyes alkatrészek Kínában készültek',
    },
    matchBasis: {
      barcode: 'Vonalkód alapján egyeztetve',
      name: 'Terméknév alapján egyeztetve',
      label: 'A csomagolás felirata alapján',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Webes kutatás — lekérdezés elküldve ide: {name}',
    searchUsage: 'Webes keresés: {provider} · keresési kérések: {n}',
    knowledgeWebVia:
      'Tartalmaz egy élő webes kutatási kört ({provider}) plusz modellismeretet. Még mindig nem cégnyilvántartás vagy vámadatbázis — a címkék és hivatalos iratok eltérhetnek a weboldalaktól. Tájékoztató — nem jogi, kereskedelmi vagy szankciós tanács.',
    title: 'Gyors ellenőrzés',
    subtitle: 'Ez a tétel Kínához kapcsolódik? Írj be egy nevet, vagy fotózd le a csomagolást.',
    placeholder: 'pl. snackmárka, telefon, játék…',
    placeholderWithPhoto: 'Opcionális: mi ez a termék?',
    photo: 'Kamera',
    gallery: 'Galéria',
    removePhoto: 'Fotó eltávolítása',
    photoLabelHint: 'Elolvassuk a címkét, ha a szöveg tiszta',
    noteOptional: 'Opcionális megjegyzés',
    submit: 'Ellenőrzés most',
    submitting: 'Ellenőrzés…',
    needInput: 'Írj be egy terméknevet, vagy adj hozzá egy fotót.',
    howLink: 'Hogyan működik',
    newCheck: 'Új ellenőrzés',
    comingSoon:
      'Az ellenőrző API egy későbbi PR-ben jön. Az előzmények és a beállítások készen állnak.',
    photoTooLarge: 'A fotó tömörítés után is túl nagy.',
    photoInvalid: 'Ezt a képet nem sikerült beolvasni.',
    dropPhoto: 'Húzza ide a fotót',
    unnamedPhoto: '(fotó)',
    partsTitle: 'Alkatrészek, pótalkatrészek és hozzávalók',
    partsHint:
      'Ebből a termékből kiemelve — főbb alkatrészek, pótalkatrészek vagy hozzávalók, és Kínához kapcsolódónak tűnnek-e.',
    partKind: {
      part: 'Alkatrész',
      spare: 'Pótalkatrész',
      ingredient: 'Hozzávaló',
      component: 'Komponens',
    },
    progressHint: 'Származás és cég elemzése…',
    stepMonolith: 'Termék- és cégjelek gyűjtése',
    answeredBy: 'Fő válasz: {name}',
    agentsUsed: '{n} ügynök',
    agentsTitle: 'Használt MI-készlet',
    agentsSummary: '{total} hívás · {ok} ok · {fail} sikertelen',
    agentsHint:
      'Minden sor egy ingyenes szerveres MI-hívás. A hibák gyakran kvótát, modellhozzáférést vagy időtúllépést jelentenek; másokat vagy tartalékot próbálunk. Az élő web Gemini Search groundingot igényel (nem ugyanaz, mint a szöveges RPM).',
    agentOk: 'OK',
    agentFail: 'Sikertelen ({err})',
    agentSkipped: 'Kihagyva ({err})',
    agentFailUnknown: 'hiba',
    agentError: {
      upstream_quota: 'kvóta / sebességkorlát',
      upstream_credits: 'elfogyott az AI-keret',
      upstream_error: 'felső szintű hiba',
      upstream_unavailable: 'a szolgáltatás nem elérhető',
      empty_response: 'üres válasz',
      model_unavailable: 'a modell nem érhető el ezen az API-kulcson',
      search_grounding_unavailable:
        'A Google Search grounding nem érhető el ezen a kulcson (próbáld a Default készlet modelljeit / kapcsold be a számlázást; a Gemini 3 Search gyakran 0/0)',
      disabled: 'kikapcsolva',
      gemini_not_configured: 'A Gemini nincs beállítva',
      no_entity: 'nincs terméknév',
    },
    agent: {
      identify: 'Címke / név olvasása',
      product: 'Termék helye',
      company: 'Céges kapcsolatok',
      verify: 'Ellenőrzés',
      alternatives: 'Kisebb CN-kapcsolatú alternatívák',
      monolith: 'Teljes ellenőrzés (egy hívás)',
      dual_core: 'Termék + cég',
      dual_alts: 'Kisebb CN-kapcsolatú alternatívák',
      unknownProvider: 'Ismeretlen MI',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Miért ez a szint',
    reason: {
      made_in_cn: 'A terméket a szárazföldi Kínában gyártják.',
      made_in_cn_detail: 'A terméket itt gyártják: {place}.',
      origin_cn: 'A termék származása a szárazföldi Kínához kapcsolódik.',
      origin_cn_detail: 'A termék származása: {place}.',
      manufacturer_cn: 'A gyártó a szárazföldi Kínához kapcsolódik.',
      manufacturer_cn_detail: 'Gyártó helye/kapcsolata: {place}.',
      hq_cn: 'A cég székhelye a szárazföldi Kínában van.',
      hq_cn_detail: 'A cég székhelye: {place}.',
      parent_majority_cn:
        'Egy többségi/ellenőrző anyavállalat a szárazföldi Kínához kapcsolódik.',
      ownership_strong_cn:
        'Erős tulajdonosi vagy ellenőrzési kapcsolatokat jelentettek a szárazföldi Kínával.',
      ownership_weak_cn:
        'Gyengébb kapcsolatokat (pl. kisebbségi részesedés, ellátás vagy kiskereskedelem) jelentettek a szárazföldi Kínával.',
      component_cn:
        'Egyes alkatrészek vagy az összeszerelés a szárazföldi Kínához kapcsolódik, teljes „made in China” állítás nélkül.',
      explicit_non_cn_geo:
        'Egyértelmű helyjelek a szárazföldi Kínán kívülre mutatnak (ennek az eszköznek a hatókörében).',
      explicit_non_cn_geo_detail:
        'Egyértelmű helyjelek a szárazföldi Kínán kívül: {places}.',
      verify_conflict:
        'A termék- és cégjelek nem egyeztek teljesen (a keresztellenőrzés ütközéseket talált).',
      conflict_no_strong:
        'A jelek ütköztek, és nem volt erős szárazföldi Kína-kapcsolat — az eredmény bizonytalan maradt.',
      insufficient:
        'Nincs elég megbízható származási vagy tulajdonosi információ a Kínához kapcsolódó kötődések megítéléséhez.',
      ownership_not_assessed:
        'A cég tulajdonjogát ebben az ellenőrzésben nem értékelték teljeskörűen.',
      taiwan_as_country:
        'Tajvant külön országnak tekintjük, és ennél a pontszámnál nem számít „Kínához kapcsolódónak”.',
      taiwan_as_country_detail:
        'Tajvant külön országnak tekintjük (látható itt: {places}), és ennél a pontszámnál nem számít „Kínához kapcsolódónak”.',
    },
    caveats: 'Fenntartások',
    disclaimer:
      'Csak tájékoztató jellegű — modellismeret és opcionális élő webes kutatás, nem jogi vagy szankciós tanács. Az MI tévedhet.',
    knowledgeModel:
      'Csak általános modellismereten alapul (nincs élő webes keresés). A márka származása, az alkatrészüzemek és a végső összeszerelés/származási ország SKU-nként/piaconként eltérhet — részesítsd előnyben a csomagolási címkéket. Nem cégnyilvántartás vagy vámadatbázis. Tájékoztató — nem jogi, kereskedelmi vagy szankciós tanács.',
    knowledgeWeb:
      'Tartalmaz egy élő webes kutatási kört (Google Search Gemini groundinggal) plusz modellismeretet. Még mindig nem cégnyilvántartás vagy vámadatbázis — a címkék és hivatalos iratok eltérhetnek a weboldalaktól. Tájékoztató — nem jogi, kereskedelmi vagy szankciós tanács.',
    providerNotConfigured:
      'Az MI-ellenőrzés nincs beállítva. Adj hozzá egy kulcsot a .dev.vars fájlhoz, és futtasd: `npm run pages:dev` (lásd a README-t).',
    rateLimited:
      'Ingyenes szerverkorlát: 1 ellenőrzés 30 másodpercenként. Várj egy kicsit.',
    rateLimitedDay:
      'Ingyenes szerverkorlát: max. 10 ellenőrzés 6 óránként. Próbáld később.',
    rateLimitBadge: 'Ingyenes szerverkorlát',
    rateLimitFreeNote:
      'Ingyenes szerver · 1 ellenőrzés / 30 mp · max. 10 / 6 óra · egyszerre 1',
    rateLimitRpmTitle: 'Ingyenes szerver sebességkorlát (30 mp)',
    rateLimitedLongTitle: 'Ingyenes szerver 6 órás korlát',
    rateLimitInflightTitle: 'Már folyamatban van egy ellenőrzés',
    rateLimitShortDetail:
      'Ingyenes szerverkorlát: {n} ellenőrzés {w} mp-enként. Várj kb. {s} mp-et, majd próbáld újra.',
    rateLimitLongDetail:
      'Ingyenes szerverkorlát: {n} ellenőrzés {h} óránként. Próbáld újra kb. {m} perc múlva.',
    rateLimitMinuteDetail:
      'Ingyenes szerverkorlát: {n} ellenőrzés {w} mp-enként. Várj kb. {s} mp-et, majd próbáld újra.',
    rateLimitDayDetail:
      'Ingyenes szerverkorlát: {n} ellenőrzés {h} óránként. Próbáld később.',
    rateLimitInflightDetail:
      'Az ingyenes szerver egyszerre csak 1 ellenőrzést enged. Várj, amíg a jelenlegi befejeződik.',
    rateLimitAutoIn: 'Automatikusan {s} mp múlva…',
    rateLimitAutoHint:
      '{s} mp múlva automatikusan elküldi, amikor az ingyenes szerverablak kinyílik.',
    rateLimitAutoStop: 'Állj',
    rateLimitAutoCancelled:
      'Az automatikus küldés megszakítva. Akkor próbálhatod újra, amikor készen állsz.',
    forbiddenOrigin: 'A kérés erről az originről nem engedélyezett.',
    badRequest: 'Érvénytelen kérés.',
    parseError: 'A választ nem sikerült értelmezni. Próbáld újra.',
    upstreamError: 'A válaszszolgáltatás sikertelen. Próbáld később.',
    upstreamQuota: 'A válaszszolgáltatás foglalt. Próbáld később.',
    upstreamUnavailable: 'A válaszszolgáltatás átmenetileg nem elérhető.',
    emptyResponse: 'Nem érkezett válasz. Próbáld újra.',
    serverError: 'Valami hiba történt. Próbáld újra.',
    forceRefresh: 'Újraellenőrzés (gyorsítótár kihagyása)',
    forceRefreshHint:
      'Ez a válasz gyorsítótárazott volt. Az újraellenőrzés friss MI-futást indít (továbbra is beleszámít az ingyenes szerverkorlátokba).',
    cached: 'gyorsítótár',
    degraded: 'részeredmény',
    relationLabel: 'Kína-kapcsolat',
    confidence: '{n}% magabiztosság',
    productFacts: 'Termék',
    companyFacts: 'Cég',
    brand: 'Márka',
    madeIn: 'Gyártás helye (ez az egység / végső származási ország)',
    madeInUnconfirmed: 'Végső származási ország nem megerősített — lásd alkatrészek / globális vonal',
    originLayersTitle: 'Származási rétegek',
    originLayersIntro:
      'Külön márka/üzemeltetés, tulajdon, végső COO és alkatrészek — a tulajdon nem made-in.',
    layerBrandOps: 'Márka / üzemeltetés',
    layerOwnership: 'Tulajdon / anyavállalatok',
    layerOwnershipHint: 'Nem végső COO / made-in',
    layerOwnershipEmpty: 'Nincs tulajdon/anyavállalat jel ebben az eredményben',
    layerFinalCoo: 'Végső COO',
    layerParts: 'Alkatrészjelöltek',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'Elfogyott a napi AI-keresési keret — pontosabb információ most nem érhető el. Próbálja újra a napi visszaállítás után.',
    aiCreditsUsedUp:
      'Az AI-szolgáltatás kerete átmenetileg elfogyott — pontosabb információ most nem érhető el. Próbálja újra később.',
    srv: {
      partOmittedNoEvidence:
        'Alkatrész országa kihagyva: nincs bizonyíték keresésből/címkéről (a márka székhelye nem az alkatrész eredete).',
      partOmittedUnconfirmed:
        'Alkatrész országa kihagyva: ehhez az alkatrészhez a keresés/címke nem erősítette meg.',
      madeInOmittedBrand:
        'Gyártási ország kihagyva: csak a márka/tervezés országával egyezett, gyári vagy származási bizonyíték nélkül.',
      madeInOmittedOwnership:
        'Gyártási ország kihagyva: Kína csak tulajdonosi/anyavállalati adatokból származik, nem a termékről, címkéről vagy kereskedőtől.',
      cooUnconfirmedSeeParts:
        'A végső származási ország nincs megerősítve – a jelölteket lásd az alkatrészek/globális gyártás sorban vagy az alkatrészeknél (a gyártás nincs megerősítve).',
      cooUnconfirmedNoLabel:
        'A végső származási ország nincs megerősítve – a terméken/címkén nincs származási ország; nem találunk ki egyet.',
      cooUnconfirmedNoBarcode:
        'A végső származási ország nincs megerősítve – egy weboldal sem mutatta a vonalkódot/JAN-t gyártási országgal együtt; a terméknév szerinti egyezések csak valószínű jelöltek.',
      cooUnconfirmedCandidates:
        'A végső származási ország nincs megerősítve – az alábbi jelöltek keresési jelek, nem nyomtatott „Made in” felirat.',
      distributorOmitted:
        'Helyi forgalmazó / piaci képviselő kihagyva az anyavállalatok közül (nem jogi tulajdonos).',
      chinaLinkUnclear:
        'A kínai kapcsolat nem egyértelmű – ne tekintse megerősítetten Kína-mentesnek.',
      verifyConflict:
        'Az ellenőrzés ellentmondó jeleket talált',
      companyNotAssessed:
        'A cég-/tulajdonosi adatokat nem értékeltük',
      taiwanSeparate:
        'A kapcsolati szinteknél Tajvan külön országnak számít',
      webUnavailableLabel:
        'Élő webes keresés nem érhető el – az alkatrészek országai a csomagolás címkéjének fotójáról származnak, nem keresésből.',
      altsAim:
        'Az alternatív márkák/termékek kisebb kínai érintettségre törekszenek (nem csak hasonlóságra). A szintek becslések; a székhely önmagában nem bizonyít Kínán kívüli gyártást.',
      altsNone:
        'Nem találtunk elég biztos, kisebb kínai érintettségű alternatívát.',
      sumCooUnconfirmed:
        'A végső származási ország nincs megerősítve',
      tierUnknown:
        'Kevés a bizonyíték a kínai kapcsolatok értékeléséhez.',
      tierNone:
        'A rendelkezésre álló jelekben nincs kínai kapcsolat.',
      tierDirect:
        'Közvetlen kínai kapcsolatra utaló jeleket találtunk.',
      tierIndirect:
        'Közvetett kínai kapcsolatra utaló jeleket találtunk.',
      cooConflictChina:
        'A végső származási ország nincs megerősítve – a(z) {source} jel ({label}) ellentmond a „Made in China” adatnak; a tulajdonos/anyavállalat önmagában nem határozza meg a gyártási országot.',
      cooConflictMadeIn:
        'A végső származási ország nincs megerősítve – a(z) {source} jel ({label}) ellentmond a(z) {madeIn} gyártásnak; csak jelöltként marad.',
      candidate:
        '{label} ({rating}, {pct}%, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Az élő keresési modellek nem voltak elérhetők ezzel az API-kulccsal – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_search_grounding_unavailable:
        'Az élő Google-keresés nem volt elérhető ezzel az API-kulccsal – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_upstream_credits:
        'Elfogyott az MI-szolgáltatás kreditje (az előre fizetett egyenleg üres) – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_upstream_quota:
        'Elfogyott a napi ingyenes Google-keresési keret – próbálja újra a napi visszaállítás után – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_upstream_unavailable:
        'Az élő webes keresés időtúllépés miatt leállt, vagy a szolgáltatás túlterhelt volt – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_empty_response:
        'Az élő webes keresés üres választ adott – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_disabled:
        'Az élő webes keresés ki volt kapcsolva ennél az ellenőrzésnél – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_gemini_not_configured:
        'A Gemini nincs beállítva élő webes kereséshez – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_no_entity:
        'Nincs terméknév az élő webes kereséshez – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      webFail_default:
        'Ennél az ellenőrzésnél nem volt élő webes keresés – a gyártási és alkatrész-országok óvatosabbak (csak a modell tudása).',
      sum: {
        madeIn: 'Gyártva: {value}',
        candidates: 'Jelöltek: {value}',
        brandOrigin: 'Márka eredete: {value}',
        components: 'Alkatrészek/globális gyártás: {value}',
        parts: 'Alkatrészek: {value}',
        hq: 'Székhely: {value}',
        company: 'Cég: {value}',
      },
      signal: {
        ocr: 'címke',
        retailer: 'kereskedő',
        manufacturer: 'gyártó',
        ownership: 'tulajdonos',
        unknown: 'ismeretlen',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Kép mentése',
    sectionShareShare: 'Megosztás',
    sectionShareSaved: 'Mentve',
    sectionShareFailed: 'A kép mentése nem sikerült',
    sectionShareHint: 'Vidd a kurzort egy rétegre a mentéshez vagy megosztáshoz',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'weboldal (névegyezés)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'tulajdon / anya',
    },
    origin: 'Származás',
    brandOrigin: 'Márka származása',
    componentsOrigin: 'Alkatrészek / globális vonal',
    productNotes: 'Származási megjegyzések',
    manufacturer: 'Gyártó',
    company: 'Cég',
    hq: 'Székhely',
    parents: 'Anyavállalatok',
    graphTitle: 'Kapcsolatgráf',
    graphHint:
      'A nyilak mutatják, hogyan kapcsolódik a termék, a cég, az anyavállalatok és a helyek. Bontsd ki vagy nagyíts, ha a címkék szűkek.',
    graphControls: 'Gráfnézet',
    graphZoomIn: 'Nagyítás',
    graphZoomOut: 'Kicsinyítés',
    graphExpand: 'Kibontás',
    graphCollapse: 'Összecsukás',
    graphRelations: 'Kapcsolatok',
    graphNoEdges: 'Ehhez az eredményhez nem következtettünk kapcsolatélekre.',
    graphLink: 'kapcsolódó',
    graphChinaLinked: 'Kínához kötött',
    graphLegendCn: 'Kínához kötött csúcs/él',
    graphLegendOther: 'Egyéb',
    graphEdge: {
      brand: 'márka',
      brand_company: 'márka',
      'brand/company': 'márka',
      made_in: 'gyártva',
      hq: 'székhely',
      parent: 'anyavállalat',
      majority: 'többségi tulajdonos',
      wholly: 'teljes tulajdon',
      minority: 'kisebbségi részesedés',
      ownership: 'tulajdon',
      affiliation: 'márka',
      manufacturing: 'gyártva',
      part: 'alkatrész',
      spare: 'pótalkatrész',
      ingredient: 'hozzávaló',
      component: 'komponens',
    },
    regionsTitle: 'Régiók',
    altBrands: 'Kisebb kínai érintettségű márkák (becsült)',
    altProducts: 'Kisebb kínai érintettségű termékek (becsült)',
    altDisclaimer:
      'Csak olyan helyettesítők, amelyekről úgy becsüljük, hogy nem közvetlenül Kínához kötöttek (nincs „made in China” kitöltés). Egy USA-/EU-székhely önmagában nem bizonyít Kínán kívüli gyártást. A tisztázatlan gyártási hely Ismeretlen, nem Független.',
    estimated: 'becs.',
    twNote:
      'Tajvant külön országnak tekintjük, és a szinteknél soha nem Kínához kapcsolódóként.',
    region: {
      CN: 'Szárazföldi Kína',
      HK: 'Hongkong',
      TW: 'Tajvan',
      MO: 'Makaó',
      OTHER: 'Egyéb',
      UNKNOWN: 'Ismeretlen',
    },
    steps: {
      start: 'Indítás',
      cache: 'Gyorsítótár',
      identify: 'Címke olvasása',
      web: 'Webes kutatás',
      monolith: 'Teljes elemzés',
      dual_core: 'Termék és cég',
      product: 'Termék származása',
      company: 'Céges kapcsolatok',
      verify: 'Keresztellenőrzés',
      alternatives: 'Kisebb CN-kapcsolatú alternatívák',
      synthesize: 'Pontozás',
    },
  },
  history: {
    title: 'Előzmények',
    subtitle: 'Korábbi ellenőrzések ezen az eszközön',
    empty: 'Még nincsenek korábbi ellenőrzések.',
    withPhoto: 'Fotó',
    open: 'Megnyitás',
    remove: 'Eltávolítás',
  },
  settings: {
    title: 'Beállítások',
    subtitle: 'Beállítások és adatok ezen az eszközön',
    panelDisplay: 'Nyelv és téma',
    panelCheck: 'Mit ellenőrizzünk',
    panelData: 'Adatok törlése',
    language: 'Nyelv',
    theme: 'Téma',
    themeSystem: 'Rendszer',
    themeLight: 'Világos',
    themeDark: 'Sötét',
    geoScope: 'Kína hatóköre a szintekhez',
    geoScopeHint:
      'Tajvant mindig külön országnak tekintjük, és soha nem vezérli a Kína-kapcsolati szinteket. Csak a KNK a szárazföldi Kínát használja. A Greater China opcionálisan tartalmazhatja Hongkongot és Makaót (Tajvant nem).',
    geoScopePrc: 'Csak KNK / szárazföld (alapértelmezett)',
    geoScopeGreater: 'CN + Hongkong + Makaó (Tajvan nélkül)',
    dimensions: 'Mit ellenőrizzünk',
    dimensionsHint:
      'A kisebb kínai érintettségű alternatívák alapból ki vannak kapcsolva. Kapcsold be a márka- vagy termékalternatívákat, ha kisebb Kína-kapcsolatú helyettesítőket szeretnél (plusz egy MI-hívás).',
    dimOrigin: 'Származási hely',
    dimManufacturer: 'Gyártó származása',
    dimCompany: 'Céges kapcsolatok',
    dimAltBrands: 'Kisebb kínai érintettségű márkaalternatívák',
    dimAltProducts: 'Kisebb kínai érintettségű termékalternatívák',
    howItWorks: 'Hogyan működik',
    about: 'Az OriginWise-ról',
    version: 'Verzió {v}',
    cleanData: 'Helyi adatok törlése',
    cleanDataHint:
      'Az adatok csak ebben a böngészőben maradnak. Válaszd ki, mit távolítsunk el. Ez nem vonható vissza.',
    dataSummary: 'Ezen az eszközön',
    dataNone: 'Nincs tárolt OriginWise-adat.',
    dataHistory: 'Korábbi ellenőrzések: {n}',
    dataSettings: 'Egyéni beállítások',
    dataDisclaimer: 'Figyelmeztetés elfogadva',
    cleanAll: 'Minden',
    cleanHistory: 'Csak korábbi ellenőrzések',
    cleanSettings: 'Csak beállítások',
    cleanConfirm: 'Töröljük a kijelölt adatokat?',
    cleanConfirmBtn: 'Törlés most',
    cleanDoneAll: 'Minden helyi OriginWise-adat törölve.',
    cleanDoneHistory: 'Korábbi ellenőrzések törölve.',
    cleanDoneSettings: 'A beállítások visszaálltak az alapértékekre.',
  },
  about: {
    title: 'Névjegy',
    tagline: 'Egyszerű, Kínához kapcsolódó termékellenőrzés',
    intro:
      'Az OriginWise segít gyorsan látni, hogy egy termék vagy márka Kínához kapcsolódónak tűnik-e — származási hely, gyártó és céges kapcsolatok —, opcionális kisebb érintettségű alternatívákkal. Az ellenőrzések ezen az eszközön maradnak.',
    body: 'Az OriginWise egyszerű eszköz a mindennapi termékek és márkák gyors Kína-ellenőrzéséhez. Az MI hiányos vagy hibás lehet.',
    privacy: 'Nincs fiók. Az előzmények ezen a telefonon/böngészőben maradnak.',
    license: 'MIT licenc',
    licenseShort: 'MIT',
    openSourceTitle: 'Nyílt forráskód · MIT',
    openSourceBody:
      'Ez a projekt szabad szoftver az MIT licenc alatt. Használhatod, másolhatod, módosíthatod, összevonhatod, közzéteheted, terjesztheted és allicencelheted — saját telepítéshez, saját API-kulcsokkal is.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      '„Ahogy van” alapon, garancia nélkül. A teljes licencszöveg a GitHubon.',
    linkSource: 'Forráskód',
    linkLicense: 'MIT licenc',
    linkIssues: 'Hibajegyek és visszajelzés',
    linkReleases: 'Kiadások',
    linkSecurity: 'Biztonsági irányelv',
    privacyTitle: 'Az adatvédelmed',
    privacyLead:
      'Egyszerűen tartjuk: nincs fiók, és az ellenőrzési előzmények a telefonodon vagy a számítógépeden maradnak.',
    privacyBullet1:
      'A korábbi ellenőrzések, beállítások és preferenciák csak ebben a böngészőben, az eszközödön tárolódnak.',
    privacyBullet2: 'Nincs bejelentkezés, és nincs felhőmásolat az ellenőrzési naplódról.',
    privacyBullet3:
      'Bármikor mindent törölhetsz a Beállítások Helyi adatok törlése pontjával.',
    privacyBullet4:
      'Ellenőrzéskor a név vagy fotó csak arra a válaszra megy el. A csomagolásokat nem őrizzük termékkatalógusként.',
    privacyBullet5:
      'A fotók az eszközödön tömörülnek feltöltés előtt, és nem tárolódnak szerverrekordként.',
    privacyBullet6:
      'Élő webes kutatás esetén a termék neve (és a címke szövege) egyszer egy keresőszolgáltatáshoz is eljut: először a Google Search a Geminin keresztül, és csak ha ez nem sikerül, a Brave Search vagy a Firecrawl. A folyamat lépései és az eredmény a ténylegesen használt szolgáltatást mutatják. A kereséseket nem naplózzuk.',
    privacyPolicyLink: 'Adatvédelmi irányelv',
    termsLink: 'Felhasználási feltételek',
    designTitle: 'Hogyan működik',
    designLead:
      'Gyors, többügynökös MI-ellenőrzés, majd egy rögzített pontozótábla — nem jogi adatbázis.',
    designLocalTitle: 'Mi marad az eszközödön',
    designLocalBody:
      'Az alkalmazás betöltése után az előzmények, a nyelv, a téma és az ellenőrzési beállítások csak ebben a böngészőben mentődnek. Töröld a webhelyadatokat, vagy használd a Helyi adatok törlése funkciót.',
    designWhyTitle: 'Miért így építettük',
    designWhy1: 'Gyors mobil ellenőrzések fiók létrehozása nélkül.',
    designWhy2: 'Az előzmények nálad maradnak — bármikor törölheted.',
    designWhy3:
      'Az MI tévedhet; fenntartásokat mutatunk, és Tajvant a szinteknél külön országnak kezeljük.',
    disclaimerTitle: 'Figyelem',
    disclaimerBody:
      'Az OriginWise csak tájékoztató — nem jogi, vám- vagy szankciós tanács. Az MI és a szintek címkéi hiányosak vagy hibásak lehetnek. A kritikus döntéseket mindig magad ellenőrizd.',
    createdBy: 'Karbantartó',
    contributionsWelcome: 'A hibajegyek és pull requestek szívesen látottak a GitHubon.',
  },
  how: {
    title: 'Hogyan működik',
    subtitle: 'Gyors, Kínához kapcsolódó ellenőrzés — tartsuk egyszerűen',
    aimTitle: 'Mire való ez az alkalmazás',
    aimBody:
      'Segít gyorsan látni, hogy egy termék vagy márka Kínához kapcsolódónak tűnik-e — ott gyártják, céges kapcsolatok stb. Nem mély kutatóeszköz, nem jogi ellenőrzés.',
    stepsTitle: 'Egyszerűen',
    step1Title: 'Valamit küldesz',
    step1Body: 'Egy terméknevet, márkát vagy a csomagolás fotóját.',
    step2Title: 'MI-vel nézzük meg',
    step2Body:
      'Kis ellenőrzések futnak: termékhely és cég (együtt), majd egy gyors keresztellenőrzés. Opcionális: kisebb kínai érintettségű márka-/termékalternatívák, ha bekapcsolod őket.',
    step3Title: 'Egyszerű eredményt kapsz',
    step3Body:
      'Színes jelvény: Független, Közvetett, Közvetlen vagy Ismeretlen — plusz egy rövid miért.',
    graphTitle: 'Teljes folyamat',
    graphHint: 'A beviteltől a színes jelvényig.',
    flowYou: 'Te (név / fotó)',
    flowAi: 'MI-ellenőrzések',
    flowProduct: 'Termék helye',
    flowCompany: 'Cég',
    flowVerify: 'Ellenőrzés',
    flowScore: 'Egyszerű pontszám',
    flowResult: 'Színes eredmény',
    flowAiDetail:
      'Először termékhely + cég, majd egy gyors keresztellenőrzés.',
    flowScoreDetail: 'A válaszokat egy egyszerű pontszámba vonjuk össze.',
    badgeTitle: 'Mit jelentenek a színek',
    badgeNone: 'Független — nem találtunk egyértelmű Kína-kapcsolatot',
    badgeIndirect: 'Közvetett — gyengébb vagy részleges kapcsolat',
    badgeDirect: 'Közvetlen — egyértelmű kapcsolat (pl. made in China vagy ottani székhely)',
    badgeUnknown: 'Ismeretlen — nincs elég egyértelmű információ',
    twTitle: 'Tajvan',
    twBody:
      'Tajvan itt mindig saját országnak számít. Önmagában nem számít „Kínához kapcsolódónak”.',
    evidenceTitle:
      'Mikor számít megerősítettnek a gyártási ország',
    evidenceBody:
      'A gyártási ország csak akkor jelenik meg megerősítettként (vonalkód-egyezés), ha a csomagolás címkéjéről készült fotóból származik, vagy ha egy weboldal ugyanazt a vonalkódot (JAN/EAN) mutatja a származási adat mellett. A csak terméknév szerinti egyezés legfeljebb „valószínű” (névegyezés), a több méretet vagy változatot felsoroló oldal pedig megerősítetlen marad. Ha az élő webes keresés nem érhető el, az eredmény csak a modell tudására épül, és ezt jelzi.',
    flowWeb:
      'Webes keresés',
    flowWebDetail:
      'Weboldalak keresése terméknév vagy vonalkód alapján, és a származási adat ellenőrzése.',
    privacyTitle: 'Az adataid',
    privacyBody:
      'Az előzmények ezen az eszközön maradnak, a fotókat nem tároljuk a szerveren. Ha az élő webes keresés be van kapcsolva, a termék neve vagy vonalkódja keresőszolgáltatásokhoz kerül. Az MI tévedhet – a fontos döntéseket mindig ellenőrizd.',
    tryBtn: 'Próbálj egy ellenőrzést',
  },
  tier: {
    none: 'Független',
    indirect: 'Közvetett',
    direct: 'Közvetlen',
    unknown: 'Ismeretlen',
  },
} satisfies MessageTree;
