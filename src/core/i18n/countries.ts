/**
 * Country names in the reader's language. The server and the models write
 * country fields in English ("China", "Germany"); the UI shows them in the
 * locale of `t` (zh-Hant: 中國 / 德國 / 泰國, others via Intl region names).
 */
import { countryNameIso } from '../../../functions/_lib/countryNames';
import { zhCountryText } from '../../../functions/_lib/zhHant';
import { localeOfT, type TFunction } from './index';
import { localeTag } from './locales';

/** English country name → ISO 3166 region code (for Intl.DisplayNames). */
const ISO: Record<string, string> = {
  china: 'CN', 'mainland china': 'CN', prc: 'CN', "people's republic of china": 'CN',
  'hong kong': 'HK', macau: 'MO', macao: 'MO', taiwan: 'TW', japan: 'JP',
  korea: 'KR', 'south korea': 'KR', 'republic of korea': 'KR', thailand: 'TH',
  vietnam: 'VN', 'viet nam': 'VN', malaysia: 'MY', indonesia: 'ID', philippines: 'PH',
  india: 'IN', singapore: 'SG', germany: 'DE', france: 'FR', italy: 'IT', spain: 'ES',
  portugal: 'PT', netherlands: 'NL', poland: 'PL', 'czech republic': 'CZ', czechia: 'CZ',
  switzerland: 'CH', sweden: 'SE', denmark: 'DK', finland: 'FI', norway: 'NO',
  austria: 'AT', belgium: 'BE', ireland: 'IE', hungary: 'HU', romania: 'RO',
  greece: 'GR', slovakia: 'SK', 'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB',
  england: 'GB', 'united states': 'US', usa: 'US', us: 'US', canada: 'CA', mexico: 'MX',
  brazil: 'BR', turkey: 'TR', australia: 'AU', 'new zealand': 'NZ', israel: 'IL',
  cambodia: 'KH', bangladesh: 'BD', 'sri lanka': 'LK', myanmar: 'MM', pakistan: 'PK',
};

const displayCache = new Map<string, Intl.DisplayNames | null>();

function regionNames(tag: string): Intl.DisplayNames | null {
  if (!displayCache.has(tag)) {
    let dn: Intl.DisplayNames | null = null;
    try {
      dn = new Intl.DisplayNames([tag], { type: 'region' });
    } catch {
      dn = null;
    }
    displayCache.set(tag, dn);
  }
  return displayCache.get(tag) ?? null;
}

/** One country value in the reader's language; unknown text passes through. */
export function localizeCountry(t: TFunction, value: string | undefined | null): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  const locale = localeOfT(t);
  if (locale === 'en') return s;
  if (locale === 'zh-Hant') return zhCountryText(s);
  const code = ISO[s.toLowerCase().replace(/\s+/g, ' ').replace(/’/g, "'")] ?? countryNameIso(s);
  if (!code) return s;
  const name = regionNames(localeTag(locale))?.of(code);
  return name && name !== code ? name : s;
}
