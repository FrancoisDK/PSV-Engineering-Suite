import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile(),
      {
        name: 'psv-standalone-html-plugin',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const builtIndex = path.resolve(distDir, 'index.html');
          const standaloneOut = path.resolve(distDir, 'PSV_Engineering_Suite.html');
          if (fs.existsSync(builtIndex)) {
            fs.copyFileSync(builtIndex, standaloneOut);
          }
        },
        configureServer(server) {
          server.middlewares.use('/__standalone_template__.html', (_req, res) => {
            const templatePath = path.resolve(__dirname, 'dist/PSV_Engineering_Suite.html');
            if (fs.existsSync(templatePath)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(fs.readFileSync(templatePath, 'utf-8'));
              return;
            }
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Standalone HTML template not built yet. Run "npm run build" first.');
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
