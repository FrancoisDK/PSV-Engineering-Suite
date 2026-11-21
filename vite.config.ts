import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {build, defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

function getLatestSourceMtimeMs(dirPath: string): number {
  let latest = 0;
  if (!fs.existsSync(dirPath)) return latest;
  const entries = fs.readdirSync(dirPath, {withFileTypes: true});
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      latest = Math.max(latest, getLatestSourceMtimeMs(full));
    } else if (entry.isFile()) {
      const stat = fs.statSync(full);
      if (stat.mtimeMs > latest) latest = stat.mtimeMs;
    }
  }
  return latest;
}

let inFlightStandaloneBuild: Promise<void> | null = null;

async function ensureStandaloneTemplateBuilt(rootDir: string): Promise<string> {
  const distDir = path.resolve(rootDir, 'dist');
  const standaloneOut = path.resolve(distDir, 'PSV_Engineering_Suite.html');
  const indexHtmlPath = path.resolve(rootDir, 'index.html');
  const srcDir = path.resolve(rootDir, 'src');

  const srcLatestMtime = Math.max(
    fs.existsSync(indexHtmlPath) ? fs.statSync(indexHtmlPath).mtimeMs : 0,
    getLatestSourceMtimeMs(srcDir)
  );

  if (fs.existsSync(standaloneOut)) {
    const outMtime = fs.statSync(standaloneOut).mtimeMs;
    if (outMtime >= srcLatestMtime) {
      return standaloneOut;
    }
  }

  if (!inFlightStandaloneBuild) {
    inFlightStandaloneBuild = (async () => {
      try {
        await build({
          root: rootDir,
          configFile: path.resolve(rootDir, 'vite.config.ts'),
          mode: 'production',
          logLevel: 'warn',
        });
      } finally {
        inFlightStandaloneBuild = null;
      }
    })();
  }

  await inFlightStandaloneBuild;

  if (!fs.existsSync(standaloneOut)) {
    const builtIndex = path.resolve(distDir, 'index.html');
    if (fs.existsSync(builtIndex)) {
      fs.copyFileSync(builtIndex, standaloneOut);
    }
  }
  return standaloneOut;
}

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
          server.httpServer?.once('listening', () => {
            ensureStandaloneTemplateBuilt(__dirname).catch((err) => {
              console.warn('[psv-standalone-html-plugin] Background prebuild failed:', err);
            });
          });

          server.middlewares.use('/__standalone_template__.html', async (_req, res) => {
            try {
              const templatePath = await ensureStandaloneTemplateBuilt(__dirname);
              if (fs.existsSync(templatePath)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.end(fs.readFileSync(templatePath, 'utf-8'));
                return;
              }
              res.statusCode = 500;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end('Standalone HTML build finished without producing dist/PSV_Engineering_Suite.html.');
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(
                err instanceof Error
                  ? `Failed to build standalone HTML template: ${err.message}`
                  : 'Failed to build standalone HTML template.'
              );
            }
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
