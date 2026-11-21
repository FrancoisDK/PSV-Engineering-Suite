import React, { useState } from 'react';
import {
  gasLoadToMassFlowKgH,
  kelvinToTemp,
  kgHToMassFlow,
  kgM3ToDensity,
  kpaAbsToPressure,
  mm2ToArea,
  pressureToKpaAbs,
  tempToKelvin,
  densityToKgM3,
} from '../../calculations/unitConversions';
import { STANDARD_REF_CONDITION_PRESETS } from '../../constants/defaultFactors';
import { TEMPERATURE_UNITS } from '../../constants/unitDefinitions';
import {
  GasLoadInputMode,
  GasPSVInput,
  GasSizingResult,
  PressureUnit,
  ProjectDocument,
  TemperatureUnit,
  UnitPreferences,
  ValveType,
} from '../../models/calculationTypes';
import { SensitivityPanel } from '../charts/SensitivityPanel';
import { StatusBadge } from '../common/StatusBadge';
import { StepByStepSection } from '../common/StepByStepSection';
import { UnitField } from '../common/UnitField';
import { ValidationBanner } from '../common/ValidationBanner';

interface GasSizingTabProps {
  document: ProjectDocument;
  result: GasSizingResult;
  advancedMode: boolean;
  onChangeGasInput: (patch: Partial<GasPSVInput>) => void;
  onChangeUnitPref: <K extends keyof UnitPreferences>(key: K, val: UnitPreferences[K]) => void;
}

type GasSubTab = 'fluid' | 'conditions' | 'regime' | 'results' | 'sensitivity';

const GAS_LOAD_MODES: GasLoadInputMode[] = [
  'kg/h',
  'kg/s',
  'lb/h',
  'Nm3/h',
  'Sm3/h',
  'actual m3/h',
  'SCFM',
];

const PRESSURE_OPTS = [
  { value: 'kPa(g)', label: 'kPa(g)' },
  { value: 'kPa(a)', label: 'kPa(a)' },
  { value: 'bar(g)', label: 'bar(g)' },
  { value: 'bar(a)', label: 'bar(a)' },
  { value: 'psig', label: 'psig' },
  { value: 'psia', label: 'psia' },
];

export const GasSizingTab: React.FC<GasSizingTabProps> = ({
  document,
  result,
  advancedMode,
  onChangeGasInput,
  onChangeUnitPref,
}) => {
  const [subTab, setSubTab] = useState<GasSubTab>('fluid');
  const g = document.gasInput;
  const u = document.unitPreferences;
  const atm = g.atmosphericPressureKpaA;

  const isStdVolMode =
    g.loadInputMode === 'Nm3/h' ||
    g.loadInputMode === 'Sm3/h' ||
    g.loadInputMode === 'SCFM';

  const fieldMsgs = (field: string) =>
    result.messages.filter((m) => m.field === field);

  const flowConv = gasLoadToMassFlowKgH(
    g.requiredFlowValue,
    g.loadInputMode,
    g.molecularWeight,
    g.standardRefConditions,
    g.relievingDensityKgM3
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['fluid', '1. Fluid Properties'],
              ['conditions', '2. Relief Conditions'],
              ['regime', '3. Flow Regime'],
              ['results', '4. Sizing Results'],
              ['sensitivity', '5. Sensitivity'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                subTab === id
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <StatusBadge status={result.status} compact />
      </div>

      <ValidationBanner messages={result.messages} />

      {/* 1. Fluid Properties */}
      {subTab === 'fluid' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Gas / Vapour Fluid Properties & Relieving Load
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">Fluid Name</label>
              <input
                type="text"
                value={g.fluidName}
                onChange={(e) => onChangeGasInput({ fluidName: e.target.value })}
                placeholder="e.g. Hydrocarbon Vapour"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
              />
            </div>

            <div className="flex flex-col gap-1 lg:col-span-2">
              <label className="text-xs font-medium text-slate-700">
                Composition Description
              </label>
              <input
                type="text"
                value={g.compositionDescription}
                onChange={(e) =>
                  onChangeGasInput({ compositionDescription: e.target.value })
                }
                placeholder="e.g. 85% CH4, 10% C2H6, 5% C3H8"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
              />
            </div>

            <UnitField
              label="Molecular Weight"
              symbol="MW"
              internalValue={g.molecularWeight}
              displayValue={g.molecularWeight}
              unitLabel="kg/kmol"
              onCommitDisplayValue={(v) => onChangeGasInput({ molecularWeight: v })}
              messages={fieldMsgs('molecularWeight')}
            />

            <UnitField
              label="Compressibility Factor"
              symbol="Z"
              tooltip="Real-gas compressibility factor evaluated at relieving P1 and T1"
              internalValue={g.compressibilityZ}
              displayValue={g.compressibilityZ}
              unitLabel="-"
              onCommitDisplayValue={(v) => onChangeGasInput({ compressibilityZ: v })}
              messages={fieldMsgs('compressibilityZ')}
            />

            <UnitField
              label="Isentropic Coefficient (Cp/Cv)"
              symbol="k"
              tooltip="Ideal-gas / isentropic ratio Cp/Cv at relieving conditions (> 1.0)"
              internalValue={g.isentropicK}
              displayValue={g.isentropicK}
              unitLabel="-"
              onCommitDisplayValue={(v) => onChangeGasInput({ isentropicK: v })}
              messages={fieldMsgs('isentropicK')}
            />

            <UnitField
              label="Relieving Temperature"
              symbol="T1"
              internalValue={g.relievingTemperatureK}
              displayValue={kelvinToTemp(g.relievingTemperatureK, u.temperature)}
              unitLabel={u.temperature}
              unitOptions={[...TEMPERATURE_UNITS]}
              selectedUnit={u.temperature}
              onUnitChange={(unit) =>
                onChangeUnitPref('temperature', unit as TemperatureUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeGasInput({ relievingTemperatureK: tempToKelvin(v, u.temperature) })
              }
              secondaryReadout={`Abs: ${g.relievingTemperatureK.toFixed(2)} K`}
              precision={2}
              messages={fieldMsgs('relievingTemperatureK')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Load Input Basis
              </label>
              <select
                value={g.loadInputMode}
                onChange={(e) => {
                  const newMode = e.target.value as GasLoadInputMode;
                  const preset =
                    newMode === 'Nm3/h'
                      ? STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)']
                      : newMode === 'Sm3/h'
                        ? STANDARD_REF_CONDITION_PRESETS['Sm3/h (15 C, 101.325 kPa)']
                        : newMode === 'SCFM'
                          ? STANDARD_REF_CONDITION_PRESETS['SCFM (60 F, 14.696 psia)']
                          : g.standardRefConditions;
                  onChangeGasInput({
                    loadInputMode: newMode,
                    standardRefConditions: preset,
                  });
                }}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                {GAS_LOAD_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <UnitField
              label="Required Relieving Load"
              symbol="W"
              internalValue={g.requiredFlowValue}
              displayValue={g.requiredFlowValue}
              unitLabel={g.loadInputMode}
              onCommitDisplayValue={(v) => onChangeGasInput({ requiredFlowValue: v })}
              secondaryReadout={
                flowConv.massFlowKgH !== null
                  ? `Mass flow: ${kgHToMassFlow(flowConv.massFlowKgH, u.massFlow).toFixed(2)} ${u.massFlow}`
                  : undefined
              }
              messages={fieldMsgs('requiredFlowValue')}
            />

            {g.loadInputMode === 'actual m3/h' && (
              <UnitField
                label="Density at Relieving Conditions"
                symbol="ρ1"
                internalValue={g.relievingDensityKgM3 ?? 0}
                displayValue={kgM3ToDensity(
                  g.relievingDensityKgM3 ?? 0,
                  u.density
                )}
                unitLabel={u.density}
                onCommitDisplayValue={(v) =>
                  onChangeGasInput({
                    relievingDensityKgM3: densityToKgM3(v, u.density),
                  })
                }
              />
            )}
          </div>

          {isStdVolMode && (
            <div className="rounded border border-blue-200 bg-blue-50/70 p-4 space-y-3">
              <div className="text-xs font-semibold text-blue-900">
                Explicit Standard Reference Conditions (Never Silently Assumed)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UnitField
                  label="Reference Temperature"
                  symbol="T_ref"
                  internalValue={g.standardRefConditions.tempK}
                  displayValue={kelvinToTemp(
                    g.standardRefConditions.tempK,
                    u.temperature
                  )}
                  unitLabel={u.temperature}
                  sourceType="STANDARD_LOOKUP"
                  onCommitDisplayValue={(v) =>
                    onChangeGasInput({
                      standardRefConditions: {
                        ...g.standardRefConditions,
                        preset: 'Custom',
                        tempK: tempToKelvin(v, u.temperature),
                      },
                    })
                  }
                  secondaryReadout={`${g.standardRefConditions.tempK.toFixed(2)} K`}
                />
                <UnitField
                  label="Reference Pressure (Abs)"
                  symbol="P_ref"
                  internalValue={g.standardRefConditions.pressureKpaA}
                  displayValue={g.standardRefConditions.pressureKpaA}
                  unitLabel="kPa(a)"
                  sourceType="STANDARD_LOOKUP"
                  onCommitDisplayValue={(v) =>
                    onChangeGasInput({
                      standardRefConditions: {
                        ...g.standardRefConditions,
                        preset: 'Custom',
                        pressureKpaA: v,
                      },
                    })
                  }
                />
                <UnitField
                  label="Reference Compressibility"
                  symbol="Z_ref"
                  internalValue={g.standardRefConditions.zRef}
                  displayValue={g.standardRefConditions.zRef}
                  unitLabel="-"
                  sourceType="STANDARD_LOOKUP"
                  onCommitDisplayValue={(v) =>
                    onChangeGasInput({
                      standardRefConditions: {
                        ...g.standardRefConditions,
                        preset: 'Custom',
                        zRef: v,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {advancedMode && (
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={g.outsideScopeFlag}
                  onChange={(e) =>
                    onChangeGasInput({ outsideScopeFlag: e.target.checked })
                  }
                  className="rounded border-slate-300 text-red-600"
                />
                <span>
                  Service involves two-phase, reactive, polymerising, or DIERS specialist regime (Outside Implemented Method)
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* 2. Relief Conditions */}
      {subTab === 'conditions' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Relief Pressure, Backpressure & PSV Factors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UnitField
              label="Set Pressure"
              symbol="P_set"
              internalValue={g.setPressureKpaG + atm}
              displayValue={kpaAbsToPressure(g.setPressureKpaG + atm, u.pressure, atm)}
              unitLabel={u.pressure}
              unitOptions={PRESSURE_OPTS}
              selectedUnit={u.pressure}
              onUnitChange={(unit) =>
                onChangeUnitPref('pressure', unit as PressureUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeGasInput({
                  setPressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
              secondaryReadout={`Relieving P1 = ${result.upstreamPressureKpaA.toFixed(2)} kPa(a)`}
              messages={fieldMsgs('setPressureKpaG')}
            />

            <UnitField
              label="Allowable Overpressure"
              symbol="% OP"
              internalValue={g.overpressurePercent}
              displayValue={g.overpressurePercent}
              unitLabel="%"
              onCommitDisplayValue={(v) => onChangeGasInput({ overpressurePercent: v })}
              precision={1}
              messages={fieldMsgs('overpressurePercent')}
            />

            <UnitField
              label="Total Backpressure"
              symbol="P2"
              internalValue={g.totalBackpressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                g.totalBackpressureKpaG + atm,
                u.pressure,
                atm
              )}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeGasInput({
                  totalBackpressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
              secondaryReadout={`Abs P2 = ${result.downstreamPressureKpaA.toFixed(2)} kPa(a)`}
              messages={fieldMsgs('totalBackpressureKpaG')}
            />

            <UnitField
              label="Atmospheric Pressure"
              symbol="P_atm"
              internalValue={g.atmosphericPressureKpaA}
              displayValue={g.atmosphericPressureKpaA}
              unitLabel="kPa(a)"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) =>
                onChangeGasInput({ atmosphericPressureKpaA: v })
              }
              messages={fieldMsgs('atmosphericPressureKpaA')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">Valve Type</label>
              <select
                value={g.valveType}
                onChange={(e) =>
                  onChangeGasInput({ valveType: e.target.value as ValveType })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="conventional">Conventional spring loaded</option>
                <option value="balanced_bellows">Balanced bellows</option>
                <option value="pilot_operated">Pilot operated</option>
              </select>
            </div>

            <UnitField
              label="Discharge Coefficient"
              symbol="Kd"
              internalValue={g.kd}
              displayValue={g.kd}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeGasInput({ kd: v })}
              messages={fieldMsgs('kd')}
            />

            <UnitField
              label="Backpressure Factor"
              symbol="Kb"
              internalValue={g.kb}
              displayValue={g.kb}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeGasInput({ kb: v })}
              messages={fieldMsgs('kb')}
            />

            <UnitField
              label="Rupture Disk Factor"
              symbol="Kc"
              internalValue={g.kc}
              displayValue={g.kc}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeGasInput({ kc: v })}
              messages={fieldMsgs('kc')}
            />
          </div>
        </div>
      )}

      {/* 3. Flow Regime */}
      {subTab === 'regime' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Compressible Flow Regime Determination (Absolute Pressure Basis)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded border border-slate-200 bg-slate-50">
              <div className="text-slate-500">Upstream Pressure (P1)</div>
              <div className="text-base font-mono font-bold text-slate-900 mt-1">
                {result.upstreamPressureKpaA.toFixed(2)} kPa(a)
              </div>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-slate-50">
              <div className="text-slate-500">Downstream Pressure (P2)</div>
              <div className="text-base font-mono font-bold text-slate-900 mt-1">
                {result.downstreamPressureKpaA.toFixed(2)} kPa(a)
              </div>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-slate-50">
              <div className="text-slate-500">Actual Ratio (P2 / P1)</div>
              <div className="text-base font-mono font-bold text-slate-900 mt-1">
                {result.pressureRatio.toFixed(5)}
              </div>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-slate-50">
              <div className="text-slate-500">Critical Ratio (r_c)</div>
              <div className="text-base font-mono font-bold text-blue-700 mt-1">
                {result.criticalPressureRatio.toFixed(5)}
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-200 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                Selected Flow Regime:
              </span>
              <span className="font-mono font-bold text-sm text-blue-800">
                {result.flowRegime === 'CRITICAL'
                  ? 'CRITICAL (CHOKED FLOW)'
                  : result.flowRegime === 'SUBCRITICAL'
                    ? 'SUBCRITICAL (NON-CHOKED FLOW)'
                    : 'INVALID / INCOMPLETE'}
              </span>
            </div>
            <div className="font-mono text-[11px] bg-slate-50 p-2.5 rounded text-slate-700">
              {result.flowRegime === 'SUBCRITICAL'
                ? `Condition: P2 / P1 (${result.pressureRatio.toFixed(5)}) > r_c (${result.criticalPressureRatio.toFixed(5)}). Applying Subcritical F2 equation (F2 = ${result.subcriticalF2?.toFixed(5) ?? 'N/A'}).`
                : `Condition: P2 / P1 (${result.pressureRatio.toFixed(5)}) <= r_c (${result.criticalPressureRatio.toFixed(5)}). Applying Critical choked nozzle equation (C = ${result.expansionCoeffC.toFixed(6)}).`}
            </div>
          </div>
        </div>
      )}

      {/* 4. Sizing Results */}
      {subTab === 'results' && (
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Gas / Vapour PSV Sizing Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Required Relieving Rate</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {kgHToMassFlow(result.requiredMassFlowKgH, u.massFlow).toFixed(2)}{' '}
                  {u.massFlow}
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {result.requiredMassFlowKgH.toFixed(2)} kg/h
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Required Effective Area</div>
                <div className="text-sm font-mono font-bold text-blue-700 mt-1 tabular-nums">
                  {result.requiredAreaMm2 !== null
                    ? `${mm2ToArea(result.requiredAreaMm2, u.area).toFixed(3)} ${u.area}`
                    : '—'}
                </div>
                {result.requiredAreaMm2 !== null && (
                  <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {result.requiredAreaMm2.toFixed(2)} mm² ·{' '}
                    {result.requiredAreaCm2?.toFixed(3)} cm² ·{' '}
                    {result.requiredAreaIn2?.toFixed(4)} in²
                  </div>
                )}
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Selected API 526 Orifice</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.orificeSelection?.selectedOrifice
                    ? `Orifice ${result.orificeSelection.selectedOrifice.designation} (${result.orificeSelection.selectedOrifice.effectiveAreaMm2.toFixed(1)} mm²)`
                    : 'None / Exceeds Standard'}
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  Margin:{' '}
                  {result.orificeSelection?.areaMarginPercent !== null &&
                  result.orificeSelection?.areaMarginPercent !== undefined
                    ? `${result.orificeSelection.areaMarginPercent.toFixed(1)}%`
                    : '—'}{' '}
                  · Util:{' '}
                  {result.orificeSelection?.utilisationPercent !== null &&
                  result.orificeSelection?.utilisationPercent !== undefined
                    ? `${result.orificeSelection.utilisationPercent.toFixed(1)}%`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded bg-blue-50 border border-blue-200">
                <div className="text-blue-900 font-medium">
                  PSV Inlet × Outlet Nozzles
                </div>
                <div className="text-sm font-mono font-bold text-blue-800 mt-1 tabular-nums">
                  {result.orificeSelection?.nozzleSizeLabel ?? '—'}
                </div>
                {result.orificeSelection?.inletNozzleSizeIn &&
                  result.orificeSelection?.outletNozzleSizeIn && (
                    <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                      Inlet {result.orificeSelection.inletNozzleSizeIn} · Outlet{' '}
                      {result.orificeSelection.outletNozzleSizeIn} (API 526)
                    </div>
                  )}
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">
                  Orifice Capacity ({g.overpressurePercent}% OP)
                </div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.selectedOrificeCapacityKgH !== null
                    ? `${kgHToMassFlow(
                        result.selectedOrificeCapacityKgH,
                        u.massFlow
                      ).toFixed(1)} ${u.massFlow}`
                    : '—'}
                </div>
                {result.selectedOrificeCapacityKgH !== null && (
                  <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {result.selectedOrificeCapacityKgH.toFixed(1)} kg/h
                  </div>
                )}
              </div>
              <div className="p-3 rounded bg-emerald-50/70 border border-emerald-200">
                <div className="text-emerald-900 font-medium">
                  Rated Cap. @ 10% OP (Line Sizing)
                </div>
                <div className="text-sm font-mono font-bold text-emerald-800 mt-1 tabular-nums">
                  {result.ratedCapacityAt10PercentKgH !== null
                    ? `${kgHToMassFlow(
                        result.ratedCapacityAt10PercentKgH,
                        u.massFlow
                      ).toFixed(1)} ${u.massFlow}`
                    : '—'}
                </div>
                {result.ratedCapacityAt10PercentKgH !== null && (
                  <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                    {result.ratedCapacityAt10PercentKgH.toFixed(1)} kg/h · P1,10% ={' '}
                    {result.ratedPressure10PctKpaA?.toFixed(1)} kPa(a)
                  </div>
                )}
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Governing Pressure Differential</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.governingDifferentialKpa.toFixed(2)} kPa
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Applied Correction Factors</div>
                <div className="text-sm font-mono text-slate-900 mt-1 tabular-nums">
                  Kd={g.kd} · Kb={g.kb} · Kc={g.kc}
                </div>
              </div>
            </div>
          </div>

          <StepByStepSection steps={result.trace.steps} defaultOpen />
        </div>
      )}

      {/* 5. Sensitivity */}
      {subTab === 'sensitivity' && (
        <SensitivityPanel
          module="gas"
          inputs={{
            gas: document.gasInput,
            liquid: document.liquidInput,
            breakthrough: document.breakthroughInput,
            fire: document.fireInput,
          }}
          standardBasis={document.standardBasis}
          unitPreferences={document.unitPreferences}
        />
      )}
    </div>
  );
};
