import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  kelvinToTemp,
  kpaAbsToPressure,
  lengthToMeters,
  metersToLength,
  pressureToKpaAbs,
  tempToKelvin,
} from '../../calculations/unitConversions';
import { validateDesignBasisAndEquipment } from '../../calculations/validation';
import { LENGTH_UNITS, TEMPERATURE_UNITS } from '../../constants/unitDefinitions';
import {
  DischargeDestination,
  HeadType,
  PressureUnit,
  ProjectDocument,
  ProtectedEquipmentType,
  TemperatureUnit,
  UnitPreferences,
  ValveType,
  ValueSourceType,
  VesselOrientation,
} from '../../models/calculationTypes';
import { SourceTag, UnitField } from '../common/UnitField';
import { ValidationBanner } from '../common/ValidationBanner';

interface DesignBasisTabProps {
  document: ProjectDocument;
  advancedMode: boolean;
  onChangeDocument: (updater: (prev: ProjectDocument) => ProjectDocument) => void;
  onChangeUnitPref: <K extends keyof UnitPreferences>(key: K, val: UnitPreferences[K]) => void;
  onSyncBasisToModules: () => void;
}

type SubTab = 'project' | 'equipment' | 'conditions' | 'factors' | 'standards';

const PRESSURE_OPTS = [
  { value: 'kPa(g)', label: 'kPa(g)' },
  { value: 'kPa(a)', label: 'kPa(a)' },
  { value: 'bar(g)', label: 'bar(g)' },
  { value: 'bar(a)', label: 'bar(a)' },
  { value: 'MPa(g)', label: 'MPa(g)' },
  { value: 'psig', label: 'psig' },
  { value: 'psia', label: 'psia' },
];

export const DesignBasisTab: React.FC<DesignBasisTabProps> = ({
  document,
  advancedMode,
  onChangeDocument,
  onChangeUnitPref,
  onSyncBasisToModules,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('project');
  const [syncedNotice, setSyncedNotice] = useState(false);

  const { project, equipment, designBasis, standardBasis, unitPreferences } = document;
  const atm = designBasis.atmosphericPressureKpaA;
  const validationMessages = validateDesignBasisAndEquipment(equipment, designBasis);

  const relievingGaugeKpaG =
    designBasis.setPressureKpaG * (1 + designBasis.overpressurePercent / 100);
  const relievingAbsKpaA = relievingGaugeKpaG + atm;
  const totalBackKpaG =
    designBasis.superimposedBackpressureKpaG + designBasis.builtUpBackpressureKpaG;
  const totalBackAbsKpaA = totalBackKpaG + atm;

  const updateProject = (patch: Partial<typeof project>) =>
    onChangeDocument((d) => ({ ...d, project: { ...d.project, ...patch } }));

  const updateEquip = (patch: Partial<typeof equipment>) =>
    onChangeDocument((d) => ({ ...d, equipment: { ...d.equipment, ...patch } }));

  const updateBasis = (patch: Partial<typeof designBasis>) =>
    onChangeDocument((d) => ({ ...d, designBasis: { ...d.designBasis, ...patch } }));

  const updateStandards = (patch: Partial<typeof standardBasis>) =>
    onChangeDocument((d) => ({
      ...d,
      standardBasis: { ...d.standardBasis, ...patch },
    }));

  const pUnit = unitPreferences.pressure;
  const tUnit = unitPreferences.temperature;
  const lUnit = unitPreferences.length;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['project', '1. Project Information'],
              ['equipment', '2. Protected Equipment'],
              ['conditions', '3. PSV Design Conditions'],
              ['factors', '4. Correction Factors'],
              ['standards', '5. Standards Basis'],
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

        <button
          type="button"
          onClick={() => {
            onSyncBasisToModules();
            setSyncedNotice(true);
            setTimeout(() => setSyncedNotice(false), 2000);
          }}
          className="inline-flex items-center gap-1.5 rounded border border-blue-700 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>
            {syncedNotice
              ? 'Synced to Gas, Liquid, Fire & Breakthrough'
              : 'Apply Design Basis to Calculation Tabs'}
          </span>
        </button>
      </div>

      <ValidationBanner messages={validationMessages} />

      {/* 1. Project Information */}
      {subTab === 'project' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Project & Calculation Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {(
              [
                ['projectName', 'Project Name'],
                ['client', 'Client'],
                ['plantFacility', 'Plant / Facility'],
                ['unit', 'Process Unit'],
                ['equipmentTag', 'Equipment Tag'],
                ['equipmentDescription', 'Equipment Description'],
                ['psvTag', 'PSV Tag'],
                ['calculationNumber', 'Calculation Number'],
                ['revision', 'Revision'],
                ['preparedBy', 'Prepared By'],
                ['checkedBy', 'Checked By'],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="flex flex-col gap-1">
                <label className="font-medium text-slate-700">{label}</label>
                <input
                  type="text"
                  value={project[field]}
                  onChange={(e) => updateProject({ [field]: e.target.value })}
                  className="rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-slate-700">Calculation Date</label>
              <input
                type="date"
                value={project.calculationDate}
                onChange={(e) => updateProject({ calculationDate: e.target.value })}
                className="rounded border border-slate-300 px-2.5 py-1.5 text-sm font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <label className="font-medium text-slate-700">Engineering Notes</label>
            <textarea
              rows={3}
              value={project.notes}
              onChange={(e) => updateProject({ notes: e.target.value })}
              placeholder="Document process assumptions, relief header constraints, or design basis notes..."
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* 2. Protected Equipment */}
      {subTab === 'equipment' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Protected Equipment Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Equipment Type
              </label>
              <select
                value={equipment.equipmentType}
                onChange={(e) =>
                  updateEquip({ equipmentType: e.target.value as ProtectedEquipmentType })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="pressure_vessel">Pressure vessel</option>
                <option value="separator">Separator</option>
                <option value="knockout_drum">Knockout drum</option>
                <option value="heat_exchanger_shell">Heat exchanger shell</option>
                <option value="heat_exchanger_tube">Heat exchanger tube side</option>
                <option value="column">Column</option>
                <option value="reactor">Reactor</option>
                <option value="compressor_system">Compressor system</option>
                <option value="pump_discharge_system">Pump discharge system</option>
                <option value="pipeline">Pipeline</option>
                <option value="other">Other</option>
              </select>
            </div>

            <UnitField
              label="MAWP"
              symbol="MAWP"
              tooltip="Maximum Allowable Working Pressure of protected equipment"
              internalValue={equipment.mawpKpaG + atm}
              displayValue={kpaAbsToPressure(equipment.mawpKpaG + atm, pUnit, atm)}
              unitLabel={pUnit}
              unitOptions={PRESSURE_OPTS}
              selectedUnit={pUnit}
              onUnitChange={(u) => onChangeUnitPref('pressure', u as PressureUnit)}
              onCommitDisplayValue={(v) =>
                updateEquip({ mawpKpaG: pressureToKpaAbs(v, pUnit, atm) - atm })
              }
              secondaryReadout={`Abs: ${(equipment.mawpKpaG + atm).toFixed(2)} kPa(a)`}
              messages={validationMessages.filter((m) => m.field === 'mawpKpaG')}
            />

            <UnitField
              label="Design Pressure"
              internalValue={equipment.designPressureKpaG + atm}
              displayValue={kpaAbsToPressure(equipment.designPressureKpaG + atm, pUnit, atm)}
              unitLabel={pUnit}
              onCommitDisplayValue={(v) =>
                updateEquip({ designPressureKpaG: pressureToKpaAbs(v, pUnit, atm) - atm })
              }
            />

            <UnitField
              label="Design Temperature"
              internalValue={equipment.designTemperatureK}
              displayValue={kelvinToTemp(equipment.designTemperatureK, tUnit)}
              unitLabel={tUnit}
              unitOptions={[...TEMPERATURE_UNITS]}
              selectedUnit={tUnit}
              onUnitChange={(u) => onChangeUnitPref('temperature', u as TemperatureUnit)}
              onCommitDisplayValue={(v) =>
                updateEquip({ designTemperatureK: tempToKelvin(v, tUnit) })
              }
              precision={2}
            />

            <UnitField
              label="Normal Operating Pressure"
              internalValue={equipment.normalOperatingPressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                equipment.normalOperatingPressureKpaG + atm,
                pUnit,
                atm
              )}
              unitLabel={pUnit}
              onCommitDisplayValue={(v) =>
                updateEquip({
                  normalOperatingPressureKpaG: pressureToKpaAbs(v, pUnit, atm) - atm,
                })
              }
            />

            <UnitField
              label="Normal Operating Temp."
              internalValue={equipment.normalOperatingTemperatureK}
              displayValue={kelvinToTemp(equipment.normalOperatingTemperatureK, tUnit)}
              unitLabel={tUnit}
              onCommitDisplayValue={(v) =>
                updateEquip({ normalOperatingTemperatureK: tempToKelvin(v, tUnit) })
              }
              precision={2}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Vessel Orientation
              </label>
              <select
                value={equipment.orientation}
                onChange={(e) =>
                  updateEquip({ orientation: e.target.value as VesselOrientation })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
                <option value="spherical">Spherical</option>
              </select>
            </div>

            <UnitField
              label="Vessel Diameter"
              symbol="D"
              internalValue={equipment.diameterM}
              displayValue={metersToLength(equipment.diameterM, lUnit)}
              unitLabel={lUnit}
              unitOptions={[...LENGTH_UNITS]}
              selectedUnit={lUnit}
              onUnitChange={(u) => onChangeUnitPref('length', u as UnitPreferences['length'])}
              onCommitDisplayValue={(v) =>
                updateEquip({ diameterM: lengthToMeters(v, lUnit) })
              }
              messages={validationMessages.filter((m) => m.field === 'diameterM')}
            />

            <UnitField
              label="Tangent-to-Tangent Length"
              symbol="L_tan"
              internalValue={equipment.tangentLengthM}
              displayValue={metersToLength(equipment.tangentLengthM, lUnit)}
              unitLabel={lUnit}
              onCommitDisplayValue={(v) =>
                updateEquip({ tangentLengthM: lengthToMeters(v, lUnit) })
              }
            />

            <UnitField
              label="Normal Liquid Level"
              internalValue={equipment.liquidLevelM}
              displayValue={metersToLength(equipment.liquidLevelM, lUnit)}
              unitLabel={lUnit}
              onCommitDisplayValue={(v) =>
                updateEquip({ liquidLevelM: lengthToMeters(v, lUnit) })
              }
            />

            <UnitField
              label="Elevation Above Grade"
              internalValue={equipment.elevationAboveGradeM}
              displayValue={metersToLength(equipment.elevationAboveGradeM, lUnit)}
              unitLabel={lUnit}
              onCommitDisplayValue={(v) =>
                updateEquip({ elevationAboveGradeM: lengthToMeters(v, lUnit) })
              }
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">Head Type</label>
              <select
                value={equipment.headType}
                onChange={(e) =>
                  updateEquip({ headType: e.target.value as HeadType })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="2:1_elliptical">2:1 Elliptical</option>
                <option value="hemispherical">Hemispherical</option>
                <option value="torispherical">Torispherical (ASME F&D)</option>
                <option value="flat">Flat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={equipment.insulated}
                onChange={(e) => updateEquip({ insulated: e.target.checked })}
                className="rounded border-slate-300 text-blue-700"
              />
              <span>Equipment Insulated</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={equipment.insulationCertified}
                onChange={(e) => updateEquip({ insulationCertified: e.target.checked })}
                className="rounded border-slate-300 text-blue-700"
              />
              <span>Fire-Rated Insulation Certified (API 521)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-700 font-medium">Fireproofing:</span>
              <select
                value={equipment.fireproofingStatus}
                onChange={(e) =>
                  updateEquip({
                    fireproofingStatus: e.target.value as typeof equipment.fireproofingStatus,
                  })
                }
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="none">None</option>
                <option value="certified_fireproofing">Certified Fireproofing</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. PSV Design Conditions */}
      {subTab === 'conditions' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            PSV Pressure Basis, Backpressure & Valve Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UnitField
              label="Set Pressure"
              symbol="P_set"
              tooltip="Gauge pressure at which PSV begins to open"
              internalValue={designBasis.setPressureKpaG + atm}
              displayValue={kpaAbsToPressure(designBasis.setPressureKpaG + atm, pUnit, atm)}
              unitLabel={pUnit}
              unitOptions={PRESSURE_OPTS}
              selectedUnit={pUnit}
              onUnitChange={(u) => onChangeUnitPref('pressure', u as PressureUnit)}
              onCommitDisplayValue={(v) =>
                updateBasis({ setPressureKpaG: pressureToKpaAbs(v, pUnit, atm) - atm })
              }
              secondaryReadout={`Abs: ${(designBasis.setPressureKpaG + atm).toFixed(2)} kPa(a)`}
              messages={validationMessages.filter((m) => m.field === 'setPressureKpaG')}
            />

            <UnitField
              label="Allowable Overpressure"
              symbol="% OP"
              tooltip="Typical ASME VIII: 10% single non-fire, 16% multiple non-fire, 21% external fire"
              internalValue={designBasis.overpressurePercent}
              displayValue={designBasis.overpressurePercent}
              unitLabel="%"
              onCommitDisplayValue={(v) => updateBasis({ overpressurePercent: v })}
              precision={1}
            />

            <UnitField
              label="Relieving Pressure (Calculated)"
              symbol="P1"
              tooltip="Internal absolute relieving pressure = P_set × (1 + OP/100) + P_atm"
              internalValue={relievingAbsKpaA}
              displayValue={kpaAbsToPressure(relievingAbsKpaA, pUnit, atm)}
              unitLabel={pUnit}
              disabled
              sourceType="CALCULATED"
              onCommitDisplayValue={() => {}}
              secondaryReadout={`Abs: ${relievingAbsKpaA.toFixed(2)} kPa(a) | Gauge: ${relievingGaugeKpaG.toFixed(2)} kPa(g)`}
            />

            <UnitField
              label="Superimposed Backpressure"
              symbol="P_bs"
              internalValue={designBasis.superimposedBackpressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                designBasis.superimposedBackpressureKpaG + atm,
                pUnit,
                atm
              )}
              unitLabel={pUnit}
              onCommitDisplayValue={(v) =>
                updateBasis({
                  superimposedBackpressureKpaG: pressureToKpaAbs(v, pUnit, atm) - atm,
                })
              }
            />

            <UnitField
              label="Built-Up Backpressure"
              symbol="P_bb"
              internalValue={designBasis.builtUpBackpressureKpaG + atm}
              displayValue={kpaAbsToPressure(
                designBasis.builtUpBackpressureKpaG + atm,
                pUnit,
                atm
              )}
              unitLabel={pUnit}
              onCommitDisplayValue={(v) =>
                updateBasis({
                  builtUpBackpressureKpaG: pressureToKpaAbs(v, pUnit, atm) - atm,
                })
              }
            />

            <UnitField
              label="Total Backpressure (Calculated)"
              symbol="P2"
              internalValue={totalBackAbsKpaA}
              displayValue={kpaAbsToPressure(totalBackAbsKpaA, pUnit, atm)}
              unitLabel={pUnit}
              disabled
              sourceType="CALCULATED"
              onCommitDisplayValue={() => {}}
              secondaryReadout={`Abs: ${totalBackAbsKpaA.toFixed(2)} kPa(a) | Gauge: ${totalBackKpaG.toFixed(2)} kPa(g)`}
            />

            <UnitField
              label="Relieving Temperature"
              symbol="T1"
              internalValue={designBasis.relievingTemperatureK}
              displayValue={kelvinToTemp(designBasis.relievingTemperatureK, tUnit)}
              unitLabel={tUnit}
              unitOptions={[...TEMPERATURE_UNITS]}
              selectedUnit={tUnit}
              onUnitChange={(u) => onChangeUnitPref('temperature', u as TemperatureUnit)}
              onCommitDisplayValue={(v) =>
                updateBasis({ relievingTemperatureK: tempToKelvin(v, tUnit) })
              }
              secondaryReadout={`Abs: ${designBasis.relievingTemperatureK.toFixed(2)} K`}
              precision={2}
            />

            <UnitField
              label="Local Atmospheric Pressure"
              symbol="P_atm"
              tooltip="Explicit local barometric pressure used for all gauge <-> absolute conversions"
              internalValue={designBasis.atmosphericPressureKpaA}
              displayValue={kpaAbsToPressure(
                designBasis.atmosphericPressureKpaA,
                'kPa(a)',
                atm
              )}
              unitLabel="kPa(a)"
              sourceType="ASSUMED"
              onCommitDisplayValue={(v) => updateBasis({ atmosphericPressureKpaA: v })}
              secondaryReadout={`${(designBasis.atmosphericPressureKpaA / 6.894757).toFixed(3)} psia`}
              messages={validationMessages.filter(
                (m) => m.field === 'atmosphericPressureKpaA'
              )}
            />

            <UnitField
              label="Accumulation (%)"
              internalValue={designBasis.accumulationPercent}
              displayValue={designBasis.accumulationPercent}
              unitLabel="%"
              onCommitDisplayValue={(v) => updateBasis({ accumulationPercent: v })}
              precision={1}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">Valve Type</label>
              <select
                value={designBasis.valveType}
                onChange={(e) =>
                  updateBasis({ valveType: e.target.value as ValveType })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="conventional">Conventional spring loaded</option>
                <option value="balanced_bellows">Balanced bellows</option>
                <option value="pilot_operated">Pilot operated</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                Discharge Destination
              </label>
              <select
                value={designBasis.dischargeDestination}
                onChange={(e) =>
                  updateBasis({
                    dischargeDestination: e.target.value as DischargeDestination,
                  })
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
              >
                <option value="atmosphere">Atmosphere</option>
                <option value="closed_vent">Closed vent</option>
                <option value="flare_header">Flare header</option>
                <option value="scrubber">Scrubber</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col justify-end gap-2 text-xs pb-1">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={designBasis.ruptureDiskUpstream}
                  onChange={(e) =>
                    updateBasis({
                      ruptureDiskUpstream: e.target.checked,
                      kc: e.target.checked && designBasis.kc === 1.0 ? 0.9 : designBasis.kc,
                      kcSource: e.target.checked ? 'ASSUMED' : designBasis.kcSource,
                    })
                  }
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Rupture Disk Upstream of PSV</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={designBasis.multiplePsvInstallation}
                  onChange={(e) =>
                    updateBasis({ multiplePsvInstallation: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Multiple PSV Installation</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4. Correction Factors */}
      {subTab === 'factors' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Sizing Correction Factors & Property Defaults
            </h3>
            <span className="text-[11px] text-slate-500">
              Mark explicitly whether each factor is User Input or Assumed Preliminary Default
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2 px-3">Factor</th>
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3 w-32">Value</th>
                  <th className="py-2 px-3">Units</th>
                  <th className="py-2 px-3">Source Type</th>
                  <th className="py-2 px-3">Engineering Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    name: 'Gas Discharge Coefficient',
                    sym: 'Kd (Gas)',
                    valKey: 'kdGas' as const,
                    srcKey: 'kdGasSource' as const,
                    unit: '-',
                    desc: 'Preliminary effective nozzle discharge coefficient (0.975 typical; replace with certified vendor Kd).',
                  },
                  {
                    name: 'Liquid Discharge Coefficient',
                    sym: 'Kd (Liq)',
                    valKey: 'kdLiquid' as const,
                    srcKey: 'kdLiquidSource' as const,
                    unit: '-',
                    desc: 'Preliminary effective liquid discharge coefficient (0.65 typical; replace with certified vendor Kd).',
                  },
                  {
                    name: 'Gas Backpressure Factor',
                    sym: 'Kb',
                    valKey: 'kb' as const,
                    srcKey: 'kbSource' as const,
                    unit: '-',
                    desc: 'Balanced-bellows capacity correction for subcritical/backpressure effects (1.0 for conventional/pilot).',
                  },
                  {
                    name: 'Liquid Backpressure Factor',
                    sym: 'Kw',
                    valKey: 'kw' as const,
                    srcKey: 'kwSource' as const,
                    unit: '-',
                    desc: 'Balanced-bellows liquid backpressure correction factor (1.0 for conventional/pilot).',
                  },
                  {
                    name: 'Viscosity Correction Factor',
                    sym: 'Kv',
                    valKey: 'kvDefault' as const,
                    srcKey: 'kvSource' as const,
                    unit: '-',
                    desc: 'Liquid viscosity correction factor (computed iteratively in Liquid PSV tab when enabled).',
                  },
                  {
                    name: 'Combination Factor',
                    sym: 'Kc',
                    valKey: 'kc' as const,
                    srcKey: 'kcSource' as const,
                    unit: '-',
                    desc: 'Rupture disk in series factor (1.0 if none; 0.90 preliminary default without certified test).',
                  },
                ].map((row) => (
                  <tr key={row.sym} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
                    <td className="py-2 px-3 font-mono text-blue-700">{row.sym}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.005"
                        value={designBasis[row.valKey]}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isFinite(v)) {
                            updateBasis({
                              [row.valKey]: v,
                              [row.srcKey]: 'USER_INPUT' as ValueSourceType,
                            });
                          }
                        }}
                        className="w-24 rounded border border-slate-300 px-2 py-1 font-mono tabular-nums text-right"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">{row.unit}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <SourceTag sourceType={designBasis[row.srcKey]} />
                        <select
                          value={designBasis[row.srcKey]}
                          onChange={(e) =>
                            updateBasis({
                              [row.srcKey]: e.target.value as ValueSourceType,
                            })
                          }
                          className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px]"
                        >
                          <option value="USER_INPUT">User Input</option>
                          <option value="ASSUMED">Assumed</option>
                          <option value="STANDARD_LOOKUP">Lookup</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{row.desc}</td>
                  </tr>
                ))}

                {advancedMode && (
                  <>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        Steam Napier / Pressure Factor
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-700">Kn</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={designBasis.steamCorrectionKn}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) updateBasis({ steamCorrectionKn: v });
                          }}
                          className="w-24 rounded border border-slate-300 px-2 py-1 font-mono tabular-nums text-right"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">-</td>
                      <td className="py-2 px-3">
                        <SourceTag sourceType="USER_INPUT" />
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        High-pressure steam Napier correction factor (for reference; verify steam service against API 520 Part I).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        Steam Superheat Factor
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-700">Ksh</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={designBasis.steamCorrectionKsh}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) updateBasis({ steamCorrectionKsh: v });
                          }}
                          className="w-24 rounded border border-slate-300 px-2 py-1 font-mono tabular-nums text-right"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">-</td>
                      <td className="py-2 px-3">
                        <SourceTag sourceType="USER_INPUT" />
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        Superheated steam correction factor (verify against licensed API 520 Part I tables).
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Standards Edition Basis */}
      {subTab === 'standards' && (
        <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Adopted Standards Edition & Configurable Fire Constants
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              This application is not API-certified or ASME-certified. Enter the adopted editions from your licensed standards and verify all constants.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {(
              [
                ['api520Part1Edition', 'API Standard 520 Part I Edition'],
                ['api520Part2Edition', 'API Standard 520 Part II Edition'],
                ['api521Edition', 'API Standard 521 Edition'],
                ['api526Edition', 'API Standard 526 Edition'],
                ['asmeSectionViiiEdition', 'ASME BPVC Section VIII Edition'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="font-medium text-slate-700">{label}</label>
                <input
                  type="text"
                  value={standardBasis[key]}
                  onChange={(e) => updateStandards({ [key]: e.target.value })}
                  className="rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
                />
              </div>
            ))}

            <UnitField
              label="API 521 Fire Constant (Prompt Drainage & Firefighting)"
              symbol="C1_prompt"
              internalValue={standardBasis.fireHeatConstantPromptDrainageW}
              displayValue={standardBasis.fireHeatConstantPromptDrainageW}
              unitLabel="W / m^1.64"
              sourceType="STANDARD_LOOKUP"
              onCommitDisplayValue={(v) =>
                updateStandards({ fireHeatConstantPromptDrainageW: v })
              }
              precision={0}
            />

            <UnitField
              label="API 521 Fire Constant (Inadequate Drainage)"
              symbol="C1_inad"
              internalValue={standardBasis.fireHeatConstantInadequateDrainageW}
              displayValue={standardBasis.fireHeatConstantInadequateDrainageW}
              unitLabel="W / m^1.64"
              sourceType="STANDARD_LOOKUP"
              onCommitDisplayValue={(v) =>
                updateStandards({ fireHeatConstantInadequateDrainageW: v })
              }
              precision={0}
            />

            <UnitField
              label="Fire Heat Input Area Exponent"
              symbol="n"
              internalValue={standardBasis.fireHeatAreaExponent}
              displayValue={standardBasis.fireHeatAreaExponent}
              unitLabel="-"
              sourceType="STANDARD_LOOKUP"
              onCommitDisplayValue={(v) =>
                updateStandards({ fireHeatAreaExponent: v })
              }
              precision={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};
