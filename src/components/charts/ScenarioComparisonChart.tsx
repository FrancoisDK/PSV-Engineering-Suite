import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { mm2ToArea } from '../../calculations/unitConversions';
import { AreaUnit, ReliefScenario } from '../../models/calculationTypes';

interface ScenarioComparisonChartProps {
  scenarios: ReliefScenario[];
  governingScenarioId: string | null;
  areaUnit: AreaUnit;
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({
  scenarios,
  governingScenarioId,
  areaUnit,
}) => {
  const data = scenarios
    .filter((s) => s.enabled && s.requiredAreaMm2 !== null)
    .map((s) => ({
      id: s.id,
      name: s.name.length > 22 ? `${s.name.slice(0, 20)}…` : s.name,
      fullName: s.name,
      area: Number(mm2ToArea(s.requiredAreaMm2!, areaUnit).toFixed(2)),
      isGoverning: s.id === governingScenarioId,
    }));

  if (data.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
        Enable at least one calculated relief scenario to plot Required Effective Area comparison.
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-800">
          Required Effective Area by Relief Scenario ({areaUnit})
        </h3>
        <span className="text-[11px] text-slate-500">
          Highlighted bar indicates governing scenario
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
            <YAxis tick={{ fontSize: 11, fill: '#475569' }} width={64} />
            <Tooltip
              formatter={(value: unknown) => [`${value} ${areaUnit}`, 'Required Area']}
              labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
            <Bar dataKey="area" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={entry.isGoverning ? '#1d4ed8' : '#64748b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
