/** Test helper: the save path's UI strip (CAPTURE_UI_SELECTOR) on static markup. */
import { CAPTURE_UI_SELECTOR } from '../core/util/sectionImage';

export function stripUiForCapture(markup: string): string {
  if (CAPTURE_UI_SELECTOR !== '[data-section-share="ui"], [role="tooltip"]') {
    throw new Error('capture UI selector changed: update stripUiForCapture');
  }
  let out = markup;
  for (;;) {
    const m = /<(\w+)\b[^>]*(?:data-section-share="ui"|role="tooltip")[^>]*>/.exec(out);
    if (!m) return out;
    const re = new RegExp(`<${m[1]}\\b[^>]*>|</${m[1]}>`, 'g');
    re.lastIndex = m.index + m[0].length;
    let depth = 1;
    let end = out.length;
    for (let x = re.exec(out); x; x = re.exec(out)) {
      depth += x[0].startsWith('</') ? -1 : 1;
      if (!depth) {
        end = x.index + x[0].length;
        break;
      }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
}
