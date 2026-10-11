/**
 * One country list for made-in values: English label, ISO code, and the names
 * written on labels and pages (English, Japanese, Traditional and Simplified
 * Chinese). Shared by the label reader, the page reader and the display name.
 *
 * Several names are also ordinary words or US states (Turkey, Jordan, Chad,
 * Georgia, Niger, Guinea, Togo, Chile, Panama, Mali, Cuba). This list is only used
 * right after a made-in cue or as a made-in field value (產地 / 原産国 / COO /
 * Origin / Country of origin), never on free text or notes, which keep the
 * shorter COUNTRY_NAME_PATTERNS table in countryLabel.ts. Japanese names that
 * are common words (チリ, マリ) are left out.
 */
type Row = readonly [label: string, iso: string, en: readonly string[], ja: readonly string[], hant: readonly string[], hans: readonly string[]];

const ROWS: readonly Row[] = [
  ['China', 'CN', ['china', 'mainland china', 'prc', 'p.r.c.', 'p.r. china', "people's republic of china", 'people’s republic of china', 'people s republic of china', 'peoples republic of china'], ['中国', '中華人民共和国'], ['中國', '中國大陸', '中華人民共和國'], ['中国', '中国大陆', '中华人民共和国']],
  ['Hong Kong', 'HK', ['hong kong'], ['香港'], ['香港'], ['香港']],
  ['Macau', 'MO', ['macau', 'macao'], ['マカオ'], ['澳門'], ['澳门']],
  ['Taiwan', 'TW', ['taiwan', 'republic of china', 'r.o.c.', 'r.o.c', 'roc'], ['台湾', '中華民国'], ['台灣', '臺灣', '中華民國'], ['台湾', '中华民国']],
  ['Japan', 'JP', ['japan'], ['日本'], ['日本'], ['日本']],
  ['South Korea', 'KR', ['south korea', 'korea', 'republic of korea'], ['韓国', '大韓民国'], ['韓國', '南韓'], ['韩国']],
  ['North Korea', 'KP', ['north korea', 'n. korea', 'n.korea', 'n korea', 'dprk', 'd.p.r.k.', "democratic people's republic of korea", 'd.p.r. korea'], ['北朝鮮'], ['北韓', '朝鮮', '朝鮮民主主義人民共和國'], ['朝鲜', '北朝鲜', '北韩', '朝鲜民主主义人民共和国']],
  ['Vietnam', 'VN', ['vietnam', 'viet nam'], ['ベトナム'], ['越南'], ['越南']],
  ['Thailand', 'TH', ['thailand'], ['タイ'], ['泰國'], ['泰国']],
  ['Cambodia', 'KH', ['cambodia'], ['カンボジア'], ['柬埔寨'], ['柬埔寨']],
  ['Laos', 'LA', ['laos'], ['ラオス'], ['寮國'], ['老挝']],
  ['Myanmar', 'MM', ['myanmar', 'burma'], ['ミャンマー'], ['緬甸'], ['缅甸']],
  ['Malaysia', 'MY', ['malaysia'], ['マレーシア'], ['馬來西亞'], ['马来西亚']],
  ['Singapore', 'SG', ['singapore'], ['シンガポール'], ['新加坡'], ['新加坡']],
  ['Indonesia', 'ID', ['indonesia'], ['インドネシア'], ['印尼', '印度尼西亞'], ['印度尼西亚', '印尼']],
  ['Philippines', 'PH', ['philippines'], ['フィリピン'], ['菲律賓'], ['菲律宾']],
  ['India', 'IN', ['india'], ['インド'], ['印度'], ['印度']],
  ['Bangladesh', 'BD', ['bangladesh'], ['バングラデシュ'], ['孟加拉'], ['孟加拉国', '孟加拉']],
  ['Sri Lanka', 'LK', ['sri lanka'], ['スリランカ'], ['斯里蘭卡'], ['斯里兰卡']],
  ['Pakistan', 'PK', ['pakistan'], ['パキスタン'], ['巴基斯坦'], ['巴基斯坦']],
  ['Nepal', 'NP', ['nepal'], ['ネパール'], ['尼泊爾'], ['尼泊尔']],
  ['Mongolia', 'MN', ['mongolia'], ['モンゴル'], ['蒙古'], ['蒙古']],
  ['Kazakhstan', 'KZ', ['kazakhstan'], ['カザフスタン'], ['哈薩克'], ['哈萨克斯坦']],
  ['Uzbekistan', 'UZ', ['uzbekistan'], ['ウズベキスタン'], ['烏茲別克'], ['乌兹别克斯坦']],
  ['United Arab Emirates', 'AE', ['united arab emirates', 'uae'], ['アラブ首長国連邦'], ['阿拉伯聯合大公國', '阿聯'], ['阿联酋']],
  ['Saudi Arabia', 'SA', ['saudi arabia'], ['サウジアラビア'], ['沙烏地阿拉伯'], ['沙特阿拉伯']],
  ['Israel', 'IL', ['israel'], ['イスラエル'], ['以色列'], ['以色列']],
  ['Jordan', 'JO', ['jordan'], ['ヨルダン'], ['約旦'], ['约旦']],
  ['Lebanon', 'LB', ['lebanon'], ['レバノン'], ['黎巴嫩'], ['黎巴嫩']],
  ['Iran', 'IR', ['iran'], ['イラン'], ['伊朗'], ['伊朗']],
  ['Iraq', 'IQ', ['iraq'], ['イラク'], ['伊拉克'], ['伊拉克']],
  ['Qatar', 'QA', ['qatar'], ['カタール'], ['卡達'], ['卡塔尔']],
  ['Kuwait', 'KW', ['kuwait'], ['クウェート'], ['科威特'], ['科威特']],
  ['Oman', 'OM', ['oman'], ['オマーン'], ['阿曼'], ['阿曼']],
  ['Bahrain', 'BH', ['bahrain'], ['バーレーン'], ['巴林'], ['巴林']],
  ['Brunei', 'BN', ['brunei'], ['ブルネイ'], ['汶萊'], ['文莱']],
  ['Côte d’Ivoire', 'CI', ["côte d'ivoire", 'côte d’ivoire', "cote d'ivoire", 'cote d’ivoire', 'ivory coast'], ['コートジボワール'], ['象牙海岸'], ['科特迪瓦']],
  ['Turkey', 'TR', ['turkey', 'türkiye', 'turkiye'], ['トルコ'], ['土耳其'], ['土耳其']],
  ['Egypt', 'EG', ['egypt'], ['エジプト'], ['埃及'], ['埃及']],
  ['Morocco', 'MA', ['morocco'], ['モロッコ'], ['摩洛哥'], ['摩洛哥']],
  ['Tunisia', 'TN', ['tunisia'], ['チュニジア'], ['突尼西亞'], ['突尼斯']],
  ['Algeria', 'DZ', ['algeria'], ['アルジェリア'], ['阿爾及利亞'], ['阿尔及利亚']],
  ['South Africa', 'ZA', ['south africa'], ['南アフリカ'], ['南非'], ['南非']],
  ['Lesotho', 'LS', ['lesotho'], ['レソト'], ['賴索托'], ['莱索托']],
  ['Kenya', 'KE', ['kenya'], ['ケニア'], ['肯亞'], ['肯尼亚']],
  ['Tanzania', 'TZ', ['tanzania'], ['タンザニア'], ['坦尚尼亞'], ['坦桑尼亚']],
  ['Uganda', 'UG', ['uganda'], ['ウガンダ'], ['烏干達'], ['乌干达']],
  ['Ethiopia', 'ET', ['ethiopia'], ['エチオピア'], ['衣索比亞'], ['埃塞俄比亚']],
  ['Madagascar', 'MG', ['madagascar'], ['マダガスカル'], ['馬達加斯加'], ['马达加斯加']],
  ['Mauritius', 'MU', ['mauritius'], ['モーリシャス'], ['模里西斯'], ['毛里求斯']],
  ['Nigeria', 'NG', ['nigeria'], ['ナイジェリア'], ['奈及利亞'], ['尼日利亚']],
  ['Ghana', 'GH', ['ghana'], ['ガーナ'], ['迦納'], ['加纳']],
  ['Senegal', 'SN', ['senegal'], ['セネガル'], ['塞內加爾'], ['塞内加尔']],
  ['Chad', 'TD', ['chad'], ['チャド'], ['查德'], ['乍得']],
  ['Niger', 'NE', ['niger'], ['ニジェール'], ['尼日'], ['尼日尔']],
  ['Mali', 'ML', ['mali'], [], ['馬利'], ['马里']],
  ['Guinea', 'GN', ['guinea'], ['ギニア'], ['幾內亞'], ['几内亚']],
  ['Guinea-Bissau', 'GW', ['guinea-bissau', 'guinea bissau'], ['ギニアビサウ'], ['幾內亞比索'], ['几内亚比绍']],
  ['Togo', 'TG', ['togo'], ['トーゴ'], ['多哥'], ['多哥']],
  ['Germany', 'DE', ['germany'], ['ドイツ'], ['德國'], ['德国']],
  ['France', 'FR', ['france'], ['フランス'], ['法國'], ['法国']],
  ['Italy', 'IT', ['italy'], ['イタリア'], ['義大利', '意大利'], ['意大利']],
  ['Spain', 'ES', ['spain'], ['スペイン'], ['西班牙'], ['西班牙']],
  ['Portugal', 'PT', ['portugal'], ['ポルトガル'], ['葡萄牙'], ['葡萄牙']],
  ['United Kingdom', 'GB', ['united kingdom', 'great britain', 'britain', 'england'], ['イギリス', '英国'], ['英國'], ['英国']],
  ['Ireland', 'IE', ['ireland'], ['アイルランド'], ['愛爾蘭'], ['爱尔兰']],
  ['Netherlands', 'NL', ['netherlands', 'holland'], ['オランダ'], ['荷蘭'], ['荷兰']],
  ['Belgium', 'BE', ['belgium'], ['ベルギー'], ['比利時'], ['比利时']],
  ['Luxembourg', 'LU', ['luxembourg'], ['ルクセンブルク'], ['盧森堡'], ['卢森堡']],
  ['Switzerland', 'CH', ['switzerland'], ['スイス'], ['瑞士'], ['瑞士']],
  ['Austria', 'AT', ['austria'], ['オーストリア'], ['奧地利'], ['奥地利']],
  ['Denmark', 'DK', ['denmark'], ['デンマーク'], ['丹麥'], ['丹麦']],
  ['Sweden', 'SE', ['sweden'], ['スウェーデン'], ['瑞典'], ['瑞典']],
  ['Norway', 'NO', ['norway'], ['ノルウェー'], ['挪威'], ['挪威']],
  ['Finland', 'FI', ['finland'], ['フィンランド'], ['芬蘭'], ['芬兰']],
  ['Iceland', 'IS', ['iceland'], ['アイスランド'], ['冰島'], ['冰岛']],
  ['Poland', 'PL', ['poland'], ['ポーランド'], ['波蘭'], ['波兰']],
  ['Czech Republic', 'CZ', ['czech republic', 'czechia'], ['チェコ'], ['捷克'], ['捷克']],
  ['Slovakia', 'SK', ['slovakia'], ['スロバキア'], ['斯洛伐克'], ['斯洛伐克']],
  ['Hungary', 'HU', ['hungary'], ['ハンガリー'], ['匈牙利'], ['匈牙利']],
  ['Romania', 'RO', ['romania'], ['ルーマニア'], ['羅馬尼亞'], ['罗马尼亚']],
  ['Bulgaria', 'BG', ['bulgaria'], ['ブルガリア'], ['保加利亞'], ['保加利亚']],
  ['Greece', 'GR', ['greece'], ['ギリシャ'], ['希臘'], ['希腊']],
  ['Slovenia', 'SI', ['slovenia'], ['スロベニア'], ['斯洛維尼亞'], ['斯洛文尼亚']],
  ['Croatia', 'HR', ['croatia'], ['クロアチア'], ['克羅埃西亞'], ['克罗地亚']],
  ['Serbia', 'RS', ['serbia'], ['セルビア'], ['塞爾維亞'], ['塞尔维亚']],
  ['Bosnia and Herzegovina', 'BA', ['bosnia and herzegovina', 'bosnia'], ['ボスニア・ヘルツェゴビナ'], ['波士尼亞與赫塞哥維納'], ['波斯尼亚和黑塞哥维那']],
  ['North Macedonia', 'MK', ['north macedonia', 'macedonia'], ['北マケドニア'], ['北馬其頓'], ['北马其顿']],
  ['Albania', 'AL', ['albania'], ['アルバニア'], ['阿爾巴尼亞'], ['阿尔巴尼亚']],
  ['Lithuania', 'LT', ['lithuania'], ['リトアニア'], ['立陶宛'], ['立陶宛']],
  ['Latvia', 'LV', ['latvia'], ['ラトビア'], ['拉脫維亞'], ['拉脱维亚']],
  ['Estonia', 'EE', ['estonia'], ['エストニア'], ['愛沙尼亞'], ['爱沙尼亚']],
  ['Ukraine', 'UA', ['ukraine'], ['ウクライナ'], ['烏克蘭'], ['乌克兰']],
  ['Belarus', 'BY', ['belarus'], ['ベラルーシ'], ['白俄羅斯'], ['白俄罗斯']],
  ['Moldova', 'MD', ['moldova'], ['モルドバ'], ['摩爾多瓦'], ['摩尔多瓦']],
  ['Russia', 'RU', ['russia'], ['ロシア'], ['俄羅斯'], ['俄罗斯']],
  ['Georgia', 'GE', ['georgia'], ['ジョージア'], ['喬治亞'], ['格鲁吉亚']],
  ['Armenia', 'AM', ['armenia'], ['アルメニア'], ['亞美尼亞'], ['亚美尼亚']],
  ['Azerbaijan', 'AZ', ['azerbaijan'], ['アゼルバイジャン'], ['亞塞拜然'], ['阿塞拜疆']],
  ['Malta', 'MT', ['malta'], ['マルタ'], ['馬爾他'], ['马耳他']],
  ['Cyprus', 'CY', ['cyprus'], ['キプロス'], ['賽普勒斯'], ['塞浦路斯']],
  ['United States', 'US', ['united states', 'united states of america', 'usa', 'u.s.a.'], ['アメリカ', '米国'], ['美國'], ['美国']],
  ['Canada', 'CA', ['canada'], ['カナダ'], ['加拿大'], ['加拿大']],
  ['Mexico', 'MX', ['mexico'], ['メキシコ'], ['墨西哥'], ['墨西哥']],
  ['Guatemala', 'GT', ['guatemala'], ['グアテマラ'], ['瓜地馬拉'], ['危地马拉']],
  ['Honduras', 'HN', ['honduras'], ['ホンジュラス'], ['宏都拉斯'], ['洪都拉斯']],
  ['El Salvador', 'SV', ['el salvador'], ['エルサルバドル'], ['薩爾瓦多'], ['萨尔瓦多']],
  ['Nicaragua', 'NI', ['nicaragua'], ['ニカラグア'], ['尼加拉瓜'], ['尼加拉瓜']],
  ['Costa Rica', 'CR', ['costa rica'], ['コスタリカ'], ['哥斯大黎加'], ['哥斯达黎加']],
  ['Panama', 'PA', ['panama'], ['パナマ'], ['巴拿馬'], ['巴拿马']],
  ['Dominican Republic', 'DO', ['dominican republic'], ['ドミニカ共和国'], ['多明尼加'], ['多米尼加']],
  ['Cuba', 'CU', ['cuba'], ['キューバ'], ['古巴'], ['古巴']],
  ['Haiti', 'HT', ['haiti'], ['ハイチ'], ['海地'], ['海地']],
  ['Jamaica', 'JM', ['jamaica'], ['ジャマイカ'], ['牙買加'], ['牙买加']],
  ['Colombia', 'CO', ['colombia'], ['コロンビア'], ['哥倫比亞'], ['哥伦比亚']],
  ['Peru', 'PE', ['peru'], ['ペルー'], ['秘魯'], ['秘鲁']],
  ['Ecuador', 'EC', ['ecuador'], ['エクアドル'], ['厄瓜多'], ['厄瓜多尔']],
  ['Chile', 'CL', ['chile'], [], ['智利'], ['智利']],
  ['Argentina', 'AR', ['argentina'], ['アルゼンチン'], ['阿根廷'], ['阿根廷']],
  ['Brazil', 'BR', ['brazil'], ['ブラジル'], ['巴西'], ['巴西']],
  ['Uruguay', 'UY', ['uruguay'], ['ウルグアイ'], ['烏拉圭'], ['乌拉圭']],
  ['Paraguay', 'PY', ['paraguay'], ['パラグアイ'], ['巴拉圭'], ['巴拉圭']],
  ['Bolivia', 'BO', ['bolivia'], ['ボリビア'], ['玻利維亞'], ['玻利维亚']],
  ['Venezuela', 'VE', ['venezuela'], ['ベネズエラ'], ['委內瑞拉'], ['委内瑞拉']],
  ['Australia', 'AU', ['australia'], ['オーストラリア'], ['澳洲', '澳大利亞'], ['澳大利亚']],
  ['New Zealand', 'NZ', ['new zealand'], ['ニュージーランド'], ['紐西蘭'], ['新西兰']],
  ['Fiji', 'FJ', ['fiji'], ['フィジー'], ['斐濟'], ['斐济']],
  // Not a country, but a made-in value on labels ("Made in the EU" / "Made in European Union").
  ['European Union', 'EU', ['european union'], ['欧州連合'], ['歐盟'], ['欧盟']],
];

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const BY_NAME = new Map<string, Row>();
for (const r of ROWS) {
  for (const n of [r[0], ...r[2], ...r[3], ...r[4], ...r[5]]) if (!BY_NAME.has(norm(n))) BY_NAME.set(norm(n), r);
}

/** English label for a country name in any of the four scripts ("カンボジア" → Cambodia). */
export function countryNameLabel(name: string): string | undefined {
  return BY_NAME.get(norm(name))?.[0];
}

/** ISO 3166 code for an English label or alias. */
export function countryNameIso(name: string): string | undefined {
  return BY_NAME.get(norm(name))?.[1];
}

/** Traditional Chinese display name for an English label or alias. */
export function countryNameZhHant(name: string): string | undefined {
  return BY_NAME.get(norm(name))?.[4][0];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
const byLength = (a: string, b: string) => b.length - a.length;

/** Every Latin name, longest first, as a regex alternation (wrap with letter guards). */
const ACCENTED: Record<string, string> = { a: '[aàáâãäå]', e: '[eèéêë]', i: '[iìíîï]', o: '[oòóôõöø]', u: '[uùúûü]', c: '[cç]', n: '[nñ]' };
// r37: every Latin alias is also listed without its accents ("méxico" / "mexico").
export const COUNTRY_LIST_LATIN = [...new Set(ROWS.flatMap((r) => [r[0].toLowerCase(), ...r[2]]).flatMap((n) => [n, n.normalize('NFKD').replace(/\p{M}+/gu, '')]))]
  .sort(byLength)
  .map(esc)
  .join('|');
/** r37: COUNTRY_LIST_LATIN for regexes: each letter also matches its accented forms ("México" as well as "Mexico"). */
export const COUNTRY_LIST_LATIN_RE = COUNTRY_LIST_LATIN.split('|')
  .map((n) => n.replace(/[aeioucn]/g, (c) => ACCENTED[c]!))
  .join('|');

/**
 * r44 (Chief, closed rule): 朝鮮 / 朝鲜 is also the first half of many other words (朝鮮半島, 朝鮮族, 朝鮮人參, 朝鮮產業,
 * 北朝鮮族), so the North Korea names below count only as the WHOLE value: from the line start or a label colon
 * (spaces trimmed) to the end of the line, with at most one made-in word after the name (製 / 製造 / 產 / 生產 / 製品 /
 * 產品 and the 制 / 产 / 産 variants) and then only spaces, closing brackets or a trailing 。 ！ ； (or ASCII ! ;). After a space, inside
 * brackets or in a list value (朝鮮、中國) they give no country. The value ends at the next label on the line
 * (產地：朝鮮 品牌：Cybex is North Korea); a second label naming another place is caught by koreaListLine. Rare real values beyond this are accepted misses.
 */
const BOUNDED_CJK = new Set(['朝鮮', '朝鲜', '北朝鮮', '北朝鲜', '朝鮮民主主義人民共和國', '朝鲜民主主义人民共和国']);
const BOUNDED_SUFFIX = '(?:[製制][造品]?|[產产産]品?|生[產产産])';
const boundedCjk = (n: string) =>
  `(?<=(?:^|\\n|[:：])[ \\t\\u3000]*)${n}(?=${BOUNDED_SUFFIX}?[ \\t\\u3000)）\\]】」〕]*[。！!；;]?(?:[ \\t\\u3000]+[^\\s:：]{1,8}[:：][^\\n]*)?[ \\t\\u3000]*(?![^\\n]))`;

/** Every Japanese / Chinese name, longest first (no letter guard needed). */
export const COUNTRY_LIST_CJK = [...new Set(ROWS.flatMap((r) => [...r[3], ...r[4], ...r[5]]))]
  .sort(byLength)
  .map((n) => (BOUNDED_CJK.has(n) ? boundedCjk(esc(n)) : esc(n)))
  .join('|');

/**
 * r44 (Chief, closed rule): an origin value that names 朝鮮 / 朝鲜 as a place AND another country (in the same value or
 * under another origin label on the line) never confirms any of them;
 * whatever joins them (產地：中國/朝鮮, 產地：中國（朝鮮）, 產地：朝鮮及中國, 產地：朝鮮 原產地：中國). 朝鮮 is a place here
 * when it is not the first half of another word: after it comes a made-in word, a joining word (及 / 和 / 與 / 与 /
 * 或), punctuation, a space or the end of the line (延邊朝鮮族自治州 is no 朝鮮 place, so 產地：中國延邊朝鮮族自治州 is China).
 * Other labels (品牌, 品名, 代理, 進口商, 經銷, 地址 …) end the value; a line with no label is read whole.
 * Scoped to 朝鮮 only: other countries' list values read as before.
 */
const KOREA_PLACE_RE = new RegExp(
  `(?:北)?朝[鮮鲜](?:民主主[義义]人民共和[國国])?(?=${BOUNDED_SUFFIX}?(?:[^\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]|[及和與与或]|$))`,
  'g',
);
/**
 * r44 (Chief, closed list): origin labels, matched after folding 产/産→產, 国→國, 制→製; any label containing 產地, 產國
 * or 原產 is one too. A second place under any of them blocks; every other label (品牌, 品名, 代理,
 * 進口商, 經銷, 地址, 製造商地址, 販售 …) ends the origin value and never counts.
 */
const ORIGIN_LABEL_RE =
  /^(?:原?產地|原產國|製造地|組裝地|加工地|生產地|製造國|made\s+in|country\s+of\s+origin)$|產地|產國|原產/i;
/** 產 / 产 / 産, 國 / 国, 製 / 制, 組 / 组, 裝 / 装 folded before a label is matched (原產国, 产地國 …). */
const foldLabel = (l: string) =>
  l.trim().replace(/[产産]/g, '產').replace(/国/g, '國').replace(/制/g, '製').replace(/组/g, '組').replace(/装/g, '裝');
const LINE_LABEL_RE = /(country\s+of\s+origin|made\s+in|[^\s:：]{1,8})[ \t\u3000]*[:：]/gi;
/** A North Korea name as the whole value: at most one made-in word, then only spaces, closing brackets or 。！；. */
const KOREA_WHOLE_VALUE_RE = new RegExp(
  `^[ \\t\\u3000]*(?:北)?朝[鮮鲜](?:民主主[義义]人民共和[國国])?${BOUNDED_SUFFIX}?[ \\t\\u3000)）\\]】」〕]*[。！!；;]?[ \\t\\u3000]*$`,
);

/** The origin values on a labelled line (cut at the next label), or the whole line when it has no label. */
function koreaOriginValues(line: string): string[] {
  const labels = [...line.matchAll(LINE_LABEL_RE)];
  if (!labels.length) return [line];
  const out: string[] = [];
  labels.forEach((m, i) => {
    if (!ORIGIN_LABEL_RE.test(foldLabel(m[1]!))) return;
    const to = i + 1 < labels.length ? labels[i + 1]!.index! : line.length;
    out.push(line.slice(m.index! + m[0].length, to));
  });
  return out;
}

/**
 * True when the line must give no country: an origin value names 朝鮮 / 朝鲜 as a place (not the first half of another
 * word like 朝鮮族) and the origin values are not all a bare North Korea name. That covers a second place in the same
 * value (any separator or bracket), a dangling list mark (產地：朝鮮、), and another place under a second origin label.
 */
export function koreaListLine(text: string, index: number): boolean {
  const ls = text.lastIndexOf('\n', index - 1) + 1;
  const le = text.indexOf('\n', index);
  const line = text.slice(ls, le < 0 ? text.length : le);
  if (!/朝[鮮鲜]/.test(line)) return false;
  const values = koreaOriginValues(line);
  const hasKorea = values.some((v) => {
    KOREA_PLACE_RE.lastIndex = 0;
    return KOREA_PLACE_RE.test(v);
  });
  if (!hasKorea) return false;
  return !values.every((v) => KOREA_WHOLE_VALUE_RE.test(v) || !v.trim());
}

/** r44: every line koreaListLine rejects, blanked to spaces (same length) before any claim or field reader runs. */
export function blankKoreaListLines(text: string): string {
  if (!/朝[鮮鲜]/.test(text)) return text;
  return text
    .split('\n')
    .map((line) => (koreaListLine(line, 0) ? ' '.repeat(line.length) : line))
    .join('\n');
}


