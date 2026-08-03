/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Tag Manager container ID, e.g. GTM-XXXXXXX. Empty disables GTM. */
  readonly VITE_GTM_ID?: string;
  /**
   * Buy Me a Coffee / support URL. Empty hides the “Buy me a pint” UI.
   * Example: https://buymeacoffee.com/your-slug
   */
  readonly VITE_BUY_ME_A_PINT_URL?: string;
  /**
   * Optional official button image URL. If empty and URL is buymeacoffee.com/<slug>,
   * a default BMC button image is derived from the slug.
   */
  readonly VITE_BUY_ME_A_PINT_IMG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
