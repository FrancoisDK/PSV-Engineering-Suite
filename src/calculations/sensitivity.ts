import {
  FireCaseInput,
  GasPSVInput,
  LiquidPSVInput,
  StandardReferenceBasis,
  VapourBreakthroughInput,
} from '../models/calculationTypes';
import { calculateFireCaseAndSizePSV } from './fireCase';
import { sizeGasPSV } from './gasSizing';
import { sizeLiquidPSV } from './liquidSizing';
import { calculateBreakthroughAndSizePSV } from './vapourBreakthrough';

export type SensitivityModule = 'gas' | 'liquid' | 'breakthrough' | 'fire';

export type SensitivityVariableKey =
  | 'relievingPressure'
  | 'backpressure'
  | 'relievingTemperature'
  | 'molecularWeight'
  | 'compressibilityZ'
  | 'requiredFlow'
  | 'kd'
  | 'kbOrKw'
  | 'kv'
  | 'fireEnvironmentalFactor'
  | 'wettedArea'
  | 'latentHeat';

export interface SensitivityPoint {
  stepLabel: string;
  variableValue: number;
  requiredAreaMm2: number | null;
  capacityMarginPercent: number | null;
  percentChangeFromBase: number;
}

export function getSensitivityVariablesForModule(
  module: SensitivityModule
): { key: SensitivityVariableKey; label: string; unitHint: string }[] {
  switch (module) {
    case 'gas':
      return [
        { key: 'requiredFlow', label: 'Required Relieving Flow', unitHint: 'mass/vol input' },
        { key: 'relievingPressure', label: 'Set / Relieving Pressure', unitHint: 'kPa(g)' },
        { key: 'backpressure', label: 'Total Backpressure', unitHint: 'kPa(g)' },
        { key: 'relievingTemperature', label: 'Relieving Temperature', unitHint: 'K' },
        { key: 'molecularWeight', label: 'Molecular Weight', unitHint: 'kg/kmol' },
        { key: 'compressibilityZ', label: 'Compressibility Factor Z', unitHint: '-' },
        { key: 'kd', label: 'Discharge Coefficient Kd', unitHint: '-' },
        { key: 'kbOrKw', label: 'Backpressure Factor Kb', unitHint: '-' },
      ];
    case 'liquid':
      return [
        { key: 'requiredFlow', label: 'Required Flow Rate', unitHint: 'm³/h or kg/h' },
        { key: 'relievingPressure', label: 'Upstream Relieving Pressure', unitHint: 'kPa(g)' },
        { key: 'backpressure', label: 'Total Backpressure', unitHint: 'kPa(g)' },
        { key: 'kd', label: 'Discharge Coefficient Kd', unitHint: '-' },
        { key: 'kbOrKw', label: 'Backpressure Factor Kw', unitHint: '-' },
        { key: 'kv', label: 'Manual Viscosity Factor Kv', unitHint: '-' },
      ];
    case 'breakthrough':
      return [
        { key: 'relievingPressure', label: 'HP Source Pressure', unitHint: 'kPa(g)' },
        { key: 'backpressure', label: 'LP Destination Relieving Pressure', unitHint: 'kPa(g)' },
        { key: 'relievingTemperature', label: 'Source Temperature', unitHint: 'K' },
        { key: 'molecularWeight', label: 'Source Molecular Weight', unitHint: 'kg/kmol' },
        { key: 'compressibilityZ', label: 'Source Compressibility Z', unitHint: '-' },
        { key: 'kd', label: 'Destination PSV Kd', unitHint: '-' },
      ];
    case 'fire':
      return [
        { key: 'fireEnvironmentalFactor', label: 'Environmental Factor F', unitHint: '-' },
        { key: 'wettedArea', label: 'Wetted Surface Area', unitHint: 'm²' },
        { key: 'latentHeat', label: 'Latent Heat ΔH_vap', unitHint: 'kJ/kg' },
        { key: 'relievingPressure', label: 'Set Pressure', unitHint: 'kPa(g)' },
        { key: 'backpressure', label: 'Total Backpressure', unitHint: 'kPa(g)' },
        { key: 'molecularWeight', label: 'Vapour Molecular Weight', unitHint: 'kg/kmol' },
        { key: 'kd', label: 'PSV Kd', unitHint: '-' },
      ];
  }
}

export function runSensitivityAnalysis(
  module: SensitivityModule,
  variable: SensitivityVariableKey,
  spanPercent: number,
  steps: number,
  inputs: {
    gas: GasPSVInput;
    liquid: LiquidPSVInput;
    breakthrough: VapourBreakthroughInput;
    fire: FireCaseInput;
  },
  standardBasis: StandardReferenceBasis,
  fireBaseWettedAreaM2?: number
): SensitivityPoint[] {
  const safeSteps = Math.max(5, Math.min(31, steps));
  const points: SensitivityPoint[] = [];

  for (let i = 0; i < safeSteps; i++) {
    const frac = -spanPercent / 100 + ((2 * spanPercent) / 100) * (i / (safeSteps - 1));
    const mult = 1 + frac;
    if (mult <= 0.01) continue;

    let varVal = 0;
    let reqArea: number | null = null;
    let marginPct: number | null = null;

    if (module === 'gas') {
      const g = { ...inputs.gas };
      if (variable === 'requiredFlow') {
        g.requiredFlowValue = g.requiredFlowValue * mult;
        varVal = g.requiredFlowValue;
      } else if (variable === 'relievingPressure') {
        g.setPressureKpaG = g.setPressureKpaG * mult;
        varVal = g.setPressureKpaG;
      } else if (variable === 'backpressure') {
        g.totalBackpressureKpaG = Math.max(0, g.totalBackpressureKpaG * mult);
        varVal = g.totalBackpressureKpaG;
      } else if (variable === 'relievingTemperature') {
        g.relievingTemperatureK = g.relievingTemperatureK * mult;
        varVal = g.relievingTemperatureK;
      } else if (variable === 'molecularWeight') {
        g.molecularWeight = g.molecularWeight * mult;
        varVal = g.molecularWeight;
      } else if (variable === 'compressibilityZ') {
        g.compressibilityZ = g.compressibilityZ * mult;
        varVal = g.compressibilityZ;
      } else if (variable === 'kd') {
        g.kd = Math.min(1.0, Math.max(0.1, g.kd * mult));
        varVal = g.kd;
      } else if (variable === 'kbOrKw') {
        g.kb = Math.min(1.0, Math.max(0.1, g.kb * mult));
        varVal = g.kb;
      }
      const res = sizeGasPSV(g, standardBasis);
      reqArea = res.requiredAreaMm2;
      marginPct = res.orificeSelection?.areaMarginPercent ?? null;
    } else if (module === 'liquid') {
      const l = { ...inputs.liquid };
      if (variable === 'requiredFlow') {
        if (l.primaryFlowBasis === 'mass') {
          l.requiredMassFlowKgH = l.requiredMassFlowKgH * mult;
          varVal = l.requiredMassFlowKgH;
        } else {
          l.requiredVolFlowM3H = l.requiredVolFlowM3H * mult;
          varVal = l.requiredVolFlowM3H;
        }
      } else if (variable === 'relievingPressure') {
        l.upstreamPressureKpaG = l.upstreamPressureKpaG * mult;
        varVal = l.upstreamPressureKpaG;
      } else if (variable === 'backpressure') {
        l.totalBackpressureKpaG = Math.max(0, l.totalBackpressureKpaG * mult);
        varVal = l.totalBackpressureKpaG;
      } else if (variable === 'kd') {
        l.kd = Math.min(1.0, Math.max(0.1, l.kd * mult));
        varVal = l.kd;
      } else if (variable === 'kbOrKw') {
        l.kw = Math.min(1.0, Math.max(0.1, l.kw * mult));
        varVal = l.kw;
      } else if (variable === 'kv') {
        l.useIterativeKv = false;
        l.manualKv = Math.min(1.0, Math.max(0.1, l.manualKv * mult));
        varVal = l.manualKv;
      }
      const res = sizeLiquidPSV(l, standardBasis);
      reqArea = res.requiredAreaMm2;
      marginPct = res.orificeSelection?.areaMarginPercent ?? null;
    } else if (module === 'breakthrough') {
      const b = { ...inputs.breakthrough };
      if (variable === 'relievingPressure') {
        b.sourcePressureKpaG = b.sourcePressureKpaG * mult;
        varVal = b.sourcePressureKpaG;
      } else if (variable === 'backpressure') {
        b.destinationRelievingPressureKpaG = b.destinationRelievingPressureKpaG * mult;
        varVal = b.destinationRelievingPressureKpaG;
      } else if (variable === 'relievingTemperature') {
        b.sourceTemperatureK = b.sourceTemperatureK * mult;
        varVal = b.sourceTemperatureK;
      } else if (variable === 'molecularWeight') {
        b.sourceMw = b.sourceMw * mult;
        varVal = b.sourceMw;
      } else if (variable === 'compressibilityZ') {
        b.sourceZ = b.sourceZ * mult;
        varVal = b.sourceZ;
      } else if (variable === 'kd') {
        b.psvKd = Math.min(1.0, Math.max(0.1, b.psvKd * mult));
        varVal = b.psvKd;
      }
      const res = calculateBreakthroughAndSizePSV(b, standardBasis);
      reqArea = res.psvSizing?.requiredAreaMm2 ?? null;
      marginPct = res.psvSizing?.orificeSelection?.areaMarginPercent ?? null;
    } else if (module === 'fire') {
      const f = { ...inputs.fire };
      if (variable === 'fireEnvironmentalFactor') {
        f.environmentalFactorF = Math.min(1.2, Math.max(0.05, f.environmentalFactorF * mult));
        varVal = f.environmentalFactorF;
      } else if (variable === 'wettedArea') {
        const baseArea = fireBaseWettedAreaM2 && fireBaseWettedAreaM2 > 0 ? fireBaseWettedAreaM2 : 20;
        f.userOverrideWettedArea = true;
        f.numberOfVessels = 1;
        f.additionalEquipment = [];
        f.includePipingAllowance = false;
        f.userWettedAreaM2 = baseArea * mult;
        varVal = f.userWettedAreaM2;
      } else if (variable === 'latentHeat') {
        f.latentHeatKjKg = f.latentHeatKjKg * mult;
        varVal = f.latentHeatKjKg;
      } else if (variable === 'relievingPressure') {
        f.setPressureKpaG = f.setPressureKpaG * mult;
        varVal = f.setPressureKpaG;
      } else if (variable === 'backpressure') {
        f.backpressureKpaG = Math.max(0, f.backpressureKpaG * mult);
        varVal = f.backpressureKpaG;
      } else if (variable === 'molecularWeight') {
        f.vapourMw = f.vapourMw * mult;
        varVal = f.vapourMw;
      } else if (variable === 'kd') {
        f.kd = Math.min(1.0, Math.max(0.1, f.kd * mult));
        varVal = f.kd;
      }
      const res = calculateFireCaseAndSizePSV(f, standardBasis);
      reqArea = res.psvSizing?.requiredAreaMm2 ?? null;
      marginPct = res.psvSizing?.orificeSelection?.areaMarginPercent ?? null;
    }

    points.push({
      stepLabel: `${frac >= 0 ? '+' : ''}${(frac * 100).toFixed(0)}%`,
      variableValue: Number(varVal.toFixed(3)),
      requiredAreaMm2: reqArea !== null ? Number(reqArea.toFixed(2)) : null,
      capacityMarginPercent: marginPct !== null ? Number(marginPct.toFixed(2)) : null,
      percentChangeFromBase: Number((frac * 100).toFixed(1)),
    });
  }

  return points;
}
