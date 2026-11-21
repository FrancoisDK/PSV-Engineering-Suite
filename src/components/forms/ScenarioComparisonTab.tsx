import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Copy,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { selectApiOrifice } from '../../calculations/orificeSelection';
import {
  kelvinToTemp,
  kgHToMassFlow,
  kpaAbsToPressure,
  mm2ToArea,
} from '../../calculations/unitConversions';
import {
  FluidPhase,
  ProjectDocument,
  ReliefScenario,
  ScenarioType,
} from '../../models/calculationTypes';
import { ScenarioComparisonChart } from '../charts/ScenarioComparisonChart';
import { StatusBadge } from '../common/StatusBadge';

interface ScenarioComparisonTabProps {
  document: ProjectDocument;
  evaluatedScenarios: ReliefScenario[];
  governingScenario: ReliefScenario | null;
  onUpdateScenarios: (next: ReliefScenario[]) => void;
  onNavigateToModule: (module: 'gas' | 'liquid' | 'breakthrough' | 'fire') => void;
}

export const ScenarioComparisonTab: React.FC<ScenarioComparisonTabProps> = ({
  document,
  evaluatedScenarios,
  governingScenario,
  onUpdateScenarios,
  onNavigateToModule,
}) => {
  const [sortBy, setSortBy] = useState<'area' | 'massFlow'>('area');
  const [sortDesc, setSortDesc] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ScenarioType>('blocked_outlet');
  const [newModule, setNewModule] = useState<ReliefScenario['linkedModule']>('gas');

  const u = document.unitPreferences;
  const atm = document.designBasis.atmosphericPressureKpaA;

  const sorted = useMemo(() => {
    const arr = [...evaluatedScenarios];
    arr.sort((a, b) => {
      const valA =
        sortBy === 'area' ? (a.requiredAreaMm2 ?? -1) : a.relievingMassFlowKgH;
      const valB =
        sortBy === 'area' ? (b.requiredAreaMm2 ?? -1) : b.relievingMassFlowKgH;
      return sortDesc ? valB - valA : valA - valB;
    });
    return arr;
  }, [evaluatedScenarios, sortBy, sortDesc]);

  const largestFlowScenario = useMemo(() => {
    return (
      evaluatedScenarios
        .filter((s) => s.enabled)
        .sort((a, b) => b.relievingMassFlowKgH - a.relievingMassFlowKgH)[0] ??
      null
    );
  }, [evaluatedScenarios]);

  const distinctPhases = useMemo(
    () =>
      Array.from(
        new Set(evaluatedScenarios.filter((s) => s.enabled).map((s) => s.fluidPhase))
      ),
    [evaluatedScenarios]
  );

  const outsideScopeScenarios = evaluatedScenarios.filter(
    (s) => s.enabled && s.status === 'OUTSIDE_IMPLEMENTED_METHOD'
  );

  const handleAddScenario = () => {
    const label = newName.trim() || `Scenario (${newType.replace(/_/g, ' ')})`;
    const phase: FluidPhase = newModule === 'liquid' ? 'liquid' : 'gas_vapour';
    const created: ReliefScenario = {
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      scenarioType: newType,
      linkedModule: newModule,
      fluidPhase: phase,
      enabled: true,
      independentlyProtected: false,
      simultaneousGroup: null,
      relievingPressureKpaA:
        document.designBasis.setPressureKpaG *
          (1 + document.designBasis.overpressurePercent / 100) +
        atm,
      relievingTemperatureK: document.designBasis.relievingTemperatureK,
      relievingMassFlowKgH: 0,
      requiredAreaMm2: null,
      selectedOrificeDesignation: null,
      inletOutletNozzle: null,
      ratedCapacity10PctKgH: null,
      capacityMarginPercent: null,
      status: 'INCOMPLETE',
      notes: '',
    };
    onUpdateScenarios([...document.scenarios, created]);
    setNewName('');
  };

  const toggleSort = (col: 'area' | 'massFlow') => {
    if (sortBy === col) {
      setSortDesc((d) => !d);
    } else {
      setSortBy(col);
      setSortDesc(true);
    }
  };

  const updateOne = (id: string, patch: Partial<ReliefScenario>) => {
    onUpdateScenarios(
      document.scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const duplicateOne = (sc: ReliefScenario) => {
    const copy: ReliefScenario = {
      ...sc,
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${sc.name} (Copy)`,
    };
    onUpdateScenarios([...document.scenarios, copy]);
  };

  const deleteOne = (id: string) => {
    onUpdateScenarios(document.scenarios.filter((s) => s.id !== id));
  };

  // Explicit simultaneous groups check (never automatically combined unless user explicitly groups)
  const simultaneousGroups = useMemo(() => {
    const groups = new Map<string, ReliefScenario[]>();
    for (const s of evaluatedScenarios) {
      if (s.enabled && s.simultaneousGroup && s.simultaneousGroup.trim()) {
        const key = s.simultaneousGroup.trim();
        groups.set(key, [...(groups.get(key) ?? []), s]);
      }
    }
    return Array.from(groups.entries()).filter(([, list]) => list.length > 1);
  }, [evaluatedScenarios]);

  return (
    <div className="space-y-4">
      {/* Highlights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
        <div className="rounded border border-blue-200 bg-blue-50 p-3.5">
          <div className="text-blue-900 font-medium">
            Governing Scenario (Largest Required Area)
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {governingScenario ? governingScenario.name : 'None evaluated'}
          </div>
          <div className="text-[11px] font-mono text-blue-800 mt-0.5 tabular-nums">
            {governingScenario?.requiredAreaMm2 !== null &&
            governingScenario?.requiredAreaMm2 !== undefined
              ? `${mm2ToArea(governingScenario.requiredAreaMm2, u.area).toFixed(2)} ${u.area} · Orifice ${governingScenario.selectedOrificeDesignation ?? '—'}${
                  governingScenario.inletOutletNozzle
                    ? ` (${governingScenario.inletOutletNozzle})`
                    : ''
                }`
              : '—'}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500 font-medium">Largest Relieving Mass Load</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {largestFlowScenario ? largestFlowScenario.name : '—'}
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-0.5">
            {largestFlowScenario
              ? `${kgHToMassFlow(largestFlowScenario.relievingMassFlowKgH, u.massFlow).toFixed(1)} ${u.massFlow}`
              : '—'}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500 font-medium">Fluid Phases Across Scenarios</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {distinctPhases.length > 0
              ? distinctPhases.map((p) => p.replace('_', '/')).join(', ')
              : 'None'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {distinctPhases.length > 1
              ? 'Mixed phases present — verify valve trim & sizing basis'
              : 'Single phase across active scenarios'}
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-3.5">
          <div className="text-slate-500 font-medium">Scope & Combination Guard</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {outsideScopeScenarios.length > 0
              ? `${outsideScopeScenarios.length} Outside Scope`
              : 'All Active Within Method'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Scenarios are never combined unless explicitly grouped.
          </div>
        </div>
      </div>

      {/* Add Scenario Toolbar */}
      <div className="rounded border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3 text-xs">
        <div className="flex-1 min-w-[180px]">
          <label className="block font-medium text-slate-700 mb-1">
            New Scenario Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Cooling Water Failure"
            className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Scenario Type
          </label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as ScenarioType)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <option value="blocked_outlet">Blocked outlet</option>
            <option value="gas_blowby">Gas blow-by</option>
            <option value="vapour_breakthrough">Vapour breakthrough</option>
            <option value="external_fire">External fire</option>
            <option value="control_valve_failure">Control valve failure</option>
            <option value="cooling_failure">Cooling failure</option>
            <option value="utility_failure">Utility failure</option>
            <option value="thermal_expansion">Thermal expansion</option>
            <option value="tube_rupture">Tube rupture</option>
            <option value="user_defined">User-defined scenario</option>
          </select>
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Linked Sizing Engine
          </label>
          <select
            value={newModule}
            onChange={(e) =>
              setNewModule(e.target.value as ReliefScenario['linkedModule'])
            }
            className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <option value="gas">Gas / Vapour PSV Tab</option>
            <option value="liquid">Liquid PSV Tab</option>
            <option value="breakthrough">Vapour Breakthrough Tab</option>
            <option value="fire">Fire Case Tab</option>
            <option value="manual">Manual Entry</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddScenario}
          className="inline-flex items-center gap-1.5 rounded bg-blue-700 px-3.5 py-2 font-medium text-white hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Scenario</span>
        </button>
      </div>

      {/* Comparison Table */}
      <div className="rounded border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Active</th>
                <th className="py-2.5 px-3">Scenario Name</th>
                <th className="py-2.5 px-3">Type / Source</th>
                <th className="py-2.5 px-3">Phase</th>
                <th className="py-2.5 px-3 text-right">Relieving P</th>
                <th className="py-2.5 px-3 text-right">Relieving T</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('massFlow')}
                    className="inline-flex items-center gap-1 font-semibold hover:text-slate-900"
                  >
                    <span>Mass Flow</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('area')}
                    className="inline-flex items-center gap-1 font-semibold hover:text-slate-900"
                  >
                    <span>Required Area</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Orifice</th>
                <th className="py-2.5 px-3">Inlet × Outlet</th>
                <th className="py-2.5 px-3 text-right">Rated Cap. (10% OP)</th>
                <th className="py-2.5 px-3 text-right">Margin</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Protection / Simultaneous</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-500">
                    No saved scenarios yet. Add a scenario above or load a demonstration case.
                  </td>
                </tr>
              ) : (
                sorted.map((sc) => {
                  const isGov = governingScenario?.id === sc.id;
                  return (
                    <tr
                      key={sc.id}
                      className={`${
                        isGov
                          ? 'bg-blue-50/70'
                          : !sc.enabled
                            ? 'bg-slate-50/60 opacity-60'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={sc.enabled}
                          onChange={(e) =>
                            updateOne(sc.id, { enabled: e.target.checked })
                          }
                          aria-label={`Enable ${sc.name}`}
                        />
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        <div>{sc.name}</div>
                        {isGov && (
                          <div className="text-[10px] font-semibold text-blue-700">
                            GOVERNING SCENARIO
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <div>{sc.scenarioType.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-slate-400">
                          Engine: {sc.linkedModule}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {sc.fluidPhase.replace('_', '/')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {kpaAbsToPressure(
                          sc.relievingPressureKpaA,
                          u.pressure,
                          atm
                        ).toFixed(1)}{' '}
                        {u.pressure}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {kelvinToTemp(sc.relievingTemperatureK, u.temperature).toFixed(
                          1
                        )}{' '}
                        {u.temperature}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {sc.linkedModule === 'manual' ? (
                          <input
                            type="number"
                            value={sc.relievingMassFlowKgH}
                            onChange={(e) =>
                              updateOne(sc.id, {
                                relievingMassFlowKgH: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-right text-xs"
                          />
                        ) : (
                          `${kgHToMassFlow(
                            sc.relievingMassFlowKgH,
                            u.massFlow
                          ).toFixed(1)} ${u.massFlow}`
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-blue-800">
                        {sc.linkedModule === 'manual' ? (
                          <input
                            type="number"
                            value={sc.requiredAreaMm2 ?? 0}
                            onChange={(e) => {
                              const area = parseFloat(e.target.value) || 0;
                              const sel = selectApiOrifice(area);
                              updateOne(sc.id, {
                                requiredAreaMm2: area,
                                selectedOrificeDesignation:
                                  sel.selectedOrifice?.designation ?? null,
                                inletOutletNozzle: sel.nozzleSizeLabel,
                                capacityMarginPercent: sel.areaMarginPercent,
                                status: sel.validSelection ? 'PASS' : 'FAIL',
                              });
                            }}
                            className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-right text-xs"
                          />
                        ) : sc.requiredAreaMm2 !== null ? (
                          `${mm2ToArea(sc.requiredAreaMm2, u.area).toFixed(2)} ${u.area}`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {sc.selectedOrificeDesignation ?? '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {sc.inletOutletNozzle ?? '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-800 whitespace-nowrap">
                        {sc.ratedCapacity10PctKgH !== null &&
                        sc.ratedCapacity10PctKgH !== undefined
                          ? `${kgHToMassFlow(
                              sc.ratedCapacity10PctKgH,
                              u.massFlow
                            ).toFixed(1)} ${u.massFlow}`
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {sc.capacityMarginPercent !== null
                          ? `${sc.capacityMarginPercent.toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={sc.status} compact />
                      </td>
                      <td className="py-2 px-3 space-y-1">
                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={sc.independentlyProtected}
                            onChange={(e) =>
                              updateOne(sc.id, {
                                independentlyProtected: e.target.checked,
                              })
                            }
                          />
                          <span>Indep. protected</span>
                        </label>
                        <input
                          type="text"
                          value={sc.simultaneousGroup ?? ''}
                          onChange={(e) =>
                            updateOne(sc.id, {
                              simultaneousGroup: e.target.value || null,
                            })
                          }
                          placeholder="Simult. group (optional)"
                          className="w-32 rounded border border-slate-200 px-1.5 py-0.5 text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {sc.linkedModule !== 'manual' && (
                            <button
                              type="button"
                              title="View calculation"
                              onClick={() =>
                                onNavigateToModule(
                                  sc.linkedModule as 'gas' | 'liquid' | 'breakthrough' | 'fire'
                                )
                              }
                              className="p-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={() => duplicateOne(sc)}
                            className="p-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => deleteOne(sc.id)}
                            className="p-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {simultaneousGroups.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 space-y-2">
          <div className="font-semibold">
            Explicit Simultaneous Scenario Groups (User-Designated)
          </div>
          {simultaneousGroups.map(([grpName, list]) => {
            const totalMass = list.reduce((acc, s) => acc + s.relievingMassFlowKgH, 0);
            const sumArea = list.reduce((acc, s) => acc + (s.requiredAreaMm2 ?? 0), 0);
            return (
              <div key={grpName} className="font-mono">
                Group &ldquo;{grpName}&rdquo; ({list.length} scenarios): Combined Load ={' '}
                {kgHToMassFlow(totalMass, u.massFlow).toFixed(1)} {u.massFlow}, Sum of Areas ={' '}
                {mm2ToArea(sumArea, u.area).toFixed(2)} {u.area} — Verify approved combination basis before use.
              </div>
            );
          })}
        </div>
      )}

      <ScenarioComparisonChart
        scenarios={evaluatedScenarios}
        governingScenarioId={governingScenario?.id ?? null}
        areaUnit={u.area}
      />
    </div>
  );
};
