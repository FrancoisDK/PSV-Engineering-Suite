import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { CalculationStatus } from '../../models/calculationTypes';

interface StatusBadgeProps {
  status: CalculationStatus;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, compact = false }) => {
  const config: Record<
    CalculationStatus,
    { label: string; cls: string; Icon: React.FC<{ className?: string }> }
  > = {
    PASS: {
      label: 'PASS',
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      Icon: CheckCircle2,
    },
    PASS_WITH_WARNINGS: {
      label: 'PASS WITH WARNINGS',
      cls: 'bg-amber-50 text-amber-800 border-amber-300',
      Icon: AlertTriangle,
    },
    FAIL: {
      label: 'FAIL',
      cls: 'bg-red-50 text-red-800 border-red-300',
      Icon: AlertCircle,
    },
    INCOMPLETE: {
      label: 'INCOMPLETE',
      cls: 'bg-slate-100 text-slate-700 border-slate-300',
      Icon: HelpCircle,
    },
    OUTSIDE_IMPLEMENTED_METHOD: {
      label: 'OUTSIDE IMPLEMENTED METHOD',
      cls: 'bg-red-100 text-red-900 border-red-400',
      Icon: ShieldAlert,
    },
  };

  const { label, cls, Icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded font-semibold whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${cls}`}
    >
      <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
