import type { MessageTree } from './en';

export const zhHant = {
  appName: 'OriginWise',
  tabs: {
    check: '查詢',
    history: '紀錄',
    about: '關於',
    settings: '設定',
    navMore: '選單',
  },
  common: {
    present: '有',
    /** Separator after a short label (full-width in CJK). */
    labelSep: '：',
    missing: '無',
    cancel: '取消',
    confirm: '確認',
    delete: '刪除',
    back: '返回',
    loading: '載入中…',
    optional: '選填',
  },
  install: {
    aria: '安裝 OriginWise',
    title: '安裝 OriginWise',
    body: '加到主畫面，之後像 App 一樣快速查。',
    bodyIos: '加到主畫面可全螢幕使用。',
    iosStep1: '點',
    iosStep2: '分享，再選「加入主畫面」。',
    action: '安裝',
    dismiss: '關閉安裝提示',
  },
  support: {
    buyMeAPint: '請我喝一杯',
    pintShort: '請杯',
    thanks: '若 OriginWise 對你有幫助，歡迎請我喝一杯：',
  },
  welcome: {
    title: '歡迎使用 OriginWise',
    body: '快速查：這項產品／品牌是否與中國相關？輸入名稱或拍包裝即可。AI 可能出錯——非法律建議。',
    accept: '知道了 — 開始查',
  },
  check: {
    matchBasis: {
      barcode: '依條碼比對',
      name: '依品名比對',
    },
    searchVia: {
      gemini: 'Google 搜尋（Gemini）',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: '網路搜尋：查詢已傳送至 {name}',
    searchUsage: '網路搜尋：{provider}・共 {n} 次搜尋請求',
    knowledgeWebVia:
      '結果結合經 {provider} 取得的即時網路資料與模型知識，並非公司登記或關務資料庫；實際包裝標示及官方文件可能與網頁內容不同。僅供參考，不構成法律、貿易或制裁方面的建議。',
    title: '快速查',
    subtitle: '這項商品是否與中國相關？輸入名稱，或拍包裝。',
    placeholder: '例如：零食品牌、手機、玩具…',
    placeholderWithPhoto: '可選：這是什麼產品？',
    photo: '相機',
    gallery: '相簿',
    removePhoto: '移除照片',
    photoLabelHint: '包裝文字清楚時會讀取標籤',
    noteOptional: '補充說明（選填）',
    submit: '立即查詢',
    submitting: '查詢中…',
    needInput: '請輸入產品名稱或加入照片。',
    howLink: '如何運作',
    newCheck: '新查詢',
    comingSoon: '查詢 API 將於後續版本提供。紀錄與設定已可用。',
    photoTooLarge: '壓縮後照片仍過大。',
    photoInvalid: '無法讀取此圖片。',
    dropPhoto: '將照片拖放到這裡',
    unnamedPhoto: '（照片）',
    partsTitle: '零件、備件與食材',
    partsHint: '由本產品自動拆出：主要零件、備件或食材，以及是否看起來與中國相關。',
    partKind: {
      part: '零件',
      spare: '備件',
      ingredient: '食材',
      component: '元件',
    },
    progressHint: '正在分析產地與公司資訊…',
    stepMonolith: '收集產品與公司訊號',
    answeredBy: '主要回答：{name}',
    agentsUsed: '{n} 個代理',
    agentsTitle: '使用的 AI 池',
    agentsSummary: '共 {total} 次呼叫 · 成功 {ok} · 失敗 {fail}',
    agentsHint:
      '每一列是一次免費伺服器 AI 呼叫。失敗多半是配額、模型權限或逾時；我們會再試其他模型。即時網路搜尋需使用 Google 搜尋（Gemini）的額度，與一般文字額度分開計算。',
    agentOk: '成功',
    agentFail: '失敗（{err}）',
    agentSkipped: '略過（{err}）',
    agentFailUnknown: '錯誤',
    agentError: {
      upstream_quota: '配額／速率限制',
      upstream_credits: 'AI 服務額度用盡',
      upstream_error: '上游錯誤',
      upstream_unavailable: '逾時／服務暫時不可用',
      empty_response: '網路搜尋空回應',
      model_unavailable: '此 API 金鑰無法使用該模型',
      search_grounding_unavailable:
        'Google 搜尋（Gemini）暫時無法使用，改用模型知識',
      disabled: '已關閉',
      gemini_not_configured: '未設定 Gemini',
      no_entity: '無產品名稱',
    },
    agent: {
      identify: '讀取名稱／標籤',
      product: '產品產地',
      company: '公司關聯',
      verify: '交叉比對',
      alternatives: '較低中國關聯替代',
      monolith: '完整查詢（單次）',
      dual_core: '產品 + 公司',
      dual_alts: '較低中國關聯替代',
      unknownProvider: '未知 AI',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok（xAI）',
      claude: 'Claude',
    },
    reasons: '分級依據',
    reason: {
      made_in_cn: '產品在中國大陸製造／生產。',
      made_in_cn_detail: '產品製造／生產地為：{place}。',
      origin_cn: '產品來源與中國大陸有關。',
      origin_cn_detail: '產品來源標示為：{place}。',
      manufacturer_cn: '製造商與中國大陸有關。',
      manufacturer_cn_detail: '製造商地點／關聯：{place}。',
      hq_cn: '公司總部位於中國大陸。',
      hq_cn_detail: '公司總部位於：{place}。',
      parent_majority_cn: '具有控股／多數控制權的母公司與中國大陸有關。',
      ownership_strong_cn: '報告中有較強的中國大陸股權或控制關聯。',
      ownership_weak_cn:
        '報告中有較弱的關聯（例如少數股權、供應或零售）與中國大陸有關。',
      component_cn:
        '部分零件或組裝與中國大陸有關，但未構成完整「中國製造」主張。',
      explicit_non_cn_geo:
        '有明確地點訊號指向中國大陸以外（依本工具的範圍設定）。',
      explicit_non_cn_geo_detail:
        '明確地點訊號在中國大陸以外：{places}。',
      verify_conflict: '產品與公司訊號不完全一致（交叉比對發現衝突）。',
      conflict_no_strong:
        '訊號互相衝突，且沒有強烈的中國大陸關聯，因此結果標為不確定。',
      insufficient: '產地或所有權資訊不足，無法判斷是否與中國相關。',
      ownership_not_assessed: '本次查詢未完整評估公司所有權。',
      taiwan_as_country:
        '在中國關聯分級中，台灣與中國分開計算。',
      taiwan_as_country_detail:
        '在中國關聯分級中，台灣與中國分開計算（出現於：{places}）。',
    },
    caveats: '注意事項',
    disclaimer:
      '僅供參考——依模型知識與（若啟用）即時網路搜尋，非法律或制裁建議。AI 可能錯誤。',
    knowledgeModel:
      '僅依一般模型知識（未進行即時網路搜尋）。品牌來源地、零件工廠與最終組裝地可能因型號或市場而異，請以包裝標示為準。並非公司登記或關務資料庫。僅供參考，不構成法律、貿易或制裁方面的建議。',
    knowledgeWeb:
      '結果結合經 Google 搜尋（Gemini）取得的即時網路資料與模型知識，並非公司登記或關務資料庫；實際包裝標示及官方文件可能與網頁內容不同。僅供參考，不構成法律、貿易或制裁方面的建議。',
    providerNotConfigured:
      '尚未設定 AI。請在 .dev.vars 加入金鑰，並執行 `npm run pages:dev`（見 README）。',
    rateLimited: '已達免費伺服器限制：每 30 秒 1 次。請稍候。',
    rateLimitedDay: '已達免費伺服器限制：每 6 小時最多 10 次。請稍後再試。',
    rateLimitBadge: '免費伺服器限制',
    rateLimitFreeNote: '免費伺服器 · 每 30 秒 1 次 · 每 6 小時最多 10 次 · 同時 1 次',
    rateLimitRpmTitle: '免費伺服器速率限制（30 秒）',
    rateLimitedLongTitle: '免費伺服器 6 小時上限',
    rateLimitInflightTitle: '已有查詢進行中',
    rateLimitShortDetail:
      '免費伺服器限制：每 {w} 秒 {n} 次。請約 {s} 秒後再試。',
    rateLimitLongDetail:
      '免費伺服器限制：每 {h} 小時 {n} 次。請約 {m} 分鐘後再試。',
    rateLimitMinuteDetail:
      '免費伺服器限制：每 {w} 秒 {n} 次。請約 {s} 秒後再試。',
    rateLimitDayDetail:
      '免費伺服器限制：每 {h} 小時 {n} 次。請稍後再試。',
    rateLimitInflightDetail:
      '免費伺服器同時只能進行 1 次查詢。請等目前查詢完成。',
    rateLimitAutoIn: '{s} 秒後自動送出…',
    rateLimitAutoHint: '免費伺服器時段開放後，將於 {s} 秒後自動送出。',
    rateLimitAutoStop: '停止',
    rateLimitAutoCancelled: '已取消自動送出。準備好後可再試。',
    forbiddenOrigin: '此來源不允許請求。',
    badRequest: '請求無效。',
    parseError: '無法解析回覆，請再試一次。',
    upstreamError: '回答服務失敗，請稍後再試。',
    upstreamQuota: '回答服務忙碌，請稍後再試。',
    upstreamUnavailable: '回答服務暫時無法使用。',
    emptyResponse: '未取得回覆，請再試一次。',
    serverError: '發生錯誤，請再試一次。',
    forceRefresh: '重新查詢（略過快取）',
    forceRefreshHint:
      '此結果來自快取。重新查詢會再跑一次 AI（仍計入免費伺服器限制）。',
    cached: '快取',
    degraded: '部分結果',
    relationLabel: '中國相關',
    confidence: '信心 {n}%',
    productFacts: '產品',
    companyFacts: '公司',
    brand: '品牌',
    madeIn: '產地（本機／最終原產地）',
    madeInUnconfirmed: '未確認最終產地——請參考零件／全球產線候選（並非已確認的產地標示）',
    originLayersTitle: '產地分層',
    originLayersIntro:
      '分開顯示品牌／營運、所有權、最終產地與零件。',
    layerBrandOps: '品牌／營運',
    layerOwnership: '所有權／母公司',
    layerOwnershipHint: '並非最終產地／中國製',
    layerOwnershipEmpty: '此結果沒有所有權／母公司訊號',
    layerFinalCoo: '最終原產地（COO）',
    layerParts: '零件候選',
    partsModelOnlyBanner:
      '零件產地為模型推測，非包裝／Search 確認。',
    searchQuotaUsedUp:
      'AI 搜尋額度已用盡，暫時未能提供更準確的資訊，請於每日額度重設後再查詢。',
    aiCreditsUsedUp:
      'AI 服務額度暫時用盡，未能提供更準確的資訊，請稍後再查詢。',
    srv: {
      partOmittedNoEvidence:
        '未列出零件產地：搜尋或標籤上沒有證據（品牌總部不等於零件產地）。',
      partOmittedUnconfirmed:
        '未列出零件產地：搜尋或標籤未能確認此零件的產地。',
      madeInOmittedBrand:
        '未列出製造地：只與品牌／設計所在地吻合，沒有工廠或產地證據。',
      madeInOmittedOwnership:
        '未列出製造地：「中國」僅來自所有權／母公司資料，並非產品、標籤或零售商標示的產地。',
      cooUnconfirmedSeeParts:
        '最終產地未確認：候選產地請參考「零件／全球產線」或「零件」欄（並非已確認的製造地）。',
      cooUnconfirmedNoLabel:
        '最終產地未確認：產品或標籤上沒有產地資料，不會自行推斷製造地。',
      cooUnconfirmedNoBarcode:
        '最終產地未確認：沒有網頁同時顯示此條碼（JAN）與製造地；依品名比對到的只算較可能的候選。',
      cooUnconfirmedCandidates:
        '最終產地未確認：以下候選來自查詢結果，並非標籤上印明的製造地。',
      distributorOmitted:
        '母公司名單未列入本地經銷商／市場代理（並非法定擁有人）。',
      chinaLinkUnclear:
        '與中國的關聯不明，請勿視為已確認與中國無關。',
      verifyConflict:
        '核對時發現互相矛盾的資料',
      companyNotAssessed:
        '未評估公司／所有權資料',
      taiwanSeparate:
        '在中國關聯分級中，台灣與中國分開計算',
      webUnavailableLabel:
        '無法進行即時網路搜尋，零件產地取自包裝標籤相片，並非搜尋結果。',
      altsAim:
        '替代品牌／產品以較低的中國參與程度為目標（不只是相似產品）。關聯等級屬估算；單憑總部所在地不能證明並非在中國製造。',
      altsNone:
        '找不到有足夠把握、中國參與程度較低的替代品牌或產品。',
      sumCooUnconfirmed:
        '最終產地未確認',
      tierUnknown:
        '證據不足，未能評估與中國的關聯。',
      tierNone:
        '從現有資料中未發現與中國的關聯。',
      tierDirect:
        '發現與中國直接相關的跡象。',
      tierIndirect:
        '發現與中國間接相關的跡象。',
      cooConflictChina:
        '最終產地未確認：{source}資料（{label}）與「中國製造」互相矛盾；單憑所有權／母公司不能判定製造地。',
      cooConflictMadeIn:
        '最終產地未確認：{source}資料（{label}）與製造地「{madeIn}」互相矛盾，只保留為候選。',
      candidate:
        '{label}（{rating}，{pct}%，{source}）',
      listSep:
        '；',
      webFail_model_unavailable:
        '此 API 金鑰無法使用即時搜尋模型，製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_search_grounding_unavailable:
        '此 API 金鑰無法使用 Google 搜尋，製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_upstream_credits:
        'AI 服務額度暫時用盡（預付餘額已用完），製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_upstream_quota:
        '今日的免費 Google 搜尋額度已用完，請於每日額度重設後再試；製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_upstream_unavailable:
        '即時網路搜尋逾時或服務繁忙，製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_empty_response:
        '即時網路搜尋沒有回傳內容，製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_disabled:
        '此次查詢未啟用即時網路搜尋，製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_gemini_not_configured:
        '尚未設定 Gemini 即時網路搜尋，製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_no_entity:
        '沒有產品名稱，無法進行即時網路搜尋；製造地及零件產地僅依模型知識，結果會較保守。',
      webFail_default:
        '此次查詢沒有進行即時網路搜尋，製造地及零件產地僅依模型知識，結果會較保守。',
      sum: {
        madeIn: '製造地：{value}',
        candidates: '候選產地：{value}',
        brandOrigin: '品牌來源地：{value}',
        components: '零件／全球產線：{value}',
        parts: '零件：{value}',
        hq: '總部：{value}',
        company: '公司：{value}',
      },
      signal: {
        ocr: '標籤',
        retailer: '零售商',
        manufacturer: '製造商',
        ownership: '所有權',
        unknown: '未知',
      },
    },
    partsSourcesLabel: '來源',
    sectionShareSave: '儲存圖片',
    sectionShareShare: '分享',
    sectionShareSaved: '已儲存',
    sectionShareFailed: '無法儲存圖片',
    sectionShareHint: '將游標移到分層即可儲存或分享圖片',
    originCandidates: '查到的產地候選',
    candidateRating: {
      confirmed: '確認最終產地',
      likely: '較可能',
      possible: '可能',
      mentioned: '有提及',
    },
    candidateSource: {
      web_name: '依品名比對的網頁',
      confirmed_coo: '標籤／確認 COO',
      parts: '零件／物料',
      components_line: '零件／全球產線',
      notes: '說明',
      manufacturer: '製造商',
      filings: '公開披露',
      model_memory: '模型知識',
      ownership: '所有權／母公司',
    },
    origin: '來源',
    brandOrigin: '品牌來源地',
    componentsOrigin: '零件／全球產線',
    productNotes: '產地說明',
    manufacturer: '製造商',
    company: '公司',
    hq: '總部',
    parents: '母公司',
    graphTitle: '關聯圖',
    graphHint: '箭頭表示產品、公司、母公司與產地之間的關係。空間不足時可展開或縮放。',
    graphControls: '關聯圖檢視控制',
    graphZoomIn: '放大',
    graphZoomOut: '縮小',
    graphExpand: '展開',
    graphCollapse: '收合',
    graphRelations: '關係列表',
    graphNoEdges: '此結果未能推得關係連線。',
    graphLink: '關聯',
    graphChinaLinked: '中國相關',
    graphLegendCn: '中國相關節點／連線',
    graphLegendOther: '其他',
    graphEdge: {
      brand: '品牌',
      brand_company: '品牌',
      'brand/company': '品牌',
      made_in: '產地',
      hq: '總部',
      parent: '母公司',
      majority: '多數控股',
      wholly: '全資',
      minority: '少數股權',
      ownership: '所有權',
      affiliation: '品牌',
      manufacturing: '產地',
      part: '零件',
      spare: '備件',
      ingredient: '食材',
      component: '元件',
    },
    regionsTitle: '地區',
    altBrands: '較低中國關聯品牌（估計）',
    altProducts: '較低中國關聯產品（估計）',
    altDisclaimer:
      '僅列出估計非「直接」中國關聯的替代（不含中國製造填充項）。歐美總部或「設計於…」不代表產地。工廠／最終產地不明時不列入或標「未知」，不會輕易標「無直接關聯」。',
    estimated: '估計',
    twNote: '台灣一律視為獨立國家／地區，永不計入「中國相關」分級。',
    region: {
      CN: '中國大陸',
      HK: '香港',
      TW: '台灣',
      MO: '澳門',
      OTHER: '其他',
      UNKNOWN: '未知',
    },
    steps: {
      start: '開始',
      cache: '快取',
      identify: '讀取標籤',
      web: '網路搜尋',
      monolith: '完整分析',
      dual_core: '產品與公司',
      product: '產品產地',
      company: '公司關聯',
      verify: '交叉驗證',
      alternatives: '較低中國關聯替代',
      synthesize: '彙整評分',
    },
  },
  history: {
    title: '紀錄',
    subtitle: '本機過去查詢',
    empty: '尚無查詢紀錄。',
    withPhoto: '含照片',
    open: '開啟',
    remove: '刪除',
  },
  settings: {
    title: '設定',
    subtitle: '偏好與本機資料',
    panelDisplay: '語言與主題',
    panelCheck: '查詢項目',
    panelData: '刪除資料',
    language: '語言',
    theme: '主題',
    themeSystem: '跟隨系統',
    themeLight: '淺色',
    themeDark: '深色',
    geoScope: '分級的「中國」範圍',
    geoScopeHint:
      '台灣一律視為獨立國家／地區，永不計入「中國相關」分級。預設僅中國大陸；可選範圍可含香港、澳門（不含台灣）。',
    geoScopePrc: '僅中國大陸（預設）',
    geoScopeGreater: '中國大陸 + 香港 + 澳門（不含台灣）',
    dimensions: '查詢項目',
    dimensionsHint:
      '「較低中國關聯」替代選項預設關閉。需要非中製或中國關聯較低的替代品牌／產品時再開啟（會多用一次 AI 呼叫）。',
    dimOrigin: '產地',
    dimManufacturer: '製造商產地',
    dimCompany: '公司關聯',
    dimAltBrands: '較低中國關聯品牌替代',
    dimAltProducts: '較低中國關聯產品替代',
    howItWorks: '如何運作',
    about: '關於 OriginWise',
    version: '版本 {v}',
    cleanData: '刪除本機資料',
    cleanDataHint: '資料只存在此瀏覽器。選擇要清除的項目，無法復原。',
    dataSummary: '本機資料',
    dataNone: '尚未儲存 OriginWise 資料。',
    dataHistory: '查詢紀錄：{n}',
    dataSettings: '自訂設定',
    dataDisclaimer: '已接受免責聲明',
    cleanAll: '全部',
    cleanHistory: '僅查詢紀錄',
    cleanSettings: '僅設定',
    cleanConfirm: '確定刪除所選資料？',
    cleanConfirmBtn: '立即刪除',
    cleanDoneAll: '已清除所有本機 OriginWise 資料。',
    cleanDoneHistory: '已清除查詢紀錄。',
    cleanDoneSettings: '設定已重設為預設。',
  },
  about: {
    title: '關於',
    tagline: '簡單的中國相關產品查詢',
    intro:
      'OriginWise 幫你快速看產品或品牌是否看起來與中國相關——產地、製造商與公司關聯，並可選較低關聯替代。查詢紀錄留在本裝置。',
    body: 'OriginWise 用簡單方式，快速看日常產品／品牌是否與中國相關。AI 可能不完整或出錯。',
    privacy: '無需帳號。查詢紀錄留在這台手機／瀏覽器。',
    license: 'MIT 授權',
    licenseShort: 'MIT',
    openSourceTitle: '開放原始碼 · MIT',
    openSourceBody:
      '本專案以 MIT 授權提供的免費軟體。你可以使用、複製、修改、合併、發佈、散布與再授權，也可使用自己的 API 金鑰自行部署。',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs: '依「現況」提供，不附帶保證。完整授權條款請見 GitHub。',
    linkSource: '原始碼',
    linkLicense: 'MIT 授權',
    linkIssues: '問題與回饋',
    linkReleases: '版本發布',
    linkSecurity: '安全政策',
    privacyTitle: '你的隱私',
    privacyLead: '我們把事情做得很單純：不用註冊帳號，查詢紀錄也只留在你的手機或電腦。',
    privacyBullet1: '查詢紀錄、設定與偏好，只存在此瀏覽器、這部裝置裡。',
    privacyBullet2: '沒有登入，也不會把你的查詢日記備份到雲端。',
    privacyBullet3: '可隨時在設定裡用「刪除本機資料」全部刪掉。',
    privacyBullet4:
      '執行查詢時，名稱或照片只用於取得該次回答。我們不會把包裝當成產品目錄保存。',
    privacyBullet5: '照片會先在裝置上壓縮再上傳，不會當成伺服器紀錄保存。',
    privacyBullet6:
      '開啟即時網路搜尋時，產品名稱（及標籤文字）也會傳送一次給搜尋服務：優先使用 Gemini 的 Google 搜尋，失敗時才改用 Brave Search 或 Firecrawl。查詢進度與結果都會標明實際使用的服務。我們不會記錄你查詢的內容。',
    privacyPolicyLink: '隱私權政策',
    termsLink: '使用條款',
    designTitle: '它怎麼運作',
    designLead: '快速多代理 AI 查詢，再以固定計分表合成——不是法律資料庫。',
    designLocalTitle: '什麼會留在你的裝置',
    designLocalBody:
      'App 載入後，紀錄、語言、主題與查詢偏好只存在此瀏覽器。清除網站資料，或使用「刪除本機資料」，就可以移除。',
    designWhyTitle: '為什麼這樣做',
    designWhy1: '想在手機上快速查，不必註冊帳號。',
    designWhy2: '紀錄跟你在一起——想刪隨時可刪。',
    designWhy3: 'AI 可能出錯；我們會顯示注意事項，且台灣在分級上視為獨立。',
    disclaimerTitle: '請注意',
    disclaimerBody:
      'OriginWise 僅供參考——不是法律、關務或制裁建議。AI 與分級標籤可能不完整或有誤。重要決定請自行再確認。',
    createdBy: '維護者',
    contributionsWelcome: '歡迎在 GitHub 提出 Issue 或 Pull Request。',
  },
  how: {
    title: '如何運作',
    subtitle:
      '快速了解產品是否與中國相關',
    aimTitle: '這個 App 做什麼',
    aimBody:
      '幫你快速判斷產品或品牌是否與中國相關，例如產地、製造商與公司關聯。它不是深度研究工具，也不是法律查核。',
    stepsTitle: '白話說明',
    step1Title: '你提供資料',
    step1Body: '產品名稱、品牌，或包裝照片。',
    step2Title:
      '查詢與比對',
    step2Body:
      'AI 先查產品產地與公司關聯；開啟即時網路搜尋時，會再找網頁上的產地資料，最後交叉比對。如有開啟，也會列出中國關聯較低的替代品牌或產品。',
    step3Title: '得到簡單結果',
    step3Body:
      '以顏色標示關聯程度：無直接關聯、間接、直接或未知，並附上簡短原因。',
    graphTitle: '完整流程',
    graphHint:
      '從輸入到結果的完整流程。',
    flowYou: '你（名稱／照片）',
    flowAi: 'AI 檢查',
    flowProduct: '產品產地',
    flowCompany: '公司',
    flowVerify: '交叉比對',
    flowScore: '簡單評分',
    flowResult: '彩色結果',
    flowAiDetail:
      '先查產品產地與公司，再交叉比對。',
    flowScoreDetail:
      '把結果彙整成簡單的分級。',
    badgeTitle: '顏色代表什麼',
    badgeNone: '無直接關聯 — 沒有清楚的中國關聯',
    badgeIndirect: '間接 — 較弱或部分關聯',
    badgeDirect:
      '直接 — 明確關聯（例如在中國製造，或總部位於中國）',
    badgeUnknown:
      '未知 — 資料不足，無法判斷',
    twTitle: '台灣',
    twBody:
      '在此台灣一律視為獨立國家／地區，本身不計入「中國相關」。',
    evidenceTitle:
      '產地怎樣才算確認',
    evidenceBody:
      '只有包裝標籤照片，或網頁上同一個條碼（JAN）旁寫明產地，才會顯示為已確認（依條碼比對）。只對上品名的，最多顯示「較可能」（依品名比對）；同一頁有多個尺寸或款式時，維持「未確認」。若即時網路搜尋無法使用，結果只依模型知識，並會另行標示。',
    flowWeb:
      '網路搜尋',
    flowWebDetail:
      '以產品名稱或條碼搜尋網頁，核對產地標示。',
    privacyTitle: '你的資料',
    privacyBody:
      '查詢紀錄只留在你的裝置，照片不會保存在伺服器上。開啟即時網路搜尋時，產品名稱或條碼會傳送給搜尋服務。AI 可能出錯，重要決定請自行再確認。',
    tryBtn: '去查一筆',
  },
  tier: {
    none: '無直接關聯',
    indirect: '間接',
    direct: '直接',
    unknown: '未知',
  },
} satisfies MessageTree;
