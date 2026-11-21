import React, { useRef } from 'react';
import { FileCode2, FileJson, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import {
  kelvinToTemp,
  kgHToMassFlow,
  kpaAbsToPressure,
  mm2ToArea,
} from '../../calculations/unitConversions';
import {
  APPLICATION_VERSION,
  CALCULATION_ENGINE_VERSION,
  ENGINEERING_NOTICE,
  VALVE_SELECTION_NOTICE,
} from '../../constants/defaultFactors';
import { exportStaticReportHtml } from '../../export/reportExporter';
import {
  FireCaseResult,
  GasSizingResult,
  LiquidSizingResult,
  ProjectDocument,
  ReliefScenario,
  VapourBreakthroughResult,
} from '../../models/calculationTypes';
import { StatusBadge } from '../common/StatusBadge';

interface CalculationReportTabProps {
  document: ProjectDocument;
  gasResult: GasSizingResult;
  liquidResult: LiquidSizingResult;
  breakthroughResult: VapourBreakthroughResult;
  fireResult: FireCaseResult;
  evaluatedScenarios: ReliefScenario[];
  governingScenario: ReliefScenario | null;
  onPrint: () => void;
  onExportStandaloneHtml: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

export const CalculationReportTab: React.FC<CalculationReportTabProps> = ({
  document,
  gasResult,
  liquidResult,
  breakthroughResult,
  fireResult,
  evaluatedScenarios,
  governingScenario,
  onPrint,
  onExportStandaloneHtml,
  onExportJson,
  onExportCsv,
}) => {
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const p = document.project;
  const eq = document.equipment;
  const db = document.designBasis;
  const sb = document.standardBasis;
  const u = document.unitPreferences;
  const atm = db.atmosphericPressureKpaA;

  const activeSizing =
    governingScenario?.linkedModule === 'liquid'
      ? liquidResult
      : governingScenario?.linkedModule === 'breakthrough'
        ? breakthroughResult.psvSizing
        : governingScenario?.linkedModule === 'fire'
          ? fireResult.psvSizing
          : gasResult;

  const activeTrace =
    governingScenario?.linkedModule === 'liquid'
      ? liquidResult.trace
      : governingScenario?.linkedModule === 'breakthrough'
        ? breakthroughResult.trace
        : governingScenario?.linkedModule === 'fire'
          ? fireResult.trace
          : gasResult.trace;

  const governingNozzleLabel =
    governingScenario?.inletOutletNozzle ??
    activeSizing?.orificeSelection?.nozzleSizeLabel ??
    '—';
  const governingRatedCap10PctKgH =
    governingScenario?.ratedCapacity10PctKgH ??
    activeSizing?.ratedCapacityAt10PercentKgH ??
    null;

  const activeMessages = [
    ...gasResult.messages,
    ...liquidResult.messages,
    ...breakthroughResult.messages,
    ...fireResult.messages,
  ];

  const uniqueMessages = Array.from(
    new Map(activeMessages.map((m) => [m.message, m])).values()
  );

  return (
    <div className="space-y-4">
      {/* Toolbar (hidden in print) */}
      <div className="rounded border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Printable Preliminary PSV Calculation Report
          </h2>
          <p className="text-xs text-slate-500">
            Complete 19-section reproducible engineering calculation sheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded bg-blue-700 px-3.5 py-2 font-medium text-white hover:bg-blue-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
          <button
            type="button"
            onClick={() => exportStaticReportHtml(reportContainerRef.current, document)}
            className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-blue-50 px-3 py-2 font-medium text-blue-900 hover:bg-blue-100"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Save Report (.html)</span>
          </button>
          <button
            type="button"
            onClick={onExportStandaloneHtml}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileCode2 className="w-3.5 h-3.5 text-blue-700" />
            <span>Save Offline App (.html)</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Document Body */}
      <div
        ref={reportContainerRef}
        className="rounded border border-slate-200 bg-white p-6 lg:p-8 space-y-6 text-xs text-slate-900"
      >
        {p.isDemonstrationData && (
          <div className="border-2 border-amber-500 bg-amber-50 p-3 text-center font-bold text-amber-950">
            DEMONSTRATION DATA – NOT FOR DESIGN
          </div>
        )}

        {/* 1. Cover Information */}
        <section className="border-b-2 border-slate-900 pb-4 flex flex-wrap justify-between gap-4 print-break-inside-avoid">
          <div>
            <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
              PSV Engineering Suite v{APPLICATION_VERSION} (Engine v{CALCULATION_ENGINE_VERSION})
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Preliminary Pressure Safety Valve Sizing Calculation Report
            </h1>
            <div className="text-xs text-slate-600 mt-1">
              {p.projectName || 'Untitled Project'} · {p.equipmentTag || 'Untagged Equipment'} ·{' '}
              {p.psvTag || 'Untagged PSV'}
            </div>
          </div>
          <div className="text-right font-mono space-y-0.5">
            <div>Calc No.: {p.calculationNumber || '—'}</div>
            <div>Revision: {p.revision || '0'}</div>
            <div>Date: {p.calculationDate || '—'}</div>
          </div>
        </section>

        {/* Notice */}
        <div className="rounded border border-slate-300 bg-slate-50 p-3 text-[11px] text-slate-700">
          <strong>Engineering Notice:</strong> {ENGINEERING_NOTICE}
        </div>

        {/* 2. Project Data & 3. Equipment Data */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
          <div>
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
              2. Project Data
            </h2>
            <dl className="grid grid-cols-2 gap-y-1">
              <dt className="text-slate-500">Client</dt>
              <dd>{p.client || '—'}</dd>
              <dt className="text-slate-500">Plant / Facility</dt>
              <dd>{p.plantFacility || '—'}</dd>
              <dt className="text-slate-500">Unit</dt>
              <dd>{p.unit || '—'}</dd>
              <dt className="text-slate-500">Equipment Tag</dt>
              <dd className="font-mono">{p.equipmentTag || '—'}</dd>
              <dt className="text-slate-500">PSV Tag</dt>
              <dd className="font-mono">{p.psvTag || '—'}</dd>
            </dl>
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
              3. Protected Equipment Data
            </h2>
            <dl className="grid grid-cols-2 gap-y-1">
              <dt className="text-slate-500">Type</dt>
              <dd>{eq.equipmentType.replace(/_/g, ' ')}</dd>
              <dt className="text-slate-500">Description</dt>
              <dd>{p.equipmentDescription || '—'}</dd>
              <dt className="text-slate-500">MAWP</dt>
              <dd className="font-mono">
                {kpaAbsToPressure(eq.mawpKpaG + atm, u.pressure, atm).toFixed(2)} {u.pressure}
              </dd>
              <dt className="text-slate-500">Design Temp.</dt>
              <dd className="font-mono">
                {kelvinToTemp(eq.designTemperatureK, u.temperature).toFixed(1)} {u.temperature}
              </dd>
              <dt className="text-slate-500">Geometry (D × L)</dt>
              <dd className="font-mono">
                {eq.diameterM.toFixed(2)} m × {eq.tangentLengthM.toFixed(2)} m ({eq.orientation})
              </dd>
            </dl>
          </div>
        </section>

        {/* 4. Code and Standard Basis */}
        <section className="print-break-inside-avoid">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
            4. Code and Standard Basis (Preliminary Reference — Not Certified)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
            <div>• {sb.api520Part1Edition}</div>
            <div>• {sb.api520Part2Edition}</div>
            <div>• {sb.api521Edition}</div>
            <div>• {sb.api526Edition}</div>
            <div>• {sb.asmeSectionViiiEdition}</div>
          </div>
        </section>

        {/* 5. Scenario Description & 6. Input Data & 7. Assumptions & 8. Unit Conversions */}
        <section className="space-y-3 print-break-inside-avoid">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
            5–8. Design Basis, Input Data, Assumptions & Unit Basis
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded font-mono">
            <div>
              <span className="text-slate-500 font-sans block">Set Pressure</span>
              {kpaAbsToPressure(db.setPressureKpaG + atm, u.pressure, atm).toFixed(2)} {u.pressure}
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Local Patm (Assumed/Input)</span>
              {atm.toFixed(3)} kPa(a)
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Valve Type</span>
              <span className="font-sans">{db.valveType.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Display Unit System</span>
              <span className="font-sans">{document.unitSystem} (Internal: SI kPa(a), K, kg/h, mm²)</span>
            </div>
          </div>
        </section>

        {/* 9–12. Relieving Load, Sizing, Equations & Intermediate Values */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
            9–12. Governing Calculation Trace ({activeTrace.methodId} v{activeTrace.methodVersion})
          </h2>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-1.5 px-3">Step</th>
                  <th className="py-1.5 px-3">Equation & Substitution</th>
                  <th className="py-1.5 px-3 text-right">Result</th>
                  <th className="py-1.5 px-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTrace.steps.map((s, idx) => (
                  <tr key={`${s.label}-${idx}`}>
                    <td className="py-1.5 px-3 font-medium">
                      {idx + 1}. {s.label}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">
                      {s.equation && <div>{s.equation}</div>}
                      {s.substitution && <div>= {s.substitution}</div>}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-semibold">
                      {s.value} {s.unit ?? ''}
                    </td>
                    <td className="py-1.5 px-3 text-[11px] text-slate-500">
                      {s.sourceType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 13. API Orifice Selection & 14. Capacity Margin */}
        <section className="print-break-inside-avoid space-y-2">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
            13–14. API 526 Orifice Selection, Nozzle Sizes & Line-Sizing Rated Capacity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-3 rounded border border-slate-200 bg-slate-50 font-mono">
            <div>
              <span className="text-slate-500 font-sans block">Governing Scenario</span>
              <span className="font-sans font-semibold">
                {governingScenario?.name ?? 'Active Sizing Module'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Required Area</span>
              {governingScenario?.requiredAreaMm2 !== null &&
              governingScenario?.requiredAreaMm2 !== undefined
                ? `${mm2ToArea(governingScenario.requiredAreaMm2, u.area).toFixed(2)} ${u.area}`
                : `${activeSizing?.requiredAreaMm2?.toFixed(2) ?? '—'} mm²`}
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Selected Orifice</span>
              {governingScenario?.selectedOrificeDesignation ??
                activeSizing?.orificeSelection?.selectedOrifice?.designation ??
                '—'}
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Inlet × Outlet Nozzles</span>
              {governingNozzleLabel}
            </div>
            <div>
              <span className="text-slate-500 font-sans block">
                Rated Cap. @ 10% OP
              </span>
              {governingRatedCap10PctKgH !== null
                ? `${kgHToMassFlow(governingRatedCap10PctKgH, u.massFlow).toFixed(1)} ${u.massFlow}`
                : '—'}
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Capacity Margin</span>
              {governingScenario?.capacityMarginPercent !== null &&
              governingScenario?.capacityMarginPercent !== undefined
                ? `${governingScenario.capacityMarginPercent.toFixed(1)}%`
                : activeSizing?.orificeSelection?.areaMarginPercent !== null &&
                    activeSizing?.orificeSelection?.areaMarginPercent !== undefined
                  ? `${activeSizing.orificeSelection.areaMarginPercent.toFixed(1)}%`
                  : '—'}
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            {VALVE_SELECTION_NOTICE} Rated capacity at 10% overpressure is evaluated for the selected API 526 orifice at 1.10 × P_set + P_atm as the API 520 Part II inlet/outlet line-sizing basis.
          </p>
        </section>

        {/* 15. Warnings and Limitations */}
        <section className="print-break-inside-avoid space-y-1.5">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
            15. Warnings and Limitations
          </h2>
          {uniqueMessages.length === 0 ? (
            <p className="text-slate-500">No active warnings or errors recorded.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              {uniqueMessages.map((m, idx) => (
                <li
                  key={`${m.id}-${idx}`}
                  className={
                    m.severity === 'ERROR'
                      ? 'text-red-700 font-semibold'
                      : m.severity === 'WARNING'
                        ? 'text-amber-800'
                        : 'text-slate-700'
                  }
                >
                  [{m.severity}] {m.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 16. Scenario Comparison */}
        <section className="print-break-inside-avoid space-y-2">
          <h2 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">
            16. Scenario Comparison Summary
          </h2>
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-1.5 px-2.5">Scenario</th>
                <th className="py-1.5 px-2.5">Phase</th>
                <th className="py-1.5 px-2.5 text-right">Flow ({u.massFlow})</th>
                <th className="py-1.5 px-2.5 text-right">Req. Area ({u.area})</th>
                <th className="py-1.5 px-2.5">Orifice</th>
                <th className="py-1.5 px-2.5">Inlet × Outlet</th>
                <th className="py-1.5 px-2.5 text-right">Rated 10% OP ({u.massFlow})</th>
                <th className="py-1.5 px-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluatedScenarios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-3 px-2.5 text-slate-500 text-center">
                    No scenarios saved in comparison table.
                  </td>
                </tr>
              ) : (
                evaluatedScenarios.map((sc) => (
                  <tr key={sc.id}>
                    <td className="py-1.5 px-2.5 font-medium">{sc.name}</td>
                    <td className="py-1.5 px-2.5">{sc.fluidPhase}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono">
                      {kgHToMassFlow(sc.relievingMassFlowKgH, u.massFlow).toFixed(1)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono">
                      {sc.requiredAreaMm2 !== null
                        ? mm2ToArea(sc.requiredAreaMm2, u.area).toFixed(2)
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono">
                      {sc.selectedOrificeDesignation ?? '—'}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono">
                      {sc.inletOutletNozzle ?? '—'}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono">
                      {sc.ratedCapacity10PctKgH !== null &&
                      sc.ratedCapacity10PctKgH !== undefined
                        ? kgHToMassFlow(sc.ratedCapacity10PctKgH, u.massFlow).toFixed(1)
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2.5">
                      <StatusBadge status={sc.status} compact />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 17. Engineering Notes & 18. Signoff & 19. Revision History */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid pt-2 border-t border-slate-200">
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-900">
              17. Engineering Notes & 18. Sign-Off
            </h2>
            <p className="text-[11px] text-slate-700 whitespace-pre-wrap bg-slate-50 p-2.5 rounded border border-slate-200 min-h-[56px]">
              {p.notes || 'No additional engineering notes entered.'}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="border-t border-slate-300 pt-1">
                <div className="text-slate-500 text-[10px]">Prepared By</div>
                <div className="font-medium">{p.preparedBy || '________________'}</div>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <div className="text-slate-500 text-[10px]">Checked By</div>
                <div className="font-medium">{p.checkedBy || '________________'}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-900">
              19. Revision History
            </h2>
            <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-1 px-2">Rev</th>
                  <th className="py-1 px-2">Date</th>
                  <th className="py-1 px-2">Author</th>
                  <th className="py-1 px-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {document.revisionHistory.map((rev, i) => (
                  <tr key={`${rev.revision}-${i}`}>
                    <td className="py-1 px-2 font-mono">{rev.revision}</td>
                    <td className="py-1 px-2 font-mono">{rev.date}</td>
                    <td className="py-1 px-2">{rev.author || '—'}</td>
                    <td className="py-1 px-2">{rev.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
