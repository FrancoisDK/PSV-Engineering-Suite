import { describe, expect, it } from 'vitest';
import {
  areaToMm2,
  gasLoadToMassFlowKgH,
  kelvinToTemp,
  kgHToMassFlow,
  kpaAbsToPressure,
  massFlowToKgH,
  mm2ToArea,
  pressureToKpaAbs,
  tempToKelvin,
} from '../calculations/unitConversions';
import { STANDARD_REF_CONDITION_PRESETS } from '../constants/defaultFactors';

describe('Unit Conversions', () => {
  it('converts gauge and absolute pressures accurately using explicit atmospheric pressure', () => {
    const atm = 101.325;
    // 1000 kPa(g) -> 1101.325 kPa(a)
    expect(pressureToKpaAbs(1000, 'kPa(g)', atm)).toBeCloseTo(1101.325, 4);
    expect(kpaAbsToPressure(1101.325, 'kPa(g)', atm)).toBeCloseTo(1000, 4);

    // 10 bar(g) -> 1101.325 kPa(a)
    expect(pressureToKpaAbs(10, 'bar(g)', atm)).toBeCloseTo(1101.325, 4);
    expect(kpaAbsToPressure(1101.325, 'bar(g)', atm)).toBeCloseTo(10, 4);

    // 145.0377 psig -> ~1000 kPa(g) -> ~1101.325 kPa(a)
    const kpaFromPsig = pressureToKpaAbs(145.0377, 'psig', atm);
    expect(kpaFromPsig).toBeCloseTo(1101.325, 2);
    expect(kpaAbsToPressure(kpaFromPsig, 'psig', atm)).toBeCloseTo(145.0377, 4);

    // Absolute conversions preserve value without adding atm
    expect(pressureToKpaAbs(200, 'psia', atm)).toBeCloseTo(1378.951, 2);
    expect(kpaAbsToPressure(1378.95146, 'psia', atm)).toBeCloseTo(200, 3);
  });

  it('converts temperatures across C, K, F, and R without drift', () => {
    expect(tempToKelvin(100, 'C')).toBeCloseTo(373.15, 4);
    expect(kelvinToTemp(373.15, 'C')).toBeCloseTo(100, 4);
    expect(tempToKelvin(212, 'F')).toBeCloseTo(373.15, 4);
    expect(kelvinToTemp(373.15, 'F')).toBeCloseTo(212, 4);
    expect(tempToKelvin(671.67, 'R')).toBeCloseTo(373.15, 4);
    expect(kelvinToTemp(373.15, 'R')).toBeCloseTo(671.67, 4);
  });

  it('converts areas across mm2, cm2, and in2', () => {
    expect(areaToMm2(1, 'in2')).toBeCloseTo(645.16, 4);
    expect(mm2ToArea(645.16, 'in2')).toBeCloseTo(1, 5);
    expect(areaToMm2(5, 'cm2')).toBeCloseTo(500, 5);
    expect(mm2ToArea(500, 'cm2')).toBeCloseTo(5, 5);
  });

  it('converts mass flows and preserves physical values across unit switches', () => {
    const kgH = 10000;
    const lbH = kgHToMassFlow(kgH, 'lb/h');
    expect(lbH).toBeCloseTo(22046.226, 2);
    // Switching back recovers original physical value
    expect(massFlowToKgH(lbH, 'lb/h')).toBeCloseTo(kgH, 5);

    const kgS = kgHToMassFlow(kgH, 'kg/s');
    expect(kgS).toBeCloseTo(2.77778, 4);
    expect(massFlowToKgH(kgS, 'kg/s')).toBeCloseTo(kgH, 5);
  });

  it('converts standard volumetric gas flow using explicit reference conditions', () => {
    const ref = STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)'];
    const res = gasLoadToMassFlowKgH(1000, 'Nm3/h', 28.013, ref);
    // Molar volume at 0 C, 101.325 kPa = 22.414 m3/kmol => 1000/22.414 * 28.013 = ~1249.8 kg/h
    expect(res.massFlowKgH).toBeCloseTo(1249.8, 0);
  });
});
