import { UNIVERSAL_GAS_CONSTANT_J_KMOL_K } from '../constants/defaultFactors';
import {
  AreaUnit,
  DeltaPressureUnit,
  DensityUnit,
  GasLoadInputMode,
  HeatRateUnit,
  LatentHeatUnit,
  LengthUnit,
  LiquidVolFlowUnit,
  MassFlowUnit,
  PressureUnit,
  StandardRefConditions,
  TemperatureUnit,
  ViscosityUnit,
} from '../models/calculationTypes';

// Exact conversion constants
export const PSI_TO_KPA = 6.894757293168361;
export const BAR_TO_KPA = 100.0;
export const MPA_TO_KPA = 1000.0;
export const LB_TO_KG = 0.45359237;
export const IN_TO_M = 0.0254;
export const FT_TO_M = 0.3048;
export const IN2_TO_MM2 = 645.16;
export const US_GALLON_TO_M3 = 0.003785411784;
export const FT3_TO_M3 = 0.028316846592;
export const LB_FT3_TO_KG_M3 = LB_TO_KG / FT3_TO_M3; // 16.01846337396
export const BTU_TO_KJ = 1.05505585262;
export const BTU_H_TO_KW = BTU_TO_KJ / 3600; // 0.00029307107
export const BTU_LB_TO_KJ_KG = BTU_TO_KJ / LB_TO_KG; // 2.326

export function isGaugePressureUnit(unit: PressureUnit): boolean {
  return (
    unit === 'kPa(g)' ||
    unit === 'bar(g)' ||
    unit === 'MPa(g)' ||
    unit === 'psig'
  );
}

/**
 * Converts a pressure reading in gauge or absolute units into internal kPa(a).
 * Atmospheric pressure must be supplied explicitly; never silently assumed.
 */
export function pressureToKpaAbs(
  value: number,
  unit: PressureUnit,
  atmosphericKpaA: number
): number {
  switch (unit) {
    case 'kPa(a)':
    case 'kPa':
      return value;
    case 'kPa(g)':
      return value + atmosphericKpaA;
    case 'bar(a)':
      return value * BAR_TO_KPA;
    case 'bar(g)':
      return value * BAR_TO_KPA + atmosphericKpaA;
    case 'MPa(a)':
    case 'MPa':
      return value * MPA_TO_KPA;
    case 'MPa(g)':
      return value * MPA_TO_KPA + atmosphericKpaA;
    case 'psia':
      return value * PSI_TO_KPA;
    case 'psig':
      return value * PSI_TO_KPA + atmosphericKpaA;
  }
}

/**
 * Converts an internal kPa(a) pressure into display gauge or absolute units.
 */
export function kpaAbsToPressure(
  kpaAbs: number,
  unit: PressureUnit,
  atmosphericKpaA: number
): number {
  switch (unit) {
    case 'kPa(a)':
    case 'kPa':
      return kpaAbs;
    case 'kPa(g)':
      return kpaAbs - atmosphericKpaA;
    case 'bar(a)':
      return kpaAbs / BAR_TO_KPA;
    case 'bar(g)':
      return (kpaAbs - atmosphericKpaA) / BAR_TO_KPA;
    case 'MPa(a)':
    case 'MPa':
      return kpaAbs / MPA_TO_KPA;
    case 'MPa(g)':
      return (kpaAbs - atmosphericKpaA) / MPA_TO_KPA;
    case 'psia':
      return kpaAbs / PSI_TO_KPA;
    case 'psig':
      return (kpaAbs - atmosphericKpaA) / PSI_TO_KPA;
  }
}

export function deltaPressureToKpa(value: number, unit: DeltaPressureUnit): number {
  switch (unit) {
    case 'kPa':
      return value;
    case 'bar':
      return value * BAR_TO_KPA;
    case 'MPa':
      return value * MPA_TO_KPA;
    case 'psi':
      return value * PSI_TO_KPA;
  }
}

export function kpaToDeltaPressure(kpa: number, unit: DeltaPressureUnit): number {
  switch (unit) {
    case 'kPa':
      return kpa;
    case 'bar':
      return kpa / BAR_TO_KPA;
    case 'MPa':
      return kpa / MPA_TO_KPA;
    case 'psi':
      return kpa / PSI_TO_KPA;
  }
}

export function tempToKelvin(value: number, unit: TemperatureUnit): number {
  switch (unit) {
    case 'K':
      return value;
    case 'C':
      return value + 273.15;
    case 'R':
      return value * (5 / 9);
    case 'F':
      return (value - 32) * (5 / 9) + 273.15;
  }
}

export function kelvinToTemp(kelvin: number, unit: TemperatureUnit): number {
  switch (unit) {
    case 'K':
      return kelvin;
    case 'C':
      return kelvin - 273.15;
    case 'R':
      return kelvin * 1.8;
    case 'F':
      return (kelvin - 273.15) * 1.8 + 32;
  }
}

export function massFlowToKgH(value: number, unit: MassFlowUnit): number {
  switch (unit) {
    case 'kg/h':
      return value;
    case 'kg/s':
      return value * 3600;
    case 'lb/h':
      return value * LB_TO_KG;
  }
}

export function kgHToMassFlow(kgH: number, unit: MassFlowUnit): number {
  switch (unit) {
    case 'kg/h':
      return kgH;
    case 'kg/s':
      return kgH / 3600;
    case 'lb/h':
      return kgH / LB_TO_KG;
  }
}

export function volFlowToM3H(value: number, unit: LiquidVolFlowUnit): number {
  switch (unit) {
    case 'm3/h':
      return value;
    case 'US gpm':
      return value * US_GALLON_TO_M3 * 60;
    case 'ft3/min':
      return value * FT3_TO_M3 * 60;
  }
}

export function m3HToVolFlow(m3H: number, unit: LiquidVolFlowUnit): number {
  switch (unit) {
    case 'm3/h':
      return m3H;
    case 'US gpm':
      return m3H / (US_GALLON_TO_M3 * 60);
    case 'ft3/min':
      return m3H / (FT3_TO_M3 * 60);
  }
}

/**
 * Converts a gas/vapour flow input (mass, standard volumetric, or actual volumetric)
 * into mass flow [kg/h].
 * Requires explicit reference conditions for standard volumetric modes.
 */
export function gasLoadToMassFlowKgH(
  value: number,
  mode: GasLoadInputMode,
  molecularWeight: number,
  refConditions: StandardRefConditions,
  relievingDensityKgM3?: number
): { massFlowKgH: number | null; error?: string } {
  if (!Number.isFinite(value)) {
    return { massFlowKgH: null, error: 'Flow rate must be a finite number.' };
  }
  switch (mode) {
    case 'kg/h':
      return { massFlowKgH: value };
    case 'kg/s':
      return { massFlowKgH: value * 3600 };
    case 'lb/h':
      return { massFlowKgH: value * LB_TO_KG };
    case 'actual m3/h': {
      if (!relievingDensityKgM3 || relievingDensityKgM3 <= 0) {
        return {
          massFlowKgH: null,
          error: 'Relieving density (> 0) is required to convert actual m³/h to mass flow.',
        };
      }
      return { massFlowKgH: value * relievingDensityKgM3 };
    }
    case 'Nm3/h':
    case 'Sm3/h':
    case 'SCFM': {
      if (molecularWeight <= 0) {
        return {
          massFlowKgH: null,
          error: 'Positive molecular weight is required to convert standard volumetric flow to mass flow.',
        };
      }
      if (refConditions.tempK <= 0 || refConditions.pressureKpaA <= 0 || refConditions.zRef <= 0) {
        return {
          massFlowKgH: null,
          error: 'Valid reference temperature, pressure, and Z_ref (> 0) are required.',
        };
      }
      const volM3H = mode === 'SCFM' ? value * FT3_TO_M3 * 60 : value;
      // Ideal/real gas law: rho_ref [kg/m3] = (P_ref [Pa] * MW) / (Z_ref * R_u * T_ref)
      const pRefPa = refConditions.pressureKpaA * 1000;
      const rhoRef =
        (pRefPa * molecularWeight) /
        (refConditions.zRef * UNIVERSAL_GAS_CONSTANT_J_KMOL_K * refConditions.tempK);
      return { massFlowKgH: volM3H * rhoRef };
    }
  }
}

export function massFlowKgHToStandardVolM3H(
  massFlowKgH: number,
  molecularWeight: number,
  refConditions: StandardRefConditions
): number | null {
  if (
    molecularWeight <= 0 ||
    refConditions.tempK <= 0 ||
    refConditions.pressureKpaA <= 0 ||
    refConditions.zRef <= 0
  ) {
    return null;
  }
  const pRefPa = refConditions.pressureKpaA * 1000;
  const rhoRef =
    (pRefPa * molecularWeight) /
    (refConditions.zRef * UNIVERSAL_GAS_CONSTANT_J_KMOL_K * refConditions.tempK);
  return massFlowKgH / rhoRef;
}

export function areaToMm2(value: number, unit: AreaUnit): number {
  switch (unit) {
    case 'mm2':
      return value;
    case 'cm2':
      return value * 100;
    case 'in2':
      return value * IN2_TO_MM2;
  }
}

export function mm2ToArea(mm2: number, unit: AreaUnit): number {
  switch (unit) {
    case 'mm2':
      return mm2;
    case 'cm2':
      return mm2 / 100;
    case 'in2':
      return mm2 / IN2_TO_MM2;
  }
}

export function densityToKgM3(value: number, unit: DensityUnit): number {
  switch (unit) {
    case 'kg/m3':
      return value;
    case 'lb/ft3':
      return value * LB_FT3_TO_KG_M3;
  }
}

export function kgM3ToDensity(kgM3: number, unit: DensityUnit): number {
  switch (unit) {
    case 'kg/m3':
      return kgM3;
    case 'lb/ft3':
      return kgM3 / LB_FT3_TO_KG_M3;
  }
}

export function viscosityToCp(value: number, unit: ViscosityUnit): number {
  switch (unit) {
    case 'cP':
      return value;
    case 'Pa·s':
      return value * 1000;
  }
}

export function cpToViscosity(cp: number, unit: ViscosityUnit): number {
  switch (unit) {
    case 'cP':
      return cp;
    case 'Pa·s':
      return cp / 1000;
  }
}

export function lengthToMeters(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'm':
      return value;
    case 'mm':
      return value / 1000;
    case 'in':
      return value * IN_TO_M;
    case 'ft':
      return value * FT_TO_M;
  }
}

export function metersToLength(meters: number, unit: LengthUnit): number {
  switch (unit) {
    case 'm':
      return meters;
    case 'mm':
      return meters * 1000;
    case 'in':
      return meters / IN_TO_M;
    case 'ft':
      return meters / FT_TO_M;
  }
}

export function heatRateToKw(value: number, unit: HeatRateUnit): number {
  switch (unit) {
    case 'kW':
      return value;
    case 'MJ/h':
      return value / 3.6;
    case 'Btu/h':
      return value * BTU_H_TO_KW;
  }
}

export function kwToHeatRate(kw: number, unit: HeatRateUnit): number {
  switch (unit) {
    case 'kW':
      return kw;
    case 'MJ/h':
      return kw * 3.6;
    case 'Btu/h':
      return kw / BTU_H_TO_KW;
  }
}

export function latentHeatToKjKg(value: number, unit: LatentHeatUnit): number {
  switch (unit) {
    case 'kJ/kg':
      return value;
    case 'Btu/lb':
      return value * BTU_LB_TO_KJ_KG;
  }
}

export function kjKgToLatentHeat(kjKg: number, unit: LatentHeatUnit): number {
  switch (unit) {
    case 'kJ/kg':
      return kjKg;
    case 'Btu/lb':
      return kjKg / BTU_LB_TO_KJ_KG;
  }
}
