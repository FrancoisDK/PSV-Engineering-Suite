import { describe, expect, it } from 'vitest';
import { sizeLiquidPSV } from '../calculations/liquidSizing';
import { DEFAULT_STANDARD_BASIS } from '../constants/defaultFactors';
import { LiquidPSVInput } from '../models/calculationTypes';

function makeBaseLiquidInput(): LiquidPSVInput {
  return {
    fluidName: 'Glycol Solution',
    primaryFlowBasis: 'volumetric',
    requiredMassFlowKgH: 45000,
    requiredVolFlowM3H: 40,
    densityKgM3: 1125,
    dynamicViscosityCp: 60,
    vapourPressureKpaA: 2,
    relievingTemperatureK: 315,
    upstreamPressureKpaG: 1200,
    totalBackpressureKpaG: 50,
    atmosphericPressureKpaA: 101.325,
    kd: 0.65,
    kw: 1.0,
    kc: 1.0,
    useIterativeKv: true,
    manualKv: 1.0,
    flashingOrTwoPhaseFlag: false,
    nonNewtonianFlag: false,
  };
}

describe('Liquid PSV Sizing & Viscosity Iteration', () => {
  it('converges viscosity correction Kv iteration and produces larger corrected area than provisional area', () => {
    const res = sizeLiquidPSV(makeBaseLiquidInput(), DEFAULT_STANDARD_BASIS);
    expect(res.status === 'PASS' || res.status === 'PASS_WITH_WARNINGS').toBe(true);
    expect(res.converged).toBe(true);
    expect(res.iterationCount).toBeGreaterThanOrEqual(2);
    expect(res.kvFinal!).toBeLessThan(1.0);
    expect(res.requiredAreaMm2!).toBeGreaterThan(res.preliminaryAreaMm2!);
    expect(res.orificeSelection?.selectedOrifice?.effectiveAreaMm2).toBeGreaterThanOrEqual(
      res.requiredAreaMm2!
    );
  });

  it('blocks single-phase liquid sizing and marks OUTSIDE_IMPLEMENTED_METHOD when flashing occurs', () => {
    const flashingRes = sizeLiquidPSV(
      { ...makeBaseLiquidInput(), vapourPressureKpaA: 250 }, // > P2 = 151.325 kPa(a)
      DEFAULT_STANDARD_BASIS
    );
    expect(flashingRes.status).toBe('OUTSIDE_IMPLEMENTED_METHOD');
    expect(flashingRes.requiredAreaMm2).toBeNull();
    expect(
      flashingRes.messages.some((m) =>
        m.message.includes('OUTSIDE IMPLEMENTED METHOD')
      )
    ).toBe(true);
  });
});
