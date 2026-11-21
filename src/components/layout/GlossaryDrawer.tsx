import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ENGINEERING_GLOSSARY } from '../../constants/glossary';

interface GlossaryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const GlossaryDrawer: React.FC<GlossaryDrawerProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENGINEERING_GLOSSARY;
    return ENGINEERING_GLOSSARY.filter(
      (item) =>
        item.term.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        (item.symbol && item.symbol.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 no-print">
      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col border-l border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">PSV Engineering Glossary</h2>
            <p className="text-[11px] text-slate-300">
              Process safety and relief-device terminology reference
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glossary"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms, symbols (Kd, Kb, MAWP)..."
              className="w-full text-xs text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">
              No matching engineering terms found.
            </div>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.term}
                className="rounded border border-slate-200 bg-white p-3 space-y-1"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900">
                    {entry.term}
                    {entry.symbol && (
                      <span className="ml-1.5 font-mono text-blue-700">
                        [{entry.symbol}]
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {entry.category}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {entry.definition}
                </p>
                <div className="text-[11px] text-slate-500">
                  Reference: {entry.referenceNote}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
