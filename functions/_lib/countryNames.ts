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
  ['China', 'CN', ['china', 'mainland china', 'prc', 'p.r.c.', 'p.r. china', "people's republic of china"], ['中国', '中華人民共和国'], ['中國', '中國大陸', '中華人民共和國'], ['中国', '中国大陆', '中华人民共和国']],
  ['Hong Kong', 'HK', ['hong kong'], ['香港'], ['香港'], ['香港']],
  ['Macau', 'MO', ['macau', 'macao'], ['マカオ'], ['澳門'], ['澳门']],
  ['Taiwan', 'TW', ['taiwan', 'republic of china', 'r.o.c.', 'r.o.c', 'roc'], ['台湾', '中華民国'], ['台灣', '臺灣', '中華民國'], ['台湾', '中华民国']],
  ['Japan', 'JP', ['japan'], ['日本'], ['日本'], ['日本']],
  ['South Korea', 'KR', ['south korea', 'korea', 'republic of korea'], ['韓国', '大韓民国'], ['韓國', '南韓'], ['韩国']],
  ['North Korea', 'KP', ['north korea', 'n. korea', 'n.korea', 'n korea', 'dprk', 'd.p.r.k.', "democratic people's republic of korea"], ['北朝鮮'], ['北韓', '朝鮮民主主義人民共和國'], ['朝鲜', '北朝鲜', '北韩']],
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
export const COUNTRY_LIST_LATIN = [...new Set(ROWS.flatMap((r) => [r[0].toLowerCase(), ...r[2]]))]
  .sort(byLength)
  .map(esc)
  .join('|');

/** Every Japanese / Chinese name, longest first (no letter guard needed). */
export const COUNTRY_LIST_CJK = [...new Set(ROWS.flatMap((r) => [...r[3], ...r[4], ...r[5]]))]
  .sort(byLength)
  .map(esc)
  .join('|');
