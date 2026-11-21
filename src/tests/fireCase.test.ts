import { describe, expect, it } from 'vitest';
import { calculateFireCaseAndSizePSV, calculateWettedArea } from '../calculations/fireCase';
import { DEFAULT_STANDARD_BASIS } from '../constants/defaultFactors';
import { FireCaseInput } from '../models/calculationTypes';

function makeBaseFireInput(): FireCaseInput {
  return {
    equipmentType: 'pressure_vessel',
    geometryType: 'horizontal_cylinder_heads',
    insulated: false,
    insulationCertified: false,
    environmentalFactorF: 1.0,
    environmentalFactorSource: 'STANDARD_LOOKUP',
    environmentalFactorBasis: 'Bare / Uninsulated Vessel (F = 1.00)',
    drainageQuality: 'prompt_drainage_firefighting',
    fireExposureLimitM: 7.62,
    diameterM: 2.0,
    tangentLengthM: 6.0,
    headType: '2:1_elliptical',
    normalLiquidLevelM: 1.0,
    relievingLiquidLevelM: 1.0,
    elevationAboveGradeM: 1.0,
    numberOfVessels: 1,
    userOverrideWettedArea: false,
    userWettedAreaM2: 0,
    setPressureKpaG: 900,
    fireOverpressurePercent: 21,
    backpressureKpaG: 50,
    atmosphericPressureKpaA: 101.325,
    relievingTemperatureK: 390,
    latentHeatKjKg: 320,
    vapourMw: 58.12,
    vapourZ: 0.88,
    vapourK: 1.12,
    kd: 0.975,
    kb: 1.0,
    kc: 1.0,
  };
}

describe('Fire Case Wetted Area, Heat Input & Vapour Generation', () => {
  it('computes partial wetted surface area (not total vessel area) respecting liquid level and fire limit', () => {
    const input = makeBaseFireInput();
    // Half-full horizontal vessel (D = 2.0, L = 6.0, level = 1.0m):
    // Shell wetted = (pi * 2.0 / 2) * 6.0 = 18.85 m2 + half of 2 elliptical heads (1.084 * D^2 = 4.336 m2)
    const wetted = calculateWettedArea(input);
    expect(wetted.shellWettedAreaM2).toBeCloseTo(Math.PI * 6.0, 2);
    expect(wetted.headWettedAreaM2).toBeCloseTo(1.084 * 2.0 * 2.0, 1);

    // Total surface area of full vessel would be ~46.4 m2; half-full wetted must be ~23.2 m2
    expect(wetted.totalWettedAreaM2).toBeLessThan(25);
  });

  it('computes API 521 heat input, vapour generation rate, and PSV required area', () => {
    const res = calculateFireCaseAndSizePSV(makeBaseFireInput(), DEFAULT_STANDARD_BASIS);
    expect(res.status === 'PASS' || res.status === 'PASS_WITH_WARNINGS').toBe(true);
    expect(res.heatInputKw).toBeGreaterThan(400);
    expect(res.vapourGenerationKgH).toBeCloseTo(
      (res.heatInputKw * 3600) / 320,
      1
    );
    expect(res.psvSizing?.requiredAreaMm2).toBeGreaterThan(0);
  });

  it('blocks unverified insulation credit as OUTSIDE_IMPLEMENTED_METHOD', () => {
    const unverified = calculateFireCaseAndSizePSV(
      {
        ...makeBaseFireInput(),
        insulated: true,
        insulationCertified: false,
        environmentalFactorF: 0.3,
      },
      DEFAULT_STANDARD_BASIS
    );
    expect(unverified.status).toBe('OUTSIDE_IMPLEMENTED_METHOD');
  });

  it('sums multiple equipment items (geometry and direct wetted area) and applies 10% piping allowance', () => {
    const base = makeBaseFireInput();
    const baseOnly = calculateWettedArea(base);

    const multiInput: FireCaseInput = {
      ...base,
      includePipingAllowance: true,
      pipingAllowancePercent: 10,
      additionalEquipment: [
        {
          id: 'eq-direct-1',
          tag: 'E-101',
          description: 'Kettle Reboiler (Direct Wetted Area)',
          enabled: true,
          entryMode: 'direct_area',
          geometryType: 'heat_exchanger_shell',
          diameterM: 1.0,
          tangentLengthM: 4.0,
          headType: '2:1_elliptical',
          relievingLiquidLevelM: 0.5,
          elevationAboveGradeM: 1.0,
          directWettedAreaM2: 12.5,
          quantity: 2,
        },
        {
          id: 'eq-geom-2',
          tag: 'V-102',
          description: 'Vertical Knock-Out Drum',
          enabled: true,
          entryMode: 'geometry',
          geometryType: 'vertical_cylinder_heads',
          diameterM: 1.0,
          tangentLengthM: 3.0,
          headType: 'flat',
          relievingLiquidLevelM: 2.0,
          elevationAboveGradeM: 0.5,
          directWettedAreaM2: 0,
          quantity: 1,
        },
        {
          id: 'eq-disabled',
          tag: 'V-103',
          description: 'Disabled Item',
          enabled: false,
          entryMode: 'direct_area',
          geometryType: 'vertical_cylinder_heads',
          diameterM: 1.0,
          tangentLengthM: 2.0,
          headType: 'flat',
          relievingLiquidLevelM: 1.0,
          elevationAboveGradeM: 0,
          directWettedAreaM2: 100,
          quantity: 1,
        },
      ],
    };

    const res = calculateFireCaseAndSizePSV(multiInput, DEFAULT_STANDARD_BASIS);
    expect(res.status === 'PASS' || res.status === 'PASS_WITH_WARNINGS').toBe(true);

    // E-101: 12.5 * 2 = 25.0 m2
    // V-102 (vertical flat bottom D=1, H=2): pi*0.5^2 + pi*1*2 = 2.25 * pi = 7.06858 m2
    const expectedExtraM2 = 25.0 + Math.PI * 0.25 + Math.PI * 1.0 * 2.0;
    const expectedSubtotalM2 = baseOnly.primaryWettedAreaM2 + expectedExtraM2;
    const expectedPipingM2 = expectedSubtotalM2 * 0.1;
    const expectedTotalM2 = expectedSubtotalM2 + expectedPipingM2;

    expect(res.additionalEquipmentWettedAreaM2).toBeCloseTo(expectedExtraM2, 3);
    expect(res.equipmentSubtotalWettedAreaM2).toBeCloseTo(expectedSubtotalM2, 3);
    expect(res.pipingAllowanceM2).toBeCloseTo(expectedPipingM2, 3);
    expect(res.totalWettedAreaM2).toBeCloseTo(expectedTotalM2, 3);
    expect(res.itemizedEquipment).toHaveLength(3); // Primary + E-101 + V-102 (disabled excluded)
  });

  it('validates invalid additional equipment wetted area and liquid levels', () => {
    const invalidInput: FireCaseInput = {
      ...makeBaseFireInput(),
      includePipingAllowance: true,
      pipingAllowancePercent: -5,
      additionalEquipment: [
        {
          id: 'bad-1',
          tag: 'E-BAD',
          description: 'Negative area',
          enabled: true,
          entryMode: 'direct_area',
          geometryType: 'heat_exchanger_shell',
          diameterM: 1.0,
          tangentLengthM: 3.0,
          headType: '2:1_elliptical',
          relievingLiquidLevelM: 0.5,
          elevationAboveGradeM: 0.5,
          directWettedAreaM2: -4,
          quantity: 1,
        },
      ],
    };

    const res = calculateFireCaseAndSizePSV(invalidInput, DEFAULT_STANDARD_BASIS);
    expect(res.messages.some((m) => m.severity === 'ERROR' && m.id === 'fire-piping-pct')).toBe(true);
    expect(res.messages.some((m) => m.severity === 'ERROR' && m.id === 'fire-extra-area-bad-1')).toBe(true);
  });
});
