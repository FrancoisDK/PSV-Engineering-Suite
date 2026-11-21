import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getSensitivityVariablesForModule,
  runSensitivityAnalysis,
  SensitivityModule,
  SensitivityVariableKey,
} from '../../calculations/sensitivity';
import { mm2ToArea } from '../../calculations/unitConversions';
import {
  FireCaseInput,
  GasPSVInput,
  LiquidPSVInput,
  StandardReferenceBasis,
  UnitPreferences,
  VapourBreakthroughInput,
} from '../../models/calculationTypes';

interface SensitivityPanelProps {
  module: SensitivityModule;
  inputs: {
    gas: GasPSVInput;
    liquid: LiquidPSVInput;
    breakthrough: VapourBreakthroughInput;
    fire: FireCaseInput;
  };
  standardBasis: StandardReferenceBasis;
  unitPreferences: UnitPreferences;
  fireBaseWettedAreaM2?: number;
}

export const SensitivityPanel: React.FC<SensitivityPanelProps> = ({
  module,
  inputs,
  standardBasis,
  unitPreferences,
  fireBaseWettedAreaM2,
}) => {
  const variables = useMemo(() => getSensitivityVariablesForModule(module), [module]);
  const [selectedVar, setSelectedVar] = useState<SensitivityVariableKey>(variables[0].key);
  const [spanPercent, setSpanPercent] = useState<number>(30);
  const [debouncedKey, setDebouncedKey] = useState(0);

  useEffect(() => {
    if (!variables.some((v) => v.key === selectedVar)) {
      setSelectedVar(variables[0].key);
    }
  }, [variables, selectedVar]);

  // Debounce chart recalculation per UX requirement
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKey((k) => k + 1);
    }, 180);
    return () => clearTimeout(timer);
  }, [module, selectedVar, spanPercent, inputs, standardBasis]);

  const rawPoints = useMemo(() => {
    void debouncedKey;
    return runSensitivityAnalysis(
      module,
      selectedVar,
      spanPercent,
      15,
      inputs,
      standardBasis,
      fireBaseWettedAreaM2
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey]);

  const areaUnit = unitPreferences.area;
  const chartData = useMemo(
    () =>
      rawPoints.map((pt) => ({
        ...pt,
        requiredAreaDisplay:
          pt.requiredAreaMm2 !== null
            ? Number(mm2ToArea(pt.requiredAreaMm2, areaUnit).toFixed(3))
            : null,
      })),
    [rawPoints, areaUnit]
  );

  const selectedMeta = variables.find((v) => v.key === selectedVar) ?? variables[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Sensitivity Variable
            </label>
            <select
              value={selectedVar}
              onChange={(e) => setSelectedVar(e.target.value as SensitivityVariableKey)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
            >
              {variables.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label} ({v.unitHint})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Variation Range (±%)
            </label>
            <select
              value={spanPercent}
              onChange={(e) => setSpanPercent(Number(e.target.value))}
              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono text-slate-900"
            >
              <option value={15}>±15%</option>
              <option value={30}>±30%</option>
              <option value={50}>±50%</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Reuses deterministic {module} sizing engine across 15 operating points.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-semibold text-slate-800 mb-3">
            Required Effective Area ({areaUnit}) vs {selectedMeta.label}
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="stepLabel"
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    `${value ?? 'N/A'} ${areaUnit}`,
                    'Required Area',
                  ]}
                  labelFormatter={(label, payload) => {
                    const pt = payload?.[0]?.payload;
                    return pt
                      ? `${label} (Val: ${pt.variableValue})`
                      : String(label);
                  }}
                />
                <ReferenceLine x="0%" stroke="#94a3b8" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="requiredAreaDisplay"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-semibold text-slate-800 mb-3">
            Selected Orifice Capacity Margin (%) vs {selectedMeta.label}
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="stepLabel"
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  width={50}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    `${value ?? 'N/A'}%`,
                    'Area Margin',
                  ]}
                  labelFormatter={(label, payload) => {
                    const pt = payload?.[0]?.payload;
                    return pt
                      ? `${label} (Val: ${pt.variableValue})`
                      : String(label);
                  }}
                />
                <ReferenceLine x="0%" stroke="#94a3b8" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="capacityMarginPercent"
                  stroke="#047857"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
