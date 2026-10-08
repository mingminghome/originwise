import type { MessageTree } from './en';

export const es = {
  appName: 'OriginWise',
  tabs: {
    check: 'Comprobar',
    history: 'Historial',
    about: 'Acerca de',
    settings: 'Ajustes',
    navMore: 'Menú',
  },
  common: {
    present: 'Sí',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'No',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    back: 'Atrás',
    loading: 'Cargando…',
    optional: 'Opcional',
  },
  install: {
    aria: 'Instalar OriginWise',
    title: 'Instalar OriginWise',
    body: 'Añádelo a la pantalla de inicio para una comprobación rápida tipo app.',
    bodyIos: 'Añadir a la pantalla de inicio para usarlo a pantalla completa.',
    iosStep1: 'Toca',
    iosStep2: 'Compartir y luego Añadir a pantalla de inicio.',
    action: 'Instalar',
    dismiss: 'Cerrar el aviso de instalación',
  },
  support: {
    buyMeAPint: 'Invítame a una pinta',
    pintShort: 'Pinta',
    thanks: 'Si OriginWise te ayuda, puedes invitarme a una pinta:',
  },
  welcome: {
    title: 'Bienvenido a OriginWise',
    body: 'Comprobación rápida: ¿este producto o marca está relacionado con China? Escribe un nombre o fotografía el envase. La IA puede equivocarse — no es asesoramiento legal.',
    accept: 'Entendido — empezar',
  },
  check: {
    identifiedAs: 'Identificado como: {name}',
    chinaLink: {
      title: 'Vínculo con China',
      chinaCompany: 'Empresa china',
      chinaControlled: 'Bajo control chino',
      hq: 'Sede',
      owner: 'Propietario de control',
      brandOrigin: 'Origen de la marca',
      madeIn: 'Fabricado en',
      parts: 'Piezas',
      china: 'China',
      unconfirmed: 'Sin confirmar',
      partsChina: 'Algunas piezas fabricadas en China',
      hqParentNote: 'La sede en China de la respuesta es la de la empresa matriz',
      madeInBelow: 'El país de fabricación se decide solo en la tarjeta «Fabricado en» (código de barras, etiqueta o coincidencia de modelo).',
      madeInChina: 'Fabricado en China',
      footnote: 'Esta tarjeta solo describe dónde tiene su sede la empresa, quién es su propietario y dónde se fabrica el producto. No es un juicio sobre la calidad o la seguridad del producto ni sobre la empresa.',
      controlling: 'Control',
      reasonParent: 'La empresa matriz que la controla está en China continental.',
      reasonBrandOrigin: 'Origen de la marca: {place}.',
      madeInLineBarcode: 'Fabricado en: {place} (coincidencia del código de barras, ver la tarjeta «Fabricado en» abajo)',
      madeInLineLabel: 'Fabricado en: {place} (etiqueta del envase, ver la tarjeta «Fabricado en» abajo)',
      madeInLineModel: 'Fabricado en: {place} (coincidencia de modelo exacto, ver la tarjeta «Fabricado en» abajo)',
    },
    rc: {
      modelRef: 'Referencia del modelo (sin confirmar)',
      modelRefHelp: 'No lo confirma ninguna página web ni la etiqueta del envase; es solo una suposición del modelo. Guíese por la etiqueta del envase.',
      moreInfo: 'Más información',
      candidatesTitle: 'Países de fabricación candidatos (sin confirmar)',
      noCandidates: 'No se encontraron candidatos fiables.',
      sourceCount: 'Fuentes: {n}',
      sourceFirst: 'Fuente 1: {label}',
      sourceNth: 'Fuente {n}: {label}',
      sourceAiAnswer: 'Respuesta de la IA',
      oneExactModelPage: '1 página con el modelo exacto',
      dispute: 'En disputa: {sides}',
      disputeSideExact: '{country} (páginas con el modelo exacto: {n})',
      disputeSideMixed: '{country} (páginas: {n}, con el modelo exacto: {e})',
      disputeSidePages: '{country} (páginas: {n})',
      disputeSideLabel: '{country} (etiqueta del envase)',
      disputeSideLabelPages: '{country} (etiqueta del envase; páginas: {n})',
      disputeSideLabelExact: '{country} (etiqueta del envase; páginas con el modelo exacto: {n})',
      disputeSideLabelMixed: '{country} (etiqueta del envase; páginas: {n}, con el modelo exacto: {e})',
      disputeSep: '; ',
      designInfo: 'Información adicional: diseño / ingeniería según la marca: {country}. No es el lugar de fabricación.',
      brandInfo: 'Información adicional: origen de la marca según se indica: {country}. No es el lugar de fabricación.',
      infoSource: 'Fuente: {label}',
      foldUnconfirmed: 'País de fabricación final sin confirmar: {reason}. Los demás países son solo candidatos.',
      citedUnverified: 'Citado por la IA, no verificado',
      excludedOtherModel: 'Otro modelo ({model}), no se cuenta',
      reason: {
        aiOnly: 'Solo la respuesta de la IA, sin página web que la respalde',
        pagesDisagree: 'Las páginas web no coinciden',
        sourcesDisagree: 'Las fuentes no coinciden',
        aiCitedUnverified: 'No se pudo verificar el enlace citado por la IA',
        onePageOnly: 'Solo una página web lo menciona',
      },
      sourceCountry: 'fabricado en {country}',
      labelSource: 'Fuente: foto de la etiqueta del envase',
      parent: 'Empresa matriz',
      tagConfirmed: 'Confirmado',
      tagLikely: 'Probable',
      tagMentioned: 'Mencionado',
      tagUnconfirmed: 'Sin confirmar',
      foldSources: 'Todas las fuentes',
      foldAlts: 'Marcas alternativas',
      foldAi: 'Detalles de IA / búsqueda',
      expand: 'Mostrar',
      collapse: 'Ocultar',
    },
    matchBasis: {
      barcode: 'Coincidencia por código de barras',
      name: 'Coincidencia por nombre del producto',
      label: 'Según la etiqueta del envase',
      model: 'Coincidencia de modelo exacto',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Investigación web — consulta enviada a {name}',
    searchUsage: 'Búsqueda web: {provider} · solicitudes de búsqueda: {n}',
    knowledgeWebVia:
      'Incluye una pasada de investigación web en vivo ({provider}) más el conocimiento del modelo. Sigue sin ser un registro mercantil ni una base aduanera: las etiquetas y los documentos oficiales pueden discrepar de las páginas web. Informativo — no es asesoramiento legal, comercial ni sobre sanciones.',
    title: 'Comprobación rápida',
    subtitle: '¿Este artículo está relacionado con China? Escribe un nombre o fotografía el envase.',
    placeholder: 'p. ej. marca de snacks, teléfono, juguete…',
    placeholderWithPhoto: 'Opcional: ¿qué producto es?',
    photo: 'Cámara',
    gallery: 'Galería',
    removePhoto: 'Quitar foto',
    photoLabelHint: 'Leemos la etiqueta si el texto se ve claro',
    noteOptional: 'Nota opcional',
    submit: 'Comprobar ahora',
    submitting: 'Comprobando…',
    needInput: 'Escribe un nombre de producto o añade una foto.',
    howLink: 'Cómo funciona',
    newCheck: 'Nueva comprobación',
    comingSoon:
      'La API de comprobación llega en un PR posterior. El historial y los ajustes ya están listos.',
    photoTooLarge: 'La foto sigue siendo demasiado grande tras comprimir.',
    photoInvalid: 'No se pudo leer esa imagen.',
    dropPhoto: 'Suelta la foto aquí',
    unnamedPhoto: '(foto)',
    partsTitle: 'Piezas, recambios e ingredientes',
    partsHint:
      'Aislado de este producto: componentes, recambios o ingredientes principales y si parecen vinculados a China.',
    partKind: {
      part: 'Pieza',
      spare: 'Recambio',
      ingredient: 'Ingrediente',
      component: 'Componente',
    },
    progressHint: 'Analizando origen y empresa…',
    stepMonolith: 'Recogiendo señales de producto y empresa',
    answeredBy: 'Respuesta principal vía {name}',
    agentsUsed: '{n} agentes',
    agentsTitle: 'Grupo de IA usado',
    agentsSummary: '{total} llamadas · {ok} ok · {fail} fallidas',
    /** Strength of a company–country relation (所有權 rows). */
    relStrength: {
      strong: 'vínculo fuerte',
      moderate: 'vínculo moderado',
      weak: 'vínculo débil',
    },
    agentsHint:
      'Cada fila es una llamada de IA del servidor gratuito. Los fallos suelen ser cuota, acceso al modelo o tiempo de espera; seguimos probando otros o un respaldo. La web en vivo necesita Gemini Search grounding (no es lo mismo que el RPM de texto).',
    agentsHintVia:
      'Cada fila es una llamada de IA del servidor gratuito. Los fallos suelen ser cuota, acceso al modelo o tiempo de espera; seguimos probando otros o un respaldo. La búsqueda web en vivo se hizo con {provider}.',
    agentOk: 'OK',
    agentFail: 'Falló ({err})',
    agentSkipped: 'Omitido ({err})',
    agentFailUnknown: 'error',
    agentError: {
      upstream_quota: 'cuota / límite de ritmo',
      upstream_credits: 'crédito de IA agotado',
      upstream_error: 'error de origen',
      upstream_unavailable: 'servicio no disponible',
      empty_response: 'respuesta vacía',
      model_unavailable: 'modelo no disponible en esta clave API',
      search_grounding_unavailable:
        'Google Search grounding no disponible en esta clave (prueba modelos del grupo predeterminado / activa facturación; Gemini 3 Search suele ser 0/0)',
      disabled: 'desactivado',
      gemini_not_configured: 'Gemini no configurado',
      no_entity: 'sin nombre de producto',
    },
    agent: {
      identify: 'Leer etiqueta / nombre',
      product: 'Lugar del producto',
      company: 'Vínculos de empresa',
      verify: 'Doble comprobación',
      alternatives: 'Alternativas con menor vínculo CN',
      monolith: 'Comprobación completa (una llamada)',
      dual_core: 'Producto + empresa',
      dual_alts: 'Alternativas con menor vínculo CN',
      web: 'Búsqueda web',
      unknownProvider: 'IA desconocida',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Por qué este nivel',
    reason: {
      made_in_cn: 'El producto se fabrica en China continental.',
      made_in_cn_detail: 'El producto se fabrica en {place}.',
      origin_cn: 'El origen del producto está vinculado a China continental.',
      origin_cn_detail: 'El origen del producto figura como {place}.',
      manufacturer_cn: 'El fabricante está vinculado a China continental.',
      manufacturer_cn_detail: 'Ubicación/vínculo del fabricante: {place}.',
      hq_cn: 'La sede de la empresa está en China continental.',
      hq_cn_detail: 'La sede de la empresa está en {place}.',
      parent_majority_cn:
        'Una matriz mayoritaria/controladora está vinculada a China continental.',
      ownership_strong_cn:
        'Se informaron vínculos fuertes de propiedad o control con China continental.',
      ownership_weak_cn:
        'Se informaron vínculos más débiles (p. ej. participación minoritaria, suministro o venta) con China continental.',
      component_cn:
        'Algunos componentes o el ensamblaje están vinculados a China continental, sin una afirmación completa de «hecho en China».',
      explicit_non_cn_geo:
        'Señales de lugar claras apuntan fuera de China continental (según el alcance de esta herramienta).',
      explicit_non_cn_geo_detail:
        'Señales de lugar claras fuera de China continental: {places}.',
      verify_conflict:
        'Las señales de producto y empresa no coincidían del todo (la comprobación cruzada encontró conflictos).',
      conflict_no_strong:
        'Las señales chocaban y no había un vínculo fuerte con China continental: resultado incierto.',
      insufficient:
        'No hay suficiente información fiable de origen o propiedad para juzgar vínculos con China.',
      ownership_not_assessed:
        'La propiedad de la empresa no se evaluó por completo en esta comprobación.',
      taiwan_as_country:
        'Taiwán se trata como un país aparte y no cuenta como «relacionado con China» para esta puntuación.',
      taiwan_as_country_detail:
        'Taiwán se trata como un país aparte (visto en: {places}) y no cuenta como «relacionado con China» para esta puntuación.',
    },
    caveats: 'Matices',
    disclaimer:
      'Solo informativo — conocimiento del modelo e investigación web opcional, no asesoramiento legal ni sobre sanciones. La IA puede equivocarse.',
    knowledgeModel:
      'Basado solo en el conocimiento general del modelo (sin búsqueda web en vivo). El origen de la marca, las plantas de componentes y el ensamblaje final/país de origen pueden diferir según SKU/mercado: prioriza las etiquetas. No es un registro mercantil ni una base aduanera. Informativo — no es asesoramiento legal, comercial ni sobre sanciones.',
    knowledgeWeb:
      'Incluye una pasada de investigación web en vivo (Google Search mediante grounding de Gemini) más el conocimiento del modelo. Sigue sin ser un registro mercantil ni una base aduanera: las etiquetas y los documentos oficiales pueden discrepar de las páginas web. Informativo — no es asesoramiento legal, comercial ni sobre sanciones.',
    providerNotConfigured:
      'La comprobación IA no está configurada. Añade una clave en .dev.vars y ejecuta `npm run pages:dev` (véase el README).',
    rateLimited:
      'Límite del servidor gratuito: 1 comprobación cada 30 segundos. Espera un momento.',
    rateLimitedDay:
      'Límite del servidor gratuito: máx. 10 comprobaciones cada 6 horas. Inténtalo más tarde.',
    rateLimitBadge: 'Límite del servidor gratuito',
    rateLimitFreeNote:
      'Servidor gratuito · 1 comprobación / 30 s · máx. 10 / 6 horas · 1 a la vez',
    rateLimitRpmTitle: 'Límite de ritmo del servidor gratuito (30 s)',
    rateLimitedLongTitle: 'Límite de 6 horas del servidor gratuito',
    rateLimitInflightTitle: 'Ya hay una comprobación en curso',
    rateLimitShortDetail:
      'Límite del servidor gratuito: {n} comprobación(es) cada {w} s. Espera unos {s} s e inténtalo de nuevo.',
    rateLimitLongDetail:
      'Límite del servidor gratuito: {n} comprobaciones cada {h} horas. Inténtalo en unos {m} minutos.',
    rateLimitMinuteDetail:
      'Límite del servidor gratuito: {n} comprobación(es) cada {w} s. Espera unos {s} s e inténtalo de nuevo.',
    rateLimitDayDetail:
      'Límite del servidor gratuito: {n} comprobaciones cada {h} horas. Inténtalo más tarde.',
    rateLimitInflightDetail:
      'El servidor gratuito solo permite 1 comprobación a la vez. Espera a que termine la actual.',
    rateLimitAutoIn: 'Automático en {s} s…',
    rateLimitAutoHint:
      'Se enviará automáticamente en {s} s cuando se abra la ventana del servidor gratuito.',
    rateLimitAutoStop: 'Detener',
    rateLimitAutoCancelled:
      'Envío automático cancelado. Puedes intentarlo de nuevo cuando quieras.',
    forbiddenOrigin: 'Solicitud no permitida desde este origen.',
    badRequest: 'Solicitud no válida.',
    parseError: 'No se pudo entender la respuesta. Inténtalo de nuevo.',
    upstreamError: 'El servicio de respuesta falló. Inténtalo más tarde.',
    upstreamQuota: 'El servicio de respuesta está ocupado. Inténtalo más tarde.',
    upstreamUnavailable: 'El servicio de respuesta no está disponible temporalmente.',
    emptyResponse: 'No se devolvió ninguna respuesta. Inténtalo de nuevo.',
    serverError: 'Algo salió mal. Inténtalo de nuevo.',
    forceRefresh: 'Volver a comprobar (omitir caché)',
    forceRefreshHint:
      'Esta respuesta estaba en caché. Volver a comprobar lanza una pasada IA nueva (sigue contando para los límites del servidor gratuito).',
    cached: 'caché',
    degraded: 'resultado parcial',
    relationLabel: 'Relación con China',
    confidence: '{n}% de confianza',
    productFacts: 'Producto',
    companyFacts: 'Empresa',
    brand: 'Marca',
    madeIn: 'Hecho en (esta unidad / país de origen final)',
    madeInUnconfirmed: 'País de origen final sin confirmar — ver componentes / línea global',
    originLayersTitle: 'Capas de origen',
    originLayersIntro:
      'Separa marca/ops, propiedad, COO final y piezas — la propiedad no es made-in.',
    layerBrandOps: 'Marca / ops',
    layerOwnership: 'Propiedad / matrices',
    layerOwnershipHint: 'No es COO final / made-in',
    layerOwnershipEmpty: 'Sin señal de propiedad/matriz en este resultado',
    layerFinalCoo: 'COO final',
    layerParts: 'Candidatos de piezas',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'Cuota de búsqueda de IA agotada — no hay información más precisa por ahora. Vuelve a consultar tras el reinicio diario.',
    aiCreditsUsedUp:
      'El crédito del servicio de IA se ha agotado temporalmente — no hay información más precisa por ahora. Inténtalo más tarde.',
    srv: {
      partOmittedNoEvidence:
        'País de la pieza omitido: sin pruebas de búsqueda/etiqueta (la sede de la marca no es el origen de una pieza).',
      partOmittedUnconfirmed:
        'País de la pieza omitido: no confirmado por búsqueda/etiqueta para esta pieza.',
      madeInOmittedBrand:
        'País de fabricación omitido: solo coincidía con el país de la marca/diseño, sin pruebas de fábrica u origen.',
      madeInOmittedOwnership:
        'País de fabricación omitido: China procede solo de datos de propiedad/matriz, no del producto, la etiqueta o un minorista.',
      cooUnconfirmedSeeParts:
        'Origen final sin confirmar: consulta la línea de componentes/producción global o las piezas para ver candidatos (fabricación no confirmada).',
      cooUnconfirmedNoLabel:
        'Origen final sin confirmar: no hay país de origen en el producto/etiqueta; no se inventa ninguno.',
      cooUnconfirmedNoBarcode:
        'País de fabricación final sin confirmar; los demás países son solo candidatos.',
      cooUnconfirmedCandidates:
        'Origen final sin confirmar: los candidatos de abajo son señales de búsqueda, no un «Hecho en» impreso.',
      distributorOmitted:
        'Distribuidor local / agente de mercado omitido de las matrices (no es propietario legal).',
      chinaLinkUnclear:
        'Vínculo con China poco claro: no lo trates como confirmado sin China.',
      verifyConflict:
        'La verificación detectó señales contradictorias',
      companyNotAssessed:
        'Datos de empresa/propiedad no evaluados',
      taiwanSeparate:
        'Taiwán se trata como un país distinto para los niveles de relación',
      webUnavailableLabel:
        'Búsqueda web en vivo no disponible: los países de las piezas proceden de la foto de la etiqueta, no de la búsqueda.',
      altsAim:
        'Las marcas/productos alternativos buscan menor implicación de China (no solo similitud). Los niveles son estimaciones; la sede por sí sola no demuestra fabricación fuera de China.',
      altsNone:
        'No se encontraron alternativas con menor implicación de China con suficiente certeza.',
      sumCooUnconfirmed:
        'Origen final sin confirmar',
      tierUnknown:
        'Pruebas insuficientes para evaluar vínculos con China.',
      tierNone:
        'No se encontraron vínculos con China en las señales disponibles.',
      tierDirect:
        'Se encontraron señales de vínculo directo con China.',
      tierIndirect:
        'Se encontraron señales de vínculo indirecto con China.',
      cooConflictChina:
        'Origen final sin confirmar: la señal de {source} ({label}) contradice «Hecho en China»; la propiedad/matriz por sí sola no fija el país de fabricación.',
      cooConflictMadeIn:
        'Origen final sin confirmar: la señal de {source} ({label}) contradice la fabricación en {madeIn}; se mantiene solo como candidato.',
      candidate:
        '{label} ({rating}, {pct} %, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Los modelos de búsqueda en vivo no estaban disponibles con esta clave API; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_search_grounding_unavailable:
        'La búsqueda de Google en vivo no estaba disponible con esta clave API; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_upstream_credits:
        'Créditos del servicio de IA agotados (saldo prepago vacío); los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_upstream_quota:
        'Cuota diaria gratuita de búsqueda de Google agotada: inténtalo tras el reinicio diario; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_upstream_unavailable:
        'La búsqueda web en vivo agotó el tiempo o el servicio estaba saturado; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_empty_response:
        'La búsqueda web en vivo devolvió una respuesta vacía; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_disabled:
        'La búsqueda web en vivo estaba desactivada para esta consulta; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_gemini_not_configured:
        'Gemini no está configurado para la búsqueda web en vivo; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_no_entity:
        'No hay nombre de producto para la búsqueda web en vivo; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      webFail_default:
        'Sin búsqueda web en vivo para esta consulta; los países de fabricación y de las piezas son más prudentes (solo conocimiento del modelo).',
      sum: {
        madeIn: 'Hecho en: {value}',
        candidates: 'Candidatos: {value}',
        brandOrigin: 'Origen de la marca: {value}',
        components: 'Componentes/producción global: {value}',
        parts: 'Piezas: {value}',
        hq: 'Sede: {value}',
        company: 'Empresa: {value}',
      },
      signal: {
        ocr: 'etiqueta',
        retailer: 'minorista',
        manufacturer: 'fabricante',
        ownership: 'propiedad',
        unknown: 'desconocido',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Guardar imagen',
    sectionShareShare: 'Compartir',
    sectionShareSaved: 'Guardado',
    sectionShareFailed: 'No se pudo guardar la imagen',
    sectionShareHint: 'Pasa el cursor por una capa para guardar o compartir',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'página web (coincidencia de nombre)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'propiedad / matriz',
    },
    origin: 'Origen',
    brandOrigin: 'Origen de la marca',
    componentsOrigin: 'Componentes / línea global',
    productNotes: 'Notas de origen',
    manufacturer: 'Fabricante',
    company: 'Empresa',
    hq: 'Sede',
    parents: 'Matrices',
    graphTitle: 'Grafo de relaciones',
    graphHint:
      'Las flechas muestran cómo se conectan el producto, la empresa, las matrices y los lugares. Amplía o haz zoom si las etiquetas quedan apretadas.',
    graphControls: 'Controles del grafo',
    graphZoomIn: 'Acercar',
    graphZoomOut: 'Alejar',
    graphExpand: 'Expandir',
    graphCollapse: 'Contraer',
    graphRelations: 'Relaciones',
    graphNoEdges: 'No se infirieron vínculos de relación para este resultado.',
    graphLink: 'relacionado',
    graphChinaLinked: 'Vinculado a China',
    graphLegendCn: 'Nodo/arista vinculado a China',
    graphLegendOther: 'Otro',
    graphEdge: {
      brand: 'marca',
      brand_company: 'marca',
      'brand/company': 'marca',
      made_in: 'hecho en',
      hq: 'sede',
      parent: 'matriz',
      majority: 'propietario mayoritario',
      wholly: 'propiedad total',
      minority: 'participación minoritaria',
      ownership: 'propiedad',
      affiliation: 'marca',
      manufacturing: 'hecho en',
      part: 'pieza',
      spare: 'recambio',
      ingredient: 'ingrediente',
      component: 'componente',
    },
    regionsTitle: 'Regiones',
    altBrands: 'Marcas con menor implicación china (estimado)',
    altProducts: 'Productos con menor implicación china (estimado)',
    altDisclaimer:
      'Solo sustitutos estimados como no vinculados de forma Directa a China (sin relleno «hecho en China»). Una sede en EE. UU./UE no demuestra fabricación fuera de China. Un origen de fabricación poco claro es Desconocido, no Sin relación.',
    estimated: 'est.',
    twNote:
      'Taiwán se trata como un país aparte y nunca como relacionado con China para los niveles.',
    region: {
      CN: 'China continental',
      HK: 'Hong Kong',
      TW: 'Taiwán',
      MO: 'Macao',
      OTHER: 'Otro',
      UNKNOWN: 'Desconocido',
    },
    steps: {
      start: 'Inicio',
      cache: 'Caché',
      identify: 'Leyendo etiqueta',
      web: 'Investigación web',
      monolith: 'Análisis completo',
      dual_core: 'Producto y empresa',
      product: 'Origen del producto',
      company: 'Vínculos de empresa',
      verify: 'Comprobación cruzada',
      alternatives: 'Alternativas con menor vínculo CN',
      synthesize: 'Puntuación',
    },
  },
  history: {
    title: 'Historial',
    subtitle: 'Comprobaciones anteriores en este dispositivo',
    empty: 'Aún no hay comprobaciones anteriores.',
    withPhoto: 'Foto',
    open: 'Abrir',
    remove: 'Quitar',
  },
  settings: {
    title: 'Ajustes',
    subtitle: 'Preferencias y datos en este dispositivo',
    panelDisplay: 'Idioma y tema',
    panelCheck: 'Qué comprobar',
    panelData: 'Borrar datos',
    language: 'Idioma',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    geoScope: 'Alcance de China para los niveles',
    geoScopeHint:
      'Taiwán siempre se trata como un país aparte y nunca determina los niveles de relación con China. Solo RPC usa China continental. Gran China puede incluir Hong Kong y Macao (no Taiwán).',
    geoScopePrc: 'Solo RPC / continental (predeterminado)',
    geoScopeGreater: 'CN + Hong Kong + Macao (no Taiwán)',
    dimensions: 'Qué comprobar',
    dimensionsHint:
      'Las alternativas con menor implicación china están desactivadas por defecto. Activa alternativas de marca o producto si quieres sustitutos con menos vínculo chino (usa una llamada IA extra).',
    dimOrigin: 'Lugar de origen',
    dimManufacturer: 'Origen del fabricante',
    dimCompany: 'Relaciones de empresa',
    dimAltBrands: 'Alternativas de marca con menor implicación china',
    dimAltProducts: 'Alternativas de producto con menor implicación china',
    howItWorks: 'Cómo funciona',
    about: 'Acerca de OriginWise',
    version: 'Versión {v}',
    cleanData: 'Borrar datos locales',
    cleanDataHint:
      'Los datos solo permanecen en este navegador. Elige qué quitar. No se puede deshacer.',
    dataSummary: 'En este dispositivo',
    dataNone: 'No hay datos de OriginWise guardados.',
    dataHistory: 'Comprobaciones anteriores: {n}',
    dataSettings: 'Ajustes personalizados',
    dataDisclaimer: 'Aviso aceptado',
    cleanAll: 'Todo',
    cleanHistory: 'Solo comprobaciones anteriores',
    cleanSettings: 'Solo ajustes',
    cleanConfirm: '¿Borrar los datos seleccionados?',
    cleanConfirmBtn: 'Borrar ahora',
    cleanDoneAll: 'Se borraron todos los datos locales de OriginWise.',
    cleanDoneHistory: 'Comprobaciones anteriores borradas.',
    cleanDoneSettings: 'Ajustes restablecidos a los valores predeterminados.',
  },
  about: {
    title: 'Acerca de',
    tagline: 'Una comprobación sencilla de productos relacionados con China',
    intro:
      'OriginWise te ayuda a ver rápido si un producto o marca parece relacionado con China — lugar de origen, fabricante y vínculos de empresa — con alternativas opcionales de menor implicación. Las comprobaciones se quedan en este dispositivo.',
    body: 'OriginWise es una herramienta sencilla para una comprobación rápida del vínculo con China en productos y marcas cotidianos. La IA puede ser incompleta o incorrecta.',
    privacy: 'Sin cuenta. Tu historial se queda en este teléfono/navegador.',
    license: 'Licencia MIT',
    licenseShort: 'MIT',
    openSourceTitle: 'Código abierto · MIT',
    openSourceBody:
      'Este proyecto es software libre bajo la licencia MIT. Puedes usarlo, copiarlo, modificarlo, fusionarlo, publicarlo, distribuirlo y sublicenciarlo — también para tu propio despliegue con tus claves API.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Se ofrece «tal cual», sin garantía. Consulta el texto completo de la licencia en GitHub.',
    linkSource: 'Código fuente',
    linkLicense: 'Licencia MIT',
    linkIssues: 'Incidencias y comentarios',
    linkReleases: 'Versiones',
    linkSecurity: 'Política de seguridad',
    privacyTitle: 'Tu privacidad',
    privacyLead:
      'Lo mantenemos simple: sin cuenta, y el historial de comprobaciones se queda en tu teléfono u ordenador.',
    privacyBullet1:
      'Las comprobaciones anteriores, ajustes y preferencias se guardan solo en este navegador, en tu dispositivo.',
    privacyBullet2: 'No hay inicio de sesión ni copia en la nube de tu diario de comprobaciones.',
    privacyBullet3:
      'Puedes borrar todo en cualquier momento con «Borrar datos locales» en Ajustes.',
    privacyBullet4:
      'Al hacer una comprobación, el nombre o la foto se envían solo para esa respuesta. No guardamos envases como catálogo de productos.',
    privacyBullet5:
      'Las fotos se comprimen en tu dispositivo antes de subirlas y no se almacenan como registros del servidor.',
    privacyBullet6:
      'Con la investigación web en vivo activada, el nombre del producto (y el texto de la etiqueta) también se envía una vez a un servicio de búsqueda: primero Google Search mediante Gemini y, solo si falla, Brave Search o Firecrawl. Los pasos de progreso y el resultado indican el servicio realmente usado. No guardamos registro de las búsquedas.',
    privacyPolicyLink: 'Política de privacidad',
    termsLink: 'Términos de uso',
    designTitle: 'Cómo funciona',
    designLead:
      'Comprobación IA multiagente rápida y luego una tabla de puntuación fija — no una base de datos legal.',
    designLocalTitle: 'Qué se queda en tu dispositivo',
    designLocalBody:
      'Tras cargar la app, el historial, el idioma, el tema y las preferencias de comprobación se guardan solo en este navegador. Borra los datos del sitio o usa «Borrar datos locales».',
    designWhyTitle: 'Por qué lo hicimos así',
    designWhy1: 'Comprobaciones móviles rápidas sin crear una cuenta.',
    designWhy2: 'El historial se queda contigo: bórralo cuando quieras.',
    designWhy3:
      'La IA puede equivocarse; mostramos matices y tratamos Taiwán como un país aparte para los niveles.',
    disclaimerTitle: 'Ten en cuenta',
    disclaimerBody:
      'OriginWise es solo informativo: no es asesoramiento legal, aduanero ni sobre sanciones. La IA y las etiquetas de nivel pueden ser incompletas o incorrectas. Verifica siempre las decisiones críticas tú mismo.',
    createdBy: 'Mantenido por',
    contributionsWelcome: 'Las incidencias y pull requests son bienvenidas en GitHub.',
  },
  how: {
    title: 'Cómo funciona',
    subtitle: 'Comprobación rápida del vínculo con China — mantenerlo simple',
    aimTitle: 'Para qué sirve esta app',
    aimBody:
      'Ayudarte a ver rápido si un producto o marca parece relacionado con China: fabricado allí, vínculos de empresa, etc. No es una herramienta de investigación profunda ni una comprobación legal.',
    stepsTitle: 'En palabras simples',
    step1Title: 'Envías algo',
    step1Body: 'Un nombre de producto, una marca o una foto del envase.',
    step2Title: 'Lo buscamos con IA',
    step2Body:
      'Se ejecutan comprobaciones pequeñas: lugar del producto y empresa (juntos), luego una doble comprobación rápida. Opcional: alternativas de marca/producto con menor implicación china si las activas.',
    step3Title: 'Obtienes un resultado simple',
    step3Body:
      'Una insignia de color: Sin relación, Indirecto, Directo o Desconocido — más un breve porqué.',
    graphTitle: 'Flujo completo',
    graphHint: 'De tu entrada a la insignia de color.',
    flowYou: 'Tú (nombre / foto)',
    flowAi: 'Comprobaciones IA',
    flowProduct: 'Lugar del producto',
    flowCompany: 'Empresa',
    flowVerify: 'Doble comprobación',
    flowScore: 'Puntuación simple',
    flowResult: 'Resultado de color',
    flowAiDetail:
      'Primero lugar del producto + empresa, luego una doble comprobación rápida.',
    flowScoreDetail: 'Combinamos las respuestas en una puntuación simple.',
    badgeTitle: 'Qué significan los colores',
    badgeNone: 'Sin relación — no se encontró un vínculo claro con China',
    badgeIndirect: 'Indirecto — vínculo más débil o parcial',
    badgeDirect: 'Directo — vínculo claro (p. ej. hecho en China o sede allí)',
    badgeUnknown: 'Desconocido — no hay información suficientemente clara',
    twTitle: 'Taiwán',
    twBody:
      'Taiwán siempre cuenta aquí como su propio país. No cuenta por sí solo como «relacionado con China».',
    evidenceTitle:
      'Cuándo un país de fabricación cuenta como confirmado',
    evidenceBody:
      'Un país de fabricación aparece como confirmado de tres formas. La más fuerte: una foto de la etiqueta del envase, o una página web que muestra el mismo código de barras (JAN/EAN) junto a la indicación de origen (coincidencia de código de barras). Después, la coincidencia de modelo exacto: la respuesta de la IA y al menos una página web con la marca y el modelo exactos indican el mismo país, o dos o más de esas páginas de sitios distintos coinciden; la respuesta de la IA aparece entonces como una de las fuentes. En ambos casos, ninguna página con el modelo exacto puede indicar otro país. La respuesta de la IA por sí sola nunca confirma y queda como referencia del modelo; si las páginas con el modelo exacto no coinciden, el país queda sin confirmar con los candidatos listados. Un enlace citado por la IA solo cuenta tras una comprobación: la página (devuelta por la búsqueda web o cargada) debe mencionar el modelo exacto y el mismo país, y no puede ser una descartada como otro modelo; si no, aparece como «Citado por la IA, no verificado» y no cuenta. Una coincidencia vaga por nombre de producto solo aparece como candidato bajo «Sin confirmar», y una página con varias tallas o variantes queda sin confirmar. Si la búsqueda web en directo no está disponible, el resultado se basa solo en el conocimiento del modelo y lo indica.',
    flowWeb:
      'Búsqueda web',
    flowWebDetail:
      'Buscar páginas web por nombre de producto o código de barras y comprobar la indicación de origen.',
    privacyTitle: 'Tus datos',
    privacyBody:
      'El historial se queda en este dispositivo y las fotos no se guardan en el servidor. Con la búsqueda web en directo activada, el nombre del producto o el código de barras se envía a servicios de búsqueda. La IA puede equivocarse: comprueba siempre las decisiones importantes.',
    tryBtn: 'Probar una comprobación',
  },
  tier: {
    none: 'Sin relación',
    indirect: 'Indirecto',
    direct: 'Directo',
    unknown: 'Desconocido',
  },
} satisfies MessageTree;
