import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { checkApiDevPlugin } from './vite.check-api.ts';

export default defineConfig({
  plugins: [react(), checkApiDevPlugin()],
});
