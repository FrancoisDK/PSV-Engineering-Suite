import { describe, expect, it } from 'vitest';
import { sizeGasPSV } from '../calculations/gasSizing';
import { selectApiOrifice } from '../calculations/orificeSelection';
import { DEFAULT_STANDARD_BASIS, STANDARD_REF_CONDITION_PRESETS } from '../constants/defaultFactors';
import { GasPSVInput } from '../models/calculationTypes';

function makeBaseGasInput(): GasPSVInput {
  return {
    fluidName: 'Natural Gas',
    compositionDescription: 'Light hydrocarbons',
    molecularWeight: 20,
    compressibilityZ: 0.95,
    isentropicK: 1.3,
    relievingTemperatureK: 320,
    loadInputMode: 'kg/h',
    requiredFlowValue: 10000,
    standardRefConditions: { ...STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)'] },
    setPressureKpaG: 1000,
    overpressurePercent: 10,
    totalBackpressureKpaG: 50,
    atmosphericPressureKpaA: 101.325,
    kd: 0.975,
    kb: 1.0,
    kc: 1.0,
    valveType: 'conventional',
    outsideScopeFlag: false,
  };
}

describe('Gas PSV Sizing & API Orifice Selection', () => {
  it('computes critical pressure ratio and classifies critical vs subcritical flow correctly', () => {
    // k = 1.3 -> rc = (2/2.3)^(1.3/0.3) = 0.54573
    const criticalRes = sizeGasPSV(makeBaseGasInput(), DEFAULT_STANDARD_BASIS);
    expect(criticalRes.criticalPressureRatio).toBeCloseTo(0.54573, 4);
    expect(criticalRes.flowRegime).toBe('CRITICAL');
    expect(criticalRes.requiredAreaMm2).toBeGreaterThan(0);

    // High backpressure -> P2/P1 > rc -> SUBCRITICAL
    const subInput = {
      ...makeBaseGasInput(),
      totalBackpressureKpaG: 800, // P2 = 901.325, P1 = 1201.325, ratio = 0.7503 > 0.5457
    };
    const subRes = sizeGasPSV(subInput, DEFAULT_STANDARD_BASIS);
    expect(subRes.flowRegime).toBe('SUBCRITICAL');
    expect(subRes.subcriticalF2).not.toBeNull();
    expect(subRes.requiredAreaMm2!).toBeGreaterThan(criticalRes.requiredAreaMm2!);
  });

  it('selects smallest standard API 526 orifice >= required area and errors if exceeding T', () => {
    const sel = selectApiOrifice(400);
    expect(sel.recommendedOrifice?.designation).toBe('H'); // H = 506.45 mm2, G = 324.52 mm2
    expect(sel.validSelection).toBe(true);
    expect(sel.selectedOrifice!.effectiveAreaMm2).toBeGreaterThanOrEqual(400);

    const tooLarge = selectApiOrifice(25000);
    expect(tooLarge.exceedsLargestStandard).toBe(true);
    expect(tooLarge.recommendedOrifice).toBeNull();
    expect(tooLarge.selectedOrifice).toBeNull();
    expect(tooLarge.validSelection).toBe(false);
    expect(tooLarge.messages.some((m) => m.severity === 'ERROR')).toBe(true);
  });

  it('rejects invalid inputs such as backpressure >= upstream pressure or k <= 1', () => {
    const badBp = sizeGasPSV(
      { ...makeBaseGasInput(), totalBackpressureKpaG: 1200 },
      DEFAULT_STANDARD_BASIS
    );
    expect(badBp.status).toBe('INCOMPLETE');
    expect(badBp.requiredAreaMm2).toBeNull();

    const badK = sizeGasPSV(
      { ...makeBaseGasInput(), isentropicK: 1.0 },
      DEFAULT_STANDARD_BASIS
    );
    expect(badK.status).toBe('INCOMPLETE');
    expect(badK.messages.some((m) => m.severity === 'ERROR')).toBe(true);
  });
});
