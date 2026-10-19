/**
 * Fixed English lines older results still carry. The UI maps each exact
 * line to `check.srv.<key>`. Keep this module free of other imports — the
 * client bundles it.
 */

const TAIL =
  'made-in and part countries are more conservative (model knowledge only).';

export const SERVER_TEXT = {
  partOmittedNoEvidence:
    'Part country omitted: no Search/OCR evidence (brand HQ is not a part COO).',
  partOmittedUnconfirmed:
    'Part country omitted: not confirmed by Search/OCR for this part.',
  madeInOmittedBrand:
    'Made-in omitted: it matched brand/design country without factory/COO evidence.',
  madeInOmittedOwnership:
    'Made-in omitted: China came from ownership/parent signals only — not a SKU/label/retailer COO.',
  cooUnconfirmedSeeParts:
    'Final COO unconfirmed — see components/global line or parts for candidates (not confirmed made-in).',
  cooUnconfirmedNoLabel:
    'Final COO unconfirmed — no SKU/label country of origin; do not invent made-in.',
  cooUnconfirmedNoBarcode:
    'Final made-in unconfirmed; other countries are candidates only.',
  cooUnconfirmedCandidates:
    'Final COO unconfirmed — candidates below are queried signals, not a stamped made-in label.',
  distributorOmitted:
    'Local distributor / market agent omitted from parents (not a legal owner).',
  chinaLinkUnclear: 'China link unclear — do not treat as confirmed non-China.',
  verifyConflict: 'Verification reported conflicting signals',
  companyNotAssessed: 'Company/ownership data not assessed',
  taiwanSeparate: 'Taiwan is treated as a separate country for relation tiers',
  webUnavailableLabel:
    'Live web research unavailable — part countries come from the package label photo, not Search.',
  webFail_model_unavailable: `Live web Search models were unavailable on this API key — ${TAIL}`,
  webFail_search_grounding_unavailable: `Live Google Search grounding unavailable on this API key — ${TAIL}`,
  webFail_upstream_credits: `AI service credits used up (prepaid balance empty) — ${TAIL}`,
  webFail_upstream_quota: `Daily free Google Search quota used up — try again after the daily reset; ${TAIL}`,
  webFail_upstream_unavailable: `Live web research timed out or upstream was busy — ${TAIL}`,
  webFail_empty_response: `Live web research returned an empty reply — ${TAIL}`,
  webFail_disabled: `Live web research was disabled for this check — ${TAIL}`,
  webFail_gemini_not_configured: `Gemini not configured for live web — ${TAIL}`,
  webFail_no_entity: `No product name for live web research — ${TAIL}`,
  webFail_default: `No live web research for this check — ${TAIL}`,
  altsAim:
    'Alternative brands/products aim for lower China involvement (not merely similar). Tiers are estimates; HQ alone does not prove non-China manufacture.',
  altsNone:
    'No lower China-involvement brand/product alternatives found with enough confidence.',
  sumCooUnconfirmed: 'Final COO unconfirmed',
  tierUnknown: 'Insufficient evidence to assess China-related links.',
  tierNone: 'No China-related links found from available signals.',
  tierDirect: 'Direct China-related signals found.',
  tierIndirect: 'Indirect China-related signals found.',
} as const;

export type ServerTextKey = keyof typeof SERVER_TEXT;

/** Older cached conflict notes. The UI still maps these exact sentences. */
export const COO_CONFLICT_CHINA_RE =
  /^Final COO unconfirmed — (\S+) signal \((.+)\) conflicts with China made-in; ownership\/parent alone cannot stamp made-in\.$/;
export const COO_CONFLICT_MADEIN_RE =
  /^Final COO unconfirmed — (\S+) signal \((.+)\) conflicts with made-in (.+); keeping candidates only\.$/;

/** Summary segments (joined with " · "). */
export const SUMMARY_PREFIX = {
  madeIn: 'Made in: ',
  candidates: 'Candidates: ',
  brandOrigin: 'Brand origin: ',
  components: 'Components/global line: ',
  parts: 'Parts: ',
  hq: 'HQ: ',
  company: 'Company: ',
} as const;

export const SUMMARY_SEP = ' · ';
