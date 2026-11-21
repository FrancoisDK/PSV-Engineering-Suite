import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import {
  ValidationMessage,
  ValueSourceType,
} from '../../models/calculationTypes';

interface SourceTagProps {
  sourceType?: ValueSourceType;
}

export const SourceTag: React.FC<SourceTagProps> = ({ sourceType }) => {
  if (!sourceType) return null;
  const labels: Record<ValueSourceType, { text: string; cls: string }> = {
    USER_INPUT: { text: 'Input', cls: 'text-slate-600' },
    CALCULATED: { text: 'Calc', cls: 'text-blue-700 font-medium' },
    ASSUMED: { text: 'Assumed', cls: 'text-amber-700 font-medium' },
    STANDARD_LOOKUP: { text: 'Lookup', cls: 'text-emerald-700 font-medium' },
  };
  const cfg = labels[sourceType];
  return <span className={`text-[11px] ${cfg.cls}`}>{cfg.text}</span>;
};

interface UnitFieldProps {
  label: string;
  symbol?: string;
  tooltip?: string;
  internalValue: number;
  displayValue: number;
  unitLabel: string;
  unitOptions?: { value: string; label: string }[];
  selectedUnit?: string;
  onUnitChange?: (unit: string) => void;
  onCommitDisplayValue: (newDisplayVal: number) => void;
  sourceType?: ValueSourceType;
  precision?: number;
  disabled?: boolean;
  messages?: ValidationMessage[];
  min?: number;
  step?: string;
  secondaryReadout?: string;
}

export const UnitField: React.FC<UnitFieldProps> = ({
  label,
  symbol,
  tooltip,
  displayValue,
  unitLabel,
  unitOptions,
  selectedUnit,
  onUnitChange,
  onCommitDisplayValue,
  sourceType = 'USER_INPUT',
  precision = 3,
  disabled = false,
  messages = [],
  secondaryReadout,
}) => {
  const formatVal = (val: number) => {
    if (!Number.isFinite(val)) return '';
    return Number(val.toPrecision(7)).toString();
  };

  const [text, setText] = useState<string>(() =>
    Number.isFinite(displayValue) ? Number(displayValue.toFixed(precision)).toString() : ''
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(
        Number.isFinite(displayValue)
          ? Number(displayValue.toFixed(precision)).toString()
          : ''
      );
    }
  }, [displayValue, precision, focused, selectedUnit, unitLabel]);

  const hasError = messages.some((m) => m.severity === 'ERROR');
  const hasWarn = !hasError && messages.some((m) => m.severity === 'WARNING');

  const borderCls = hasError
    ? 'border-red-500 focus-within:ring-red-200'
    : hasWarn
      ? 'border-amber-500 focus-within:ring-amber-200'
      : 'border-slate-300 focus-within:border-blue-600 focus-within:ring-blue-100';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <span>{label}</span>
          {symbol && (
            <span className="font-mono text-[11px] text-slate-500">({symbol})</span>
          )}
          {tooltip && (
            <span title={tooltip} className="text-slate-400 hover:text-slate-600 cursor-help">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          )}
        </label>
        <SourceTag sourceType={sourceType} />
      </div>

      <div
        className={`flex items-stretch rounded border bg-white focus-within:ring-2 transition-colors ${borderCls} ${
          disabled ? 'bg-slate-100 text-slate-500' : ''
        }`}
      >
        <input
          type="number"
          step="any"
          disabled={disabled}
          value={focused ? text : formatVal(Number(displayValue.toFixed(precision)))}
          onFocus={() => {
            setFocused(true);
            setText(
              Number.isFinite(displayValue)
                ? Number(displayValue.toFixed(precision)).toString()
                : ''
            );
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = parseFloat(text);
            if (Number.isFinite(parsed)) {
              onCommitDisplayValue(parsed);
            }
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const parsed = parseFloat(raw);
            if (Number.isFinite(parsed)) {
              onCommitDisplayValue(parsed);
            }
          }}
          className="w-full min-w-0 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none disabled:cursor-not-allowed"
        />

        {unitOptions && onUnitChange && selectedUnit ? (
          <select
            aria-label={`${label} unit`}
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="border-l border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none rounded-r"
          >
            {unitOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0 rounded-r">
            {unitLabel}
          </span>
        )}
      </div>

      {secondaryReadout && (
        <div className="text-[11px] font-mono tabular-nums text-slate-500">
          {secondaryReadout}
        </div>
      )}

      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex items-start gap-1 text-[11px] leading-snug ${
            m.severity === 'ERROR'
              ? 'text-red-700'
              : m.severity === 'WARNING'
                ? 'text-amber-700'
                : 'text-blue-700'
          }`}
        >
          {m.severity === 'ERROR' ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : m.severity === 'WARNING' ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          )}
          <span>{m.message}</span>
        </div>
      ))}
    </div>
  );
};
