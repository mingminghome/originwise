/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Tag Manager container ID, e.g. GTM-XXXXXXX. Empty disables GTM. */
  readonly VITE_GTM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
