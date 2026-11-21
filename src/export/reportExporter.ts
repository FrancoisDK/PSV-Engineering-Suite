import { ProjectDocument } from '../models/calculationTypes';

export function triggerPrintCalculationReport(): void {
  window.print();
}

function collectEmbeddedStyles(): string {
  if (typeof document === 'undefined') return '';
  const chunks: string[] = [];

  for (const styleEl of Array.from(document.querySelectorAll('head style'))) {
    if (styleEl.textContent) {
      chunks.push(styleEl.textContent);
    }
  }

  if (chunks.length === 0) {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        chunks.push(rules.map((r) => r.cssText).join('\n'));
      } catch {
        // Ignore inaccessible cross-origin sheets if any
      }
    }
  }

  return chunks.join('\n');
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportStaticReportHtml(
  reportElement: HTMLElement | null,
  doc: ProjectDocument
): { filename: string; bytes: number } | null {
  if (!reportElement) return null;

  const clone = reportElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  const styles = collectEmbeddedStyles();
  const p = doc.project;
  const eq = (p.equipmentTag || 'Equipment').replace(/[^a-zA-Z0-9_-]/g, '');
  const psv = (p.psvTag || 'PSV').replace(/[^a-zA-Z0-9_-]/g, '');
  const rev = (p.revision || '0').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `PSV_Report_${eq || 'Equipment'}_${psv || 'PSV'}_Rev_${rev || '0'}.html`;
  const title = `PSV Calculation Report — ${p.projectName || 'Untitled Project'} (${p.psvTag || 'Untagged PSV'})`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlText(title)}</title>
    <style>
${styles}
      body {
        background-color: #f8fafc;
        color: #0f172a;
        margin: 0;
        padding: 24px 16px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .offline-report-shell {
        max-width: 1120px;
        margin: 0 auto;
      }
      @media print {
        body {
          background-color: #ffffff;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="offline-report-shell">
      ${clone.outerHTML}
    </div>
  </body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
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

