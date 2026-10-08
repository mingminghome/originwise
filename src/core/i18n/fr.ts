import type { MessageTree } from './en';

export const fr = {
  appName: 'OriginWise',
  tabs: {
    check: 'Vérifier',
    history: 'Historique',
    about: 'À propos',
    settings: 'Réglages',
    navMore: 'Menu',
  },
  common: {
    present: 'Oui',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ' : ',
    missing: 'Non',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    back: 'Retour',
    loading: 'Chargement…',
    optional: 'Facultatif',
  },
  install: {
    aria: 'Installer OriginWise',
    title: 'Installer OriginWise',
    body: 'Ajoutez à l’écran d’accueil pour un contrôle rapide façon application.',
    bodyIos: 'Ajoutez à l’écran d’accueil pour une utilisation plein écran.',
    iosStep1: 'Touchez',
    iosStep2: 'Partager, puis Ajouter à l’écran d’accueil.',
    action: 'Installer',
    dismiss: 'Fermer l’invite d’installation',
  },
  support: {
    buyMeAPint: 'Offrez-moi une pinte',
    pintShort: 'Pinte',
    thanks: 'Si OriginWise vous aide, vous pouvez m’offrir une pinte :',
  },
  welcome: {
    title: 'Bienvenue sur OriginWise',
    body: 'Contrôle rapide : ce produit ou cette marque est-il lié à la Chine ? Saisissez un nom ou photographiez l’emballage. L’IA peut se tromper — ce n’est pas un conseil juridique.',
    accept: 'Compris — commencer',
  },
  check: {
    identifiedAs: 'Identifié comme : {name}',
    chinaLink: {
      title: 'Lien avec la Chine',
      chinaCompany: 'Entreprise chinoise',
      chinaControlled: 'Sous contrôle chinois',
      hq: 'Siège',
      owner: 'Propriétaire de contrôle',
      brandOrigin: 'Origine de la marque',
      madeIn: 'Fabriqué en',
      parts: 'Pièces',
      china: 'Chine',
      unconfirmed: 'Non confirmé',
      partsChina: 'Certaines pièces fabriquées en Chine',
      hqParentNote: 'Le siège en Chine indiqué est celui de la société mère',
      madeInBelow: 'Le lieu de fabrication est établi uniquement dans la carte « Fabriqué en » (code-barres ou étiquette).',
      madeInChina: 'Fabriqué en Chine',
      footnote: 'Cette carte indique seulement où l’entreprise est établie, qui la détient et où le produit est fabriqué. Ce n’est pas un jugement sur la qualité ou la sécurité du produit, ni sur l’entreprise.',
      controlling: 'Contrôle',
      reasonParent: 'La société mère qui contrôle l’entreprise est en Chine continentale.',
      reasonBrandOrigin: 'Origine de la marque : {place}.',
      madeInLineBarcode: 'Fabriqué en : {place} (correspondance du code-barres, voir la carte « Fabriqué en » ci-dessous)',
      madeInLineLabel: 'Fabriqué en : {place} (étiquette de l’emballage, voir la carte « Fabriqué en » ci-dessous)',
      madeInLineModel: 'Fabriqué en : {place} (correspondance du modèle exact, voir la carte « Fabriqué en » ci-dessous)',
    },
    rc: {
      modelRef: 'Indication du modèle (non confirmée)',
      modelRefHelp: 'Non confirmé par une page web ni par l’étiquette de l’emballage ; ce n’est qu’une supposition du modèle. Fiez-vous à l’étiquette de l’emballage.',
      moreInfo: 'En savoir plus',
      candidatesTitle: 'Lieux de fabrication candidats (non confirmés)',
      noCandidates: 'Aucun candidat fiable trouvé.',
      sourceCount: 'Sources : {n}',
      sourceFirst: 'Source 1 : {label}',
      sourceNth: 'Source {n} : {label}',
      sourceAiAnswer: 'Réponse de l’IA',
      oneExactModelPage: '1 page au modèle exact',
      citedUnverified: 'Cité par l’IA, non vérifié',
      excludedOtherModel: 'Autre modèle ({model}), non compté',
      reason: {
        aiOnly: 'Réponse de l’IA seule, aucune page web ne l’appuie',
        pagesDisagree: 'Les pages web se contredisent',
        aiCitedUnverified: 'Lien cité par l’IA non vérifiable',
        onePageOnly: 'Une seule page web le mentionne',
      },
      sourceCountry: 'fabriqué en {country}',
      labelSource: 'Source : photo de l’étiquette',
      parent: 'Société mère',
      tagConfirmed: 'Confirmé',
      tagLikely: 'Probable',
      tagMentioned: 'Mentionné',
      tagUnconfirmed: 'Non confirmé',
      foldSources: 'Toutes les sources',
      foldAlts: 'Marques alternatives',
      foldAi: 'Détails IA / recherche',
      expand: 'Afficher',
      collapse: 'Masquer',
    },
    matchBasis: {
      barcode: 'Correspondance par code-barres',
      name: 'Correspondance par nom du produit',
      label: 'D’après l’étiquette de l’emballage',
      model: 'Correspondance du modèle exact',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Recherche web — requête envoyée à {name}',
    searchUsage: 'Recherche web : {provider} · requêtes de recherche : {n}',
    knowledgeWebVia:
      'Inclut une recherche web en direct ({provider}) plus les connaissances du modèle. Ce n’est toujours pas un registre d’entreprises ni une base douanière — les étiquettes et documents officiels peuvent diverger des pages web. Informatif — pas un conseil juridique, commercial ou sur les sanctions.',
    title: 'Contrôle rapide',
    subtitle: 'Cet article est-il lié à la Chine ? Saisissez un nom ou photographiez l’emballage.',
    placeholder: 'ex. marque de snacks, téléphone, jouet…',
    placeholderWithPhoto: 'Facultatif : de quel produit s’agit-il ?',
    photo: 'Appareil photo',
    gallery: 'Galerie',
    removePhoto: 'Retirer la photo',
    photoLabelHint: 'Nous lisons l’étiquette si le texte est lisible',
    noteOptional: 'Note facultative',
    submit: 'Vérifier maintenant',
    submitting: 'Vérification…',
    needInput: 'Saisissez un nom de produit ou ajoutez une photo.',
    howLink: 'Comment ça marche',
    newCheck: 'Nouveau contrôle',
    comingSoon:
      'L’API de contrôle arrive dans une PR ultérieure. Historique et réglages sont prêts.',
    photoTooLarge: 'La photo reste trop volumineuse après compression.',
    photoInvalid: 'Impossible de lire cette image.',
    dropPhoto: 'Déposez la photo ici',
    unnamedPhoto: '(photo)',
    partsTitle: 'Pièces, rechanges et ingrédients',
    partsHint:
      'Isolé depuis ce produit — composants, pièces de rechange ou ingrédients majeurs et s’ils semblent liés à la Chine.',
    partKind: {
      part: 'Pièce',
      spare: 'Rechange',
      ingredient: 'Ingrédient',
      component: 'Composant',
    },
    progressHint: 'Analyse de l’origine et de l’entreprise…',
    stepMonolith: 'Collecte des signaux produit et entreprise',
    answeredBy: 'Réponse principale via {name}',
    agentsUsed: '{n} agents',
    agentsTitle: 'Pool d’IA utilisé',
    agentsSummary: '{total} appels · {ok} ok · {fail} échoués',
    /** Strength of a company–country relation (所有權 rows). */
    relStrength: {
      strong: 'lien fort',
      moderate: 'lien modéré',
      weak: 'lien faible',
    },
    agentsHint:
      'Chaque ligne est un appel IA du serveur gratuit. Les échecs viennent souvent du quota, de l’accès au modèle ou d’un délai ; nous essayons d’autres modèles ou un repli. Le web en direct nécessite le grounding Gemini Search (différent du RPM texte).',
    agentsHintVia:
      'Chaque ligne est un appel IA du serveur gratuit. Les échecs viennent souvent du quota, de l’accès au modèle ou d’un délai ; nous essayons d’autres modèles ou un repli. La recherche web en direct a utilisé {provider}.',
    agentOk: 'OK',
    agentFail: 'Échec ({err})',
    agentSkipped: 'Ignoré ({err})',
    agentFailUnknown: 'erreur',
    agentError: {
      upstream_quota: 'quota / limite de débit',
      upstream_credits: 'crédit IA épuisé',
      upstream_error: 'erreur amont',
      upstream_unavailable: 'service indisponible',
      empty_response: 'réponse vide',
      model_unavailable: 'modèle indisponible sur cette clé API',
      search_grounding_unavailable:
        'Le grounding Google Search n’est pas disponible sur cette clé (essayer les modèles du pool par défaut / activer la facturation ; Gemini 3 Search est souvent 0/0)',
      disabled: 'désactivé',
      gemini_not_configured: 'Gemini non configuré',
      no_entity: 'pas de nom de produit',
    },
    agent: {
      identify: 'Lire l’étiquette / le nom',
      product: 'Lieu du produit',
      company: 'Liens d’entreprise',
      verify: 'Double vérification',
      alternatives: 'Alternatives à moindre lien CN',
      monolith: 'Contrôle complet (un appel)',
      dual_core: 'Produit + entreprise',
      dual_alts: 'Alternatives à moindre lien CN',
      web: 'Recherche web',
      unknownProvider: 'IA inconnue',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Pourquoi ce niveau',
    reason: {
      made_in_cn: 'Le produit est fabriqué en Chine continentale.',
      made_in_cn_detail: 'Le produit est fabriqué à {place}.',
      origin_cn: 'L’origine du produit est liée à la Chine continentale.',
      origin_cn_detail: 'L’origine du produit est indiquée comme {place}.',
      manufacturer_cn: 'Le fabricant est lié à la Chine continentale.',
      manufacturer_cn_detail: 'Lieu/lien du fabricant : {place}.',
      hq_cn: 'Le siège de l’entreprise est en Chine continentale.',
      hq_cn_detail: 'Le siège de l’entreprise est à {place}.',
      parent_majority_cn:
        'Une société mère majoritaire/contrôlante est liée à la Chine continentale.',
      ownership_strong_cn:
        'Des liens forts de propriété ou de contrôle avec la Chine continentale ont été signalés.',
      ownership_weak_cn:
        'Des liens plus faibles (ex. participation minoritaire, approvisionnement ou vente) avec la Chine continentale ont été signalés.',
      component_cn:
        'Certains composants ou l’assemblage sont liés à la Chine continentale, sans mention complète « fabriqué en Chine ».',
      explicit_non_cn_geo:
        'Des indications de lieu claires pointent hors de la Chine continentale (selon le périmètre de cet outil).',
      explicit_non_cn_geo_detail:
        'Indications de lieu claires hors de la Chine continentale : {places}.',
      verify_conflict:
        'Les signaux produit et entreprise ne concordaient pas entièrement (la contre-vérification a trouvé des conflits).',
      conflict_no_strong:
        'Les signaux se contredisaient et il n’y avait pas de lien fort avec la Chine continentale — résultat laissé incertain.',
      insufficient:
        'Pas assez d’informations fiables sur l’origine ou la propriété pour juger des liens avec la Chine.',
      ownership_not_assessed:
        'La propriété de l’entreprise n’a pas été pleinement évaluée pour ce contrôle.',
      taiwan_as_country:
        'Taïwan est traité comme un pays distinct et ne compte pas comme « lié à la Chine » pour ce score.',
      taiwan_as_country_detail:
        'Taïwan est traité comme un pays distinct (vu dans : {places}) et ne compte pas comme « lié à la Chine » pour ce score.',
    },
    caveats: 'Précautions',
    disclaimer:
      'À titre informatif uniquement — connaissances du modèle et recherche web facultative, pas un conseil juridique ou sur les sanctions. L’IA peut se tromper.',
    knowledgeModel:
      'Basé uniquement sur les connaissances générales du modèle (pas de recherche web en direct). L’origine de la marque, les usines de composants et l’assemblage final/pays d’origine peuvent varier selon le SKU/marché — privilégiez les étiquettes. Ce n’est pas un registre d’entreprises ni une base douanière. Informatif — pas un conseil juridique, commercial ou sur les sanctions.',
    knowledgeWeb:
      'Inclut une recherche web en direct (Google Search via le grounding Gemini) plus les connaissances du modèle. Ce n’est toujours pas un registre d’entreprises ni une base douanière — les étiquettes et documents officiels peuvent diverger des pages web. Informatif — pas un conseil juridique, commercial ou sur les sanctions.',
    providerNotConfigured:
      'Le contrôle IA n’est pas configuré. Ajoutez une clé dans .dev.vars et lancez `npm run pages:dev` (voir le README).',
    rateLimited:
      'Limite du serveur gratuit : 1 contrôle toutes les 30 secondes. Veuillez patienter.',
    rateLimitedDay:
      'Limite du serveur gratuit : max. 10 contrôles par 6 heures. Réessayez plus tard.',
    rateLimitBadge: 'Limite du serveur gratuit',
    rateLimitFreeNote:
      'Serveur gratuit · 1 contrôle / 30 s · max. 10 / 6 heures · 1 à la fois',
    rateLimitRpmTitle: 'Limite de débit du serveur gratuit (30 s)',
    rateLimitedLongTitle: 'Limite 6 heures du serveur gratuit',
    rateLimitInflightTitle: 'Un contrôle est déjà en cours',
    rateLimitShortDetail:
      'Limite du serveur gratuit : {n} contrôle(s) toutes les {w} s. Attendez environ {s} s, puis réessayez.',
    rateLimitLongDetail:
      'Limite du serveur gratuit : {n} contrôles par {h} heures. Réessayez dans environ {m} minutes.',
    rateLimitMinuteDetail:
      'Limite du serveur gratuit : {n} contrôle(s) toutes les {w} s. Attendez environ {s} s, puis réessayez.',
    rateLimitDayDetail:
      'Limite du serveur gratuit : {n} contrôles par {h} heures. Réessayez plus tard.',
    rateLimitInflightDetail:
      'Le serveur gratuit n’autorise qu’un contrôle à la fois. Attendez la fin du contrôle en cours.',
    rateLimitAutoIn: 'Auto dans {s} s…',
    rateLimitAutoHint:
      'Envoi automatique dans {s} s lorsque la fenêtre du serveur gratuit s’ouvre.',
    rateLimitAutoStop: 'Arrêter',
    rateLimitAutoCancelled:
      'Envoi automatique annulé. Vous pourrez réessayer quand vous serez prêt.',
    forbiddenOrigin: 'Requête non autorisée depuis cette origine.',
    badRequest: 'Requête invalide.',
    parseError: 'Impossible de comprendre la réponse. Veuillez réessayer.',
    upstreamError: 'Le service de réponse a échoué. Réessayez plus tard.',
    upstreamQuota: 'Le service de réponse est occupé. Réessayez plus tard.',
    upstreamUnavailable: 'Le service de réponse est temporairement indisponible.',
    emptyResponse: 'Aucune réponse n’a été renvoyée. Veuillez réessayer.',
    serverError: 'Un problème est survenu. Veuillez réessayer.',
    forceRefresh: 'Revérifier (ignorer le cache)',
    forceRefreshHint:
      'Cette réponse était en cache. Revérifier lance un nouveau passage IA (compte toujours dans les limites du serveur gratuit).',
    cached: 'cache',
    degraded: 'résultat partiel',
    relationLabel: 'Lien avec la Chine',
    confidence: '{n} % de confiance',
    productFacts: 'Produit',
    companyFacts: 'Entreprise',
    brand: 'Marque',
    madeIn: 'Fabriqué en (cette unité / pays d’origine final)',
    madeInUnconfirmed: 'Pays d’origine final non confirmé — voir composants / ligne mondiale',
    originLayersTitle: 'Couches d’origine',
    originLayersIntro:
      'Sépare marque/ops, propriété, COO final et pièces — la propriété n’est pas le made-in.',
    layerBrandOps: 'Marque / ops',
    layerOwnership: 'Propriété / sociétés mères',
    layerOwnershipHint: 'Pas le COO final / made-in',
    layerOwnershipEmpty: 'Aucun signal de propriété/société mère dans ce résultat',
    layerFinalCoo: 'COO final',
    layerParts: 'Candidats pièces',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'Quota de recherche IA épuisé — pas d\'informations plus précises pour le moment. Réessayez après la réinitialisation quotidienne.',
    aiCreditsUsedUp:
      'Crédit du service IA temporairement épuisé — pas d\'informations plus précises pour le moment. Réessayez plus tard.',
    srv: {
      partOmittedNoEvidence:
        'Pays de la pièce omis : aucune preuve via recherche/étiquette (le siège de la marque n’est pas le pays d’origine d’une pièce).',
      partOmittedUnconfirmed:
        'Pays de la pièce omis : non confirmé par recherche/étiquette pour cette pièce.',
      madeInOmittedBrand:
        'Pays de fabrication omis : il correspondait seulement au pays de la marque/du design, sans preuve d’usine ou d’origine.',
      madeInOmittedOwnership:
        'Pays de fabrication omis : la Chine provient uniquement des données de propriété/société mère, pas du produit, de l’étiquette ou d’un revendeur.',
      cooUnconfirmedSeeParts:
        'Origine finale non confirmée – voir la ligne composants/production mondiale ou les pièces pour les candidats (fabrication non confirmée).',
      cooUnconfirmedNoLabel:
        'Origine finale non confirmée – aucun pays d’origine sur le produit/l’étiquette ; aucun pays n’est inventé.',
      cooUnconfirmedNoBarcode:
        'Pays de fabrication final non confirmé : aucune page avec code-barres, étiquette ou correspondance du modèle exact ne l’appuie ; les autres pays ne sont que des candidats.',
      cooUnconfirmedCandidates:
        'Origine finale non confirmée – les candidats ci-dessous sont des signaux de recherche, pas une mention « Fabriqué en » imprimée.',
      distributorOmitted:
        'Distributeur local / agent commercial retiré des sociétés mères (pas un propriétaire légal).',
      chinaLinkUnclear:
        'Lien avec la Chine incertain – ne pas le considérer comme confirmé sans lien avec la Chine.',
      verifyConflict:
        'La vérification a signalé des signaux contradictoires',
      companyNotAssessed:
        'Données sur l’entreprise/la propriété non évaluées',
      taiwanSeparate:
        'Taïwan est traité comme un pays distinct pour les niveaux de lien',
      webUnavailableLabel:
        'Recherche web en direct indisponible – les pays des pièces viennent de la photo de l’étiquette, pas de la recherche.',
      altsAim:
        'Les marques/produits alternatifs visent une moindre implication de la Chine (pas seulement la similarité). Les niveaux sont des estimations ; le siège seul ne prouve pas une fabrication hors de Chine.',
      altsNone:
        'Aucune alternative à moindre implication de la Chine trouvée avec assez de certitude.',
      sumCooUnconfirmed:
        'Origine finale non confirmée',
      tierUnknown:
        'Preuves insuffisantes pour évaluer les liens avec la Chine.',
      tierNone:
        'Aucun lien avec la Chine trouvé dans les signaux disponibles.',
      tierDirect:
        'Signaux de lien direct avec la Chine trouvés.',
      tierIndirect:
        'Signaux de lien indirect avec la Chine trouvés.',
      cooConflictChina:
        'Origine finale non confirmée – le signal {source} ({label}) contredit « Fabriqué en Chine » ; la propriété/société mère seule ne suffit pas à fixer le pays de fabrication.',
      cooConflictMadeIn:
        'Origine finale non confirmée – le signal {source} ({label}) contredit la fabrication en {madeIn} ; conservé comme candidat uniquement.',
      candidate:
        '{label} ({rating}, {pct} %, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Les modèles de recherche en direct étaient indisponibles avec cette clé API – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_search_grounding_unavailable:
        'La recherche Google en direct était indisponible avec cette clé API – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_upstream_credits:
        'Crédits du service d’IA épuisés (solde prépayé vide) – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_upstream_quota:
        'Quota quotidien gratuit de recherche Google épuisé – réessayez après la réinitialisation quotidienne – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_upstream_unavailable:
        'La recherche web en direct a expiré ou le service était saturé – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_empty_response:
        'La recherche web en direct a renvoyé une réponse vide – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_disabled:
        'La recherche web en direct était désactivée pour cette vérification – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_gemini_not_configured:
        'Gemini n’est pas configuré pour la recherche web en direct – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_no_entity:
        'Aucun nom de produit pour la recherche web en direct – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      webFail_default:
        'Pas de recherche web en direct pour cette vérification – les pays de fabrication et des pièces sont plus prudents (connaissances du modèle uniquement).',
      sum: {
        madeIn: 'Fabriqué en : {value}',
        candidates: 'Candidats : {value}',
        brandOrigin: 'Origine de la marque : {value}',
        components: 'Composants/production mondiale : {value}',
        parts: 'Pièces : {value}',
        hq: 'Siège : {value}',
        company: 'Entreprise : {value}',
      },
      signal: {
        ocr: 'étiquette',
        retailer: 'revendeur',
        manufacturer: 'fabricant',
        ownership: 'propriété',
        unknown: 'inconnu',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: "Enregistrer l'image",
    sectionShareShare: 'Partager',
    sectionShareSaved: 'Enregistré',
    sectionShareFailed: "Impossible d'enregistrer l'image",
    sectionShareHint: "Survolez une couche pour l'enregistrer ou la partager",
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'page web (correspondance du nom)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'propriété / mère',
    },
    origin: 'Origine',
    brandOrigin: 'Origine de la marque',
    componentsOrigin: 'Composants / ligne mondiale',
    productNotes: 'Notes d’origine',
    manufacturer: 'Fabricant',
    company: 'Entreprise',
    hq: 'Siège',
    parents: 'Sociétés mères',
    graphTitle: 'Graphe des relations',
    graphHint:
      'Les flèches montrent comment le produit, l’entreprise, les sociétés mères et les lieux se connectent. Développez ou zoomez si les libellés sont serrés.',
    graphControls: 'Contrôles du graphe',
    graphZoomIn: 'Zoom avant',
    graphZoomOut: 'Zoom arrière',
    graphExpand: 'Développer',
    graphCollapse: 'Réduire',
    graphRelations: 'Relations',
    graphNoEdges: 'Aucun lien de relation n’a été déduit pour ce résultat.',
    graphLink: 'lié',
    graphChinaLinked: 'Lié à la Chine',
    graphLegendCn: 'Nœud/arête lié à la Chine',
    graphLegendOther: 'Autre',
    graphEdge: {
      brand: 'marque',
      brand_company: 'marque',
      'brand/company': 'marque',
      made_in: 'fabriqué en',
      hq: 'siège',
      parent: 'société mère',
      majority: 'actionnaire majoritaire',
      wholly: 'détenu à 100 %',
      minority: 'participation minoritaire',
      ownership: 'propriété',
      affiliation: 'marque',
      manufacturing: 'fabriqué en',
      part: 'pièce',
      spare: 'rechange',
      ingredient: 'ingrédient',
      component: 'composant',
    },
    regionsTitle: 'Régions',
    altBrands: 'Marques à moindre implication chinoise (estimé)',
    altProducts: 'Produits à moindre implication chinoise (estimé)',
    altDisclaimer:
      'Uniquement des substituts estimés comme non directement liés à la Chine (pas de remplissage « fabriqué en Chine »). Un siège UE/US ne prouve pas une fabrication hors Chine. Un lieu de fabrication flou est Inconnu, pas Sans lien.',
    estimated: 'est.',
    twNote:
      'Taïwan est traité comme un pays distinct et jamais comme lié à la Chine pour les niveaux.',
    region: {
      CN: 'Chine continentale',
      HK: 'Hong Kong',
      TW: 'Taïwan',
      MO: 'Macao',
      OTHER: 'Autre',
      UNKNOWN: 'Inconnu',
    },
    steps: {
      start: 'Démarrage',
      cache: 'Cache',
      identify: 'Lecture de l’étiquette',
      web: 'Recherche web',
      monolith: 'Analyse complète',
      dual_core: 'Produit et entreprise',
      product: 'Origine du produit',
      company: 'Liens d’entreprise',
      verify: 'Contre-vérification',
      alternatives: 'Alternatives à moindre lien CN',
      synthesize: 'Notation',
    },
  },
  history: {
    title: 'Historique',
    subtitle: 'Contrôles passés sur cet appareil',
    empty: 'Aucun contrôle passé pour l’instant.',
    withPhoto: 'Photo',
    open: 'Ouvrir',
    remove: 'Supprimer',
  },
  settings: {
    title: 'Réglages',
    subtitle: 'Préférences et données sur cet appareil',
    panelDisplay: 'Langue et thème',
    panelCheck: 'Quoi vérifier',
    panelData: 'Supprimer les données',
    language: 'Langue',
    theme: 'Thème',
    themeSystem: 'Système',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    geoScope: 'Périmètre Chine pour les niveaux',
    geoScopeHint:
      'Taïwan est toujours traité comme un pays distinct et ne détermine jamais les niveaux de lien avec la Chine. « RPC uniquement » utilise la Chine continentale. La Grande Chine peut inclure Hong Kong et Macao (pas Taïwan).',
    geoScopePrc: 'RPC / continent uniquement (défaut)',
    geoScopeGreater: 'CN + Hong Kong + Macao (pas Taïwan)',
    dimensions: 'Quoi vérifier',
    dimensionsHint:
      'Les alternatives à moindre implication chinoise sont désactivées par défaut. Activez les alternatives de marque ou de produit si vous voulez des substituts avec moins de lien chinois (appel IA supplémentaire).',
    dimOrigin: 'Lieu d’origine',
    dimManufacturer: 'Origine du fabricant',
    dimCompany: 'Relations d’entreprise',
    dimAltBrands: 'Alternatives de marques à moindre implication chinoise',
    dimAltProducts: 'Alternatives de produits à moindre implication chinoise',
    howItWorks: 'Comment ça marche',
    about: 'À propos d’OriginWise',
    version: 'Version {v}',
    cleanData: 'Supprimer les données locales',
    cleanDataHint:
      'Les données restent uniquement dans ce navigateur. Choisissez ce qu’il faut retirer. Irréversible.',
    dataSummary: 'Sur cet appareil',
    dataNone: 'Aucune donnée OriginWise enregistrée.',
    dataHistory: 'Contrôles passés : {n}',
    dataSettings: 'Réglages personnalisés',
    dataDisclaimer: 'Avertissement accepté',
    cleanAll: 'Tout',
    cleanHistory: 'Contrôles passés uniquement',
    cleanSettings: 'Réglages uniquement',
    cleanConfirm: 'Supprimer les données sélectionnées ?',
    cleanConfirmBtn: 'Supprimer maintenant',
    cleanDoneAll: 'Toutes les données locales OriginWise ont été supprimées.',
    cleanDoneHistory: 'Contrôles passés supprimés.',
    cleanDoneSettings: 'Réglages rétablis par défaut.',
  },
  about: {
    title: 'À propos',
    tagline: 'Un contrôle simple du lien avec la Chine',
    intro:
      'OriginWise vous aide à voir rapidement si un produit ou une marque semble lié à la Chine — lieu d’origine, fabricant et liens d’entreprise — avec des alternatives facultatives à moindre implication. Les contrôles restent sur cet appareil.',
    body: 'OriginWise est un outil simple pour un contrôle rapide du lien avec la Chine sur des produits et marques du quotidien. L’IA peut être incomplète ou erronée.',
    privacy: 'Pas de compte. Votre historique reste sur ce téléphone/navigateur.',
    license: 'Licence MIT',
    licenseShort: 'MIT',
    openSourceTitle: 'Open source · MIT',
    openSourceBody:
      'Ce projet est un logiciel libre sous licence MIT. Vous pouvez l’utiliser, le copier, le modifier, le fusionner, le publier, le distribuer et le sous-licencier — y compris pour votre propre déploiement avec vos clés API.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Fourni « en l’état », sans garantie. Voir le texte complet de la licence sur GitHub.',
    linkSource: 'Code source',
    linkLicense: 'Licence MIT',
    linkIssues: 'Problèmes et retours',
    linkReleases: 'Versions',
    linkSecurity: 'Politique de sécurité',
    privacyTitle: 'Votre vie privée',
    privacyLead:
      'Nous restons simples : pas de compte, et l’historique des contrôles reste sur votre téléphone ou ordinateur.',
    privacyBullet1:
      'Les contrôles passés, réglages et préférences sont enregistrés uniquement dans ce navigateur, sur votre appareil.',
    privacyBullet2: 'Il n’y a ni connexion ni copie cloud de votre journal de contrôles.',
    privacyBullet3:
      'Vous pouvez tout effacer à tout moment avec « Supprimer les données locales » dans les Réglages.',
    privacyBullet4:
      'Lorsque vous lancez un contrôle, le nom ou la photo n’est envoyé que pour cette réponse. Nous ne conservons pas les emballages comme catalogue.',
    privacyBullet5:
      'Les photos sont compressées sur votre appareil avant l’envoi et ne sont pas stockées comme enregistrements serveur.',
    privacyBullet6:
      'Lorsque la recherche web en direct est active, le nom du produit (et le texte de l’étiquette) est aussi envoyé une fois à un service de recherche : d’abord Google Search via Gemini, puis Brave Search ou Firecrawl seulement en cas d’échec. Les étapes de progression et le résultat indiquent le service réellement utilisé. Nous ne conservons aucun journal des recherches.',
    privacyPolicyLink: 'Politique de confidentialité',
    termsLink: 'Conditions d’utilisation',
    designTitle: 'Comment ça marche',
    designLead:
      'Contrôle IA multi-agents rapide, puis un tableau de notation fixe — pas une base juridique.',
    designLocalTitle: 'Ce qui reste sur votre appareil',
    designLocalBody:
      'Après le chargement, l’historique, la langue, le thème et les préférences de contrôle sont enregistrés uniquement dans ce navigateur. Effacez les données du site ou utilisez « Supprimer les données locales ».',
    designWhyTitle: 'Pourquoi ce choix',
    designWhy1: 'Des contrôles mobiles rapides sans créer de compte.',
    designWhy2: 'L’historique reste chez vous — effacez-le à tout moment.',
    designWhy3:
      'L’IA peut se tromper ; nous affichons des précautions et traitons Taïwan comme un pays distinct pour les niveaux.',
    disclaimerTitle: 'À noter',
    disclaimerBody:
      'OriginWise est uniquement informatif — pas un conseil juridique, douanier ou sur les sanctions. L’IA et les libellés de niveau peuvent être incomplets ou erronés. Vérifiez toujours les décisions importantes vous-même.',
    createdBy: 'Maintenu par',
    contributionsWelcome: 'Les issues et pull requests sont les bienvenues sur GitHub.',
  },
  how: {
    title: 'Comment ça marche',
    subtitle: 'Contrôle rapide du lien avec la Chine — rester simple',
    aimTitle: 'À quoi sert cette application',
    aimBody:
      'Vous aider à voir rapidement si un produit ou une marque semble lié à la Chine — fabriqué là-bas, liens d’entreprise, etc. Pas un outil de recherche approfondie, pas un contrôle juridique.',
    stepsTitle: 'En mots simples',
    step1Title: 'Vous envoyez quelque chose',
    step1Body: 'Un nom de produit, une marque, ou une photo de l’emballage.',
    step2Title: 'Nous cherchons avec l’IA',
    step2Body:
      'De petits contrôles s’exécutent : lieu du produit et entreprise (ensemble), puis une double vérification rapide. Optionnel : alternatives de marque/produit à moindre implication chinoise si vous les activez.',
    step3Title: 'Vous obtenez un résultat simple',
    step3Body:
      'Un badge coloré : Sans lien, Indirect, Direct ou Inconnu — plus un court pourquoi.',
    graphTitle: 'Flux complet',
    graphHint: 'De votre saisie au badge coloré.',
    flowYou: 'Vous (nom / photo)',
    flowAi: 'Contrôles IA',
    flowProduct: 'Lieu du produit',
    flowCompany: 'Entreprise',
    flowVerify: 'Double vérification',
    flowScore: 'Score simple',
    flowResult: 'Résultat coloré',
    flowAiDetail:
      'Lieu du produit + entreprise d’abord, puis une double vérification rapide.',
    flowScoreDetail: 'Nous combinons les réponses en un score simple.',
    badgeTitle: 'Ce que signifient les couleurs',
    badgeNone: 'Sans lien — aucun lien clair avec la Chine trouvé',
    badgeIndirect: 'Indirect — lien plus faible ou partiel',
    badgeDirect: 'Direct — lien clair (ex. fabriqué en Chine ou siège là-bas)',
    badgeUnknown: 'Inconnu — pas assez d’infos claires',
    twTitle: 'Taïwan',
    twBody:
      'Taïwan compte toujours ici comme son propre pays. Il ne compte pas à lui seul comme « lié à la Chine ».',
    evidenceTitle:
      'Quand un pays de fabrication est confirmé',
    evidenceBody:
      'Un pays de fabrication apparaît comme confirmé de trois façons. La plus forte : une photo de l’étiquette, ou une page web affichant le même code-barres (JAN/EAN) à côté de la mention d’origine (correspondance du code-barres). Ensuite, la correspondance du modèle exact : la réponse de l’IA et au moins une page web citant la marque et le modèle exacts donnent le même pays, ou au moins deux pages de ce type sur des sites différents concordent ; la réponse de l’IA figure alors parmi les sources. Dans les deux cas, aucune page citant le modèle exact ne doit indiquer un autre pays. La réponse de l’IA seule ne confirme jamais rien et reste une référence du modèle ; si les pages du modèle exact se contredisent, le pays reste non confirmé et les candidats sont listés. Un lien cité par l’IA ne compte qu’après vérification : la page figure aussi dans la recherche web, ou elle se charge et cite le modèle exact et le pays ; sinon elle apparaît comme « Cité par l’IA, non vérifié » et ne compte pas. Une correspondance approximative sur le nom du produit n’apparaît que comme candidat sous « Non confirmé », et une page listant plusieurs tailles ou variantes reste non confirmée. Si la recherche web en direct n’est pas disponible, le résultat repose uniquement sur les connaissances du modèle et l’indique.',
    flowWeb:
      'Recherche web',
    flowWebDetail:
      'Chercher des pages web par nom de produit ou code-barres et vérifier la mention d’origine.',
    privacyTitle: 'Vos données',
    privacyBody:
      'L’historique reste sur cet appareil et les photos ne sont pas stockées sur le serveur. Si la recherche web en direct est activée, le nom du produit ou le code-barres est envoyé aux services de recherche. L’IA peut se tromper : vérifiez toujours les décisions importantes.',
    tryBtn: 'Essayer un contrôle',
  },
  tier: {
    none: 'Sans lien',
    indirect: 'Indirect',
    direct: 'Direct',
    unknown: 'Inconnu',
  },
} satisfies MessageTree;
