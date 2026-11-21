import { UnitPreferences, UnitSystem } from '../models/calculationTypes';

export const DEFAULT_UNIT_PREFERENCES: Record<UnitSystem, UnitPreferences> = {
  SI: {
    pressure: 'kPa(g)',
    deltaPressure: 'kPa',
    temperature: 'C',
    massFlow: 'kg/h',
    liquidVolFlow: 'm3/h',
    area: 'mm2',
    density: 'kg/m3',
    viscosity: 'cP',
    length: 'm',
    heatRate: 'kW',
    latentHeat: 'kJ/kg',
  },
  US: {
    pressure: 'psig',
    deltaPressure: 'psi',
    temperature: 'F',
    massFlow: 'lb/h',
    liquidVolFlow: 'US gpm',
    area: 'in2',
    density: 'lb/ft3',
    viscosity: 'cP',
    length: 'ft',
    heatRate: 'Btu/h',
    latentHeat: 'Btu/lb',
  },
};

export const PRESSURE_UNIT_LABELS: Record<string, { label: string; isGauge: boolean }> = {
  'kPa(g)': { label: 'kPa(g) [Gauge]', isGauge: true },
  'kPa(a)': { label: 'kPa(a) [Absolute]', isGauge: false },
  'kPa': { label: 'kPa [Differential]', isGauge: false },
  'bar(g)': { label: 'bar(g) [Gauge]', isGauge: true },
  'bar(a)': { label: 'bar(a) [Absolute]', isGauge: false },
  'MPa(g)': { label: 'MPa(g) [Gauge]', isGauge: true },
  'MPa(a)': { label: 'MPa(a) [Absolute]', isGauge: false },
  'MPa': { label: 'MPa [Differential]', isGauge: false },
  'psig': { label: 'psig [Gauge]', isGauge: true },
  'psia': { label: 'psia [Absolute]', isGauge: false },
};

export const TEMPERATURE_UNITS = [
  { value: 'C', label: '°C' },
  { value: 'K', label: 'K' },
  { value: 'F', label: '°F' },
  { value: 'R', label: '°R' },
] as const;

export const MASS_FLOW_UNITS = [
  { value: 'kg/h', label: 'kg/h' },
  { value: 'kg/s', label: 'kg/s' },
  { value: 'lb/h', label: 'lb/h' },
] as const;

export const LIQUID_VOL_FLOW_UNITS = [
  { value: 'm3/h', label: 'm³/h' },
  { value: 'US gpm', label: 'US gpm' },
  { value: 'ft3/min', label: 'ft³/min' },
] as const;

export const AREA_UNITS = [
  { value: 'mm2', label: 'mm²' },
  { value: 'cm2', label: 'cm²' },
  { value: 'in2', label: 'in²' },
] as const;

export const DENSITY_UNITS = [
  { value: 'kg/m3', label: 'kg/m³' },
  { value: 'lb/ft3', label: 'lb/ft³' },
] as const;

export const VISCOSITY_UNITS = [
  { value: 'cP', label: 'cP' },
  { value: 'Pa·s', label: 'Pa·s' },
] as const;

export const LENGTH_UNITS = [
  { value: 'mm', label: 'mm' },
  { value: 'm', label: 'm' },
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
] as const;

export const HEAT_RATE_UNITS = [
  { value: 'kW', label: 'kW' },
  { value: 'MJ/h', label: 'MJ/h' },
  { value: 'Btu/h', label: 'Btu/h' },
] as const;

export const LATENT_HEAT_UNITS = [
  { value: 'kJ/kg', label: 'kJ/kg' },
  { value: 'Btu/lb', label: 'Btu/lb' },
] as const;
