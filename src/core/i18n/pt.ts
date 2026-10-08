import type { MessageTree } from './en';

export const pt = {
  appName: 'OriginWise',
  tabs: {
    check: 'Verificar',
    history: 'Histórico',
    about: 'Acerca',
    settings: 'Definições',
    navMore: 'Menu',
  },
  common: {
    present: 'Sim',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'Não',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    back: 'Voltar',
    loading: 'A carregar…',
    optional: 'Opcional',
  },
  install: {
    aria: 'Instalar OriginWise',
    title: 'Instalar OriginWise',
    body: 'Adicione ao ecrã inicial para uma verificação rápida tipo aplicação.',
    bodyIos: 'Adicionar ao ecrã inicial para utilização em ecrã inteiro.',
    iosStep1: 'Toque',
    iosStep2: 'Partilhar e depois Adicionar ao ecrã inicial.',
    action: 'Instalar',
    dismiss: 'Fechar o aviso de instalação',
  },
  support: {
    buyMeAPint: 'Ofereça-me uma imperial',
    pintShort: 'Imperial',
    thanks: 'Se o OriginWise o ajudar, pode oferecer-me uma imperial:',
  },
  welcome: {
    title: 'Bem-vindo ao OriginWise',
    body: 'Verificação rápida: este produto ou marca está relacionado com a China? Escreva um nome ou fotografe a embalagem. A IA pode falhar — não é aconselhamento jurídico.',
    accept: 'Percebi — começar a verificar',
  },
  check: {
    identifiedAs: 'Identificado como: {name}',
    chinaLink: {
      title: 'Ligação à China',
      chinaCompany: 'Empresa chinesa',
      chinaControlled: 'Sob controlo chinês',
      hq: 'Sede',
      owner: 'Proprietário controlador',
      brandOrigin: 'Origem da marca',
      madeIn: 'Fabricado em',
      parts: 'Peças',
      china: 'China',
      unconfirmed: 'Não confirmado',
      partsChina: 'Algumas peças fabricadas na China',
      hqParentNote: 'A sede na China indicada é a da empresa-mãe',
      madeInBelow: 'O país de fabrico é decidido apenas no cartão «Fabricado em» (código de barras ou rótulo).',
      madeInChina: 'Fabricado na China',
      footnote: 'Este cartão descreve apenas onde a empresa está sediada, quem a detém e onde o produto é fabricado. Não é um juízo sobre a qualidade ou a segurança do produto nem sobre a empresa.',
      controlling: 'Controlo',
      reasonParent: 'A empresa-mãe que a controla está na China continental.',
      reasonBrandOrigin: 'Origem da marca: {place}.',
      madeInLineBarcode: 'Fabricado em: {place} (correspondência do código de barras, ver o cartão «Fabricado em» abaixo)',
      madeInLineLabel: 'Fabricado em: {place} (rótulo da embalagem, ver o cartão «Fabricado em» abaixo)',
    },
    rc: {
      modelRef: 'Referência do modelo (não confirmada)',
      modelRefHelp: 'Não confirmado por nenhuma página web nem pelo rótulo da embalagem; é apenas uma suposição do modelo. Siga o rótulo da embalagem.',
      moreInfo: 'Mais informações',
      notConfirmed: ' (não confirmado)',
      likelyNote: 'Correspondência apenas pelo nome do produto: país de fabrico não confirmado. Não o trate como confirmado.',
      candidatesTitle: 'Países de fabrico candidatos (não confirmados)',
      noCandidates: 'Não foram encontrados candidatos fiáveis.',
      noBarcodePage: 'Nenhuma página mostrou o código de barras com o país de fabrico',
      sourceCount: 'Fontes: {n}',
      sourceFirst: 'Fonte 1: {label}',
      sourceCountry: 'fabricado em {country}',
      labelSource: 'Fonte: foto do rótulo da embalagem',
      parent: 'Empresa-mãe',
      tagConfirmed: 'Confirmado',
      tagLikely: 'Provável',
      tagMentioned: 'Mencionado',
      tagUnconfirmed: 'Não confirmado',
      foldSources: 'Todas as fontes',
      foldAlts: 'Marcas alternativas',
      foldAi: 'Detalhes de IA / pesquisa',
      expand: 'Mostrar',
      collapse: 'Ocultar',
    },
    matchBasis: {
      barcode: 'Correspondência pelo código de barras',
      name: 'Correspondência pelo nome do produto',
      label: 'Segundo o rótulo da embalagem',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Pesquisa web — consulta enviada para {name}',
    searchUsage: 'Pesquisa web: {provider} · pedidos de pesquisa: {n}',
    knowledgeWebVia:
      'Inclui uma passagem de pesquisa web em direto ({provider}) mais o conhecimento do modelo. Continua a não ser um registo comercial nem uma base aduaneira — rótulos e documentos oficiais podem discordar das páginas web. Informativo — não é aconselhamento jurídico, comercial ou sobre sanções.',
    title: 'Verificação rápida',
    subtitle: 'Este artigo está relacionado com a China? Escreva um nome ou fotografe a embalagem.',
    placeholder: 'ex. marca de snacks, telemóvel, brinquedo…',
    placeholderWithPhoto: 'Opcional: que produto é este?',
    photo: 'Câmara',
    gallery: 'Galeria',
    removePhoto: 'Remover foto',
    photoLabelHint: 'Lemos o rótulo se o texto estiver nítido',
    noteOptional: 'Nota opcional',
    submit: 'Verificar agora',
    submitting: 'A verificar…',
    needInput: 'Escreva um nome de produto ou adicione uma foto.',
    howLink: 'Como funciona',
    newCheck: 'Nova verificação',
    comingSoon:
      'A API de verificação chega num PR posterior. Histórico e definições já estão prontos.',
    photoTooLarge: 'A foto continua demasiado grande após a compressão.',
    photoInvalid: 'Não foi possível ler essa imagem.',
    dropPhoto: 'Largue a foto aqui',
    unnamedPhoto: '(foto)',
    partsTitle: 'Peças, reservas e ingredientes',
    partsHint:
      'Isolado deste produto — componentes, peças de reserva ou ingredientes principais e se parecem ligados à China.',
    partKind: {
      part: 'Peça',
      spare: 'Reserva',
      ingredient: 'Ingrediente',
      component: 'Componente',
    },
    progressHint: 'A analisar origem e empresa…',
    stepMonolith: 'A recolher sinais de produto e empresa',
    answeredBy: 'Resposta principal via {name}',
    agentsUsed: '{n} agentes',
    agentsTitle: 'Pool de IA usado',
    agentsSummary: '{total} chamadas · {ok} ok · {fail} falhadas',
    agentsHint:
      'Cada linha é uma chamada de IA do servidor gratuito. Falhas costumam ser quota, acesso ao modelo ou tempo esgotado; tentamos outros ou uma alternativa. A web em direto precisa de Gemini Search grounding (não é o mesmo que RPM de texto).',
    agentOk: 'OK',
    agentFail: 'Falhou ({err})',
    agentSkipped: 'Ignorado ({err})',
    agentFailUnknown: 'erro',
    agentError: {
      upstream_quota: 'quota / limite de ritmo',
      upstream_credits: 'crédito de IA esgotado',
      upstream_error: 'erro a montante',
      upstream_unavailable: 'serviço indisponível',
      empty_response: 'resposta vazia',
      model_unavailable: 'modelo indisponível nesta chave API',
      search_grounding_unavailable:
        'Google Search grounding indisponível nesta chave (experimente modelos do pool predefinido / ative a faturação; Gemini 3 Search é muitas vezes 0/0)',
      disabled: 'desativado',
      gemini_not_configured: 'Gemini não configurado',
      no_entity: 'sem nome de produto',
    },
    agent: {
      identify: 'Ler rótulo / nome',
      product: 'Local do produto',
      company: 'Ligações da empresa',
      verify: 'Confirmação',
      alternatives: 'Alternativas com menor ligação CN',
      monolith: 'Verificação completa (uma chamada)',
      dual_core: 'Produto + empresa',
      dual_alts: 'Alternativas com menor ligação CN',
      unknownProvider: 'IA desconhecida',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Porque este nível',
    reason: {
      made_in_cn: 'O produto é fabricado na China continental.',
      made_in_cn_detail: 'O produto é fabricado em {place}.',
      origin_cn: 'A origem do produto está ligada à China continental.',
      origin_cn_detail: 'A origem do produto está indicada como {place}.',
      manufacturer_cn: 'O fabricante está ligado à China continental.',
      manufacturer_cn_detail: 'Local/ligação do fabricante: {place}.',
      hq_cn: 'A sede da empresa está na China continental.',
      hq_cn_detail: 'A sede da empresa está em {place}.',
      parent_majority_cn:
        'Uma empresa-mãe maioritária/controladora está ligada à China continental.',
      ownership_strong_cn:
        'Foram reportadas ligações fortes de propriedade ou controlo com a China continental.',
      ownership_weak_cn:
        'Foram reportadas ligações mais fracas (p. ex. participação minoritária, fornecimento ou retalho) com a China continental.',
      component_cn:
        'Alguns componentes ou a montagem estão ligados à China continental, sem uma afirmação completa de «fabricado na China».',
      explicit_non_cn_geo:
        'Sinais de local claros apontam para fora da China continental (para o âmbito desta ferramenta).',
      explicit_non_cn_geo_detail:
        'Sinais de local claros fora da China continental: {places}.',
      verify_conflict:
        'Os sinais de produto e empresa não coincidiram totalmente (a verificação cruzada encontrou conflitos).',
      conflict_no_strong:
        'Os sinais conflitavam e não havia uma ligação forte à China continental — resultado deixado incerto.',
      insufficient:
        'Não há informação fiável suficiente de origem ou propriedade para julgar ligações à China.',
      ownership_not_assessed:
        'A propriedade da empresa não foi totalmente avaliada nesta verificação.',
      taiwan_as_country:
        'Taiwan é tratado como um país separado e não conta como «relacionado com a China» para esta pontuação.',
      taiwan_as_country_detail:
        'Taiwan é tratado como um país separado (visto em: {places}) e não conta como «relacionado com a China» para esta pontuação.',
    },
    caveats: 'Ressalvas',
    disclaimer:
      'Apenas informativo — conhecimento do modelo e pesquisa web opcional, não aconselhamento jurídico ou sobre sanções. A IA pode falhar.',
    knowledgeModel:
      'Baseado apenas no conhecimento geral do modelo (sem pesquisa web em direto). A origem da marca, as fábricas de componentes e a montagem final/país de origem podem diferir por SKU/mercado — dê prioridade aos rótulos. Não é um registo comercial nem uma base aduaneira. Informativo — não é aconselhamento jurídico, comercial ou sobre sanções.',
    knowledgeWeb:
      'Inclui uma passagem de pesquisa web em direto (Google Search via grounding Gemini) mais o conhecimento do modelo. Continua a não ser um registo comercial nem uma base aduaneira — rótulos e documentos oficiais podem discordar das páginas web. Informativo — não é aconselhamento jurídico, comercial ou sobre sanções.',
    providerNotConfigured:
      'A verificação IA não está configurada. Adicione uma chave em .dev.vars e execute `npm run pages:dev` (ver README).',
    rateLimited:
      'Limite do servidor gratuito: 1 verificação a cada 30 segundos. Aguarde um pouco.',
    rateLimitedDay:
      'Limite do servidor gratuito: máx. 10 verificações por 6 horas. Tente mais tarde.',
    rateLimitBadge: 'Limite do servidor gratuito',
    rateLimitFreeNote:
      'Servidor gratuito · 1 verificação / 30 s · máx. 10 / 6 horas · 1 de cada vez',
    rateLimitRpmTitle: 'Limite de ritmo do servidor gratuito (30 s)',
    rateLimitedLongTitle: 'Limite de 6 horas do servidor gratuito',
    rateLimitInflightTitle: 'Já há uma verificação em curso',
    rateLimitShortDetail:
      'Limite do servidor gratuito: {n} verificação(ões) a cada {w} s. Aguarde cerca de {s} s e tente novamente.',
    rateLimitLongDetail:
      'Limite do servidor gratuito: {n} verificações por {h} horas. Tente daqui a cerca de {m} minutos.',
    rateLimitMinuteDetail:
      'Limite do servidor gratuito: {n} verificação(ões) a cada {w} s. Aguarde cerca de {s} s e tente novamente.',
    rateLimitDayDetail:
      'Limite do servidor gratuito: {n} verificações por {h} horas. Tente mais tarde.',
    rateLimitInflightDetail:
      'O servidor gratuito só permite 1 verificação de cada vez. Aguarde que a atual termine.',
    rateLimitAutoIn: 'Automático em {s} s…',
    rateLimitAutoHint:
      'Será enviado automaticamente em {s} s quando a janela do servidor gratuito abrir.',
    rateLimitAutoStop: 'Parar',
    rateLimitAutoCancelled:
      'Envio automático cancelado. Pode tentar novamente quando estiver pronto.',
    forbiddenOrigin: 'Pedido não permitido a partir desta origem.',
    badRequest: 'Pedido inválido.',
    parseError: 'Não foi possível compreender a resposta. Tente novamente.',
    upstreamError: 'O serviço de resposta falhou. Tente mais tarde.',
    upstreamQuota: 'O serviço de resposta está ocupado. Tente mais tarde.',
    upstreamUnavailable: 'O serviço de resposta está temporariamente indisponível.',
    emptyResponse: 'Nenhuma resposta foi devolvida. Tente novamente.',
    serverError: 'Algo correu mal. Tente novamente.',
    forceRefresh: 'Verificar de novo (ignorar cache)',
    forceRefreshHint:
      'Esta resposta estava em cache. Verificar de novo corre uma passagem IA nova (continua a contar para os limites do servidor gratuito).',
    cached: 'cache',
    degraded: 'resultado parcial',
    relationLabel: 'Relação com a China',
    confidence: '{n}% de confiança',
    productFacts: 'Produto',
    companyFacts: 'Empresa',
    brand: 'Marca',
    madeIn: 'Fabricado em (esta unidade / país de origem final)',
    madeInUnconfirmed: 'País de origem final não confirmado — ver componentes / linha global',
    originLayersTitle: 'Camadas de origem',
    originLayersIntro:
      'Separa marca/ops, propriedade, COO final e peças — propriedade não é made-in.',
    layerBrandOps: 'Marca / ops',
    layerOwnership: 'Propriedade / empresas-mãe',
    layerOwnershipHint: 'Não é COO final / made-in',
    layerOwnershipEmpty: 'Sem sinal de propriedade/empresa-mãe neste resultado',
    layerFinalCoo: 'COO final',
    layerParts: 'Candidatos de peças',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'Quota de pesquisa de IA esgotada — não há informação mais precisa de momento. Volte a verificar após a reposição diária.',
    aiCreditsUsedUp:
      'O crédito do serviço de IA esgotou-se temporariamente — não há informação mais precisa de momento. Tente novamente mais tarde.',
    srv: {
      partOmittedNoEvidence:
        'País da peça omitido: sem provas de pesquisa/rótulo (a sede da marca não é a origem de uma peça).',
      partOmittedUnconfirmed:
        'País da peça omitido: não confirmado por pesquisa/rótulo para esta peça.',
      madeInOmittedBrand:
        'País de fabrico omitido: correspondia apenas ao país da marca/design, sem provas de fábrica ou origem.',
      madeInOmittedOwnership:
        'País de fabrico omitido: a China vem apenas de dados de propriedade/empresa-mãe, não do produto, do rótulo ou de um retalhista.',
      cooUnconfirmedSeeParts:
        'Origem final não confirmada – veja a linha de componentes/produção global ou as peças para candidatos (fabrico não confirmado).',
      cooUnconfirmedNoLabel:
        'Origem final não confirmada – sem país de origem no produto/rótulo; nenhum é inventado.',
      cooUnconfirmedNoBarcode:
        'Origem final não confirmada – nenhuma página web mostrava o código de barras/JAN com um país de fabrico; correspondências por nome são apenas candidatos prováveis.',
      cooUnconfirmedCandidates:
        'Origem final não confirmada – os candidatos abaixo são sinais de pesquisa, não um «Fabricado em» impresso.',
      distributorOmitted:
        'Distribuidor local / agente de mercado omitido das empresas-mãe (não é proprietário legal).',
      chinaLinkUnclear:
        'Ligação à China pouco clara – não considere como confirmado sem China.',
      verifyConflict:
        'A verificação detetou sinais contraditórios',
      companyNotAssessed:
        'Dados de empresa/propriedade não avaliados',
      taiwanSeparate:
        'Taiwan é tratado como país distinto para os níveis de relação',
      webUnavailableLabel:
        'Pesquisa web em direto indisponível – os países das peças vêm da foto do rótulo, não da pesquisa.',
      altsAim:
        'As marcas/produtos alternativos visam menor envolvimento da China (não apenas semelhança). Os níveis são estimativas; a sede por si só não prova fabrico fora da China.',
      altsNone:
        'Não foram encontradas alternativas com menor envolvimento da China com certeza suficiente.',
      sumCooUnconfirmed:
        'Origem final não confirmada',
      tierUnknown:
        'Provas insuficientes para avaliar ligações à China.',
      tierNone:
        'Não foram encontradas ligações à China nos sinais disponíveis.',
      tierDirect:
        'Encontrados sinais de ligação direta à China.',
      tierIndirect:
        'Encontrados sinais de ligação indireta à China.',
      cooConflictChina:
        'Origem final não confirmada – o sinal de {source} ({label}) contradiz «Fabricado na China»; propriedade/empresa-mãe por si só não define o país de fabrico.',
      cooConflictMadeIn:
        'Origem final não confirmada – o sinal de {source} ({label}) contradiz o fabrico em {madeIn}; mantido apenas como candidato.',
      candidate:
        '{label} ({rating}, {pct}%, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Os modelos de pesquisa em direto não estavam disponíveis com esta chave API – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_search_grounding_unavailable:
        'A pesquisa Google em direto não estava disponível com esta chave API – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_upstream_credits:
        'Créditos do serviço de IA esgotados (saldo pré-pago vazio) – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_upstream_quota:
        'Quota diária gratuita da pesquisa Google esgotada – tente após a reposição diária – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_upstream_unavailable:
        'A pesquisa web em direto excedeu o tempo ou o serviço estava sobrecarregado – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_empty_response:
        'A pesquisa web em direto devolveu uma resposta vazia – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_disabled:
        'A pesquisa web em direto estava desativada para esta verificação – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_gemini_not_configured:
        'O Gemini não está configurado para pesquisa web em direto – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_no_entity:
        'Sem nome de produto para a pesquisa web em direto – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      webFail_default:
        'Sem pesquisa web em direto para esta verificação – os países de fabrico e das peças são mais prudentes (apenas conhecimento do modelo).',
      sum: {
        madeIn: 'Fabricado em: {value}',
        candidates: 'Candidatos: {value}',
        brandOrigin: 'Origem da marca: {value}',
        components: 'Componentes/produção global: {value}',
        parts: 'Peças: {value}',
        hq: 'Sede: {value}',
        company: 'Empresa: {value}',
      },
      signal: {
        ocr: 'rótulo',
        retailer: 'retalhista',
        manufacturer: 'fabricante',
        ownership: 'propriedade',
        unknown: 'desconhecido',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Guardar imagem',
    sectionShareShare: 'Partilhar',
    sectionShareSaved: 'Guardado',
    sectionShareFailed: 'Não foi possível guardar a imagem',
    sectionShareHint: 'Passe o rato numa camada para guardar ou partilhar',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'página web (correspondência do nome)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'propriedade / mãe',
    },
    origin: 'Origem',
    brandOrigin: 'Origem da marca',
    componentsOrigin: 'Componentes / linha global',
    productNotes: 'Notas de origem',
    manufacturer: 'Fabricante',
    company: 'Empresa',
    hq: 'Sede',
    parents: 'Empresas-mãe',
    graphTitle: 'Grafo de relações',
    graphHint:
      'As setas mostram como o produto, a empresa, as empresas-mãe e os locais se ligam. Expanda ou faça zoom se os rótulos estiverem apertados.',
    graphControls: 'Controlos do grafo',
    graphZoomIn: 'Aproximar',
    graphZoomOut: 'Afastar',
    graphExpand: 'Expandir',
    graphCollapse: 'Recolher',
    graphRelations: 'Relações',
    graphNoEdges: 'Não foram inferidas ligações de relação para este resultado.',
    graphLink: 'relacionado',
    graphChinaLinked: 'Ligado à China',
    graphLegendCn: 'Nó/aresta ligado à China',
    graphLegendOther: 'Outro',
    graphEdge: {
      brand: 'marca',
      brand_company: 'marca',
      'brand/company': 'marca',
      made_in: 'fabricado em',
      hq: 'sede',
      parent: 'empresa-mãe',
      majority: 'acionista maioritário',
      wholly: 'detido a 100%',
      minority: 'participação minoritária',
      ownership: 'propriedade',
      affiliation: 'marca',
      manufacturing: 'fabricado em',
      part: 'peça',
      spare: 'reserva',
      ingredient: 'ingrediente',
      component: 'componente',
    },
    regionsTitle: 'Regiões',
    altBrands: 'Marcas com menor envolvimento chinês (estimado)',
    altProducts: 'Produtos com menor envolvimento chinês (estimado)',
    altDisclaimer:
      'Apenas substitutos estimados como não Directamente ligados à China (sem preenchimento «fabricado na China»). Uma sede nos EUA/UE por si só não prova fabrico fora da China. Fabrico pouco claro é Desconhecido, não Sem relação.',
    estimated: 'est.',
    twNote:
      'Taiwan é tratado como um país separado e nunca como relacionado com a China para os níveis.',
    region: {
      CN: 'China continental',
      HK: 'Hong Kong',
      TW: 'Taiwan',
      MO: 'Macau',
      OTHER: 'Outro',
      UNKNOWN: 'Desconhecido',
    },
    steps: {
      start: 'A iniciar',
      cache: 'Cache',
      identify: 'A ler o rótulo',
      web: 'Pesquisa web',
      monolith: 'Análise completa',
      dual_core: 'Produto e empresa',
      product: 'Origem do produto',
      company: 'Ligações da empresa',
      verify: 'Verificação cruzada',
      alternatives: 'Alternativas com menor ligação CN',
      synthesize: 'Pontuação',
    },
  },
  history: {
    title: 'Histórico',
    subtitle: 'Verificações anteriores neste dispositivo',
    empty: 'Ainda não há verificações anteriores.',
    withPhoto: 'Foto',
    open: 'Abrir',
    remove: 'Remover',
  },
  settings: {
    title: 'Definições',
    subtitle: 'Preferências e dados neste dispositivo',
    panelDisplay: 'Idioma e tema',
    panelCheck: 'O que verificar',
    panelData: 'Eliminar dados',
    language: 'Idioma',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Escuro',
    geoScope: 'Âmbito da China para os níveis',
    geoScopeHint:
      'Taiwan é sempre tratado como um país separado e nunca determina os níveis de relação com a China. Apenas RPC usa a China continental. A Grande China pode incluir Hong Kong e Macau (não Taiwan).',
    geoScopePrc: 'Apenas RPC / continental (predefinição)',
    geoScopeGreater: 'CN + Hong Kong + Macau (não Taiwan)',
    dimensions: 'O que verificar',
    dimensionsHint:
      'As alternativas com menor envolvimento chinês estão desligadas por predefinição. Ative alternativas de marca ou produto se quiser substitutos com menos ligação à China (usa uma chamada IA extra).',
    dimOrigin: 'Local de origem',
    dimManufacturer: 'Origem do fabricante',
    dimCompany: 'Relações da empresa',
    dimAltBrands: 'Alternativas de marca com menor envolvimento chinês',
    dimAltProducts: 'Alternativas de produto com menor envolvimento chinês',
    howItWorks: 'Como funciona',
    about: 'Acerca do OriginWise',
    version: 'Versão {v}',
    cleanData: 'Eliminar dados locais',
    cleanDataHint:
      'Os dados ficam apenas neste browser. Escolha o que remover. Não pode ser anulado.',
    dataSummary: 'Neste dispositivo',
    dataNone: 'Nenhum dado OriginWise armazenado.',
    dataHistory: 'Verificações anteriores: {n}',
    dataSettings: 'Definições personalizadas',
    dataDisclaimer: 'Aviso aceite',
    cleanAll: 'Tudo',
    cleanHistory: 'Apenas verificações anteriores',
    cleanSettings: 'Apenas definições',
    cleanConfirm: 'Eliminar os dados selecionados?',
    cleanConfirmBtn: 'Eliminar agora',
    cleanDoneAll: 'Todos os dados locais OriginWise foram eliminados.',
    cleanDoneHistory: 'Verificações anteriores eliminadas.',
    cleanDoneSettings: 'Definições repostas para os valores predefinidos.',
  },
  about: {
    title: 'Acerca',
    tagline: 'Uma verificação simples de produtos relacionados com a China',
    intro:
      'O OriginWise ajuda-o a ver rapidamente se um produto ou marca parece relacionado com a China — local de origem, fabricante e ligações da empresa — com alternativas opcionais de menor envolvimento. As verificações ficam neste dispositivo.',
    body: 'O OriginWise é uma ferramenta simples para uma verificação rápida da relação com a China em produtos e marcas do dia a dia. A IA pode ser incompleta ou errada.',
    privacy: 'Sem conta. O histórico fica neste telemóvel/browser.',
    license: 'Licença MIT',
    licenseShort: 'MIT',
    openSourceTitle: 'Código aberto · MIT',
    openSourceBody:
      'Este projeto é software livre sob a licença MIT. Pode usá-lo, copiá-lo, modificá-lo, fundi-lo, publicá-lo, distribuí-lo e sublicenciá-lo — inclusive no seu próprio deployment com as suas chaves API.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Fornecido «tal como está», sem garantia. Consulte o texto completo da licença no GitHub.',
    linkSource: 'Código-fonte',
    linkLicense: 'Licença MIT',
    linkIssues: 'Problemas e feedback',
    linkReleases: 'Lançamentos',
    linkSecurity: 'Política de segurança',
    privacyTitle: 'A sua privacidade',
    privacyLead:
      'Mantemos as coisas simples: sem conta, e o histórico de verificações fica no seu telemóvel ou computador.',
    privacyBullet1:
      'Verificações anteriores, definições e preferências são guardadas apenas neste browser, no seu dispositivo.',
    privacyBullet2: 'Não há início de sessão nem cópia na nuvem do seu diário de verificações.',
    privacyBullet3:
      'Pode apagar tudo a qualquer momento com «Eliminar dados locais» nas Definições.',
    privacyBullet4:
      'Quando corre uma verificação, o nome ou a foto é enviado apenas para essa resposta. Não guardamos embalagens como catálogo de produtos.',
    privacyBullet5:
      'As fotos são comprimidas no seu dispositivo antes do envio e não são armazenadas como registos do servidor.',
    privacyBullet6:
      'Com a pesquisa web em direto ativa, o nome do produto (e o texto do rótulo) também é enviado uma vez a um serviço de pesquisa: primeiro Google Search via Gemini e, só se falhar, Brave Search ou Firecrawl. Os passos de progresso e o resultado indicam o serviço realmente usado. Não guardamos registo das pesquisas.',
    privacyPolicyLink: 'Política de privacidade',
    termsLink: 'Termos de utilização',
    designTitle: 'Como funciona',
    designLead:
      'Verificação IA multiagente rápida e depois uma tabela de pontuação fixa — não uma base de dados jurídica.',
    designLocalTitle: 'O que fica no seu dispositivo',
    designLocalBody:
      'Depois de carregar a app, o histórico, o idioma, o tema e as preferências de verificação são guardados apenas neste browser. Limpe os dados do sítio ou use «Eliminar dados locais».',
    designWhyTitle: 'Porque o fizemos assim',
    designWhy1: 'Verificações móveis rápidas sem criar uma conta.',
    designWhy2: 'O histórico fica consigo — apague-o quando quiser.',
    designWhy3:
      'A IA pode falhar; mostramos ressalvas e tratamos Taiwan como um país separado para os níveis.',
    disclaimerTitle: 'Atenção',
    disclaimerBody:
      'O OriginWise é apenas informativo — não é aconselhamento jurídico, aduaneiro ou sobre sanções. A IA e os rótulos de nível podem ser incompletos ou errados. Verifique sempre as decisões críticas por si.',
    createdBy: 'Mantido por',
    contributionsWelcome: 'Issues e pull requests são bem-vindos no GitHub.',
  },
  how: {
    title: 'Como funciona',
    subtitle: 'Verificação rápida da relação com a China — manter simples',
    aimTitle: 'Para que serve esta aplicação',
    aimBody:
      'Ajudá-lo a ver rapidamente se um produto ou marca parece relacionado com a China — fabricado lá, ligações da empresa, etc. Não é uma ferramenta de pesquisa profunda nem uma verificação jurídica.',
    stepsTitle: 'Em palavras simples',
    step1Title: 'Envia alguma coisa',
    step1Body: 'Um nome de produto, uma marca ou uma foto da embalagem.',
    step2Title: 'Procuramos com IA',
    step2Body:
      'Correm verificações pequenas: local do produto e empresa (juntos), depois uma confirmação rápida. Opcional: alternativas de marca/produto com menor envolvimento chinês se as ativar.',
    step3Title: 'Obtém um resultado simples',
    step3Body:
      'Um distintivo colorido: Sem relação, Indireto, Direto ou Desconhecido — mais um breve porquê.',
    graphTitle: 'Fluxo completo',
    graphHint: 'Da sua entrada ao distintivo colorido.',
    flowYou: 'Você (nome / foto)',
    flowAi: 'Verificações IA',
    flowProduct: 'Local do produto',
    flowCompany: 'Empresa',
    flowVerify: 'Confirmação',
    flowScore: 'Pontuação simples',
    flowResult: 'Resultado a cores',
    flowAiDetail:
      'Primeiro local do produto + empresa, depois uma confirmação rápida.',
    flowScoreDetail: 'Combinamos as respostas numa pontuação simples.',
    badgeTitle: 'O que as cores significam',
    badgeNone: 'Sem relação — nenhum vínculo claro com a China encontrado',
    badgeIndirect: 'Indireto — vínculo mais fraco ou parcial',
    badgeDirect: 'Direto — vínculo claro (p. ex. fabricado na China ou sede lá)',
    badgeUnknown: 'Desconhecido — informação pouco clara',
    twTitle: 'Taiwan',
    twBody:
      'Taiwan conta sempre aqui como o seu próprio país. Não conta por si só como «relacionado com a China».',
    evidenceTitle:
      'Quando um país de fabrico conta como confirmado',
    evidenceBody:
      'Um país de fabrico só aparece como confirmado (correspondência do código de barras) se vier de uma foto do rótulo da embalagem, ou se uma página web mostrar o mesmo código de barras (JAN/EAN) junto à indicação de origem. Uma correspondência apenas pelo nome do produto é, no máximo, «provável» (correspondência do nome), e uma página com vários tamanhos ou variantes fica por confirmar. Se a pesquisa web em tempo real não estiver disponível, o resultado baseia-se apenas no conhecimento do modelo e indica-o.',
    flowWeb:
      'Pesquisa web',
    flowWebDetail:
      'Pesquisar páginas web pelo nome do produto ou código de barras e verificar a indicação de origem.',
    privacyTitle: 'Os seus dados',
    privacyBody:
      'O histórico fica neste dispositivo e as fotos não são guardadas no servidor. Com a pesquisa web em tempo real ativada, o nome do produto ou o código de barras é enviado a serviços de pesquisa. A IA pode errar — confirme sempre as decisões importantes.',
    tryBtn: 'Experimentar uma verificação',
  },
  tier: {
    none: 'Sem relação',
    indirect: 'Indireto',
    direct: 'Direto',
    unknown: 'Desconhecido',
  },
} satisfies MessageTree;
