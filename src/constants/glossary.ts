export interface GlossaryEntry {
  term: string;
  symbol?: string;
  category: 'Pressure' | 'Valve Factors' | 'Flow Regime' | 'Fire Case' | 'Standards';
  definition: string;
  referenceNote: string;
}

export const ENGINEERING_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Maximum Allowable Working Pressure (MAWP)',
    symbol: 'MAWP',
    category: 'Pressure',
    definition:
      'The maximum gauge pressure permissible at the top of a completed vessel in its normal operating position at the designated coincident temperature.',
    referenceNote: 'ASME BPVC Section VIII Div. 1',
  },
  {
    term: 'Set Pressure',
    symbol: 'P_set',
    category: 'Pressure',
    definition:
      'The inlet gauge pressure at which the pressure-relief device is set to open under service conditions. Typically not greater than equipment MAWP for a single PSV.',
    referenceNote: 'API Std 520 Part I / ASME Section VIII',
  },
  {
    term: 'Overpressure',
    symbol: '% OP',
    category: 'Pressure',
    definition:
      'The pressure increase over the set pressure of the relieving device, usually expressed as a percentage of set pressure (commonly 10% for non-fire, 21% for fire contingency).',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Accumulation',
    symbol: '% Acc',
    category: 'Pressure',
    definition:
      'The pressure increase over the MAWP of the vessel during discharge through the pressure-relief device, expressed in pressure units or as a percentage of MAWP.',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Relieving Pressure (Absolute)',
    symbol: 'P1',
    category: 'Pressure',
    definition:
      'The upstream absolute flowing pressure at the PSV inlet during relief: P1(abs) = P_set(g) × (1 + OP/100) + P_atm(abs). Compressible flow equations require absolute pressure.',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Superimposed Backpressure',
    symbol: 'P_bs',
    category: 'Pressure',
    definition:
      'The static pressure existing at the outlet of a pressure-relief device at the time the device is required to operate (e.g., flare header static pressure).',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Built-up Backpressure',
    symbol: 'P_bb',
    category: 'Pressure',
    definition:
      'The increase in pressure at the outlet of a pressure-relief device that develops as a result of flow after the device opens.',
    referenceNote: 'API Std 520 Part I & Part II',
  },
  {
    term: 'Discharge Coefficient',
    symbol: 'Kd',
    category: 'Valve Factors',
    definition:
      'The ratio of the actual flow rate through a device to the theoretical flow rate for an ideal nozzle of the same effective area. Preliminary defaults must be replaced with certified manufacturer values.',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Backpressure Correction Factor (Gas/Vapour)',
    symbol: 'Kb',
    category: 'Valve Factors',
    definition:
      'A capacity correction factor for gas or vapour service applied primarily to balanced-bellows valves when backpressure reduces capacity below critical choked flow.',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Backpressure Correction Factor (Liquid)',
    symbol: 'Kw',
    category: 'Valve Factors',
    definition:
      'A capacity correction factor for liquid service applied to balanced-bellows valves subjected to backpressure. Equals 1.0 for conventional and pilot-operated valves.',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Viscosity Correction Factor',
    symbol: 'Kv',
    category: 'Valve Factors',
    definition:
      'A factor accounting for reduced discharge efficiency in viscous liquid service, determined iteratively from the orifice Reynolds number.',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Combination Correction Factor',
    symbol: 'Kc',
    category: 'Valve Factors',
    definition:
      'A correction factor applied when a rupture disk is installed in series upstream of a PSV (1.0 when no rupture disk is present; 0.9 default if uncertified combination).',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Critical Pressure Ratio',
    symbol: 'r_c',
    category: 'Flow Regime',
    definition:
      'The ratio of downstream to upstream absolute pressure at which sonic velocity is reached in the nozzle throat: r_c = [2 / (k + 1)]^[k / (k - 1)].',
    referenceNote: 'API Std 520 Part I',
  },
  {
    term: 'Wetted Surface Area',
    symbol: 'A_w',
    category: 'Fire Case',
    definition:
      'The portion of a vessel’s external surface area that is in internal contact with liquid and exposed to a pool fire within the fire-exposure elevation limit.',
    referenceNote: 'API Std 521',
  },
  {
    term: 'Environmental Factor',
    symbol: 'F',
    category: 'Fire Case',
    definition:
      'A factor accounting for heat flux reduction in external fire calculations (1.0 for bare vessels; lower values require certified fire-rated insulation and mechanical integrity verification).',
    referenceNote: 'API Std 521',
  },
  {
    term: 'API 526 Effective Orifice Area',
    symbol: 'A_eff',
    category: 'Standards',
    definition:
      'Standardized effective discharge area designation (D through T) used for preliminary sizing and flanged steel PSV frame selection prior to vendor certification.',
    referenceNote: 'API Std 526',
  },
];
