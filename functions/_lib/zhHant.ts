/**
 * Clean model-written text for zh-Hant readers: Simplified characters the
 * model sometimes slips in (具体, 硅胶…) and English words left inside
 * Chinese sentences (Japan, made-in, SKU, unknown).
 *
 * Only characters that never appear in correct Traditional text are mapped,
 * so running this over already-Traditional text is a no-op. Server-fixed
 * English sentences are left alone (the client translates them by exact match).
 */

const PHRASES: [string, string][] = [
  ['硅胶', '矽膠'],
  ['硅膠', '矽膠'],
  ['硅', '矽'],
  ['具体', '具體'],
];

/** Simplified-only → Traditional (one char each, no ambiguous pairs). */
const CHARS: Record<string, string> = {
  体: '體', 国: '國', 产: '產', 标: '標', 签: '籤', 码: '碼', 条: '條', 厂: '廠',
  质: '質', 组: '組', 装: '裝', 头: '頭', 盖: '蓋', 进: '進', 来: '來', 为: '為',
  与: '與', 这: '這', 个: '個', 们: '們', 说: '說', 资: '資', 讯: '訊', 网: '網',
  页: '頁', 关: '關', 联: '聯', 东: '東', 亚: '亞', 韩: '韓', 应: '應', 该: '該',
  无: '無', 确: '確', 认: '認', 证: '證', 检: '檢', 测: '測', 种: '種', 类: '類',
  别: '別', 区: '區', 时: '時', 间: '間', 处: '處', 门: '門', 现: '現', 实: '實',
  际: '際', 单: '單', 双: '雙', 么: '麼', 购: '購', 买: '買', 卖: '賣', 价: '價',
  场: '場', 机: '機', 构: '構', 设: '設', 计: '計', 号: '號', 图: '圖', 线: '線',
  级: '級', 编: '編', 输: '輸', 销: '銷', 务: '務', 业: '業', 专: '專',
  经: '經', 营: '營', 总: '總', 罗: '羅', 马: '馬', 尔: '爾', 兰: '蘭',
  泪: '淚', 读: '讀', 记: '記', 录: '錄', 数: '數', 据: '據', 显: '顯',
  仅: '僅', 视: '視', 觉: '覺',
};

const COUNTRY_ZH: Record<string, string> = {
  Japan: '日本', China: '中國', Taiwan: '台灣', 'Hong Kong': '香港',
  Korea: '韓國', 'South Korea': '韓國', Thailand: '泰國', Vietnam: '越南',
  Malaysia: '馬來西亞', Indonesia: '印尼', Philippines: '菲律賓', India: '印度',
  Singapore: '新加坡', Germany: '德國', France: '法國', Italy: '義大利',
  Spain: '西班牙', Portugal: '葡萄牙', Netherlands: '荷蘭', Poland: '波蘭',
  'Czech Republic': '捷克', Switzerland: '瑞士', Sweden: '瑞典', Denmark: '丹麥',
  'United Kingdom': '英國', UK: '英國', 'United States': '美國', USA: '美國',
  US: '美國', Canada: '加拿大', Mexico: '墨西哥', Turkey: '土耳其',
  Australia: '澳洲', 'New Zealand': '紐西蘭', Israel: '以色列',
};

const CJK_RE = /[\u3400-\u9fff]/;
const COUNTRY_ALT = Object.keys(COUNTRY_ZH)
  .sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/ /g, '\\s+'))
  .join('|');
const MADE_IN_COUNTRY_RE = new RegExp(`\\bmade[- ]?in\\s+(${COUNTRY_ALT})\\b`, 'gi');
const COUNTRY_RE = new RegExp(`(?<![A-Za-z])(${COUNTRY_ALT})(?![A-Za-z])`, 'g');

function zhCountry(name: string): string {
  const key = Object.keys(COUNTRY_ZH).find(
    (k) => k.toLowerCase() === name.replace(/\s+/g, ' ').toLowerCase()
  );
  return key ? COUNTRY_ZH[key] : name;
}

/** Simplified → Traditional for the mapped characters only. */
export function toTraditionalZh(text: string): string {
  if (!text || !CJK_RE.test(text)) return text;
  let out = text;
  for (const [a, b] of PHRASES) out = out.split(a).join(b);
  return out.replace(/[\u3400-\u9fff]/g, (ch) => CHARS[ch] ?? ch);
}

/**
 * English words inside a Chinese sentence → Chinese. Skips strings with no
 * CJK (pure English is a server line or a proper name) and any string that
 * contains one of `keep` (server sentences the client matches exactly).
 */
export function zhEnglishLeftovers(text: string, keep: readonly string[] = []): string {
  if (!text || !CJK_RE.test(text)) return text;
  if (keep.some((k) => k && text.includes(k))) return text;
  // Lines opening in English are server text (e.g. a made-in conflict note
  // carrying a Chinese label) or quotes; leave them whole.
  if (/^\s*[A-Za-z]/.test(text)) return text;
  return text
    .replace(MADE_IN_COUNTRY_RE, (_, c: string) => `${zhCountry(c)}製`)
    .replace(/\bmade[- ]?in\b/gi, '產地')
    .replace(/\bSKU\b/g, '商品編號')
    .replace(/\bunknown\b/gi, '未知')
    .replace(COUNTRY_RE, (c: string) => zhCountry(c));
}

export function fixZhHantText(text: string, keep: readonly string[] = []): string {
  return zhEnglishLeftovers(toTraditionalZh(text), keep);
}

/** Walk a result and fix every string, except the skipped top-level keys. */
export function fixZhHantDeep<T>(value: T, keep: readonly string[], skip: ReadonlySet<string>): T {
  const walk = (v: unknown, depth: number): unknown => {
    if (typeof v === 'string') return fixZhHantText(v, keep);
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        out[k] = depth === 0 && skip.has(k) ? x : walk(x, depth + 1);
      }
      return out;
    }
    return v;
  };
  return walk(value, 0) as T;
}
