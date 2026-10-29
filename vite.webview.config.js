import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

export default defineConfig((env) => mergeConfig(baseConfig(env), {
  build: {
    outDir: 'android-card-agent/.work/web-dist',
    emptyOutDir: true,
    copyPublicDir: false,
  },
  plugins: [{
    name: 'anping-webview-document',
    transformIndexHtml(html) {
      return html.replace('<html lang="en">', '<html lang="th" class="anping-webview">');
    },
  }],
}));
