import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Download,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { DEMONSTRATION_CASES } from '../../constants/demonstrationCases';
import { ProjectDocument, UnitSystem } from '../../models/calculationTypes';

interface HeaderBarProps {
  document: ProjectDocument;
  isUnsaved: boolean;
  advancedMode: boolean;
  allowDemoCases: boolean;
  onChangeUnitSystem: (sys: UnitSystem) => void;
  onToggleAdvancedMode: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onExportStandaloneHtml: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onPrintReport: () => void;
  onOpenGlossary: () => void;
  onOpenAudit: () => void;
  onLoadDemoCase: (demoId: string) => void;
  onResetProject: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  document,
  isUnsaved,
  advancedMode,
  allowDemoCases,
  onChangeUnitSystem,
  onToggleAdvancedMode,
  onSaveProject,
  onLoadProject,
  onExportStandaloneHtml,
  onExportJson,
  onExportCsv,
  onPrintReport,
  onOpenGlossary,
  onOpenAudit,
  onLoadDemoCase,
  onResetProject,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setDemoOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const p = document.project;

  return (
    <header className="bg-[#0B192C] text-white border-b border-slate-800 no-print">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
        {/* Primary Toolbar Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-2.5">
          <div className="flex items-center gap-6 min-w-0">
            <span className="text-base font-bold tracking-tight whitespace-nowrap shrink-0">
              PSV Engineering Suite
            </span>

            <div className="hidden xl:flex items-center gap-3 text-xs text-slate-300 truncate">
              <span className="truncate max-w-[180px]" title={p.projectName || 'Untitled Project'}>
                {p.projectName || 'Untitled Project'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono whitespace-nowrap">
                Eq: {p.equipmentTag || '—'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono whitespace-nowrap">
                Calc: {p.calculationNumber || '—'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono whitespace-nowrap">
                Rev {p.revision || '0'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">
                Eng: {p.preparedBy || '—'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono whitespace-nowrap">
                {p.calculationDate || '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Unit System Switcher */}
            <div
              className="flex items-center rounded bg-slate-800 p-0.5 border border-slate-700"
              role="group"
              aria-label="Unit system selector"
            >
              <button
                type="button"
                onClick={() => onChangeUnitSystem('SI')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  document.unitSystem === 'SI'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                SI
              </button>
              <button
                type="button"
                onClick={() => onChangeUnitSystem('US')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  document.unitSystem === 'US'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                US Customary
              </button>
            </div>

            {/* Basic / Advanced Switch */}
            <button
              type="button"
              onClick={onToggleAdvancedMode}
              className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                advancedMode
                  ? 'bg-slate-700 border-slate-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {advancedMode ? 'Advanced Mode' : 'Basic Mode'}
            </button>

            {/* Demo Cases Dropdown */}
            {allowDemoCases && (
              <div className="relative" ref={demoRef}>
                <button
                  type="button"
                  onClick={() => setDemoOpen((o) => !o)}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                >
                  <span>Demo Cases</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {demoOpen && (
                  <div className="absolute right-0 mt-1.5 w-80 rounded border border-slate-200 bg-white text-slate-900 shadow-lg z-40 py-1">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border-b border-amber-200">
                      DEMONSTRATION DATA – NOT FOR DESIGN
                    </div>
                    {DEMONSTRATION_CASES.map((dc) => (
                      <button
                        key={dc.id}
                        type="button"
                        onClick={() => {
                          onLoadDemoCase(dc.id);
                          setDemoOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                      >
                        <div className="text-xs font-semibold text-slate-900">
                          {dc.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {dc.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenGlossary}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Glossary</span>
            </button>

            <button
              type="button"
              onClick={onOpenAudit}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audit</span>
            </button>

            <button
              type="button"
              onClick={onSaveProject}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save{isUnsaved ? ' *' : ''}</span>
            </button>

            <button
              type="button"
              onClick={onLoadProject}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Load</span>
            </button>

            <button
              type="button"
              onClick={onExportStandaloneHtml}
              title="Save self-contained offline HTML application"
              className="inline-flex items-center gap-1.5 rounded border border-blue-500/60 bg-blue-950/70 px-2.5 py-1.5 text-xs font-medium text-blue-100 hover:bg-blue-900 whitespace-nowrap"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Save HTML (Offline)</span>
            </button>

            {/* Primary Export Menu */}
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded border border-slate-200 bg-white text-slate-900 shadow-lg z-40 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportStandaloneHtml();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left font-semibold text-blue-800 bg-blue-50/70 hover:bg-blue-100 border-b border-slate-100"
                  >
                    <FileCode2 className="w-4 h-4 shrink-0" />
                    <div>
                      <div>Standalone Interactive App (.html)</div>
                      <div className="text-[10px] font-normal text-slate-600">
                        Portable offline single-file calculator
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportJson();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <FileJson className="w-4 h-4 text-slate-600" />
                    <span>Project JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportCsv();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                    <span>Calculation Data CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onPrintReport();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Calculation Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportJson();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 border-t border-slate-100"
                  >
                    <Save className="w-4 h-4 text-slate-600" />
                    <span>Backup Project (.json)</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onResetProject}
              title="Reset project"
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-red-900/60 hover:text-white whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
