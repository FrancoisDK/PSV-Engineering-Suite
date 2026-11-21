import React, { useState } from 'react';
import {
  areaToMm2,
  kelvinToTemp,
  kgHToMassFlow,
  kpaAbsToPressure,
  lengthToMeters,
  massFlowToKgH,
  metersToLength,
  mm2ToArea,
  pressureToKpaAbs,
  tempToKelvin,
} from '../../calculations/unitConversions';
import { TEMPERATURE_UNITS } from '../../constants/unitDefinitions';
import {
  BreakthroughFailureMode,
  PressureUnit,
  ProjectDocument,
  RestrictionDeviceType,
  TemperatureUnit,
  UnitPreferences,
  VapourBreakthroughInput,
  VapourBreakthroughResult,
} from '../../models/calculationTypes';
import { SensitivityPanel } from '../charts/SensitivityPanel';
import { StatusBadge } from '../common/StatusBadge';
import { StepByStepSection } from '../common/StepByStepSection';
import { UnitField } from '../common/UnitField';
import { ValidationBanner } from '../common/ValidationBanner';

interface BreakthroughTabProps {
  document: ProjectDocument;
  result: VapourBreakthroughResult;
  onChangeBreakthroughInput: (patch: Partial<VapourBreakthroughInput>) => void;
  onChangeUnitPref: <K extends keyof UnitPreferences>(key: K, val: UnitPreferences[K]) => void;
}

type BbSubTab =
  | 'definition'
  | 'source'
  | 'restriction'
  | 'load'
  | 'psv'
  | 'results';

export const BreakthroughTab: React.FC<BreakthroughTabProps> = ({
  document,
  result,
  onChangeBreakthroughInput,
  onChangeUnitPref,
}) => {
  const [subTab, setSubTab] = useState<BbSubTab>('definition');
  const b = document.breakthroughInput;
  const u = document.unitPreferences;
  const atm = b.atmosphericPressureKpaA;

  const fieldMsgs = (field: string) =>
    result.messages.filter((m) => m.field === field);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['definition', '1. Scenario Definition'],
              ['source', '2. Source Conditions'],
              ['restriction', '3. Restriction Device'],
              ['load', '4. Breakthrough Load'],
              ['psv', '5. PSV Sizing'],
              ['results', '6. Results & Sensitivity'],
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

      {/* 1. Scenario Definition */}
      {subTab === 'definition' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Vapour Breakthrough / Gas Blow-By Scenario Definition
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Scenario Name</label>
              <input
                type="text"
                value={b.scenarioName}
                onChange={(e) =>
                  onChangeBreakthroughInput({ scenarioName: e.target.value })
                }
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">
                High-Pressure Source Equipment
              </label>
              <input
                type="text"
                value={b.sourceEquipment}
                onChange={(e) =>
                  onChangeBreakthroughInput({ sourceEquipment: e.target.value })
                }
                placeholder="e.g. V-101 HP Separator"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">
                Low-Pressure Protected Equipment
              </label>
              <input
                type="text"
                value={b.destinationEquipment}
                onChange={(e) =>
                  onChangeBreakthroughInput({ destinationEquipment: e.target.value })
                }
                placeholder="e.g. V-202 LP Flash Drum"
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Failure Mechanism</label>
              <select
                value={b.failureMode}
                onChange={(e) =>
                  onChangeBreakthroughInput({
                    failureMode: e.target.value as BreakthroughFailureMode,
                  })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="control_valve_fails_open">Control valve fails open</option>
                <option value="regulator_fails_open">Regulator fails open</option>
                <option value="bypass_valve_open">Bypass valve left open</option>
                <option value="manual_valve_opened">Manual valve inadvertently opened</option>
                <option value="restriction_orifice_connection">Restriction orifice connection</option>
                <option value="hx_tube_rupture">Heat-exchanger tube rupture</option>
                <option value="other">Other gas breakthrough source</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Calculation Basis</label>
              <select
                value={b.steadyStateBasis}
                onChange={(e) =>
                  onChangeBreakthroughInput({
                    steadyStateBasis: e.target.value as 'steady_state' | 'transient_screening',
                  })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="steady_state">Steady-state constant-pressure source</option>
                <option value="transient_screening">Transient screening (constant P_src conservative)</option>
              </select>
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={b.transientDepletionFlag}
                  onChange={(e) =>
                    onChangeBreakthroughInput({
                      transientDepletionFlag: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-red-600"
                />
                <span>
                  Requires dynamic transient depletion / multiphase tube rupture (Outside Method)
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
              <label className="font-medium text-slate-700">Failure Description</label>
              <input
                type="text"
                value={b.failureDescription}
                onChange={(e) =>
                  onChangeBreakthroughInput({ failureDescription: e.target.value })
                }
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
              <label className="font-medium text-slate-700">Engineering Notes</label>
              <textarea
                rows={2}
                value={b.engineeringNotes}
                onChange={(e) =>
                  onChangeBreakthroughInput({ engineeringNotes: e.target.value })
                }
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Source Conditions */}
      {subTab === 'source' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            High-Pressure Source & Low-Pressure Destination Conditions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UnitField
              label="Source Upstream Pressure"
              symbol="P_src"
              internalValue={b.sourcePressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                b.sourcePressureKpaG + atm,
                u.pressure,
                atm
              )}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({
                  sourcePressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
              secondaryReadout={`Abs: ${result.sourcePressureKpaA.toFixed(2)} kPa(a)`}
              messages={fieldMsgs('sourcePressureKpaG')}
            />

            <UnitField
              label="Source Gas Temperature"
              symbol="T_src"
              internalValue={b.sourceTemperatureK}
              displayValue={kelvinToTemp(b.sourceTemperatureK, u.temperature)}
              unitLabel={u.temperature}
              unitOptions={[...TEMPERATURE_UNITS]}
              selectedUnit={u.temperature}
              onUnitChange={(unit) =>
                onChangeUnitPref('temperature', unit as TemperatureUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({
                  sourceTemperatureK: tempToKelvin(v, u.temperature),
                })
              }
              secondaryReadout={`Abs: ${b.sourceTemperatureK.toFixed(2)} K`}
              precision={2}
              messages={fieldMsgs('sourceTemperatureK')}
            />

            <UnitField
              label="Destination Relieving Pressure"
              symbol="P_dest"
              internalValue={b.destinationRelievingPressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                b.destinationRelievingPressureKpaG + atm,
                u.pressure,
                atm
              )}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({
                  destinationRelievingPressureKpaG:
                    pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
              secondaryReadout={`Abs: ${result.destinationPressureKpaA.toFixed(2)} kPa(a)`}
              messages={fieldMsgs('destinationRelievingPressureKpaG')}
            />

            <UnitField
              label="Source Molecular Weight"
              symbol="MW"
              internalValue={b.sourceMw}
              displayValue={b.sourceMw}
              unitLabel="kg/kmol"
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({ sourceMw: v })
              }
              messages={fieldMsgs('sourceMw')}
            />

            <UnitField
              label="Source Compressibility Factor"
              symbol="Z"
              internalValue={b.sourceZ}
              displayValue={b.sourceZ}
              unitLabel="-"
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({ sourceZ: v })
              }
              messages={fieldMsgs('sourceZ')}
            />

            <UnitField
              label="Source Isentropic Cp/Cv"
              symbol="k"
              internalValue={b.sourceK}
              displayValue={b.sourceK}
              unitLabel="-"
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({ sourceK: v })
              }
              messages={fieldMsgs('sourceK')}
            />

            <UnitField
              label="Atmospheric Pressure"
              symbol="P_atm"
              internalValue={b.atmosphericPressureKpaA}
              displayValue={b.atmosphericPressureKpaA}
              unitLabel="kPa(a)"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({ atmosphericPressureKpaA: v })
              }
            />
          </div>
        </div>
      )}

      {/* 3. Restriction Device */}
      {subTab === 'restriction' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Connecting Restriction Device Model
            </h3>
            <span className="text-[11px] text-slate-500">
              Control-valve Cv method and physical-orifice area method are kept strictly separate.
            </span>
          </div>

          <div className="max-w-md flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Restriction Model
            </label>
            <select
              value={b.restrictionType}
              onChange={(e) =>
                onChangeBreakthroughInput({
                  restrictionType: e.target.value as RestrictionDeviceType,
                })
              }
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
            >
              <option value="control_valve">Control Valve (ISA/IEC Cv compressible flow)</option>
              <option value="restriction_orifice">Fixed Restriction Orifice (bore diameter & Cd)</option>
              <option value="pipe_nozzle">Pipe or Nozzle (bore diameter & Cd)</option>
              <option value="known_area">Known Effective Flow Area & Cd</option>
              <option value="known_rated_flow">Manufacturer-Rated Flow (externally supplied)</option>
              <option value="user_entered">User-Entered Breakthrough Mass Flow</option>
            </select>
          </div>

          {b.restrictionType === 'control_valve' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <UnitField
                label="Control Valve Rated Cv"
                symbol="Cv"
                internalValue={b.valveCv}
                displayValue={b.valveCv}
                unitLabel="USGPM/psi^0.5"
                onCommitDisplayValue={(v) => onChangeBreakthroughInput({ valveCv: v })}
                messages={fieldMsgs('valveCv')}
              />
              <UnitField
                label="Valve Opening"
                symbol="% Open"
                internalValue={b.valveOpeningPercent}
                displayValue={b.valveOpeningPercent}
                unitLabel="%"
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({ valveOpeningPercent: v })
                }
                messages={fieldMsgs('valveOpeningPercent')}
              />
              <UnitField
                label="Pressure Drop Ratio Factor"
                symbol="xT"
                tooltip="ISA/IEC terminal pressure drop ratio factor (0.15–0.90)"
                internalValue={b.valveXt}
                displayValue={b.valveXt}
                unitLabel="-"
                onCommitDisplayValue={(v) => onChangeBreakthroughInput({ valveXt: v })}
                messages={fieldMsgs('valveXt')}
              />
              <UnitField
                label="Piping Geometry Factor"
                symbol="Fp"
                internalValue={b.valveFp}
                displayValue={b.valveFp}
                unitLabel="-"
                onCommitDisplayValue={(v) => onChangeBreakthroughInput({ valveFp: v })}
                messages={fieldMsgs('valveFp')}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700">Valve Style</label>
                <select
                  value={b.valveStyle}
                  onChange={(e) =>
                    onChangeBreakthroughInput({
                      valveStyle: e.target.value as typeof b.valveStyle,
                    })
                  }
                  className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                >
                  <option value="globe">Globe</option>
                  <option value="ball">Ball</option>
                  <option value="butterfly">Butterfly</option>
                  <option value="plug">Plug</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {(b.restrictionType === 'restriction_orifice' ||
            b.restrictionType === 'pipe_nozzle') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <UnitField
                label="Restriction Bore Diameter"
                symbol="d"
                internalValue={b.orificeBoreMm}
                displayValue={metersToLength(b.orificeBoreMm / 1000, u.length === 'ft' || u.length === 'in' ? 'in' : 'mm')}
                unitLabel={u.length === 'ft' || u.length === 'in' ? 'in' : 'mm'}
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({
                    orificeBoreMm:
                      lengthToMeters(v, u.length === 'ft' || u.length === 'in' ? 'in' : 'mm') *
                      1000,
                  })
                }
                secondaryReadout={`Area = ${((Math.PI * b.orificeBoreMm * b.orificeBoreMm) / 4).toFixed(1)} mm²`}
                messages={fieldMsgs('orificeBoreMm')}
              />
              <UnitField
                label="Upstream Pipe ID"
                symbol="D_pipe"
                internalValue={b.upstreamPipeDiameterMm}
                displayValue={metersToLength(b.upstreamPipeDiameterMm / 1000, u.length === 'ft' || u.length === 'in' ? 'in' : 'mm')}
                unitLabel={u.length === 'ft' || u.length === 'in' ? 'in' : 'mm'}
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({
                    upstreamPipeDiameterMm:
                      lengthToMeters(v, u.length === 'ft' || u.length === 'in' ? 'in' : 'mm') *
                      1000,
                  })
                }
                secondaryReadout={
                  result.betaRatio !== null
                    ? `Beta ratio (d/D) = ${result.betaRatio.toFixed(3)}`
                    : undefined
                }
              />
              <UnitField
                label="Discharge Coefficient"
                symbol="Cd"
                internalValue={b.orificeCd}
                displayValue={b.orificeCd}
                unitLabel="-"
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({ orificeCd: v })
                }
                messages={fieldMsgs('orificeCd')}
              />
            </div>
          )}

          {b.restrictionType === 'known_area' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <UnitField
                label="Effective Flow Area"
                symbol="A_eff"
                internalValue={b.knownEffectiveAreaMm2}
                displayValue={mm2ToArea(b.knownEffectiveAreaMm2, u.area)}
                unitLabel={u.area}
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({
                    knownEffectiveAreaMm2: areaToMm2(v, u.area),
                  })
                }
                messages={fieldMsgs('knownEffectiveAreaMm2')}
              />
              <UnitField
                label="Discharge Coefficient"
                symbol="Cd"
                internalValue={b.knownAreaCd}
                displayValue={b.knownAreaCd}
                unitLabel="-"
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({ knownAreaCd: v })
                }
              />
            </div>
          )}

          {(b.restrictionType === 'known_rated_flow' ||
            b.restrictionType === 'user_entered') && (
            <div className="max-w-sm pt-2">
              <UnitField
                label="Externally Supplied / Rated Mass Flow"
                symbol="W_ext"
                internalValue={b.externallySuppliedMassFlowKgH}
                displayValue={kgHToMassFlow(
                  b.externallySuppliedMassFlowKgH,
                  u.massFlow
                )}
                unitLabel={u.massFlow}
                onCommitDisplayValue={(v) =>
                  onChangeBreakthroughInput({
                    externallySuppliedMassFlowKgH: massFlowToKgH(v, u.massFlow),
                  })
                }
                messages={fieldMsgs('externallySuppliedMassFlowKgH')}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. Breakthrough Load */}
      {subTab === 'load' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Breakthrough Flow Regime & Calculated Relieving Load
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Restriction Flow Regime</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.restrictionFlowRegime}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">P_dest / P_src Ratio</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.pressureRatio.toFixed(4)} (rc ={' '}
                {result.criticalPressureRatio.toFixed(4)})
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Breakthrough Mass Flow</div>
              <div className="font-mono font-bold text-blue-700 mt-1">
                {result.breakthroughMassFlowKgH !== null
                  ? `${kgHToMassFlow(result.breakthroughMassFlowKgH, u.massFlow).toFixed(1)} ${u.massFlow}`
                  : '—'}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Standard Gas Flow (0°C, 1 atm)</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.breakthroughStdVolNm3H !== null
                  ? `${result.breakthroughStdVolNm3H.toFixed(1)} Nm³/h`
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PSV Sizing */}
      {subTab === 'psv' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Destination Low-Pressure PSV Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UnitField
              label="Destination Backpressure"
              symbol="P2_psv"
              internalValue={b.destinationBackpressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                b.destinationBackpressureKpaG + atm,
                u.pressure,
                atm
              )}
              unitLabel={u.pressure}
              unitOptions={[
                { value: 'kPa(g)', label: 'kPa(g)' },
                { value: 'bar(g)', label: 'bar(g)' },
                { value: 'psig', label: 'psig' },
              ]}
              selectedUnit={u.pressure}
              onUnitChange={(unit) =>
                onChangeUnitPref('pressure', unit as PressureUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeBreakthroughInput({
                  destinationBackpressureKpaG:
                    pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
            />
            <UnitField
              label="PSV Kd"
              internalValue={b.psvKd}
              displayValue={b.psvKd}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeBreakthroughInput({ psvKd: v })}
            />
            <UnitField
              label="PSV Kb"
              internalValue={b.psvKb}
              displayValue={b.psvKb}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeBreakthroughInput({ psvKb: v })}
            />
            <UnitField
              label="PSV Kc"
              internalValue={b.psvKc}
              displayValue={b.psvKc}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeBreakthroughInput({ psvKc: v })}
            />
          </div>
        </div>
      )}

      {/* 6. Results & Sensitivity */}
      {subTab === 'results' && (
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Vapour Breakthrough & Destination PSV Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Breakthrough Relieving Rate</div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.breakthroughMassFlowKgH !== null
                    ? `${kgHToMassFlow(result.breakthroughMassFlowKgH, u.massFlow).toFixed(1)} ${u.massFlow}`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Required Destination PSV Area</div>
                <div className="font-mono font-bold text-blue-700 mt-1 tabular-nums">
                  {result.psvSizing?.requiredAreaMm2 !== null &&
                  result.psvSizing?.requiredAreaMm2 !== undefined
                    ? `${mm2ToArea(result.psvSizing.requiredAreaMm2, u.area).toFixed(3)} ${u.area}`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Selected API 526 Orifice</div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.psvSizing?.orificeSelection?.selectedOrifice
                    ? `Orifice ${result.psvSizing.orificeSelection.selectedOrifice.designation} (${result.psvSizing.orificeSelection.selectedOrifice.effectiveAreaMm2.toFixed(1)} mm²)`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded bg-blue-50 border border-blue-200">
                <div className="text-blue-900 font-medium">
                  PSV Inlet × Outlet Nozzles
                </div>
                <div className="font-mono font-bold text-blue-800 mt-1 tabular-nums">
                  {result.psvSizing?.orificeSelection?.nozzleSizeLabel ?? '—'}
                </div>
                {result.psvSizing?.orificeSelection?.inletNozzleSizeIn &&
                  result.psvSizing?.orificeSelection?.outletNozzleSizeIn && (
                    <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                      Inlet {result.psvSizing.orificeSelection.inletNozzleSizeIn} · Outlet{' '}
                      {result.psvSizing.orificeSelection.outletNozzleSizeIn} (API 526)
                    </div>
                  )}
              </div>
              <div className="p-3 rounded bg-emerald-50/70 border border-emerald-200">
                <div className="text-emerald-900 font-medium">
                  Rated Cap. @ 10% OP (Line Sizing)
                </div>
                <div className="font-mono font-bold text-emerald-800 mt-1 tabular-nums">
                  {result.psvSizing?.ratedCapacityAt10PercentKgH !== null &&
                  result.psvSizing?.ratedCapacityAt10PercentKgH !== undefined
                    ? `${kgHToMassFlow(
                        result.psvSizing.ratedCapacityAt10PercentKgH,
                        u.massFlow
                      ).toFixed(1)} ${u.massFlow}`
                    : '—'}
                </div>
                {result.psvSizing?.ratedCapacityAt10PercentKgH !== null &&
                  result.psvSizing?.ratedCapacityAt10PercentKgH !== undefined && (
                    <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                      {result.psvSizing.ratedCapacityAt10PercentKgH.toFixed(1)} kg/h · P1 ={' '}
                      {result.psvSizing.ratedPressure10PctKpaA?.toFixed(1)} kPa(a)
                    </div>
                  )}
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Area Margin & Utilisation</div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.psvSizing?.orificeSelection?.areaMarginPercent !== null &&
                  result.psvSizing?.orificeSelection?.areaMarginPercent !== undefined
                    ? `+${result.psvSizing.orificeSelection.areaMarginPercent.toFixed(1)}%`
                    : '—'}{' '}
                  ·{' '}
                  {result.psvSizing?.orificeSelection?.utilisationPercent !== null &&
                  result.psvSizing?.orificeSelection?.utilisationPercent !== undefined
                    ? `${result.psvSizing.orificeSelection.utilisationPercent.toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <StepByStepSection steps={result.trace.steps} defaultOpen />

          <SensitivityPanel
            module="breakthrough"
            inputs={{
              gas: document.gasInput,
              liquid: document.liquidInput,
              breakthrough: document.breakthroughInput,
              fire: document.fireInput,
            }}
            standardBasis={document.standardBasis}
            unitPreferences={document.unitPreferences}
          />
        </div>
      )}
    </div>
  );
};
