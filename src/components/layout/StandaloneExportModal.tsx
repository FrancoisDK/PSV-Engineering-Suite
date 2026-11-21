import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, X } from 'lucide-react';
import {
  exportStandaloneHtml,
  getStandaloneExportFilename,
  StandaloneExportOptions,
} from '../../export/standaloneHtmlExporter';
import { ProjectDocument } from '../../models/calculationTypes';

interface StandaloneExportModalProps {
  open: boolean;
  document: ProjectDocument;
  onClose: () => void;
}

export const StandaloneExportModal: React.FC<StandaloneExportModalProps> = ({
  open,
  document,
  onClose,
}) => {
  const [options, setOptions] = useState<StandaloneExportOptions>({
    mode: 'populated',
    includeCurrentProjectData: true,
    includeAllScenarios: true,
    includeAuditTrail: true,
    includeRevisionHistory: true,
    includeEngineeringNotes: true,
    includeDemonstrationCases: true,
    projectNameOverride: document.project.projectName || 'PSV Sizing Package',
    equipmentTagOverride: document.project.equipmentTag || 'V-101',
    psvTagOverride: document.project.psvTag || 'PSV-101',
    revisionOverride: document.project.revision || 'A',
  });

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setOptions((prev) => ({
      ...prev,
      projectNameOverride: document.project.projectName || 'PSV Sizing Package',
      equipmentTagOverride: document.project.equipmentTag || 'V-101',
      psvTagOverride: document.project.psvTag || 'PSV-101',
      revisionOverride: document.project.revision || 'A',
    }));
  }, [
    open,
    document.project.projectName,
    document.project.equipmentTag,
    document.project.psvTag,
    document.project.revision,
  ]);

  if (!open) return null;

  const targetFilename = getStandaloneExportFilename(options);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await exportStandaloneHtml(document, options);
      setSuccessMsg(
        `Generated ${res.filename} (${(res.bytes / 1024).toFixed(0)} KB). Open directly in any modern browser offline via file://.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Standalone HTML export failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print">
      <div className="w-full max-w-xl rounded bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Export Standalone PSV Application
            </h2>
            <p className="text-[11px] text-slate-300">
              Self-contained single-file HTML bundle · Zero server, CDN, or network dependencies
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close standalone export dialog"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setOptions((o) => ({
                  ...o,
                  mode: 'populated',
                  includeCurrentProjectData: true,
                }))
              }
              className={`rounded border p-3 text-left transition-colors ${
                options.mode === 'populated'
                  ? 'border-blue-700 bg-blue-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold">Mode B — Project-Populated</div>
              <div className="text-[11px] mt-0.5">
                Embeds project, scenarios & audit trace via window.__PSV_PROJECT_DATA__.
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setOptions((o) => ({
                  ...o,
                  mode: 'blank',
                  includeCurrentProjectData: false,
                }))
              }
              className={`rounded border p-3 text-left transition-colors ${
                options.mode === 'blank'
                  ? 'border-blue-700 bg-blue-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold">Mode A — Blank Application</div>
              <div className="text-[11px] mt-0.5">
                Exports clean PSV_Engineering_Suite.html for fresh calculations offline.
              </div>
            </button>
          </div>

          {/* Options checkboxes */}
          <div className="rounded border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <div className="font-semibold text-slate-800 mb-1">Options</div>
            {(
              [
                ['includeCurrentProjectData', 'Include current project data'],
                ['includeAllScenarios', 'Include all saved scenarios'],
                ['includeAuditTrail', 'Include calculation audit trail'],
                ['includeRevisionHistory', 'Include revision history'],
                ['includeEngineeringNotes', 'Include engineering notes'],
                ['includeDemonstrationCases', 'Include demonstration cases'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[key]}
                  disabled={options.mode === 'blank' && key !== 'includeDemonstrationCases'}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, [key]: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {/* Project identification fields */}
          {options.mode === 'populated' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={options.projectNameOverride}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, projectNameOverride: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Equipment Tag
                </label>
                <input
                  type="text"
                  value={options.equipmentTagOverride}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, equipmentTagOverride: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  PSV Tag
                </label>
                <input
                  type="text"
                  value={options.psvTagOverride}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, psvTagOverride: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Revision
                </label>
                <input
                  type="text"
                  value={options.revisionOverride}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, revisionOverride: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="rounded border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
            <span className="text-slate-500">Output Filename:</span>
            <span className="font-mono font-semibold text-slate-900">
              {targetFilename}
            </span>
          </div>

          {errorMsg && (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 rounded bg-blue-700 px-4 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {generating ? 'Bundling Standalone HTML...' : 'Generate Standalone HTML'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
