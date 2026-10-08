import type { MessageTree } from './en';

export const fi = {
  appName: 'OriginWise',
  tabs: {
    check: 'Tarkista',
    history: 'Historia',
    about: 'Tietoja',
    settings: 'Asetukset',
    navMore: 'Valikko',
  },
  common: {
    present: 'Kyllä',
    /** Separator after a short label (full-width in CJK). */
    labelSep: ': ',
    missing: 'Ei',
    cancel: 'Peruuta',
    confirm: 'Vahvista',
    delete: 'Poista',
    back: 'Takaisin',
    loading: 'Ladataan…',
    optional: 'Valinnainen',
  },
  install: {
    aria: 'Asenna OriginWise',
    title: 'Asenna OriginWise',
    body: 'Lisää alkunäyttöön nopeaa, sovellusmaista tarkistusta varten.',
    bodyIos: 'Lisää Koti-valikkoon koko näytön käyttöä varten.',
    iosStep1: 'Napauta',
    iosStep2: 'Jaa, sitten Lisää Koti-valikkoon.',
    action: 'Asenna',
    dismiss: 'Sulje asennuskehote',
  },
  support: {
    buyMeAPint: 'Tarjoa minulle tuoppi',
    pintShort: 'Tuoppi',
    thanks: 'Jos OriginWise auttaa, voit tarjota minulle tuopin:',
  },
  welcome: {
    title: 'Tervetuloa OriginWiseen',
    body: 'Nopea tarkistus: liittyykö tämä tuote tai merkki Kiinaan? Kirjoita nimi tai kuvaa pakkaus. Tekoäly voi erehtyä — ei oikeudellista neuvontaa.',
    accept: 'Selvä — aloita tarkistus',
  },
  check: {
    identifiedAs: 'Tunnistettu: {name}',
    chinaLink: {
      title: 'Yhteys Kiinaan',
      chinaCompany: 'Kiinalainen yritys',
      chinaControlled: 'Kiinalaisessa määräysvallassa',
      hq: 'Pääkonttori',
      owner: 'Määräysvaltainen omistaja',
      brandOrigin: 'Brändin alkuperä',
      madeIn: 'Valmistusmaa',
      parts: 'Osat',
      china: 'Kiina',
      unconfirmed: 'Vahvistamaton',
      partsChina: 'Osa osista valmistettu Kiinassa',
      hqParentNote: 'Vastauksen Kiinan pääkonttori kuuluu emoyhtiölle',
      madeInBelow: 'Valmistusmaa ratkaistaan vain Valmistusmaa-kortissa (viivakoodi tai pakkausmerkintä).',
      madeInChina: 'Valmistettu Kiinassa',
      footnote: 'Tämä kortti kertoo vain, missä yritys toimii, kuka sen omistaa ja missä tuote valmistetaan. Se ei ole arvio tuotteen laadusta tai turvallisuudesta eikä yrityksestä.',
      controlling: 'Määräysvalta',
      reasonParent: 'Määräysvaltaa käyttävä emoyhtiö on Manner-Kiinassa.',
      reasonBrandOrigin: 'Brändin alkuperä: {place}.',
      madeInLineBarcode: 'Valmistusmaa: {place} (viivakoodivastaavuus, katso Valmistusmaa-kortti alla)',
      madeInLineLabel: 'Valmistusmaa: {place} (pakkausmerkintä, katso Valmistusmaa-kortti alla)',
    },
    rc: {
      modelRef: 'Mallin tieto (vahvistamaton)',
      modelRefHelp: 'Mikään verkkosivu tai pakkausmerkintä ei vahvista tätä; tämä on vain mallin arvaus. Luota pakkauksen merkintään.',
      moreInfo: 'Lisätietoja',
      notConfirmed: ' (vahvistamaton)',
      likelyNote: 'Täsmätty vain tuotenimellä – valmistusmaata ei ole vahvistettu. Älä pidä sitä vahvistettuna.',
      candidatesTitle: 'Löydetyt valmistusmaaehdokkaat (vahvistamattomat)',
      noCandidates: 'Luotettavia ehdokkaita ei löytynyt.',
      noBarcodePage: 'Mikään sivu ei näyttänyt viivakoodia ja valmistusmaata',
      sourceCount: 'Lähteet: {n}',
      sourceFirst: 'Lähde 1: {label}',
      sourceNth: 'Lähde {n}: {label}',
      sourceCountry: 'valmistusmaa {country}',
      labelSource: 'Lähde: valokuva pakkausmerkinnästä',
      parent: 'Emoyhtiö',
      tagConfirmed: 'Vahvistettu',
      tagLikely: 'Todennäköinen',
      tagMentioned: 'Mainittu',
      tagUnconfirmed: 'Vahvistamaton',
      foldSources: 'Kaikki lähteet',
      foldAlts: 'Vaihtoehtoiset brändit',
      foldAi: 'Tekoäly- / hakutiedot',
      expand: 'Näytä',
      collapse: 'Piilota',
    },
    matchBasis: {
      barcode: 'Täsmätty viivakoodilla',
      name: 'Täsmätty tuotenimellä',
      label: 'Pakkausmerkinnän mukaan',
    },
    searchVia: {
      gemini: 'Google Search (Gemini)',
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
    },
    webStepVia: 'Verkkotutkimus — haku lähetetty palveluun {name}',
    searchUsage: 'Verkkohaku: {provider} · hakupyyntöjä: {n}',
    knowledgeWebVia:
      'Sisältää live-verkkotutkimuksen ({provider}) sekä mallitiedon. Silti ei yritysrekisteri tai tullitietokanta — etiketit ja viralliset asiakirjat voivat poiketa verkkosivuista. Tiedoksi — ei oikeudellista, kauppa- tai pakoteneuvontaa.',
    title: 'Nopea tarkistus',
    subtitle: 'Liittyykö tämä tuote Kiinaan? Kirjoita nimi tai kuvaa pakkaus.',
    placeholder: 'esim. snack-merkki, puhelin, lelu…',
    placeholderWithPhoto: 'Valinnainen: mikä tuote tämä on?',
    photo: 'Kamera',
    gallery: 'Galleria',
    removePhoto: 'Poista kuva',
    photoLabelHint: 'Luemme etiketistä, jos teksti on selkeä',
    noteOptional: 'Valinnainen huomautus',
    submit: 'Tarkista nyt',
    submitting: 'Tarkistetaan…',
    needInput: 'Kirjoita tuotenimi tai lisää kuva.',
    howLink: 'Miten se toimii',
    newCheck: 'Uusi tarkistus',
    comingSoon:
      'Tarkistus-API tulee myöhemmässä PR:ssä. Historia ja asetukset ovat valmiina.',
    photoTooLarge: 'Kuva on pakkauksen jälkeenkin liian suuri.',
    photoInvalid: 'Kuvaa ei voitu lukea.',
    dropPhoto: 'Pudota kuva tähän',
    unnamedPhoto: '(kuva)',
    partsTitle: 'Osat, varaosat ja ainesosat',
    partsHint:
      'Eristetty tästä tuotteesta — tärkeät komponentit, varaosat tai ainesosat ja näyttävätkö ne Kiina-liittyviltä.',
    partKind: {
      part: 'Osa',
      spare: 'Varaosa',
      ingredient: 'Ainesosa',
      component: 'Komponentti',
    },
    progressHint: 'Alkuperän ja yrityksen analyysi…',
    stepMonolith: 'Kerätään tuote- ja yrityssignaaleja',
    answeredBy: 'Päävastaus: {name}',
    agentsUsed: '{n} agenttia',
    agentsTitle: 'Käytetty tekoälyallas',
    agentsSummary: '{total} kutsua · {ok} ok · {fail} epäonnistui',
    /** Strength of a company–country relation (所有權 rows). */
    relStrength: {
      strong: 'vahva yhteys',
      moderate: 'kohtalainen yhteys',
      weak: 'heikko yhteys',
    },
    agentsHint:
      'Jokainen rivi on ilmaispalvelimen tekoälykutsu. Epäonnistumiset johtuvat usein kiintiöstä, mallin käyttöoikeudesta tai aikakatkaisusta; yritämme muita tai varavaihtoehtoa. Live-verkko vaatii Gemini Search groundingin (ei sama kuin tekstin RPM).',
    agentsHintVia:
      'Jokainen rivi on ilmaispalvelimen tekoälykutsu. Epäonnistumiset johtuvat usein kiintiöstä, mallin käyttöoikeudesta tai aikakatkaisusta; yritämme muita tai varavaihtoehtoa. Live-verkkohaku tehtiin palvelulla {provider}.',
    agentOk: 'OK',
    agentFail: 'Epäonnistui ({err})',
    agentSkipped: 'Ohitettu ({err})',
    agentFailUnknown: 'virhe',
    agentError: {
      upstream_quota: 'kiintiö / nopeusraja',
      upstream_credits: 'tekoälykrediitit käytetty',
      upstream_error: 'ylävirran virhe',
      upstream_unavailable: 'palvelu ei käytettävissä',
      empty_response: 'tyhjä vastaus',
      model_unavailable: 'malli ei ole käytettävissä tällä API-avaimella',
      search_grounding_unavailable:
        'Google Search grounding ei ole käytettävissä tällä avaimella (kokeile Default-altaan malleja / ota laskutus käyttöön; Gemini 3 Search on usein 0/0)',
      disabled: 'pois käytöstä',
      gemini_not_configured: 'Geminiä ei ole määritetty',
      no_entity: 'ei tuotenimeä',
    },
    agent: {
      identify: 'Lue etiketti / nimi',
      product: 'Tuotteen paikka',
      company: 'Yritysyhteydet',
      verify: 'Kaksoistarkistus',
      alternatives: 'Vaihtoehdot, joissa vähemmän CN-yhteyttä',
      monolith: 'Täysi tarkistus (yksi kutsu)',
      dual_core: 'Tuote + yritys',
      dual_alts: 'Vaihtoehdot, joissa vähemmän CN-yhteyttä',
      web: 'Verkkohaku',
      unknownProvider: 'Tuntematon tekoäly',
    },
    provider: {
      brave: 'Brave Search',
      firecrawl: 'Firecrawl',
      gemini: 'Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      claude: 'Claude',
    },
    reasons: 'Miksi tämä taso',
    reason: {
      made_in_cn: 'Tuote on valmistettu Manner-Kiinassa.',
      made_in_cn_detail: 'Tuote on valmistettu paikassa {place}.',
      origin_cn: 'Tuotteen alkuperä liittyy Manner-Kiinaan.',
      origin_cn_detail: 'Tuotteen alkuperäksi on merkitty {place}.',
      manufacturer_cn: 'Valmistaja liittyy Manner-Kiinaan.',
      manufacturer_cn_detail: 'Valmistajan sijainti/yhteys: {place}.',
      hq_cn: 'Yrityksen pääkonttori on Manner-Kiinassa.',
      hq_cn_detail: 'Yrityksen pääkonttori on paikassa {place}.',
      parent_majority_cn:
        'Enemmistö- tai määräysvaltainen emoyhtiö liittyy Manner-Kiinaan.',
      ownership_strong_cn:
        'Raportoitiin vahvoja omistus- tai määräysyhteyksiä Manner-Kiinaan.',
      ownership_weak_cn:
        'Raportoitiin heikompia yhteyksiä (esim. vähemmistöosuus, toimitus tai vähittäiskauppa) Manner-Kiinaan.',
      component_cn:
        'Osa komponenteista tai kokoonpano liittyy Manner-Kiinaan ilman täyttä ”made in China” -väitettä.',
      explicit_non_cn_geo:
        'Selkeät paikkasignaalit osoittavat Manner-Kiinan ulkopuolelle (tämän työkalun laajuudessa).',
      explicit_non_cn_geo_detail:
        'Selkeät paikkasignaalit Manner-Kiinan ulkopuolella: {places}.',
      verify_conflict:
        'Tuote- ja yrityssignaalit eivät täysin täsmänneet (ristitarkistus löysi ristiriitoja).',
      conflict_no_strong:
        'Signaalit olivat ristiriidassa eikä vahvaa Manner-Kiina-yhteyttä ollut — tulos jätettiin epävarmaksi.',
      insufficient:
        'Luotettavaa alkuperä- tai omistustietoa ei ole tarpeeksi Kiina-yhteyksien arviointiin.',
      ownership_not_assessed:
        'Yrityksen omistusta ei arvioitu täysin tässä tarkistuksessa.',
      taiwan_as_country:
        'Taiwan käsitellään erillisenä maana eikä se laske tälle pisteelle ”Kiina-liittyväksi”.',
      taiwan_as_country_detail:
        'Taiwan käsitellään erillisenä maana (nähty: {places}) eikä se laske tälle pisteelle ”Kiina-liittyväksi”.',
    },
    caveats: 'Varaukset',
    disclaimer:
      'Vain tiedoksi — mallin tieto ja valinnainen live-verkkotutkimus, ei oikeudellista tai pakoteneuvontaa. Tekoäly voi erehtyä.',
    knowledgeModel:
      'Perustuu vain yleiseen mallitietoon (ei live-verkkohakua). Merkin alkuperä, komponenttitehtaat ja loppukokoonpano/alkuperämaa voivat vaihdella SKU:n/markkinan mukaan — suosi pakkausetikettejä. Ei yritysrekisteri tai tullitietokanta. Tiedoksi — ei oikeudellista, kauppa- tai pakoteneuvontaa.',
    knowledgeWeb:
      'Sisältää live-verkkotutkimuksen (Google Search Gemini-groundingin kautta) sekä mallitiedon. Silti ei yritysrekisteri tai tullitietokanta — etiketit ja viralliset asiakirjat voivat poiketa verkkosivuista. Tiedoksi — ei oikeudellista, kauppa- tai pakoteneuvontaa.',
    providerNotConfigured:
      'Tekoälytarkistusta ei ole määritetty. Lisää avain tiedostoon .dev.vars ja suorita `npm run pages:dev` (katso README).',
    rateLimited:
      'Ilmaispalvelimen raja: 1 tarkistus 30 sekunnin välein. Odota hetki.',
    rateLimitedDay:
      'Ilmaispalvelimen raja: enintään 10 tarkistusta 6 tunnissa. Yritä myöhemmin.',
    rateLimitBadge: 'Ilmaispalvelimen raja',
    rateLimitFreeNote:
      'Ilmaispalvelin · 1 tarkistus / 30 s · enint. 10 / 6 tuntia · 1 kerrallaan',
    rateLimitRpmTitle: 'Ilmaispalvelimen nopeusraja (30 s)',
    rateLimitedLongTitle: 'Ilmaispalvelimen 6 tunnin raja',
    rateLimitInflightTitle: 'Tarkistus on jo käynnissä',
    rateLimitShortDetail:
      'Ilmaispalvelimen raja: {n} tarkistus(ta) {w} s välein. Odota noin {s} s ja yritä uudelleen.',
    rateLimitLongDetail:
      'Ilmaispalvelimen raja: {n} tarkistusta {h} tunnissa. Yritä uudelleen noin {m} minuutin kuluttua.',
    rateLimitMinuteDetail:
      'Ilmaispalvelimen raja: {n} tarkistus(ta) {w} s välein. Odota noin {s} s ja yritä uudelleen.',
    rateLimitDayDetail:
      'Ilmaispalvelimen raja: {n} tarkistusta {h} tunnissa. Yritä myöhemmin.',
    rateLimitInflightDetail:
      'Ilmaispalvelin sallii vain 1 tarkistuksen kerrallaan. Odota, että nykyinen tarkistus valmistuu.',
    rateLimitAutoIn: 'Automaattisesti {s} s kuluttua…',
    rateLimitAutoHint:
      'Lähetetään automaattisesti {s} s kuluttua, kun ilmaispalvelimen ikkuna avautuu.',
    rateLimitAutoStop: 'Pysäytä',
    rateLimitAutoCancelled:
      'Automaattinen lähetys peruttu. Voit yrittää uudelleen, kun olet valmis.',
    forbiddenOrigin: 'Pyyntö ei ole sallittu tästä originsta.',
    badRequest: 'Virheellinen pyyntö.',
    parseError: 'Vastausta ei voitu ymmärtää. Yritä uudelleen.',
    upstreamError: 'Vastauspalvelu epäonnistui. Yritä myöhemmin.',
    upstreamQuota: 'Vastauspalvelu on varattu. Yritä myöhemmin.',
    upstreamUnavailable: 'Vastauspalvelu on tilapäisesti poissa käytöstä.',
    emptyResponse: 'Vastausta ei palautettu. Yritä uudelleen.',
    serverError: 'Jokin meni pieleen. Yritä uudelleen.',
    forceRefresh: 'Tarkista uudelleen (ohita välimuisti)',
    forceRefreshHint:
      'Tämä vastaus oli välimuistissa. Uudelleentarkistus ajaa uuden tekoälykierroksen (lasketaan silti ilmaispalvelimen rajoihin).',
    cached: 'välimuisti',
    degraded: 'osittainen tulos',
    relationLabel: 'Kiina-suhde',
    confidence: '{n} % luottamus',
    productFacts: 'Tuote',
    companyFacts: 'Yritys',
    brand: 'Merkki',
    madeIn: 'Valmistettu (tämä yksikkö / lopullinen alkuperämaa)',
    madeInUnconfirmed: 'Lopullista alkuperämaata ei vahvistettu — katso komponentit / globaali linja',
    originLayersTitle: 'Alkuperäkerrokset',
    originLayersIntro:
      'Erota brändi/toiminta, omistus, lopullinen COO ja osat — omistus ei ole made-in.',
    layerBrandOps: 'Brändi / toiminta',
    layerOwnership: 'Omistus / emoyhtiöt',
    layerOwnershipHint: 'Ei lopullinen COO / made-in',
    layerOwnershipEmpty: 'Ei omistus-/emoyhtiösignaalia tässä tuloksessa',
    layerFinalCoo: 'Lopullinen COO',
    layerParts: 'Osakandidaatit',
    partsModelOnlyBanner:
      'Part countries are model guesses — not packaging or Search confirmed.',
    searchQuotaUsedUp:
      'Tekoälyhaun kiintiö on käytetty — tarkempaa tietoa ei ole nyt saatavilla. Tarkista uudelleen päivittäisen nollauksen jälkeen.',
    aiCreditsUsedUp:
      'Tekoälypalvelun krediitit on tilapäisesti käytetty — tarkempaa tietoa ei ole nyt saatavilla. Yritä myöhemmin uudelleen.',
    srv: {
      partOmittedNoEvidence:
        'Osan maa jätetty pois: ei näyttöä hausta/etiketistä (brändin pääkonttori ei ole osan alkuperä).',
      partOmittedUnconfirmed:
        'Osan maa jätetty pois: haku/etiketti ei vahvistanut sitä tälle osalle.',
      madeInOmittedBrand:
        'Valmistusmaa jätetty pois: se vastasi vain brändin/suunnittelun maata ilman tehdas- tai alkuperänäyttöä.',
      madeInOmittedOwnership:
        'Valmistusmaa jätetty pois: Kiina tulee vain omistus-/emoyhtiötiedoista, ei tuotteesta, etiketistä tai jälleenmyyjältä.',
      cooUnconfirmedSeeParts:
        'Lopullinen alkuperämaa vahvistamatta – katso ehdokkaat komponentit/globaali tuotanto -riviltä tai osista (valmistusta ei vahvistettu).',
      cooUnconfirmedNoLabel:
        'Lopullinen alkuperämaa vahvistamatta – tuotteessa/etiketissä ei ole alkuperämaata; sitä ei keksitä.',
      cooUnconfirmedNoBarcode:
        'Lopullinen alkuperämaa vahvistamatta – mikään verkkosivu ei näyttänyt viivakoodia/JAN-koodia yhdessä valmistusmaan kanssa; tuotenimellä löydetyt ovat vain todennäköisiä ehdokkaita.',
      cooUnconfirmedCandidates:
        'Lopullinen alkuperämaa vahvistamatta – alla olevat ehdokkaat ovat hakusignaaleja, eivät painettu ”Made in”.',
      distributorOmitted:
        'Paikallinen jakelija / markkina-agentti jätetty pois emoyhtiöistä (ei laillinen omistaja).',
      chinaLinkUnclear:
        'Yhteys Kiinaan epäselvä – älä pidä sitä vahvistetusti Kiinasta riippumattomana.',
      verifyConflict:
        'Tarkistus löysi ristiriitaisia signaaleja',
      companyNotAssessed:
        'Yritys-/omistustietoja ei arvioitu',
      taiwanSeparate:
        'Taiwania käsitellään yhteystasoissa erillisenä maana',
      webUnavailableLabel:
        'Reaaliaikainen verkkohaku ei käytettävissä – osien maat tulevat pakkausetiketin kuvasta, eivät hausta.',
      altsAim:
        'Vaihtoehtoiset brändit/tuotteet tähtäävät pienempään Kiina-kytkökseen (eivät vain samankaltaisuuteen). Tasot ovat arvioita; pääkonttori yksin ei todista valmistusta Kiinan ulkopuolella.',
      altsNone:
        'Riittävän varmoja vaihtoehtoja, joissa on pienempi Kiina-kytkös, ei löytynyt.',
      sumCooUnconfirmed:
        'Lopullinen alkuperämaa vahvistamatta',
      tierUnknown:
        'Liian vähän näyttöä Kiina-yhteyksien arvioimiseksi.',
      tierNone:
        'Saatavilla olevista signaaleista ei löytynyt yhteyksiä Kiinaan.',
      tierDirect:
        'Löytyi suoria signaaleja yhteydestä Kiinaan.',
      tierIndirect:
        'Löytyi epäsuoria signaaleja yhteydestä Kiinaan.',
      cooConflictChina:
        'Lopullinen alkuperämaa vahvistamatta – {source}-signaali ({label}) on ristiriidassa ”Made in China” -tiedon kanssa; omistus/emoyhtiö yksin ei määrää valmistusmaata.',
      cooConflictMadeIn:
        'Lopullinen alkuperämaa vahvistamatta – {source}-signaali ({label}) on ristiriidassa valmistusmaan {madeIn} kanssa; säilytetään vain ehdokkaana.',
      candidate:
        '{label} ({rating}, {pct} %, {source})',
      listSep:
        '; ',
      webFail_model_unavailable:
        'Reaaliaikaiset hakumallit eivät olleet käytettävissä tällä API-avaimella – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_search_grounding_unavailable:
        'Reaaliaikainen Google-haku ei ollut käytettävissä tällä API-avaimella – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_upstream_credits:
        'Tekoälypalvelun krediitit loppuneet (ennakkomaksettu saldo tyhjä) – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_upstream_quota:
        'Päivittäinen ilmainen Google-hakukiintiö käytetty – yritä uudelleen päivittäisen nollauksen jälkeen – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_upstream_unavailable:
        'Reaaliaikainen verkkohaku aikakatkaistiin tai palvelu oli ruuhkainen – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_empty_response:
        'Reaaliaikainen verkkohaku palautti tyhjän vastauksen – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_disabled:
        'Reaaliaikainen verkkohaku oli poistettu käytöstä tässä tarkistuksessa – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_gemini_not_configured:
        'Geminiä ei ole määritetty reaaliaikaiseen verkkohakuun – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_no_entity:
        'Ei tuotenimeä reaaliaikaista verkkohakua varten – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      webFail_default:
        'Tässä tarkistuksessa ei tehty reaaliaikaista verkkohakua – valmistus- ja osamaat ovat varovaisempia (vain mallin tietämys).',
      sum: {
        madeIn: 'Valmistusmaa: {value}',
        candidates: 'Ehdokkaat: {value}',
        brandOrigin: 'Brändin alkuperä: {value}',
        components: 'Komponentit/globaali tuotanto: {value}',
        parts: 'Osat: {value}',
        hq: 'Pääkonttori: {value}',
        company: 'Yritys: {value}',
      },
      signal: {
        ocr: 'etiketti',
        retailer: 'jälleenmyyjä',
        manufacturer: 'valmistaja',
        ownership: 'omistus',
        unknown: 'tuntematon',
      },
    },
    partsSourcesLabel: 'Sources',
    sectionShareSave: 'Tallenna kuva',
    sectionShareShare: 'Jaa',
    sectionShareSaved: 'Tallennettu',
    sectionShareFailed: 'Kuvan tallennus epäonnistui',
    sectionShareHint: 'Vie hiiri kerroksen päälle tallentaaksesi tai jakaaksesi',
    originCandidates: 'Queried origin candidates',
    candidateRating: {
      confirmed: 'confirmed COO',
      likely: 'likely',
      possible: 'possible',
      mentioned: 'mentioned',
    },
    candidateSource: {
      web_name: 'verkkosivu (nimivastaavuus)',
      confirmed_coo: 'stamped COO',
      parts: 'parts / BOM',
      components_line: 'components / global line',
      notes: 'notes',
      manufacturer: 'manufacturer',
      filings: 'filings',
      model_memory: 'model knowledge',
      ownership: 'omistus / emo',
    },
    origin: 'Alkuperä',
    brandOrigin: 'Merkin alkuperä',
    componentsOrigin: 'Komponentit / globaali linja',
    productNotes: 'Alkuperähuomautukset',
    manufacturer: 'Valmistaja',
    company: 'Yritys',
    hq: 'Pääkonttori',
    parents: 'Emoyhtiöt',
    graphTitle: 'Suhdekaavio',
    graphHint:
      'Nuolet näyttävät, miten tuote, yritys, emoyhtiöt ja paikat liittyvät. Laajenna tai zoomaa, jos tarrat ovat ahtaita.',
    graphControls: 'Kaavionäkymä',
    graphZoomIn: 'Lähennä',
    graphZoomOut: 'Loitonna',
    graphExpand: 'Laajenna',
    graphCollapse: 'Pienennä',
    graphRelations: 'Suhteet',
    graphNoEdges: 'Tälle tulokselle ei päätelty suhdeyhteyksiä.',
    graphLink: 'liittyvä',
    graphChinaLinked: 'Kiinaan liittyvä',
    graphLegendCn: 'Kiinaan liittyvä solmu/kaari',
    graphLegendOther: 'Muu',
    graphEdge: {
      brand: 'merkki',
      brand_company: 'merkki',
      'brand/company': 'merkki',
      made_in: 'valmistettu',
      hq: 'pääkonttori',
      parent: 'emoyhtiö',
      majority: 'enemmistöomistaja',
      wholly: 'kokonaan omistettu',
      minority: 'vähemmistöosuus',
      ownership: 'omistus',
      affiliation: 'merkki',
      manufacturing: 'valmistettu',
      part: 'osa',
      spare: 'varaosa',
      ingredient: 'ainesosa',
      component: 'komponentti',
    },
    regionsTitle: 'Alueet',
    altBrands: 'Merkit, joissa vähemmän Kiina-osallisuutta (arvio)',
    altProducts: 'Tuotteet, joissa vähemmän Kiina-osallisuutta (arvio)',
    altDisclaimer:
      'Vain korvaajat, joiden arvioidaan olevan ei suoraan Kiinaan liittyviä (ei ”made in China” -täytteitä). Pelkkä Yhdysvaltojen/EU:n pääkonttori ei todista valmistusta Kiinan ulkopuolella. Epäselvä valmistusmaa on Tuntematon, ei Liittymätön.',
    estimated: 'arvio',
    twNote:
      'Taiwan käsitellään erillisenä maana eikä koskaan Kiina-liittyvänä tasoissa.',
    region: {
      CN: 'Manner-Kiina',
      HK: 'Hongkong',
      TW: 'Taiwan',
      MO: 'Macao',
      OTHER: 'Muu',
      UNKNOWN: 'Tuntematon',
    },
    steps: {
      start: 'Aloitus',
      cache: 'Välimuisti',
      identify: 'Etiketin luku',
      web: 'Verkkotutkimus',
      monolith: 'Täysi analyysi',
      dual_core: 'Tuote ja yritys',
      product: 'Tuotteen alkuperä',
      company: 'Yritysyhteydet',
      verify: 'Ristitarkistus',
      alternatives: 'Vaihtoehdot, joissa vähemmän CN-yhteyttä',
      synthesize: 'Pisteytys',
    },
  },
  history: {
    title: 'Historia',
    subtitle: 'Aiemmat tarkistukset tällä laitteella',
    empty: 'Ei aiempia tarkistuksia vielä.',
    withPhoto: 'Kuva',
    open: 'Avaa',
    remove: 'Poista',
  },
  settings: {
    title: 'Asetukset',
    subtitle: 'Asetukset ja tiedot tällä laitteella',
    panelDisplay: 'Kieli ja teema',
    panelCheck: 'Mitä tarkistetaan',
    panelData: 'Poista tiedot',
    language: 'Kieli',
    theme: 'Teema',
    themeSystem: 'Järjestelmä',
    themeLight: 'Vaalea',
    themeDark: 'Tumma',
    geoScope: 'Kiinan laajuus tasoille',
    geoScopeHint:
      'Taiwan käsitellään aina erillisenä maana eikä se koskaan ohjaa Kiina-suhteen tasoja. Vain Kiinan kansantasavalta käyttää Manner-Kiinaa. Greater China voi valinnaisesti sisältää Hongkongin ja Macaon (ei Taiwania).',
    geoScopePrc: 'Vain Kiina / manner (oletus)',
    geoScopeGreater: 'CN + Hongkong + Macao (ei Taiwan)',
    dimensions: 'Mitä tarkistetaan',
    dimensionsHint:
      'Vaihtoehdot, joissa vähemmän Kiina-osallisuutta, ovat oletuksena pois. Ota merkki- tai tuotevaihtoehdot käyttöön, jos haluat korvaajia, joilla on vähemmän Kiina-yhteyttä (ylimääräinen tekoälykutsu).',
    dimOrigin: 'Alkuperäpaikka',
    dimManufacturer: 'Valmistajan alkuperä',
    dimCompany: 'Yrityssuhteet',
    dimAltBrands: 'Merkkivaihtoehdot, joissa vähemmän Kiina-osallisuutta',
    dimAltProducts: 'Tuotevaihtoehdot, joissa vähemmän Kiina-osallisuutta',
    howItWorks: 'Miten se toimii',
    about: 'Tietoja OriginWisesta',
    version: 'Versio {v}',
    cleanData: 'Poista paikalliset tiedot',
    cleanDataHint:
      'Tiedot pysyvät vain tässä selaimessa. Valitse, mitä poistetaan. Tätä ei voi perua.',
    dataSummary: 'Tällä laitteella',
    dataNone: 'OriginWise-tietoja ei ole tallennettu.',
    dataHistory: 'Aiemmat tarkistukset: {n}',
    dataSettings: 'Mukautetut asetukset',
    dataDisclaimer: 'Vastuuvapaus hyväksytty',
    cleanAll: 'Kaikki',
    cleanHistory: 'Vain aiemmat tarkistukset',
    cleanSettings: 'Vain asetukset',
    cleanConfirm: 'Poistetaanko valitut tiedot?',
    cleanConfirmBtn: 'Poista nyt',
    cleanDoneAll: 'Kaikki paikalliset OriginWise-tiedot poistettu.',
    cleanDoneHistory: 'Aiemmat tarkistukset poistettu.',
    cleanDoneSettings: 'Asetukset palautettu oletuksiin.',
  },
  about: {
    title: 'Tietoja',
    tagline: 'Yksinkertainen Kiina-liittyvä tuotetarkistus',
    intro:
      'OriginWise auttaa näkemään nopeasti, näyttääkö tuote tai merkki liittyvän Kiinaan — alkuperäpaikka, valmistaja ja yritysyhteydet — valinnaisilla vähäisemmän osallisuuden vaihtoehdoilla. Tarkistukset pysyvät tällä laitteella.',
    body: 'OriginWise on yksinkertainen työkalu arkipäivän tuotteiden ja merkkien nopeaan Kiina-tarkistukseen. Tekoäly voi olla puutteellinen tai väärässä.',
    privacy: 'Ei tiliä. Historiasi pysyy tällä puhelimella/selaimessa.',
    license: 'MIT-lisenssi',
    licenseShort: 'MIT',
    openSourceTitle: 'Avoin lähdekoodi · MIT',
    openSourceBody:
      'Tämä projekti on vapaata ohjelmistoa MIT-lisenssillä. Voit käyttää, kopioida, muokata, yhdistää, julkaista, jakaa ja alilisensoida sitä — myös omaan käyttöönottoon omilla API-avaimillasi.',
    copyrightLine: 'Copyright © {year} {name}',
    licenseAsIs:
      'Toimitetaan ”sellaisenaan”, ilman takuuta. Katso lisenssin koko teksti GitHubista.',
    linkSource: 'Lähdekoodi',
    linkLicense: 'MIT-lisenssi',
    linkIssues: 'Ongelmat ja palaute',
    linkReleases: 'Julkaisut',
    linkSecurity: 'Tietoturvakäytäntö',
    privacyTitle: 'Yksityisyytesi',
    privacyLead:
      'Pidämme asiat yksinkertaisina: ei tiliä, ja tarkistushistoria pysyy puhelimellasi tai tietokoneellasi.',
    privacyBullet1:
      'Aiemmat tarkistukset, asetukset ja mieltymykset tallennetaan vain tähän selaimeen laitteellasi.',
    privacyBullet2: 'Ei kirjausta eikä pilvikopiota tarkistuspäiväkirjastasi.',
    privacyBullet3:
      'Voit pyyhkiä kaiken milloin tahansa Asetusten Poista paikalliset tiedot -kohdasta.',
    privacyBullet4:
      'Kun ajat tarkistuksen, nimi tai kuva lähetetään vain sitä vastausta varten. Emme säilytä pakkauksia tuoteluettelona.',
    privacyBullet5:
      'Kuvat pakataan laitteellasi ennen lähetystä eikä niitä tallenneta palvelintietueiksi.',
    privacyBullet6:
      'Kun live-verkkotutkimus on päällä, tuotteen nimi (ja etiketin teksti) lähetetään lisäksi kerran hakupalveluun: ensin Google Search Geminin kautta ja vain sen epäonnistuessa Brave Search tai Firecrawl. Edistymisvaiheet ja tulos kertovat todella käytetyn palvelun. Hakuja ei kirjata lokiin.',
    privacyPolicyLink: 'Tietosuojakäytäntö',
    termsLink: 'Käyttöehdot',
    designTitle: 'Miten se toimii',
    designLead:
      'Nopea moniagenttinen tekoälytarkistus, sitten kiinteä pisteytystaulukko — ei oikeudellinen tietokanta.',
    designLocalTitle: 'Mikä jää laitteellesi',
    designLocalBody:
      'Sovelluksen latauduttua historia, kieli, teema ja tarkistusasetukset tallennetaan vain tähän selaimeen. Tyhjennä sivuston tiedot tai käytä Poista paikalliset tiedot.',
    designWhyTitle: 'Miksi rakensimme sen näin',
    designWhy1: 'Nopeat mobiilitarkistukset ilman tiliä.',
    designWhy2: 'Historia pysyy sinulla — pyyhi se milloin tahansa.',
    designWhy3:
      'Tekoäly voi erehtyä; näytämme varaukset ja käsittelemme Taiwanin erillisenä maana tasoissa.',
    disclaimerTitle: 'Huomaa',
    disclaimerBody:
      'OriginWise on vain tiedoksi — ei oikeudellista, tulli- tai pakoteneuvontaa. Tekoäly ja tasotunnisteet voivat olla puutteellisia tai vääriä. Varmista kriittiset päätökset aina itse.',
    createdBy: 'Ylläpitäjä',
    contributionsWelcome: 'Issuet ja pull requestit ovat tervetulleita GitHubissa.',
  },
  how: {
    title: 'Miten se toimii',
    subtitle: 'Nopea Kiina-liittyvä tarkistus — pidä se yksinkertaisena',
    aimTitle: 'Mihin tämä sovellus on',
    aimBody:
      'Auttaa näkemään nopeasti, näyttääkö tuote tai merkki liittyvän Kiinaan — valmistettu siellä, yritysyhteydet jne. Ei syvä tutkimusväline, ei oikeudellinen tarkistus.',
    stepsTitle: 'Yksinkertaisesti',
    step1Title: 'Lähetät jotain',
    step1Body: 'Tuotenimen, merkin tai kuvan pakkauksesta.',
    step2Title: 'Etsimme tekoälyllä',
    step2Body:
      'Pieniä tarkistuksia: tuotteen paikka ja yritys (yhdessä), sitten nopea kaksoistarkistus. Valinnainen: merkki-/tuotevaihtoehdot, joissa vähemmän Kiina-osallisuutta, jos otat ne käyttöön.',
    step3Title: 'Saat yksinkertaisen tuloksen',
    step3Body:
      'Värimerkki: Liittymätön, Epäsuora, Suora tai Tuntematon — plus lyhyt miksi.',
    graphTitle: 'Koko kulku',
    graphHint: 'Syötteestäsi värimerkkiin.',
    flowYou: 'Sinä (nimi / kuva)',
    flowAi: 'Tekoälytarkistukset',
    flowProduct: 'Tuotteen paikka',
    flowCompany: 'Yritys',
    flowVerify: 'Kaksoistarkistus',
    flowScore: 'Yksinkertainen piste',
    flowResult: 'Väritulos',
    flowAiDetail:
      'Ensin tuotteen paikka + yritys, sitten nopea kaksoistarkistus.',
    flowScoreDetail: 'Yhdistämme vastaukset yhdeksi yksinkertaiseksi pisteeksi.',
    badgeTitle: 'Mitä värit tarkoittavat',
    badgeNone: 'Liittymätön — selvää Kiina-yhteyttä ei löytynyt',
    badgeIndirect: 'Epäsuora — heikompi tai osittainen yhteys',
    badgeDirect: 'Suora — selvä yhteys (esim. made in China tai pääkonttori siellä)',
    badgeUnknown: 'Tuntematon — ei tarpeeksi selkeää tietoa',
    twTitle: 'Taiwan',
    twBody:
      'Taiwan lasketaan täällä aina omaksi maaksi. Se ei yksinään laske ”Kiina-liittyväksi”.',
    evidenceTitle:
      'Milloin valmistusmaa lasketaan vahvistetuksi',
    evidenceBody:
      'Valmistusmaa näkyy vahvistettuna (viivakoodivastaavuus) vain, jos se on peräisin pakkausetiketin kuvasta tai jos verkkosivulla on sama viivakoodi (JAN/EAN) alkuperämerkinnän vieressä. Pelkän tuotenimen vastaavuus on enintään ”todennäköinen” (nimivastaavuus), ja sivu, jolla on useita kokoja tai versioita, jää vahvistamattomaksi. Jos reaaliaikainen verkkohaku ei ole käytettävissä, tulos perustuu vain mallin tietoihin ja kertoo sen.',
    flowWeb:
      'Verkkohaku',
    flowWebDetail:
      'Haetaan verkkosivuja tuotenimellä tai viivakoodilla ja tarkistetaan alkuperämerkintä.',
    privacyTitle: 'Tietosi',
    privacyBody:
      'Historia pysyy tällä laitteella, eikä kuvia tallenneta palvelimelle. Kun reaaliaikainen verkkohaku on päällä, tuotteen nimi tai viivakoodi lähetetään hakupalveluille. Tekoäly voi erehtyä – tarkista tärkeät päätökset aina itse.',
    tryBtn: 'Kokeile tarkistusta',
  },
  tier: {
    none: 'Liittymätön',
    indirect: 'Epäsuora',
    direct: 'Suora',
    unknown: 'Tuntematon',
  },
} satisfies MessageTree;
