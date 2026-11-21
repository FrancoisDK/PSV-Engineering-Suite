import {
  APPLICATION_VERSION,
  createBlankProjectDocument,
  PROJECT_SCHEMA_VERSION,
} from '../constants/defaultFactors';
import { ProjectDocument } from '../models/calculationTypes';

export interface StandaloneExportOptions {
  mode: 'blank' | 'populated';
  includeCurrentProjectData: boolean;
  includeAllScenarios: boolean;
  includeAuditTrail: boolean;
  includeRevisionHistory: boolean;
  includeEngineeringNotes: boolean;
  includeDemonstrationCases: boolean;
  projectNameOverride: string;
  equipmentTagOverride: string;
  psvTagOverride: string;
  revisionOverride: string;
}

export interface EmbeddedStandalonePayload {
  projectDocument: ProjectDocument | null;
  includeDemonstrationCases: boolean;
  exportedAt: string;
  exportMode: 'blank' | 'populated';
}

/**
 * Safely escapes JSON for embedding inside an HTML <script> tag
 * so sequences like </script> or U+2028/U+2029 cannot break script context.
 */
export function escapeJsonForHtmlScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Detects whether the current runtime is executing from a self-contained single-file
 * production bundle (no external module script src="/src/main.tsx") vs Vite dev mode.
 */
export function isRunningInStandaloneOrProductionBundle(): boolean {
  if (typeof document === 'undefined') return false;
  const externalScripts = Array.from(document.querySelectorAll('script[src]'));
  const hasDevSrc = externalScripts.some((s) => {
    const src = s.getAttribute('src') || '';
    return src.includes('/src/main') || src.includes('@vite/client');
  });
  return !hasDevSrc && externalScripts.length === 0;
}

/**
 * Obtains a clean self-contained production HTML template:
 * 1) In Vite dev mode, fetches /__standalone_template__.html served from dist/PSV_Engineering_Suite.html.
 * 2) When running inside the single-file production/standalone HTML itself (including file://),
 *    clones the clean document shell (clearing #root and resetting embedded project script).
 */
async function obtainBundledApplicationTemplate(): Promise<string> {
  const isDev = !isRunningInStandaloneOrProductionBundle();

  if (isDev) {
    const resp = await fetch('/__standalone_template__.html', { cache: 'no-store' });
    if (!resp.ok) {
      throw new Error(
        'Production single-file template is not available in dev server. Run "npm run build" first to generate dist/PSV_Engineering_Suite.html.'
      );
    }
    const text = await resp.text();
    if (!text.includes('id="root"') || text.includes('src="/src/main.tsx"')) {
      throw new Error('Fetched template is not a valid bundled standalone HTML artifact.');
    }
    return text;
  }

  // If served over http/https (e.g. production preview), try fetching clean index HTML first
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    try {
      const resp = await fetch(window.location.href, { cache: 'no-store' });
      if (resp.ok) {
        const htmlText = await resp.text();
        if (htmlText.includes('id="root"') && !htmlText.includes('src="/src/main.tsx"')) {
          return htmlText;
        }
      }
    } catch {
      // Fall back to clean single-file DOM clone below
    }
  }

  // Offline file:// single-file bundle path: reconstruct pristine HTML from inlined bundle tags
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const rootEl = clone.querySelector('#root');
  if (rootEl) {
    rootEl.innerHTML = '';
  }
  const dataScript = clone.querySelector('#psv-project-data-script');
  if (dataScript) {
    dataScript.textContent = 'window.__PSV_PROJECT_DATA__ = null;';
  }
  return `<!doctype html>\n${clone.outerHTML}`;
}

export function buildEmbeddedPayload(
  currentDoc: ProjectDocument,
  options: StandaloneExportOptions
): EmbeddedStandalonePayload | null {
  if (options.mode === 'blank' || !options.includeCurrentProjectData) {
    if (!options.includeDemonstrationCases) {
      return {
        projectDocument: null,
        includeDemonstrationCases: false,
        exportedAt: new Date().toISOString(),
        exportMode: 'blank',
      };
    }
    return null;
  }

  const baseBlank = createBlankProjectDocument();
  const cloned: ProjectDocument = JSON.parse(JSON.stringify(currentDoc)) as ProjectDocument;

  cloned.application = 'PSV Engineering Suite';
  cloned.applicationVersion = APPLICATION_VERSION;
  cloned.schemaVersion = PROJECT_SCHEMA_VERSION;
  cloned.project = {
    ...cloned.project,
    projectName: options.projectNameOverride,
    equipmentTag: options.equipmentTagOverride,
    psvTag: options.psvTagOverride,
    revision: options.revisionOverride,
    notes: options.includeEngineeringNotes ? cloned.project.notes : '',
  };

  if (!options.includeAllScenarios) {
    cloned.scenarios = [];
  }
  if (!options.includeAuditTrail) {
    cloned.audit = {};
  }
  if (!options.includeRevisionHistory) {
    cloned.revisionHistory = baseBlank.revisionHistory;
  }
  if (!options.includeEngineeringNotes) {
    cloned.breakthroughInput.engineeringNotes = '';
    cloned.psvSelection.verificationNote = '';
  }

  return {
    projectDocument: cloned,
    includeDemonstrationCases: options.includeDemonstrationCases,
    exportedAt: new Date().toISOString(),
    exportMode: 'populated',
  };
}

export function injectProjectDataIntoHtmlTemplate(
  templateHtml: string,
  payload: EmbeddedStandalonePayload | null
): string {
  const escaped = payload ? escapeJsonForHtmlScript(payload) : 'null';
  const replacementScript = `<script id="psv-project-data-script">window.__PSV_PROJECT_DATA__ = ${escaped};</script>`;

  const scriptRegex =
    /<script\b[^>]*id=["']psv-project-data-script["'][^>]*>[\s\S]*?<\/script>/i;

  if (scriptRegex.test(templateHtml)) {
    return templateHtml.replace(scriptRegex, () => replacementScript);
  }

  // Fallback injection before </head> or </body>
  if (templateHtml.includes('</body>')) {
    return templateHtml.replace('</body>', `${replacementScript}\n</body>`);
  }
  return `${templateHtml}\n${replacementScript}`;
}

export function getStandaloneExportFilename(options: StandaloneExportOptions): string {
  if (options.mode === 'blank' || !options.includeCurrentProjectData) {
    return 'PSV_Engineering_Suite.html';
  }
  const eq = (options.equipmentTagOverride || 'Equipment').replace(/[^a-zA-Z0-9_-]/g, '');
  const psv = (options.psvTagOverride || 'PSV').replace(/[^a-zA-Z0-9_-]/g, '');
  const rev = (options.revisionOverride || '0').replace(/[^a-zA-Z0-9_-]/g, '');
  return `PSV_${eq || 'Equipment'}_${psv || 'PSV'}_Rev_${rev || '0'}.html`;
}

export async function exportStandaloneHtml(
  currentDoc: ProjectDocument,
  options: StandaloneExportOptions
): Promise<{ filename: string; bytes: number }> {
  const templateHtml = await obtainBundledApplicationTemplate();
  const payload = buildEmbeddedPayload(currentDoc, options);
  const finalHtml = injectProjectDataIntoHtmlTemplate(templateHtml, payload);
  const filename = getStandaloneExportFilename(options);

  const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return { filename, bytes: blob.size };
}
