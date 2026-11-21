import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  kelvinToTemp,
  kgHToMassFlow,
  kjKgToLatentHeat,
  kpaAbsToPressure,
  kwToHeatRate,
  latentHeatToKjKg,
  lengthToMeters,
  metersToLength,
  mm2ToArea,
  pressureToKpaAbs,
  tempToKelvin,
} from '../../calculations/unitConversions';
import { FIRE_ENV_FACTOR_OPTIONS } from '../../constants/defaultFactors';
import {
  LATENT_HEAT_UNITS,
  LENGTH_UNITS,
  TEMPERATURE_UNITS,
} from '../../constants/unitDefinitions';
import {
  FireCaseInput,
  FireCaseResult,
  FireEquipmentItem,
  FireGeometryType,
  HeadType,
  LatentHeatUnit,
  LengthUnit,
  ProjectDocument,
  TemperatureUnit,
  UnitPreferences,
  ValueSourceType,
} from '../../models/calculationTypes';
import { SensitivityPanel } from '../charts/SensitivityPanel';
import { VesselFireSvg } from '../charts/VesselFireSvg';
import { StatusBadge } from '../common/StatusBadge';
import { StepByStepSection } from '../common/StepByStepSection';
import { UnitField } from '../common/UnitField';
import { ValidationBanner } from '../common/ValidationBanner';

interface FireCaseTabProps {
  document: ProjectDocument;
  result: FireCaseResult;
  onChangeFireInput: (patch: Partial<FireCaseInput>) => void;
  onChangeUnitPref: <K extends keyof UnitPreferences>(key: K, val: UnitPreferences[K]) => void;
}

type FireSubTab =
  | 'scenario'
  | 'geometry'
  | 'wetted'
  | 'heat'
  | 'vapour'
  | 'sizing'
  | 'results';

const M2_TO_FT2 = 10.7639104167;
const SURFACE_AREA_UNIT_OPTIONS = [
  { value: 'm²', label: 'm²' },
  { value: 'ft²', label: 'ft²' },
];

export const FireCaseTab: React.FC<FireCaseTabProps> = ({
  document,
  result,
  onChangeFireInput,
  onChangeUnitPref,
}) => {
  const [subTab, setSubTab] = useState<FireSubTab>('scenario');
  const [surfaceAreaUnit, setSurfaceAreaUnit] = useState<'m²' | 'ft²'>(
    document.unitSystem === 'US' ? 'ft²' : 'm²'
  );

  useEffect(() => {
    setSurfaceAreaUnit(document.unitSystem === 'US' ? 'ft²' : 'm²');
  }, [document.unitSystem]);
  const f = document.fireInput;
  const u = document.unitPreferences;
  const sb = document.standardBasis;
  const atm = f.atmosphericPressureKpaA;
  const extras = f.additionalEquipment ?? [];
  const includePiping = Boolean(f.includePipingAllowance);
  const pipingPct = f.pipingAllowancePercent ?? 10;

  const fieldMsgs = (field: string) =>
    result.messages.filter((m) => m.field === field);

  const m2ToDisplaySurface = (m2: number) =>
    surfaceAreaUnit === 'ft²' ? m2 * M2_TO_FT2 : m2;
  const displaySurfaceToM2 = (val: number) =>
    surfaceAreaUnit === 'ft²' ? val / M2_TO_FT2 : val;

  const addAdditionalEquipment = (entryMode: 'geometry' | 'direct_area') => {
    const nextIdx = extras.length + 2;
    const newItem: FireEquipmentItem = {
      id: `fire-eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tag: entryMode === 'geometry' ? `V-${nextIdx * 100}` : `E-${nextIdx * 100}`,
      description:
        entryMode === 'geometry'
          ? 'Additional Fire-Zone Vessel'
          : 'Other Fire-Zone Equipment',
      enabled: true,
      entryMode,
      geometryType: 'vertical_cylinder_heads',
      diameterM: 1.5,
      tangentLengthM: 4.0,
      headType: '2:1_elliptical',
      relievingLiquidLevelM: 2.0,
      elevationAboveGradeM: f.elevationAboveGradeM,
      directWettedAreaM2: 10.0,
      quantity: 1,
    };
    onChangeFireInput({ additionalEquipment: [...extras, newItem] });
  };

  const updateAdditionalEquipment = (
    id: string,
    patch: Partial<FireEquipmentItem>
  ) => {
    onChangeFireInput({
      additionalEquipment: extras.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  const removeAdditionalEquipment = (id: string) => {
    onChangeFireInput({
      additionalEquipment: extras.filter((item) => item.id !== id),
    });
  };

  const isPrimaryDirect =
    f.userOverrideWettedArea || f.geometryType === 'user_entered_area';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['scenario', '1. Fire Scenario'],
              ['geometry', '2. Equipment Geometry'],
              ['wetted', '3. Wetted Area'],
              ['heat', '4. Heat Input'],
              ['vapour', '5. Vapour Generation'],
              ['sizing', '6. PSV Sizing'],
              ['results', '7. Results & Sensitivity'],
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

      {/* 1. Fire Scenario */}
      {subTab === 'scenario' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            External Fire Scenario & Environmental Basis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Drainage & Firefighting Provision
              </label>
              <select
                value={f.drainageQuality}
                onChange={(e) =>
                  onChangeFireInput({
                    drainageQuality: e.target.value as FireCaseInput['drainageQuality'],
                  })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="prompt_drainage_firefighting">
                  Prompt drainage & firefighting (C1 = {sb.fireHeatConstantPromptDrainageW} W/m^1.64)
                </option>
                <option value="inadequate_drainage">
                  Inadequate drainage / firefighting (C1 = {sb.fireHeatConstantInadequateDrainageW} W/m^1.64)
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Environmental Factor Preset (F)
              </label>
              <select
                value={
                  FIRE_ENV_FACTOR_OPTIONS.find(
                    (opt) => opt.basis === f.environmentalFactorBasis
                  )?.id ?? 'custom'
                }
                onChange={(e) => {
                  const opt = FIRE_ENV_FACTOR_OPTIONS.find(
                    (o) => o.id === e.target.value
                  );
                  if (opt) {
                    onChangeFireInput({
                      environmentalFactorF: opt.factor,
                      environmentalFactorSource: opt.sourceType,
                      environmentalFactorBasis: opt.basis,
                    });
                  }
                }}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              >
                {FIRE_ENV_FACTOR_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <UnitField
              label="Environmental Factor"
              symbol="F"
              internalValue={f.environmentalFactorF}
              displayValue={f.environmentalFactorF}
              unitLabel="-"
              sourceType={f.environmentalFactorSource}
              onCommitDisplayValue={(v) =>
                onChangeFireInput({
                  environmentalFactorF: v,
                  environmentalFactorSource: 'USER_INPUT' as ValueSourceType,
                  environmentalFactorBasis: 'User-entered environmental factor F',
                })
              }
              secondaryReadout={f.environmentalFactorBasis}
              messages={fieldMsgs('environmentalFactorF')}
            />

            <UnitField
              label="Fire-Exposure Elevation Limit"
              symbol="H_fire"
              tooltip="Pool-fire flame height limit above grade (typically 7.62 m / 25 ft per API 521)"
              internalValue={f.fireExposureLimitM}
              displayValue={metersToLength(f.fireExposureLimitM, u.length)}
              unitLabel={u.length}
              unitOptions={[...LENGTH_UNITS]}
              selectedUnit={u.length}
              onUnitChange={(unit) => onChangeUnitPref('length', unit as LengthUnit)}
              onCommitDisplayValue={(v) =>
                onChangeFireInput({ fireExposureLimitM: lengthToMeters(v, u.length) })
              }
              messages={fieldMsgs('fireExposureLimitM')}
            />

            <div className="flex flex-col justify-end gap-2 text-xs pb-1">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={f.insulated}
                  onChange={(e) => onChangeFireInput({ insulated: e.target.checked })}
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Vessel Insulated</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={f.insulationCertified}
                  onChange={(e) =>
                    onChangeFireInput({ insulationCertified: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Fire-Rated Insulation Certified (Required for F &lt; 1.0)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 2. Equipment Geometry */}
      {subTab === 'geometry' && (
        <div className="space-y-4">
          {/* Primary Vessel / Equipment */}
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Primary Equipment Geometry & Liquid Inventory Height
                </h3>
                <p className="text-xs text-slate-500">
                  Select a geometric model or choose &quot;User-entered wetted area&quot; to enter wetted surface area directly.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 tabular-nums">
                Primary Area: {result.primaryWettedAreaM2.toFixed(2)} m² ({(result.primaryWettedAreaM2 * M2_TO_FT2).toFixed(1)} ft²)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700">
                  Geometry Model
                </label>
                <select
                  value={f.geometryType}
                  onChange={(e) =>
                    onChangeFireInput({
                      geometryType: e.target.value as FireGeometryType,
                    })
                  }
                  className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                >
                  <option value="vertical_cylinder_heads">
                    Vertical cylindrical vessel with heads
                  </option>
                  <option value="horizontal_cylinder_heads">
                    Horizontal cylindrical vessel with heads
                  </option>
                  <option value="sphere">Spherical vessel</option>
                  <option value="heat_exchanger_shell">Heat exchanger shell</option>
                  <option value="user_entered_area">User-entered wetted area</option>
                  <option value="custom">Custom equipment (vertical shell + heads)</option>
                </select>
              </div>

              {f.geometryType !== 'user_entered_area' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700">Head Type</label>
                  <select
                    value={f.headType}
                    onChange={(e) =>
                      onChangeFireInput({ headType: e.target.value as HeadType })
                    }
                    className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                  >
                    <option value="2:1_elliptical">2:1 Elliptical</option>
                    <option value="hemispherical">Hemispherical</option>
                    <option value="torispherical">Torispherical</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
              )}

              <UnitField
                label="Number of Identical Units"
                internalValue={f.numberOfVessels}
                displayValue={f.numberOfVessels}
                unitLabel="units"
                onCommitDisplayValue={(v) =>
                  onChangeFireInput({ numberOfVessels: Math.max(1, Math.round(v)) })
                }
                precision={0}
              />

              {(f.geometryType === 'user_entered_area' || f.userOverrideWettedArea) ? (
                <UnitField
                  label="Direct Wetted Area (Per Unit)"
                  symbol="A_w,unit"
                  internalValue={f.userWettedAreaM2}
                  displayValue={m2ToDisplaySurface(f.userWettedAreaM2)}
                  unitLabel={surfaceAreaUnit}
                  unitOptions={SURFACE_AREA_UNIT_OPTIONS}
                  selectedUnit={surfaceAreaUnit}
                  onUnitChange={(unit) => setSurfaceAreaUnit(unit as 'm²' | 'ft²')}
                  onCommitDisplayValue={(v) =>
                    onChangeFireInput({ userWettedAreaM2: displaySurfaceToM2(v) })
                  }
                  secondaryReadout={
                    surfaceAreaUnit === 'm²'
                      ? `${(f.userWettedAreaM2 * M2_TO_FT2).toFixed(2)} ft²`
                      : `${f.userWettedAreaM2.toFixed(2)} m²`
                  }
                  messages={fieldMsgs('userWettedAreaM2')}
                />
              ) : (
                <>
                  <UnitField
                    label="Diameter"
                    symbol="D"
                    internalValue={f.diameterM}
                    displayValue={metersToLength(f.diameterM, u.length)}
                    unitLabel={u.length}
                    unitOptions={[...LENGTH_UNITS]}
                    selectedUnit={u.length}
                    onUnitChange={(unit) => onChangeUnitPref('length', unit as LengthUnit)}
                    onCommitDisplayValue={(v) =>
                      onChangeFireInput({ diameterM: lengthToMeters(v, u.length) })
                    }
                    messages={fieldMsgs('diameterM')}
                  />

                  <UnitField
                    label="Tangent-to-Tangent Length"
                    symbol="L_tan"
                    internalValue={f.tangentLengthM}
                    displayValue={metersToLength(f.tangentLengthM, u.length)}
                    unitLabel={u.length}
                    onCommitDisplayValue={(v) =>
                      onChangeFireInput({ tangentLengthM: lengthToMeters(v, u.length) })
                    }
                  />

                  <UnitField
                    label="Elevation Above Grade"
                    symbol="E_grade"
                    internalValue={f.elevationAboveGradeM}
                    displayValue={metersToLength(f.elevationAboveGradeM, u.length)}
                    unitLabel={u.length}
                    onCommitDisplayValue={(v) =>
                      onChangeFireInput({
                        elevationAboveGradeM: lengthToMeters(v, u.length),
                      })
                    }
                  />

                  <UnitField
                    label="Normal Liquid Level"
                    symbol="H_norm"
                    internalValue={f.normalLiquidLevelM}
                    displayValue={metersToLength(f.normalLiquidLevelM, u.length)}
                    unitLabel={u.length}
                    onCommitDisplayValue={(v) =>
                      onChangeFireInput({
                        normalLiquidLevelM: lengthToMeters(v, u.length),
                      })
                    }
                  />

                  <UnitField
                    label="Relieving Liquid Level"
                    symbol="H_rel"
                    internalValue={f.relievingLiquidLevelM}
                    displayValue={metersToLength(f.relievingLiquidLevelM, u.length)}
                    unitLabel={u.length}
                    onCommitDisplayValue={(v) =>
                      onChangeFireInput({
                        relievingLiquidLevelM: lengthToMeters(v, u.length),
                      })
                    }
                    messages={fieldMsgs('relievingLiquidLevelM')}
                  />
                </>
              )}
            </div>
          </div>

          {/* Additional Vessels & Equipment in Same Fire Zone */}
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Additional Vessels & Equipment in Fire Zone
                </h3>
                <p className="text-xs text-slate-500">
                  Add interconnected vessels (calculated by geometry) or heat exchangers/equipment with directly known wetted surface area within the same pool-fire envelope.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => addAdditionalEquipment('geometry')}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-700" />
                  Add Vessel (Geometry)
                </button>
                <button
                  type="button"
                  onClick={() => addAdditionalEquipment('direct_area')}
                  className="inline-flex items-center gap-1.5 rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Equipment / Wetted Area
                </button>
              </div>
            </div>

            {extras.length === 0 ? (
              <div className="rounded border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-xs text-slate-600">
                No additional vessels or equipment defined. Click <strong>Add Vessel (Geometry)</strong> or <strong>Add Equipment / Wetted Area</strong> to include multiple vessels, reboilers, drums, or exchangers served by this PSV in a single fire zone.
              </div>
            ) : (
              <div className="space-y-3">
                {extras.map((item, idx) => {
                  const rowRes = result.itemizedEquipment.find((r) => r.id === item.id);
                  const itemAreaM2 = rowRes?.totalAreaM2 ?? 0;

                  return (
                    <div
                      key={item.id}
                      className={`rounded border p-4 space-y-3 ${
                        item.enabled
                          ? 'border-slate-200 bg-slate-50/60'
                          : 'border-slate-200 bg-slate-100/50 opacity-75'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) =>
                                updateAdditionalEquipment(item.id, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="rounded border-slate-300 text-blue-700"
                            />
                            <span>#{idx + 2}</span>
                          </label>
                          <input
                            type="text"
                            value={item.tag}
                            onChange={(e) =>
                              updateAdditionalEquipment(item.id, { tag: e.target.value })
                            }
                            placeholder="Tag (e.g. E-101)"
                            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-semibold text-slate-900"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateAdditionalEquipment(item.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Equipment description"
                            className="w-52 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                          />
                          <select
                            value={item.entryMode}
                            onChange={(e) =>
                              updateAdditionalEquipment(item.id, {
                                entryMode: e.target.value as 'geometry' | 'direct_area',
                              })
                            }
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                          >
                            <option value="geometry">Calculate from Geometry</option>
                            <option value="direct_area">Direct Wetted Area</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs font-mono font-semibold text-slate-800 tabular-nums">
                            {item.enabled
                              ? `${itemAreaM2.toFixed(2)} m² (${(itemAreaM2 * M2_TO_FT2).toFixed(1)} ft²)`
                              : 'Excluded'}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalEquipment(item.id)}
                            title="Remove equipment item"
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:text-red-700 hover:border-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>

                      {item.entryMode === 'direct_area' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <UnitField
                            label="Direct Wetted Area (Per Unit)"
                            symbol="A_w"
                            internalValue={item.directWettedAreaM2}
                            displayValue={m2ToDisplaySurface(item.directWettedAreaM2)}
                            unitLabel={surfaceAreaUnit}
                            unitOptions={SURFACE_AREA_UNIT_OPTIONS}
                            selectedUnit={surfaceAreaUnit}
                            onUnitChange={(unit) =>
                              setSurfaceAreaUnit(unit as 'm²' | 'ft²')
                            }
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                directWettedAreaM2: displaySurfaceToM2(v),
                              })
                            }
                            secondaryReadout={
                              surfaceAreaUnit === 'm²'
                                ? `${(item.directWettedAreaM2 * M2_TO_FT2).toFixed(2)} ft²`
                                : `${item.directWettedAreaM2.toFixed(2)} m²`
                            }
                            messages={fieldMsgs(
                              `additionalEquipment.${item.id}.directWettedAreaM2`
                            )}
                          />
                          <UnitField
                            label="Quantity"
                            internalValue={item.quantity}
                            displayValue={item.quantity}
                            unitLabel="units"
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                quantity: Math.max(1, Math.round(v)),
                              })
                            }
                            precision={0}
                            messages={fieldMsgs(
                              `additionalEquipment.${item.id}.quantity`
                            )}
                          />
                          <div className="flex flex-col justify-end pb-1 text-xs text-slate-600">
                            <span className="font-medium text-slate-700">
                              Item Subtotal
                            </span>
                            <span className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                              {itemAreaM2.toFixed(2)} m² ({(itemAreaM2 * M2_TO_FT2).toFixed(1)} ft²)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-700">
                              Geometry Model
                            </label>
                            <select
                              value={item.geometryType}
                              onChange={(e) =>
                                updateAdditionalEquipment(item.id, {
                                  geometryType: e.target.value as FireEquipmentItem['geometryType'],
                                })
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                            >
                              <option value="vertical_cylinder_heads">
                                Vertical cylinder + heads
                              </option>
                              <option value="horizontal_cylinder_heads">
                                Horizontal cylinder + heads
                              </option>
                              <option value="sphere">Spherical vessel</option>
                              <option value="heat_exchanger_shell">
                                Heat exchanger shell
                              </option>
                              <option value="custom">Custom vessel</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-700">
                              Head Type
                            </label>
                            <select
                              value={item.headType}
                              onChange={(e) =>
                                updateAdditionalEquipment(item.id, {
                                  headType: e.target.value as HeadType,
                                })
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                            >
                              <option value="2:1_elliptical">2:1 Elliptical</option>
                              <option value="hemispherical">Hemispherical</option>
                              <option value="torispherical">Torispherical</option>
                              <option value="flat">Flat</option>
                            </select>
                          </div>

                          <UnitField
                            label="Quantity"
                            internalValue={item.quantity}
                            displayValue={item.quantity}
                            unitLabel="units"
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                quantity: Math.max(1, Math.round(v)),
                              })
                            }
                            precision={0}
                            messages={fieldMsgs(
                              `additionalEquipment.${item.id}.quantity`
                            )}
                          />

                          <UnitField
                            label="Diameter"
                            symbol="D"
                            internalValue={item.diameterM}
                            displayValue={metersToLength(item.diameterM, u.length)}
                            unitLabel={u.length}
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                diameterM: lengthToMeters(v, u.length),
                              })
                            }
                            messages={fieldMsgs(
                              `additionalEquipment.${item.id}.diameterM`
                            )}
                          />

                          <UnitField
                            label="Tan-Tan Length"
                            symbol="L_tan"
                            internalValue={item.tangentLengthM}
                            displayValue={metersToLength(item.tangentLengthM, u.length)}
                            unitLabel={u.length}
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                tangentLengthM: lengthToMeters(v, u.length),
                              })
                            }
                          />

                          <UnitField
                            label="Elevation Above Grade"
                            symbol="E_grade"
                            internalValue={item.elevationAboveGradeM}
                            displayValue={metersToLength(
                              item.elevationAboveGradeM,
                              u.length
                            )}
                            unitLabel={u.length}
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                elevationAboveGradeM: lengthToMeters(v, u.length),
                              })
                            }
                          />

                          <UnitField
                            label="Relieving Liquid Level"
                            symbol="H_rel"
                            internalValue={item.relievingLiquidLevelM}
                            displayValue={metersToLength(
                              item.relievingLiquidLevelM,
                              u.length
                            )}
                            unitLabel={u.length}
                            onCommitDisplayValue={(v) =>
                              updateAdditionalEquipment(item.id, {
                                relievingLiquidLevelM: lengthToMeters(v, u.length),
                              })
                            }
                            messages={fieldMsgs(
                              `additionalEquipment.${item.id}.relievingLiquidLevelM`
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Piping Wetted Area Allowance */}
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Piping Wetted Area Allowance
                </h3>
                <p className="text-xs text-slate-500">
                  Account for fire-exposed interconnecting piping wetted surface area (typically 10% of fire-zone equipment wetted area).
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={includePiping}
                  onChange={(e) =>
                    onChangeFireInput({
                      includePipingAllowance: e.target.checked,
                      pipingAllowancePercent:
                        f.pipingAllowancePercent ?? 10,
                    })
                  }
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Include piping wetted area allowance</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <UnitField
                    label="Piping Allowance Percentage"
                    symbol="% Pipe"
                    tooltip="Typical preliminary allowance is 10% of fire-exposed equipment wetted surface area. Set exact piping surface explicitly or adjust percentage."
                    internalValue={pipingPct}
                    displayValue={pipingPct}
                    unitLabel="%"
                    disabled={!includePiping}
                    sourceType={
                      includePiping && pipingPct === 10
                        ? 'ASSUMED'
                        : 'USER_INPUT'
                    }
                    onCommitDisplayValue={(v) =>
                      onChangeFireInput({ pipingAllowancePercent: v })
                    }
                    precision={1}
                    messages={fieldMsgs('pipingAllowancePercent')}
                  />
                </div>
                {includePiping && pipingPct !== 10 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFireInput({ pipingAllowancePercent: 10 })
                    }
                    className="mb-0.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Reset 10%
                  </button>
                )}
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs">
                <div className="text-slate-500">
                  Equipment Subtotal ({result.itemizedEquipment.length} item
                  {result.itemizedEquipment.length === 1 ? '' : 's'})
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.equipmentSubtotalWettedAreaM2.toFixed(2)} m² (
                  {(result.equipmentSubtotalWettedAreaM2 * M2_TO_FT2).toFixed(1)}{' '}
                  ft²)
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                  + Piping ({includePiping ? `${result.pipingAllowancePercentApplied.toFixed(1)}%` : 'Excluded'}):{' '}
                  {result.pipingAllowanceM2.toFixed(2)} m²
                </div>
              </div>

              <div className="p-3 rounded bg-blue-50 border border-blue-200 text-xs">
                <div className="text-blue-900 font-medium">
                  Total Fire-Exposed Wetted Area (A_w)
                </div>
                <div className="text-base font-mono font-bold text-blue-800 mt-1 tabular-nums">
                  {result.totalWettedAreaM2.toFixed(2)} m² ·{' '}
                  {(result.totalWettedAreaM2 * M2_TO_FT2).toFixed(1)} ft²
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Wetted Area */}
      {subTab === 'wetted' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Wetted Surface Area Breakdown
              </h3>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={f.userOverrideWettedArea}
                  onChange={(e) =>
                    onChangeFireInput({ userOverrideWettedArea: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Override Primary Vessel Wetted Area</span>
              </label>
            </div>

            {isPrimaryDirect && (
              <UnitField
                label="Direct Wetted Area (Per Primary Unit)"
                symbol="A_w,prim"
                internalValue={f.userWettedAreaM2}
                displayValue={m2ToDisplaySurface(f.userWettedAreaM2)}
                unitLabel={surfaceAreaUnit}
                unitOptions={SURFACE_AREA_UNIT_OPTIONS}
                selectedUnit={surfaceAreaUnit}
                onUnitChange={(unit) => setSurfaceAreaUnit(unit as 'm²' | 'ft²')}
                onCommitDisplayValue={(v) =>
                  onChangeFireInput({ userWettedAreaM2: displaySurfaceToM2(v) })
                }
                secondaryReadout={
                  surfaceAreaUnit === 'm²'
                    ? `${(f.userWettedAreaM2 * M2_TO_FT2).toFixed(2)} ft²`
                    : `${f.userWettedAreaM2.toFixed(2)} m²`
                }
                messages={fieldMsgs('userWettedAreaM2')}
              />
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Primary Shell Wetted Area (Per Unit)</div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.shellWettedAreaM2.toFixed(2)} m² (
                  {(result.shellWettedAreaM2 * M2_TO_FT2).toFixed(1)} ft²)
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Primary Head Wetted Area (Per Unit)</div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.headWettedAreaM2.toFixed(2)} m² (
                  {(result.headWettedAreaM2 * M2_TO_FT2).toFixed(1)} ft²)
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 font-medium">Equipment / Item</th>
                    <th className="py-2 px-2.5 font-medium">Basis</th>
                    <th className="py-2 px-2.5 font-medium text-right">Qty</th>
                    <th className="py-2 px-2.5 font-medium text-right">Area (m²)</th>
                    <th className="py-2 px-2.5 font-medium text-right">Area (ft²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.itemizedEquipment.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 px-2.5">
                        <div className="font-medium text-slate-900">{row.tag}</div>
                        <div className="text-[11px] text-slate-500">{row.description}</div>
                      </td>
                      <td className="py-2 px-2.5 text-slate-600">
                        {row.entryMode === 'direct_area' ? 'Direct Area' : 'Geometry'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {row.totalAreaM2.toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600 tabular-nums">
                        {(row.totalAreaM2 * M2_TO_FT2).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/70">
                    <td colSpan={3} className="py-2 px-2.5 font-medium text-slate-700">
                      Equipment Wetted Area Subtotal
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {result.equipmentSubtotalWettedAreaM2.toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-600 tabular-nums">
                      {(result.equipmentSubtotalWettedAreaM2 * M2_TO_FT2).toFixed(1)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-2.5 text-slate-700">
                      Piping Wetted Area Allowance (
                      {includePiping
                        ? `${result.pipingAllowancePercentApplied.toFixed(1)}%`
                        : 'Excluded'}
                      )
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-900 tabular-nums">
                      {result.pipingAllowanceM2.toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-600 tabular-nums">
                      {(result.pipingAllowanceM2 * M2_TO_FT2).toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded bg-blue-50 border border-blue-200 text-xs">
              <div className="text-blue-900 font-medium">
                Total Fire-Exposed Wetted Area (A_w)
              </div>
              <div className="text-base font-mono font-bold text-blue-800 mt-1 tabular-nums">
                {result.totalWettedAreaM2.toFixed(2)} m² ·{' '}
                {(result.totalWettedAreaM2 * M2_TO_FT2).toFixed(1)} ft²
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Primary effective liquid height in fire zone: {result.effectiveLiquidHeightM.toFixed(2)} m (fire ceiling above primary vessel base: {result.effectiveFireHeightM.toFixed(2)} m)
              </div>
            </div>
          </div>

          <VesselFireSvg input={f} result={result} />
        </div>
      )}

      {/* 4. Heat Input */}
      {subTab === 'heat' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Absorbed Fire Heat Input ({sb.api521Edition})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Wetted Area (A_w)</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.totalWettedAreaM2.toFixed(2)} m²
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Environmental Factor (F)</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {f.environmentalFactorF.toFixed(3)}
              </div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Heat-Input Coefficient (C1)</div>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {result.heatInputCoefficientW} W / m^({sb.fireHeatAreaExponent * 2})
              </div>
            </div>
            <div className="p-3 rounded bg-blue-50 border border-blue-200">
              <div className="text-blue-900 font-medium">Absorbed Heat Input (Q)</div>
              <div className="font-mono font-bold text-blue-800 mt-1">
                {kwToHeatRate(result.heatInputKw, 'kW').toFixed(1)} kW
              </div>
              <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                {result.heatInputMjH.toFixed(0)} MJ/h ·{' '}
                {result.heatInputBtuH.toFixed(0)} Btu/h
              </div>
            </div>
          </div>
          <div className="font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">
            Q = C1 × F × (A_w)^{sb.fireHeatAreaExponent} = {result.heatInputCoefficientW} × {f.environmentalFactorF} × ({result.totalWettedAreaM2.toFixed(2)})^{sb.fireHeatAreaExponent} = {result.heatInputKw.toFixed(2)} kW
          </div>
        </div>
      )}

      {/* 5. Vapour Generation */}
      {subTab === 'vapour' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Fire Vapour Generation Rate
            </h3>
            <p className="text-xs text-slate-500">
              All thermodynamic properties (latent heat, MW, Z, Cp/Cv, temperature) must correspond to fire relieving conditions.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UnitField
              label="Latent Heat at Relieving Conditions"
              symbol="ΔH_vap"
              internalValue={f.latentHeatKjKg}
              displayValue={kjKgToLatentHeat(f.latentHeatKjKg, u.latentHeat)}
              unitLabel={u.latentHeat}
              unitOptions={[...LATENT_HEAT_UNITS]}
              selectedUnit={u.latentHeat}
              onUnitChange={(unit) =>
                onChangeUnitPref('latentHeat', unit as LatentHeatUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeFireInput({
                  latentHeatKjKg: latentHeatToKjKg(v, u.latentHeat),
                })
              }
              messages={fieldMsgs('latentHeatKjKg')}
            />

            <UnitField
              label="Relieving Temperature"
              symbol="T1"
              internalValue={f.relievingTemperatureK}
              displayValue={kelvinToTemp(f.relievingTemperatureK, u.temperature)}
              unitLabel={u.temperature}
              unitOptions={[...TEMPERATURE_UNITS]}
              selectedUnit={u.temperature}
              onUnitChange={(unit) =>
                onChangeUnitPref('temperature', unit as TemperatureUnit)
              }
              onCommitDisplayValue={(v) =>
                onChangeFireInput({
                  relievingTemperatureK: tempToKelvin(v, u.temperature),
                })
              }
              precision={2}
            />

            <UnitField
              label="Generated Vapour Mass Flow"
              symbol="W_vap"
              internalValue={result.vapourGenerationKgH}
              displayValue={kgHToMassFlow(result.vapourGenerationKgH, u.massFlow)}
              unitLabel={u.massFlow}
              disabled
              sourceType="CALCULATED"
              onCommitDisplayValue={() => {}}
              secondaryReadout={`${result.vapourGenerationKgH.toFixed(1)} kg/h · ${result.vapourGenerationLbH.toFixed(1)} lb/h`}
            />

            <UnitField
              label="Vapour Molecular Weight"
              symbol="MW"
              internalValue={f.vapourMw}
              displayValue={f.vapourMw}
              unitLabel="kg/kmol"
              onCommitDisplayValue={(v) => onChangeFireInput({ vapourMw: v })}
            />

            <UnitField
              label="Vapour Compressibility"
              symbol="Z"
              internalValue={f.vapourZ}
              displayValue={f.vapourZ}
              unitLabel="-"
              onCommitDisplayValue={(v) => onChangeFireInput({ vapourZ: v })}
            />

            <UnitField
              label="Vapour Cp/Cv"
              symbol="k"
              internalValue={f.vapourK}
              displayValue={f.vapourK}
              unitLabel="-"
              onCommitDisplayValue={(v) => onChangeFireInput({ vapourK: v })}
            />
          </div>
        </div>
      )}

      {/* 6. PSV Sizing */}
      {subTab === 'sizing' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Fire Case PSV Pressure & Correction Factors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UnitField
              label="Set Pressure"
              symbol="P_set"
              internalValue={f.setPressureKpaG + atm}
              displayValue={kpaAbsToPressure(f.setPressureKpaG + atm, u.pressure, atm)}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeFireInput({
                  setPressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
            />
            <UnitField
              label="Fire Overpressure Basis"
              symbol="% OP"
              internalValue={f.fireOverpressurePercent}
              displayValue={f.fireOverpressurePercent}
              unitLabel="%"
              onCommitDisplayValue={(v) =>
                onChangeFireInput({ fireOverpressurePercent: v })
              }
              precision={1}
              messages={fieldMsgs('fireOverpressurePercent')}
            />
            <UnitField
              label="Total Backpressure"
              symbol="P2"
              internalValue={f.backpressureKpaG + atm}
              displayValue={kpaAbsToPressure(f.backpressureKpaG + atm, u.pressure, atm)}
              unitLabel={u.pressure}
              onCommitDisplayValue={(v) =>
                onChangeFireInput({
                  backpressureKpaG: pressureToKpaAbs(v, u.pressure, atm) - atm,
                })
              }
            />
            <UnitField
              label="PSV Kd"
              internalValue={f.kd}
              displayValue={f.kd}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeFireInput({ kd: v })}
            />
            <UnitField
              label="PSV Kb"
              internalValue={f.kb}
              displayValue={f.kb}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeFireInput({ kb: v })}
            />
            <UnitField
              label="PSV Kc"
              internalValue={f.kc}
              displayValue={f.kc}
              unitLabel="-"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => onChangeFireInput({ kc: v })}
            />
          </div>
        </div>
      )}

      {/* 7. Results & Sensitivity */}
      {subTab === 'results' && (
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Fire Case Sizing Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Fire Vapour Load</div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {kgHToMassFlow(result.vapourGenerationKgH, u.massFlow).toFixed(1)}{' '}
                  {u.massFlow}
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {result.vapourGenerationKgH.toFixed(1)} kg/h
                </div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Required PSV Area</div>
                <div className="font-mono font-bold text-blue-700 mt-1 tabular-nums">
                  {result.psvSizing?.requiredAreaMm2 !== null &&
                  result.psvSizing?.requiredAreaMm2 !== undefined
                    ? `${mm2ToArea(result.psvSizing.requiredAreaMm2, u.area).toFixed(2)} ${u.area}`
                    : '—'}
                </div>
                <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                  Margin:{' '}
                  {result.psvSizing?.orificeSelection?.areaMarginPercent !== null &&
                  result.psvSizing?.orificeSelection?.areaMarginPercent !== undefined
                    ? `+${result.psvSizing.orificeSelection.areaMarginPercent.toFixed(1)}%`
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
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <div className="text-slate-500">
                  Orifice Capacity @ {f.fireOverpressurePercent}% Fire OP
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1 tabular-nums">
                  {result.psvSizing?.selectedOrificeCapacityKgH !== null &&
                  result.psvSizing?.selectedOrificeCapacityKgH !== undefined
                    ? `${kgHToMassFlow(
                        result.psvSizing.selectedOrificeCapacityKgH,
                        u.massFlow
                      ).toFixed(1)} ${u.massFlow}`
                    : '—'}
                </div>
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
                      {result.psvSizing.ratedCapacityAt10PercentKgH.toFixed(1)} kg/h · P1,10% ={' '}
                      {result.psvSizing.ratedPressure10PctKpaA?.toFixed(1)} kPa(a)
                    </div>
                  )}
              </div>
            </div>
          </div>

          <StepByStepSection steps={result.trace.steps} defaultOpen />

          <SensitivityPanel
            module="fire"
            inputs={{
              gas: document.gasInput,
              liquid: document.liquidInput,
              breakthrough: document.breakthroughInput,
              fire: document.fireInput,
            }}
            standardBasis={document.standardBasis}
            unitPreferences={document.unitPreferences}
            fireBaseWettedAreaM2={result.totalWettedAreaM2}
          />
        </div>
      )}
    </div>
  );
};
