import React, { useState } from 'react';
import {
  cpToViscosity,
  densityToKgM3,
  kelvinToTemp,
  kgHToMassFlow,
  kgM3ToDensity,
  kpaAbsToPressure,
  m3HToVolFlow,
  massFlowToKgH,
  mm2ToArea,
  pressureToKpaAbs,
  tempToKelvin,
  viscosityToCp,
  volFlowToM3H,
} from '../../calculations/unitConversions';
import {
  DENSITY_UNITS,
  LIQUID_VOL_FLOW_UNITS,
  MASS_FLOW_UNITS,
  TEMPERATURE_UNITS,
  VISCOSITY_UNITS,
} from '../../constants/unitDefinitions';
import {
  DensityUnit,
  LiquidPSVInput,
  LiquidSizingResult,
  LiquidVolFlowUnit,
  MassFlowUnit,
  PressureUnit,
  ProjectDocument,
  TemperatureUnit,
  UnitPreferences,
  ViscosityUnit,
} from '../../models/calculationTypes';
import { SensitivityPanel } from '../charts/SensitivityPanel';
import { StatusBadge } from '../common/StatusBadge';
import { StepByStepSection } from '../common/StepByStepSection';
import { UnitField } from '../common/UnitField';
import { ValidationBanner } from '../common/ValidationBanner';

interface LiquidSizingTabProps {
  document: ProjectDocument;
  result: LiquidSizingResult;
  advancedMode: boolean;
  onChangeLiquidInput: (patch: Partial<LiquidPSVInput>) => void;
  onChangeUnitPref: <K extends keyof UnitPreferences>(key: K, val: UnitPreferences[K]) => void;
}

type LiquidSubTab = 'properties' | 'conditions' | 'iteration' | 'results' | 'sensitivity';

export const LiquidSizingTab: React.FC<LiquidSizingTabProps> = ({
  document,
  result,
  advancedMode,
  onChangeLiquidInput,
  onChangeUnitPref,
}) => {
  const [subTab, setSubTab] = useState<LiquidSubTab>('properties');
  const [showIterTable, setShowIterTable] = useState(true);

  const l = document.liquidInput;
  const u = document.unitPreferences;
  const atm = l.atmosphericPressureKpaA;

  const fieldMsgs = (field: string) =>
    result.messages.filter((m) => m.field === field);

  const kinematicCst =
    l.densityKgM3 > 0 ? l.dynamicViscosityCp / (l.densityKgM3 / 1000) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['properties', '1. Liquid Properties'],
              ['conditions', '2. Relief Conditions'],
              ['iteration', '3. Viscosity Iteration'],
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

      {/* 1. Liquid Properties */}
      {subTab === 'properties' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Single-Phase Liquid Properties & Relieving Rate
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">Fluid Name</label>
              <input
                type="text"
                value={l.fluidName}
                onChange={(e) => onChangeLiquidInput({ fluidName: e.target.value })}
                placeholder="e.g. Glycol / Water / Hydrocarbon"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Primary Flow Input Basis
              </label>
              <select
                value={l.primaryFlowBasis}
                onChange={(e) =>
                  onChangeLiquidInput({
                    primaryFlowBasis: e.target.value as 'mass' | 'volumetric',
                  })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="volumetric">Volumetric Flow (calculate mass)</option>
                <option value="mass">Mass Flow (calculate volumetric)</option>
              </select>
            </div>

            <UnitField
              label="Relieving Temperature"
              symbol="T1"
              internalValue={l.relievingTemperatureK}
              displayValue={kelvinToTemp(l.relievingTemperatureK, u.temperature)}
              unitLabel={u.temperature}
              unitOptions={[...TEMPERATURE_UNITS]}
              selectedUnit={u.temperature}
              onUnitChange={(unit) =>
                onChangeUnitPref('temperature', unit as TemperatureUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeLiquidInput({
                  relievingTemperatureK: tempToKelvin(v, u.temperature),
                })
              }
              precision={2}
            />

            <UnitField
              label="Density at Relieving Temp."
              symbol="ρ"
              internalValue={l.densityKgM3}
              displayValue={kgM3ToDensity(l.densityKgM3, u.density)}
              unitLabel={u.density}
              unitOptions={[...DENSITY_UNITS]}
              selectedUnit={u.density}
              onUnitChange={(unit) => onChangeUnitPref('density', unit as DensityUnit)}
              onCommitDisplayValue={(v) => {
                const kgm3 = densityToKgM3(v, u.density);
                onChangeLiquidInput({
                  densityKgM3: kgm3,
                  requiredMassFlowKgH:
                    l.primaryFlowBasis === 'volumetric'
                      ? l.requiredVolFlowM3H * kgm3
                      : l.requiredMassFlowKgH,
                  requiredVolFlowM3H:
                    l.primaryFlowBasis === 'mass' && kgm3 > 0
                      ? l.requiredMassFlowKgH / kgm3
                      : l.requiredVolFlowM3H,
                });
              }}
              secondaryReadout={`SG (water=1000): ${(l.densityKgM3 / 1000).toFixed(4)}`}
              messages={fieldMsgs('densityKgM3')}
            />

            <UnitField
              label="Specific Gravity (SG)"
              symbol="G"
              tooltip="Relative to water at 1000 kg/m³; editing updates density"
              internalValue={l.densityKgM3 / 1000}
              displayValue={l.densityKgM3 / 1000}
              unitLabel="-"
              onCommitDisplayValue={(sg) => {
                const kgm3 = sg * 1000;
                onChangeLiquidInput({ densityKgM3: kgm3 });
              }}
              precision={4}
            />

            <UnitField
              label="Dynamic Viscosity"
              symbol="μ"
              internalValue={l.dynamicViscosityCp}
              displayValue={cpToViscosity(l.dynamicViscosityCp, u.viscosity)}
              unitLabel={u.viscosity}
              unitOptions={[...VISCOSITY_UNITS]}
              selectedUnit={u.viscosity}
              onUnitChange={(unit) =>
                onChangeUnitPref('viscosity', unit as ViscosityUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeLiquidInput({
                  dynamicViscosityCp: viscosityToCp(v, u.viscosity),
                })
              }
              secondaryReadout={`Kinematic: ${kinematicCst.toFixed(2)} cSt`}
              messages={fieldMsgs('dynamicViscosityCp')}
            />

            <UnitField
              label="Vapour Pressure at Relieving Temp."
              symbol="P_vap"
              tooltip="Used to screen against flashing at inlet or across valve seat"
              internalValue={l.vapourPressureKpaA}
              displayValue={kpaAbsToPressure(l.vapourPressureKpaA, 'kPa(a)', atm)}
              unitLabel="kPa(a)"
              onCommitDisplayValue={(v) =>
                onChangeLiquidInput({ vapourPressureKpaA: v })
              }
              secondaryReadout={`${(l.vapourPressureKpaA / 6.894757).toFixed(2)} psia`}
              messages={fieldMsgs('vapourPressureKpaA')}
            />

            <UnitField
              label="Required Volumetric Flow"
              symbol="Q"
              internalValue={result.volumetricFlowM3H}
              displayValue={m3HToVolFlow(result.volumetricFlowM3H, u.liquidVolFlow)}
              unitLabel={u.liquidVolFlow}
              unitOptions={[...LIQUID_VOL_FLOW_UNITS]}
              selectedUnit={u.liquidVolFlow}
              onUnitChange={(unit) =>
                onChangeUnitPref('liquidVolFlow', unit as LiquidVolFlowUnit)
              }
              disabled={l.primaryFlowBasis === 'mass'}
              sourceType={l.primaryFlowBasis === 'volumetric' ? 'USER_INPUT' : 'CALCULATED'}
              onCommitDisplayValue={(v) => {
                const m3h = volFlowToM3H(v, u.liquidVolFlow);
                onChangeLiquidInput({
                  requiredVolFlowM3H: m3h,
                  requiredMassFlowKgH: m3h * l.densityKgM3,
                });
              }}
              messages={fieldMsgs('requiredVolFlowM3H')}
            />

            <UnitField
              label="Required Mass Flow"
              symbol="W"
              internalValue={result.massFlowKgH}
              displayValue={kgHToMassFlow(result.massFlowKgH, u.massFlow)}
              unitLabel={u.massFlow}
              unitOptions={[...MASS_FLOW_UNITS]}
              selectedUnit={u.massFlow}
              onUnitChange={(unit) =>
                onChangeUnitPref('massFlow', unit as MassFlowUnit)
              }
              disabled={l.primaryFlowBasis === 'volumetric'}
              sourceType={l.primaryFlowBasis === 'mass' ? 'USER_INPUT' : 'CALCULATED'}
              onCommitDisplayValue={(v) => {
                const kgh = massFlowToKgH(v, u.massFlow);
                onChangeLiquidInput({
                  requiredMassFlowKgH: kgh,
                  requiredVolFlowM3H: l.densityKgM3 > 0 ? kgh / l.densityKgM3 : 0,
                });
              }}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-6 text-xs">
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={l.flashingOrTwoPhaseFlag}
                onChange={(e) =>
                  onChangeLiquidInput({ flashingOrTwoPhaseFlag: e.target.checked })
                }
                className="rounded border-slate-300 text-red-600"
              />
              <span>
                Flashing / Two-Phase Flow Suspected (blocks single-phase liquid method)
              </span>
            </label>
            {advancedMode && (
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={l.nonNewtonianFlag}
                  onChange={(e) =>
                    onChangeLiquidInput({ nonNewtonianFlag: e.target.checked })
                  }
                  className="rounded border-slate-300 text-red-600"
                />
                <span>Non-Newtonian Fluid (outside implemented method)</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* 2. Relief Conditions */}
      {subTab === 'conditions' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Liquid Relief Pressures & Valve Factors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UnitField
              label="Upstream Relieving Pressure"
              symbol="P1"
              internalValue={l.upstreamPressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                l.upstreamPressureKpaG + atm,
                u.pressure,
                atm
              )}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeLiquidInput({
                  upstreamPressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
              secondaryReadout={`Abs P1 = ${result.upstreamPressureKpaA.toFixed(2)} kPa(a)`}
              messages={fieldMsgs('upstreamPressureKpaG')}
            />

            <UnitField
              label="Total Backpressure"
              symbol="P2"
              internalValue={l.totalBackpressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                l.totalBackpressureKpaG + atm,
                u.pressure,
                atm
              )}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeLiquidInput({
                  totalBackpressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
              secondaryReadout={`Abs P2 = ${result.downstreamPressureKpaA.toFixed(2)} kPa(a)`}
              messages={fieldMsgs('totalBackpressureKpaG')}
            />

            <UnitField
              label="Differential Pressure (ΔP)"
              symbol="P1 - P2"
              internalValue={result.differentialPressureKpa}
              displayValue={result.differentialPressureKpa}
              unitLabel="kPa"
              disabled
              sourceType="CALCULATED"
              onCommitDisplayValue={() => {}}
              secondaryReadout={`${(result.differentialPressureKpa / 6.894757).toFixed(2)} psi`}
            />

            <UnitField
              label="Atmospheric Pressure"
              symbol="P_atm"
              internalValue={l.atmosphericPressureKpaA}
              displayValue={l.atmosphericPressureKpaA}
              unitLabel="kPa(a)"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) =>
                onChangeLiquidInput({ atmosphericPressureKpaA: v })
              }
            />

            <UnitField
              label="Discharge Coefficient"
              symbol="Kd"
              internalValue={l.kd}
              displayValue={l.kd}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeLiquidInput({ kd: v })}
              messages={fieldMsgs('kd')}
            />

            <UnitField
              label="Liquid Backpressure Factor"
              symbol="Kw"
              internalValue={l.kw}
              displayValue={l.kw}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeLiquidInput({ kw: v })}
              messages={fieldMsgs('kw')}
            />

            <UnitField
              label="Combination Factor"
              symbol="Kc"
              internalValue={l.kc}
              displayValue={l.kc}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeLiquidInput({ kc: v })}
              messages={fieldMsgs('kc')}
            />
          </div>
        </div>
      )}

      {/* 3. Viscosity Iteration */}
      {subTab === 'iteration' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Viscosity Correction Factor (Kv) Iteration
              </h3>
              <p className="text-xs text-slate-500">
                Provisional area at Kv = 1.0 → Reynolds parameter R → Kv → corrected area until convergence (&lt; 0.001%).
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={l.useIterativeKv}
                onChange={(e) =>
                  onChangeLiquidInput({ useIterativeKv: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-700"
              />
              <span>Enable Iterative Kv Evaluation</span>
            </label>
          </div>

          {!l.useIterativeKv && (
            <div className="max-w-xs">
              <UnitField
                label="Manual Viscosity Factor"
                symbol="Kv"
                internalValue={l.manualKv}
                displayValue={l.manualKv}
                unitLabel="-"
                onCommitDisplayValue={(v) => onChangeLiquidInput({ manualKv: v })}
                messages={fieldMsgs('manualKv')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Provisional Area (Kv=1)</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.preliminaryAreaMm2 !== null
                  ? `${result.preliminaryAreaMm2.toFixed(2)} mm²`
                  : '—'}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Reynolds Parameter (R)</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.reynoldsNumber !== null
                  ? result.reynoldsNumber.toFixed(1)
                  : '—'}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Final Kv</div>
              <div className="font-mono font-bold text-blue-700 mt-1">
                {result.kvFinal !== null ? result.kvFinal.toFixed(5) : '—'}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Convergence</div>
              <div
                className={`font-semibold mt-1 ${
                  result.converged ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {result.converged
                  ? `Converged (${result.iterationCount} iter)`
                  : 'Not converged / N/A'}
              </div>
            </div>
          </div>

          {result.iterationHistory.length > 0 && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setShowIterTable((s) => !s)}
                className="w-full px-4 py-2 bg-slate-50 text-left text-xs font-semibold text-slate-800 border-b border-slate-200 flex justify-between"
              >
                <span>Iteration History Table ({result.iterationHistory.length} steps)</span>
                <span>{showIterTable ? 'Hide' : 'Show'}</span>
              </button>
              {showIterTable && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3">Iteration</th>
                        <th className="py-2 px-3 text-right">Trial Area (mm²)</th>
                        <th className="py-2 px-3 text-right">Reynolds Param (R)</th>
                        <th className="py-2 px-3 text-right">Kv</th>
                        <th className="py-2 px-3 text-right">Corrected Area (mm²)</th>
                        <th className="py-2 px-3 text-right">% Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {result.iterationHistory.map((row) => (
                        <tr key={row.iteration}>
                          <td className="py-1.5 px-3">{row.iteration}</td>
                          <td className="py-1.5 px-3 text-right">
                            {row.trialAreaMm2.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {row.reynoldsNumber.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {row.kv.toFixed(5)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-semibold">
                            {row.correctedAreaMm2.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {row.percentChange !== null
                              ? `${row.percentChange.toFixed(4)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Sizing Results */}
      {subTab === 'results' && (
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Liquid PSV Sizing Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Required Volumetric Flow</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                  {m3HToVolFlow(result.volumetricFlowM3H, u.liquidVolFlow).toFixed(2)}{' '}
                  {u.liquidVolFlow}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Required Area (Corrected)</div>
                <div className="text-sm font-mono font-bold text-blue-700 mt-1">
                  {result.requiredAreaMm2 !== null
                    ? `${mm2ToArea(result.requiredAreaMm2, u.area).toFixed(3)} ${u.area}`
                    : 'Blocked / Outside Method'}
                </div>
                {result.requiredAreaMm2 !== null && (
                  <div className="text-[11px] font-mono text-slate-500">
                    {result.requiredAreaMm2.toFixed(2)} mm² ·{' '}
                    {result.requiredAreaIn2?.toFixed(4)} in²
                  </div>
                )}
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Selected API 526 Orifice</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                  {result.orificeSelection?.selectedOrifice
                    ? `Orifice ${result.orificeSelection.selectedOrifice.designation} (${result.orificeSelection.selectedOrifice.effectiveAreaMm2.toFixed(1)} mm²)`
                    : 'None'}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Orifice Volumetric Capacity</div>
                <div className="text-sm font-mono font-bold text-emerald-700 mt-1">
                  {result.selectedOrificeCapacityM3H !== null
                    ? `${m3HToVolFlow(
                        result.selectedOrificeCapacityM3H,
                        u.liquidVolFlow
                      ).toFixed(2)} ${u.liquidVolFlow}`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Governing ΔP & SG</div>
                <div className="text-sm font-mono text-slate-900 mt-1">
                  ΔP = {result.differentialPressureKpa.toFixed(1)} kPa · SG ={' '}
                  {result.specificGravity.toFixed(4)}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Applied Factors</div>
                <div className="text-sm font-mono text-slate-900 mt-1">
                  Kd={l.kd} · Kw={l.kw} · Kc={l.kc} · Kv={result.kvFinal?.toFixed(4) ?? '—'}
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
          module="liquid"
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
