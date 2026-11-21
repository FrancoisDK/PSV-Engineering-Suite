import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { ValidationMessage } from '../../models/calculationTypes';

interface ValidationBannerProps {
  messages: ValidationMessage[];
  title?: string;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  messages,
  title = 'Engineering Checks & Validation Messages',
}) => {
  if (!messages.length) return null;

  const errors = messages.filter((m) => m.severity === 'ERROR');
  const warnings = messages.filter((m) => m.severity === 'WARNING');
  const infos = messages.filter((m) => m.severity === 'INFO');

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <span>Errors ({errors.length}) — {title}</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {errors.map((m) => (
              <li key={m.id}>{m.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Warnings ({warnings.length}) — Review Required</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {warnings.map((m) => (
              <li key={m.id}>{m.message}</li>
            ))}
          </ul>
        </div>
      )}
      {infos.length > 0 && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <Info className="w-4 h-4 text-blue-700 shrink-0" />
            <span>Engineering Guidance</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {infos.map((m) => (
              <li key={m.id}>{m.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
