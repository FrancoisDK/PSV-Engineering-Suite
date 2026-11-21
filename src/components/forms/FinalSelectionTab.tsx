import React from 'react';
import { selectApiOrifice } from '../../calculations/orificeSelection';
import { mm2ToArea } from '../../calculations/unitConversions';
import {
  API_526_EDITION_NOTE,
  API_526_ORIFICES,
} from '../../constants/apiOrifices';
import { VALVE_SELECTION_NOTICE } from '../../constants/defaultFactors';
import {
  FinalPSVSelection,
  ProjectDocument,
  ReliefScenario,
  ValveType,
} from '../../models/calculationTypes';
import { StatusBadge } from '../common/StatusBadge';
import { ValidationBanner } from '../common/ValidationBanner';

interface FinalSelectionTabProps {
  document: ProjectDocument;
  governingScenario: ReliefScenario | null;
  activeModuleRequiredAreaMm2: number | null;
  onChangeSelection: (patch: Partial<FinalPSVSelection>) => void;
}

export const FinalSelectionTab: React.FC<FinalSelectionTabProps> = ({
  document,
  governingScenario,
  activeModuleRequiredAreaMm2,
  onChangeSelection,
}) => {
  const sel = document.psvSelection;
  const u = document.unitPreferences;

  const governingAreaMm2 =
    governingScenario?.requiredAreaMm2 ?? activeModuleRequiredAreaMm2 ?? 0;

  const orificeRes = selectApiOrifice(
    governingAreaMm2,
    sel.overrideOrificeDesignation,
    sel.overrideNote
  );

  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Final API 526 Standard Orifice Selection
            </h3>
            <p className="text-[11px] text-slate-500">{API_526_EDITION_NOTE}</p>
          </div>
          <StatusBadge
            status={
              orificeRes.validSelection
                ? orificeRes.messages.some((m) => m.severity === 'WARNING')
                  ? 'PASS_WITH_WARNINGS'
                  : 'PASS'
                : governingAreaMm2 > 0
                  ? 'FAIL'
                  : 'INCOMPLETE'
            }
          />
        </div>

        <ValidationBanner messages={orificeRes.messages} />

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Governing Area</div>
            <div className="font-mono font-bold text-blue-700 mt-1">
              {governingAreaMm2 > 0
                ? `${mm2ToArea(governingAreaMm2, u.area).toFixed(2)} ${u.area}`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Recommended</div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              {orificeRes.recommendedOrifice
                ? `Orifice ${orificeRes.recommendedOrifice.designation}`
                : orificeRes.exceedsLargestStandard
                  ? 'Exceeds T'
                  : '—'}
            </div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Next Larger</div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              {orificeRes.nextLargerOrifice
                ? `Orifice ${orificeRes.nextLargerOrifice.designation}`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500">User Selected</div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              {orificeRes.selectedOrifice
                ? `Orifice ${orificeRes.selectedOrifice.designation} (${orificeRes.selectedOrifice.effectiveAreaIn2.toFixed(3)} in²)`
                : 'None'}
            </div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Area Margin</div>
            <div
              className={`font-mono font-bold mt-1 ${
                (orificeRes.areaMarginPercent ?? 0) < 0
                  ? 'text-red-700'
                  : 'text-emerald-700'
              }`}
            >
              {orificeRes.areaMarginPercent !== null
                ? `${orificeRes.areaMarginPercent >= 0 ? '+' : ''}${orificeRes.areaMarginPercent.toFixed(1)}%`
                : '—'}
            </div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Utilisation</div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              {orificeRes.utilisationPercent !== null
                ? `${orificeRes.utilisationPercent.toFixed(1)}%`
                : '—'}
            </div>
          </div>
        </div>

        {/* Override & Valve Specification Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700">
              Orifice Selection Mode / Manual Override
            </label>
            <select
              value={sel.overrideOrificeDesignation ?? ''}
              onChange={(e) =>
                onChangeSelection({
                  overrideOrificeDesignation: e.target.value || null,
                })
              }
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="">Automatic (Smallest Standard &ge; Required)</option>
              {API_526_ORIFICES.map((o) => (
                <option key={o.designation} value={o.designation}>
                  Override: {o.designation} ({o.effectiveAreaIn2.toFixed(3)} in² /{' '}
                  {o.effectiveAreaMm2.toFixed(1)} mm²)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="font-medium text-slate-700">
              Override Engineering Justification{' '}
              {orificeRes.isOverride && <span className="text-red-600">(Required)</span>}
            </label>
            <input
              type="text"
              value={sel.overrideNote}
              onChange={(e) => onChangeSelection({ overrideNote: e.target.value })}
              placeholder="Explain reason for manual orifice override (e.g. standardize plant spare parts, extra margin)"
              className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700">Selected Valve Type</label>
            <select
              value={sel.selectedValveType}
              onChange={(e) =>
                onChangeSelection({ selectedValveType: e.target.value as ValveType })
              }
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="conventional">Conventional spring loaded</option>
              <option value="balanced_bellows">Balanced bellows</option>
              <option value="pilot_operated">Pilot operated</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700">
              Preliminary Body / Flange Class
            </label>
            <input
              type="text"
              value={sel.selectedBodyRating}
              onChange={(e) =>
                onChangeSelection({ selectedBodyRating: e.target.value })
              }
              className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700">
              Vendor Verification Note
            </label>
            <input
              type="text"
              value={sel.verificationNote}
              onChange={(e) =>
                onChangeSelection({ verificationNote: e.target.value })
              }
              placeholder="e.g. Confirm with vendor datasheet at Rev 0"
              className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
          {VALVE_SELECTION_NOTICE}
        </div>
      </div>

      {/* Full API 526 Table */}
      <div className="rounded border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">
            Configurable API 526 Effective Orifice Reference Table
          </span>
          <span className="text-[11px] text-slate-500">
            1 in² = 645.16 mm² exact conversion
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2 px-3">Designation</th>
                <th className="py-2 px-3 text-right">Effective Area (in²)</th>
                <th className="py-2 px-3 text-right">Effective Area (mm²)</th>
                <th className="py-2 px-3">Typical Inlet × Outlet</th>
                <th className="py-2 px-3 text-right">Utilisation vs Governing</th>
                <th className="py-2 px-3">Selection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {API_526_ORIFICES.map((o) => {
                const isSelected =
                  orificeRes.selectedOrifice?.designation === o.designation;
                const isRec =
                  orificeRes.recommendedOrifice?.designation === o.designation;
                const util =
                  governingAreaMm2 > 0
                    ? (governingAreaMm2 / o.effectiveAreaMm2) * 100
                    : null;
                const undersized =
                  governingAreaMm2 > 0 && o.effectiveAreaMm2 < governingAreaMm2;

                return (
                  <tr
                    key={o.designation}
                    className={
                      isSelected
                        ? 'bg-blue-50 font-semibold'
                        : undersized
                          ? 'text-slate-400'
                          : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-1.5 px-3 font-bold text-slate-900">
                      {o.designation}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {o.effectiveAreaIn2.toFixed(3)}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {o.effectiveAreaMm2.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-600">
                      {o.nominalInletSizeIn} × {o.nominalOutletSizeIn}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {util !== null ? `${util.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-1.5 px-3 font-sans">
                      {isSelected ? (
                        <span className="text-blue-700 font-semibold">
                          Selected {isRec ? '(Recommended)' : '(Manual Override)'}
                        </span>
                      ) : isRec ? (
                        <span className="text-emerald-700">Recommended</span>
                      ) : undersized ? (
                        <span>Undersized</span>
                      ) : (
                        <span className="text-slate-500">Available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
