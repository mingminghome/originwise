import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { checkApiDevPlugin } from './vite.check-api.ts';

/** Inject Google Search Console meta when VITE_GOOGLE_SITE_VERIFICATION is set. */
function googleSiteVerificationPlugin(token: string): Plugin {
  return {
    name: 'google-site-verification',
    transformIndexHtml(html) {
      const t = token.trim();
      if (!t || !/^[A-Za-z0-9_-]+$/.test(t)) {
        return html.replace(
          /<!--\s*GOOGLE_SITE_VERIFICATION\s*-->/,
          '<!-- Google Search Console: set VITE_GOOGLE_SITE_VERIFICATION at build time -->'
        );
      }
      return html.replace(
        /<!--\s*GOOGLE_SITE_VERIFICATION\s*-->/,
        `<meta name="google-site-verification" content="${t}" />`
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gsc = env.VITE_GOOGLE_SITE_VERIFICATION ?? '';

  return {
    plugins: [
      react(),
      checkApiDevPlugin(),
      googleSiteVerificationPlugin(gsc),
    ],
  };
});
