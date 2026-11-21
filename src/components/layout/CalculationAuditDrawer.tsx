import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { CalculationTrace } from '../../models/calculationTypes';

interface CalculationAuditDrawerProps {
  open: boolean;
  onClose: () => void;
  traces: { label: string; trace?: CalculationTrace }[];
}

export const CalculationAuditDrawer: React.FC<CalculationAuditDrawerProps> = ({
  open,
  onClose,
  traces,
}) => {
  const available = traces.filter((t) => t.trace);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'sequence' | 'json'>('sequence');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const active = available[selectedIdx] ?? available[0];
  const trace = active?.trace;

  const handleCopyJson = async () => {
    if (!trace) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors offline
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 no-print">
      <div className="w-full max-w-2xl bg-white h-full shadow-xl flex flex-col border-l border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Calculation Audit & Traceability</h2>
            <p className="text-[11px] text-slate-300">
              Deterministic method metadata, internal conversions, constants, and step sequence
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit drawer"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex flex-wrap gap-1.5">
            {available.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                  idx === selectedIdx
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-200 rounded">
            <button
              type="button"
              onClick={() => setViewMode('sequence')}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                viewMode === 'sequence'
                  ? 'bg-white text-slate-900'
                  : 'text-slate-600'
              }`}
            >
              Human Sequence
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`px-2.5 py-1 text-xs font-medium rounded ${
                viewMode === 'json' ? 'bg-white text-slate-900' : 'text-slate-600'
              }`}
            >
              Structured JSON
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
          {!trace ? (
            <div className="text-slate-500">
              No calculation trace recorded yet for the active modules.
            </div>
          ) : viewMode === 'json' ? (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy JSON Trace'}</span>
                </button>
              </div>
              <pre className="p-3 rounded bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {JSON.stringify(trace, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-3 rounded border border-slate-200 bg-slate-50">
                <div>
                  <span className="text-slate-500">Method ID:</span>{' '}
                  <span className="font-mono font-semibold">{trace.methodId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Method Version:</span>{' '}
                  <span className="font-mono">{trace.methodVersion}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Reference:</span>{' '}
                  <span className="font-medium">{trace.standardReferenceTitle}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Adopted Edition:</span>{' '}
                  <span>{trace.adoptedEdition}</span>
                </div>
                <div>
                  <span className="text-slate-500">App Version:</span>{' '}
                  <span className="font-mono">{trace.applicationVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500">Timestamp:</span>{' '}
                  <span className="font-mono">{trace.timestamp}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  Internal SI Values & Correction Factors
                </h3>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Parameter</th>
                        <th className="px-3 py-1.5 font-medium text-right">Value</th>
                        <th className="px-3 py-1.5 font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {Object.entries(trace.internalValues).map(([k, v]) => (
                        <tr key={k}>
                          <td className="px-3 py-1.5 text-slate-700">{k}</td>
                          <td className="px-3 py-1.5 text-right">
                            {typeof v.value === 'number' ? v.value.toFixed(4) : String(v.value)}
                          </td>
                          <td className="px-3 py-1.5 text-slate-500">{v.unit ?? '-'}</td>
                        </tr>
                      ))}
                      {Object.entries(trace.correctionFactors).map(([k, v]) => (
                        <tr key={k}>
                          <td className="px-3 py-1.5 text-slate-700">
                            {k} ({v.description})
                          </td>
                          <td className="px-3 py-1.5 text-right">{v.value}</td>
                          <td className="px-3 py-1.5 text-slate-500">{v.sourceType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  Calculation Sequence ({trace.steps.length} steps)
                </h3>
                <div className="space-y-2">
                  {trace.steps.map((s, idx) => (
                    <div
                      key={`${s.label}-${idx}`}
                      className="p-2.5 rounded border border-slate-200 bg-white space-y-1"
                    >
                      <div className="flex justify-between font-medium">
                        <span>
                          {idx + 1}. {s.label}
                        </span>
                        <span className="font-mono text-blue-700">
                          {s.value} {s.unit ?? ''}
                        </span>
                      </div>
                      {s.equation && (
                        <div className="font-mono text-[11px] text-slate-600">
                          {s.equation}
                        </div>
                      )}
                      {s.substitution && (
                        <div className="font-mono text-[11px] text-slate-500">
                          = {s.substitution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
