import { ApiOrificeDefinition } from '../models/calculationTypes';

/**
 * Standard API 526 Flanged Steel Pressure-Relief Valve Effective Orifice Designations.
 *
 * IMPORTANT ENGINEERING NOTICE:
 * - Standard reference: API Standard 526 (Flanged Steel Pressure-Relief Valves).
 * - Verify all effective orifice areas, inlet/outlet flange sizes, and pressure-temperature
 *   ratings against your licensed copy of API Standard 526 and the actual manufacturer's
 *   certified valve data before final specification.
 * - Conversion basis: 1 in² = 645.16 mm² (exact international inch conversion).
 */
export const API_526_EDITION_NOTE =
  'API Standard 526 (Effective Orifice Areas — verify against licensed standard edition and manufacturer data)';

export const IN2_TO_MM2_EXACT = 645.16;

export const API_526_ORIFICES: ApiOrificeDefinition[] = [
  { designation: 'D', effectiveAreaIn2: 0.110, effectiveAreaMm2: Number((0.110 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '1"', nominalOutletSizeIn: '2"' },
  { designation: 'E', effectiveAreaIn2: 0.196, effectiveAreaMm2: Number((0.196 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '1"', nominalOutletSizeIn: '2"' },
  { designation: 'F', effectiveAreaIn2: 0.307, effectiveAreaMm2: Number((0.307 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '1.5"', nominalOutletSizeIn: '2"' },
  { designation: 'G', effectiveAreaIn2: 0.503, effectiveAreaMm2: Number((0.503 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '1.5"', nominalOutletSizeIn: '3"' },
  { designation: 'H', effectiveAreaIn2: 0.785, effectiveAreaMm2: Number((0.785 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '2"', nominalOutletSizeIn: '3"' },
  { designation: 'J', effectiveAreaIn2: 1.287, effectiveAreaMm2: Number((1.287 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '3"', nominalOutletSizeIn: '4"' },
  { designation: 'K', effectiveAreaIn2: 1.838, effectiveAreaMm2: Number((1.838 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '3"', nominalOutletSizeIn: '4"' },
  { designation: 'L', effectiveAreaIn2: 2.853, effectiveAreaMm2: Number((2.853 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '4"', nominalOutletSizeIn: '6"' },
  { designation: 'M', effectiveAreaIn2: 3.600, effectiveAreaMm2: Number((3.600 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '4"', nominalOutletSizeIn: '6"' },
  { designation: 'N', effectiveAreaIn2: 4.340, effectiveAreaMm2: Number((4.340 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '4"', nominalOutletSizeIn: '6"' },
  { designation: 'P', effectiveAreaIn2: 6.380, effectiveAreaMm2: Number((6.380 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '4"', nominalOutletSizeIn: '6"' },
  { designation: 'Q', effectiveAreaIn2: 11.050, effectiveAreaMm2: Number((11.050 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '6"', nominalOutletSizeIn: '8"' },
  { designation: 'R', effectiveAreaIn2: 16.000, effectiveAreaMm2: Number((16.000 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '6"', nominalOutletSizeIn: '10"' },
  { designation: 'T', effectiveAreaIn2: 26.000, effectiveAreaMm2: Number((26.000 * IN2_TO_MM2_EXACT).toFixed(2)), nominalInletSizeIn: '8"', nominalOutletSizeIn: '10"' },
];
