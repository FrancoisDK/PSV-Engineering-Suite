import { API_526_ORIFICES } from '../constants/apiOrifices';
import {
  ApiOrificeDefinition,
  OrificeSelectionResult,
  ValidationMessage,
} from '../models/calculationTypes';

/**
 * Selects the smallest standard API 526 effective orifice >= requiredAreaMm2.
 * Never silently selects the largest orifice if requiredAreaMm2 exceeds it.
 * Never presents a smaller orifice as passing.
 */
export function selectApiOrifice(
  requiredAreaMm2: number,
  overrideDesignation?: string | null,
  overrideNote?: string,
  orificeTable: ApiOrificeDefinition[] = API_526_ORIFICES
): OrificeSelectionResult {
  const messages: ValidationMessage[] = [];
  const sorted = [...orificeTable].sort(
    (a, b) => a.effectiveAreaMm2 - b.effectiveAreaMm2
  );

  if (!Number.isFinite(requiredAreaMm2) || requiredAreaMm2 <= 0) {
    return {
      requiredAreaMm2,
      recommendedOrifice: null,
      nextLargerOrifice: null,
      selectedOrifice: null,
      inletNozzleSizeIn: null,
      outletNozzleSizeIn: null,
      nozzleSizeLabel: null,
      isOverride: false,
      overrideNote: overrideNote ?? '',
      exceedsLargestStandard: false,
      areaMarginMm2: null,
      areaMarginPercent: null,
      utilisationPercent: null,
      validSelection: false,
      messages: [
        {
          id: 'orifice-invalid-area',
          severity: 'ERROR',
          message: 'Required effective area must be finite and positive before orifice selection.',
        },
      ],
    };
  }

  const recIndex = sorted.findIndex((o) => o.effectiveAreaMm2 >= requiredAreaMm2);
  const exceedsLargestStandard = recIndex === -1;
  const recommendedOrifice = exceedsLargestStandard ? null : sorted[recIndex];
  const nextLargerOrifice =
    !exceedsLargestStandard && recIndex + 1 < sorted.length
      ? sorted[recIndex + 1]
      : null;

  if (exceedsLargestStandard) {
    const largest = sorted[sorted.length - 1];
    messages.push({
      id: 'orifice-exceeds-max',
      severity: 'ERROR',
      message: `Required effective area (${requiredAreaMm2.toFixed(1)} mm²) exceeds the largest configured API 526 standard orifice (${largest.designation}: ${largest.effectiveAreaMm2.toFixed(1)} mm² / ${largest.effectiveAreaIn2.toFixed(3)} in²). Multiple PSVs or a non-standard/special valve is required.`,
    });
  }

  let selectedOrifice: ApiOrificeDefinition | null = recommendedOrifice;
  let isOverride = false;
  const trimmedNote = (overrideNote ?? '').trim();

  if (overrideDesignation) {
    const found = sorted.find((o) => o.designation === overrideDesignation);
    if (found) {
      isOverride =
        !recommendedOrifice ||
        found.designation !== recommendedOrifice.designation;
      selectedOrifice = found;
      if (isOverride && !trimmedNote) {
        messages.push({
          id: 'orifice-override-note-missing',
          severity: 'WARNING',
          message: `Orifice selection manually overridden to '${found.designation}'. An engineering override note is required.`,
        });
      }
    }
  }

  let areaMarginMm2: number | null = null;
  let areaMarginPercent: number | null = null;
  let utilisationPercent: number | null = null;
  let validSelection = false;

  if (selectedOrifice) {
    areaMarginMm2 = selectedOrifice.effectiveAreaMm2 - requiredAreaMm2;
    areaMarginPercent =
      ((selectedOrifice.effectiveAreaMm2 - requiredAreaMm2) / requiredAreaMm2) *
      100;
    utilisationPercent =
      (requiredAreaMm2 / selectedOrifice.effectiveAreaMm2) * 100;

    if (selectedOrifice.effectiveAreaMm2 < requiredAreaMm2) {
      validSelection = false;
      messages.push({
        id: 'orifice-undersized',
        severity: 'ERROR',
        message: `Selected orifice ${selectedOrifice.designation} (${selectedOrifice.effectiveAreaMm2.toFixed(1)} mm²) is SMALLER than required area (${requiredAreaMm2.toFixed(1)} mm²). Selection fails capacity check.`,
      });
    } else {
      validSelection = true;
      if (utilisationPercent > 95) {
        messages.push({
          id: 'orifice-high-utilisation',
          severity: 'WARNING',
          message: `Orifice ${selectedOrifice.designation} utilisation is ${utilisationPercent.toFixed(1)}% (> 95%). Consider next larger orifice (${nextLargerOrifice ? nextLargerOrifice.designation : 'or multiple valves'}) if margin is required for line losses or vendor certified capacity.`,
        });
      }
    }
  }

  const inletNozzleSizeIn = selectedOrifice?.nominalInletSizeIn ?? null;
  const outletNozzleSizeIn = selectedOrifice?.nominalOutletSizeIn ?? null;
  const nozzleSizeLabel =
    inletNozzleSizeIn && outletNozzleSizeIn
      ? `${inletNozzleSizeIn} × ${outletNozzleSizeIn}`
      : null;

  return {
    requiredAreaMm2,
    recommendedOrifice,
    nextLargerOrifice,
    selectedOrifice,
    inletNozzleSizeIn,
    outletNozzleSizeIn,
    nozzleSizeLabel,
    isOverride,
    overrideNote: trimmedNote,
    exceedsLargestStandard,
    areaMarginMm2,
    areaMarginPercent,
    utilisationPercent,
    validSelection,
    messages,
  };
}
