import React from 'react';
import { FileSearch, Info } from 'lucide-react';
import {
  kelvinToTemp,
  kgHToMassFlow,
  kpaAbsToPressure,
  m3HToVolFlow,
  mm2ToArea,
} from '../../calculations/unitConversions';
import {
  APPLICATION_VERSION,
  CALCULATION_ENGINE_VERSION,
  PROJECT_SCHEMA_VERSION,
  VALVE_SELECTION_NOTICE,
} from '../../constants/defaultFactors';
import {
  CalculationStatus,
  OrificeSelectionResult,
  UnitPreferences,
} from '../../models/calculationTypes';
import { StatusBadge } from '../common/StatusBadge';

export interface ActiveResultsSummary {
  scenarioLabel: string;
  fluidPhaseLabel: string;
  requiredMassFlowKgH: number | null;
  relievingPressureKpaA: number | null;
  relievingTemperatureK: number | null;
  atmosphericPressureKpaA: number;
  requiredAreaMm2: number | null;
  orificeSelection: OrificeSelectionResult | null;
  status: CalculationStatus;
  flowRegimeLabel?: string;
  ratedPressure10PctKpaA?: number | null;
  ratedCapacityAt10PercentKgH?: number | null;
  ratedCapacityAt10PercentM3H?: number | null;
}

interface StickyResultsCardProps {
  summary: ActiveResultsSummary;
  unitPrefs: UnitPreferences;
  isStandaloneMode: boolean;
  isSaved: boolean;
  lastCalcTimestamp: string;
  onOpenAudit: () => void;
}

export const StickyResultsCard: React.FC<StickyResultsCardProps> = ({
  summary,
  unitPrefs,
  isStandaloneMode,
  isSaved,
  lastCalcTimestamp,
  onOpenAudit,
}) => {
  const {
    scenarioLabel,
    fluidPhaseLabel,
    requiredMassFlowKgH,
    relievingPressureKpaA,
    relievingTemperatureK,
    atmosphericPressureKpaA,
    requiredAreaMm2,
    orificeSelection,
    status,
    flowRegimeLabel,
    ratedPressure10PctKpaA,
    ratedCapacityAt10PercentKgH,
    ratedCapacityAt10PercentM3H,
  } = summary;

  const selOrifice = orificeSelection?.selectedOrifice ?? null;
  const marginPct = orificeSelection?.areaMarginPercent ?? null;
  const utilPct = orificeSelection?.utilisationPercent ?? null;

  return (
    <aside className="lg:sticky lg:top-4 space-y-3 no-print">
      <div className="rounded border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] text-slate-300 font-medium">
              Sizing Summary
            </div>
            <div className="text-sm font-semibold truncate max-w-[220px]">
              {scenarioLabel}
            </div>
          </div>
          <StatusBadge status={status} compact />
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-y-2 gap-x-3 pb-3 border-b border-slate-100">
            <span className="text-slate-500">Fluid Phase</span>
            <span className="font-medium text-slate-900 text-right">
              {fluidPhaseLabel}
            </span>

            {flowRegimeLabel && (
              <>
                <span className="text-slate-500">Flow Regime</span>
                <span className="font-mono font-medium text-slate-900 text-right">
                  {flowRegimeLabel}
                </span>
              </>
            )}

            <span className="text-slate-500">Relieving Rate</span>
            <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
              {requiredMassFlowKgH !== null
                ? `${kgHToMassFlow(requiredMassFlowKgH, unitPrefs.massFlow).toFixed(1)} ${unitPrefs.massFlow}`
                : '—'}
            </span>

            <span className="text-slate-500">Relieving Pressure</span>
            <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
              {relievingPressureKpaA !== null
                ? `${kpaAbsToPressure(
                    relievingPressureKpaA,
                    unitPrefs.pressure,
                    atmosphericPressureKpaA
                  ).toFixed(2)} ${unitPrefs.pressure}`
                : '—'}
            </span>

            <span className="text-slate-500">Relieving Pressure (Abs)</span>
            <span className="font-mono tabular-nums text-slate-700 text-right">
              {relievingPressureKpaA !== null
                ? `${relievingPressureKpaA.toFixed(2)} kPa(a)`
                : '—'}
            </span>

            <span className="text-slate-500">Relieving Temp.</span>
            <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
              {relievingTemperatureK !== null
                ? `${kelvinToTemp(relievingTemperatureK, unitPrefs.temperature).toFixed(1)} °${unitPrefs.temperature.replace('K', '') || 'K'}`.replace('°K', 'K')
                : '—'}
            </span>
          </div>

          <div className="rounded bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-600 font-medium">Required Area</span>
              <span className="text-base font-mono tabular-nums font-bold text-blue-700">
                {requiredAreaMm2 !== null
                  ? `${mm2ToArea(requiredAreaMm2, unitPrefs.area).toFixed(2)} ${unitPrefs.area.replace('2', '²')}`
                  : '—'}
              </span>
            </div>
            {requiredAreaMm2 !== null && (
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
                <span>{requiredAreaMm2.toFixed(1)} mm²</span>
                <span>{(requiredAreaMm2 / 100).toFixed(2)} cm²</span>
                <span>{(requiredAreaMm2 / 645.16).toFixed(3)} in²</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-1">
            <span className="text-slate-500">API 526 Orifice</span>
            <span className="font-mono font-bold text-slate-900 text-right text-sm">
              {selOrifice ? `Orifice ${selOrifice.designation}` : '—'}
            </span>

            <span className="text-slate-500">Inlet × Outlet Nozzles</span>
            <span className="font-mono font-bold text-slate-900 text-right tabular-nums">
              {orificeSelection?.nozzleSizeLabel ?? '—'}
            </span>

            <span className="text-slate-500">Selected Eff. Area</span>
            <span className="font-mono tabular-nums font-medium text-slate-900 text-right">
              {selOrifice
                ? `${mm2ToArea(selOrifice.effectiveAreaMm2, unitPrefs.area).toFixed(2)} ${unitPrefs.area.replace('2', '²')}`
                : '—'}
            </span>

            <span className="text-slate-500">
              Rated Cap. (10% OP)
              <span className="block text-[10px] text-slate-400">
                Line sizing basis
              </span>
            </span>
            <span className="font-mono tabular-nums font-semibold text-emerald-700 text-right">
              {ratedCapacityAt10PercentKgH !== null &&
              ratedCapacityAt10PercentKgH !== undefined ? (
                <>
                  {kgHToMassFlow(
                    ratedCapacityAt10PercentKgH,
                    unitPrefs.massFlow
                  ).toFixed(1)}{' '}
                  {unitPrefs.massFlow}
                  {ratedCapacityAt10PercentM3H !== null &&
                    ratedCapacityAt10PercentM3H !== undefined && (
                      <span className="block text-[10px] font-normal text-slate-500">
                        {m3HToVolFlow(
                          ratedCapacityAt10PercentM3H,
                          unitPrefs.liquidVolFlow
                        ).toFixed(2)}{' '}
                        {unitPrefs.liquidVolFlow}
                      </span>
                    )}
                  {ratedPressure10PctKpaA !== null &&
                    ratedPressure10PctKpaA !== undefined && (
                      <span className="block text-[10px] font-normal text-slate-400">
                        @ {ratedPressure10PctKpaA.toFixed(1)} kPa(a)
                      </span>
                    )}
                </>
              ) : (
                '—'
              )}
            </span>

            <span className="text-slate-500">Capacity Margin</span>
            <span
              className={`font-mono tabular-nums font-semibold text-right ${
                marginPct === null
                  ? 'text-slate-500'
                  : marginPct < 0
                    ? 'text-red-700'
                    : 'text-emerald-700'
              }`}
            >
              {marginPct !== null ? `${marginPct >= 0 ? '+' : ''}${marginPct.toFixed(1)}%` : '—'}
            </span>

            <span className="text-slate-500">Utilisation</span>
            <span className="font-mono tabular-nums text-slate-700 text-right">
              {utilPct !== null ? `${utilPct.toFixed(1)}%` : '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenAudit}
            className="w-full flex items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Open Calculation Audit Trace</span>
          </button>

          <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5 pt-1 border-t border-slate-100">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>{VALVE_SELECTION_NOTICE}</span>
          </p>
        </div>
      </div>

      {/* Application Status Panel per Section 22.19 */}
      <div className="rounded border border-slate-200 bg-white p-3.5 text-xs space-y-1.5">
        <div className="font-semibold text-slate-800 pb-1 border-b border-slate-100">
          Application Status
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-[11px]">
          <span className="text-slate-500">Mode</span>
          <span className="font-medium text-slate-800 text-right">
            {isStandaloneMode ? 'Standalone' : 'Development'}
          </span>
          <span className="text-slate-500">Application Version</span>
          <span className="font-mono text-slate-800 text-right">
            {APPLICATION_VERSION}
          </span>
          <span className="text-slate-500">Calculation Engine</span>
          <span className="font-mono text-slate-800 text-right">
            {CALCULATION_ENGINE_VERSION}
          </span>
          <span className="text-slate-500">Project Schema</span>
          <span className="font-mono text-slate-800 text-right">
            {PROJECT_SCHEMA_VERSION}
          </span>
          <span className="text-slate-500">Network Required</span>
          <span className="font-medium text-emerald-700 text-right">No</span>
          <span className="text-slate-500">Project</span>
          <span
            className={`font-medium text-right ${
              isSaved ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {isSaved ? 'Saved' : 'Unsaved'}
          </span>
          <span className="text-slate-500">Last Calculation</span>
          <span className="font-mono text-slate-700 text-right truncate">
            {lastCalcTimestamp}
          </span>
        </div>
      </div>
    </aside>
  );
};
