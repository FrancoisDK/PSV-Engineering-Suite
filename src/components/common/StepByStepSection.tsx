import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CalculationStep } from '../../models/calculationTypes';
import { SourceTag } from './UnitField';

interface StepByStepSectionProps {
  title?: string;
  steps: CalculationStep[];
  defaultOpen?: boolean;
}

export const StepByStepSection: React.FC<StepByStepSectionProps> = ({
  title = 'Step-by-Step Calculation & Substituted Equations',
  steps,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
      >
        <span>{title} ({steps.length} steps)</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          {steps.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              No calculation steps available yet. Resolve validation errors to compute.
            </div>
          ) : (
            steps.map((step, idx) => (
              <div key={`${step.label}-${idx}`} className="p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-800">
                    {idx + 1}. {step.label}{' '}
                    {step.symbol && (
                      <span className="font-mono text-slate-500">({step.symbol})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SourceTag sourceType={step.sourceType} />
                    <span className="font-mono tabular-nums font-semibold text-blue-800">
                      {step.value} {step.unit ?? ''}
                    </span>
                  </div>
                </div>
                {step.equation && (
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded">
                    Eq: {step.equation}
                  </div>
                )}
                {step.substitution && (
                  <div className="font-mono text-[11px] text-slate-500 px-2">
                    Sub: {step.substitution}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
