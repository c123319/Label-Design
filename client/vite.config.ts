import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const templateStoreDir = path.resolve(__dirname, '../template-store');

/** 开发环境静态服务 template-store 目录 */
function templateStorePlugin() {
  const storeRoot = path.resolve(templateStoreDir);

  return {
    name: 'template-store',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent(req.url?.split('?')[0] ?? '');
        const prefix = '/template-store/';
        if (!url.startsWith(prefix) && url !== '/template-store') {
          next();
          return;
        }
        const relative = url === '/template-store' ? '' : url.slice(prefix.length);
        const filePath = path.resolve(storeRoot, relative);
        if (
          !filePath.startsWith(storeRoot + path.sep)
          && filePath !== storeRoot
        ) {
          next();
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          next();
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime: Record<string, string> = {
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.webp': 'image/webp',
        };
        res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: '/Label-Design/',
  plugins: [react(), templateStorePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
