import {
  ProjectDocument,
  StandardReferenceBasis,
  StandardRefConditions,
} from '../models/calculationTypes';
import { DEFAULT_UNIT_PREFERENCES } from './unitDefinitions';

/**
 * Engineering constants and configurable preliminary defaults.
 *
 * IMPORTANT STANDARDS NOTICE:
 * All standard-dependent coefficients, constants, and factors below are provided as
 * configurable engineering defaults for preliminary calculations only.
 * Verify every constant, equation, and factor against your licensed copies of:
 * - API Standard 520 Part I & Part II
 * - API Standard 521
 * - API Standard 526
 * - ASME BPVC Section VIII
 * - Certified valve manufacturer capacity curves
 */

export const APPLICATION_VERSION = '1.0.0';
export const CALCULATION_ENGINE_VERSION = '1.0.0';
export const PROJECT_SCHEMA_VERSION = 1;
export const LOCAL_STORAGE_PROJECTS_KEY = 'psvEngineeringSuite.projects';
export const LOCAL_STORAGE_ACTIVE_ID_KEY = 'psvEngineeringSuite.activeProjectId';

export const UNIVERSAL_GAS_CONSTANT_J_KMOL_K = 8314.4626;
export const STANDARD_ATMOSPHERE_KPA = 101.325;

export const DEFAULT_STANDARD_BASIS: StandardReferenceBasis = {
  api520Part1Edition: 'API Std 520 Part I (User-Verified Edition)',
  api520Part2Edition: 'API Std 520 Part II (User-Verified Edition)',
  api521Edition: 'API Std 521 (User-Verified Edition)',
  api526Edition: 'API Std 526 (User-Verified Edition)',
  asmeSectionViiiEdition: 'ASME BPVC Sec. VIII Div. 1 (User-Verified Edition)',
  // API 521 pool-fire heat absorption constants: Q [W] = C1 * F * A_wetted [m²] ^ 0.82
  // 43,200 W/m^1.64 (~21,000 Btu/h·ft^1.64) with prompt drainage & firefighting
  // 70,900 W/m^1.64 (~34,500 Btu/h·ft^1.64) without prompt drainage / firefighting
  fireHeatConstantPromptDrainageW: 43200,
  fireHeatConstantInadequateDrainageW: 70900,
  fireHeatAreaExponent: 0.82,
  fireExposureElevationLimitM: 7.62, // 25 ft typical pool-fire elevation limit
};

export const STANDARD_REF_CONDITION_PRESETS: Record<string, StandardRefConditions> = {
  'Nm3/h (0 C, 101.325 kPa)': {
    preset: 'Nm3/h (0 C, 101.325 kPa)',
    tempK: 273.15,
    pressureKpaA: 101.325,
    zRef: 1.0,
  },
  'Sm3/h (15 C, 101.325 kPa)': {
    preset: 'Sm3/h (15 C, 101.325 kPa)',
    tempK: 288.15,
    pressureKpaA: 101.325,
    zRef: 1.0,
  },
  'SCFM (60 F, 14.696 psia)': {
    preset: 'SCFM (60 F, 14.696 psia)',
    tempK: 288.705556,
    pressureKpaA: 101.325,
    zRef: 1.0,
  },
};

export const FIRE_ENV_FACTOR_OPTIONS = [
  {
    id: 'bare_vessel',
    label: 'Bare / Uninsulated Vessel (F = 1.00)',
    factor: 1.0,
    sourceType: 'STANDARD_LOOKUP' as const,
    basis: 'Uninsulated vessel with no credit for thermal insulation (F = 1.0).',
  },
  {
    id: 'water_spray_not_credited',
    label: 'Water Spray / Depressuring Not Credited (F = 1.00)',
    factor: 1.0,
    sourceType: 'STANDARD_LOOKUP' as const,
    basis: 'API 521 generally does not credit water deluge alone without approved engineering basis (F = 1.0).',
  },
  {
    id: 'certified_insulation_03',
    label: 'Certified Fire-Rated Insulation (User Basis F = 0.30)',
    factor: 0.3,
    sourceType: 'ASSUMED' as const,
    basis: 'Configurable preliminary value — requires certified insulation conductance & fire-exposure verification per API 521.',
  },
  {
    id: 'certified_insulation_015',
    label: 'Certified Heavy Fire-Rated Insulation (User Basis F = 0.15)',
    factor: 0.15,
    sourceType: 'ASSUMED' as const,
    basis: 'Configurable preliminary value — requires certified insulation conductance & fire-exposure verification per API 521.',
  },
  {
    id: 'earth_covered',
    label: 'Earth-Covered / Mounded Storage (User Basis F = 0.03)',
    factor: 0.03,
    sourceType: 'ASSUMED' as const,
    basis: 'Configurable preliminary value — requires mounding thickness & code verification per API 521.',
  },
  {
    id: 'custom',
    label: 'Custom User-Entered Environmental Factor',
    factor: 1.0,
    sourceType: 'USER_INPUT' as const,
    basis: 'User-entered environmental factor F; verify against licensed API 521 edition.',
  },
];

export const ENGINEERING_NOTICE =
  'This application is an engineering calculation aid. It does not replace a qualified engineer’s review, a certified valve manufacturer’s sizing program, or the applicable governing codes and standards.';

export const VALVE_SELECTION_NOTICE =
  'Final valve selection must be verified using the certified capacity and approved sizing data of the actual manufacturer and model.';

export const BREAKTHROUGH_WARNING =
  'Gas breakthrough calculations can be sensitive to upstream-system response, control-valve characteristics, line pressure loss, source inventory, and destination pressure. Confirm the final relieving load using an approved process simulation or validated vendor method where required.';

export function createBlankProjectDocument(): ProjectDocument {
  const today = new Date().toISOString().slice(0, 10);
  return {
    application: 'PSV Engineering Suite',
    applicationVersion: APPLICATION_VERSION,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    unitSystem: 'SI',
    unitPreferences: { ...DEFAULT_UNIT_PREFERENCES.SI },
    standardBasis: { ...DEFAULT_STANDARD_BASIS },
    project: {
      projectName: '',
      client: '',
      plantFacility: '',
      unit: '',
      equipmentTag: '',
      equipmentDescription: '',
      psvTag: '',
      calculationNumber: '',
      revision: '0',
      preparedBy: '',
      checkedBy: '',
      calculationDate: today,
      notes: '',
      isDemonstrationData: false,
    },
    equipment: {
      equipmentType: 'pressure_vessel',
      mawpKpaG: 1000,
      designPressureKpaG: 1000,
      designTemperatureK: 393.15,
      normalOperatingPressureKpaG: 750,
      normalOperatingTemperatureK: 333.15,
      orientation: 'vertical',
      diameterM: 2.0,
      tangentLengthM: 5.0,
      headType: '2:1_elliptical',
      liquidLevelM: 2.5,
      insulated: false,
      insulationCertified: false,
      fireproofingStatus: 'none',
      elevationAboveGradeM: 0.5,
    },
    designBasis: {
      setPressureKpaG: 1000,
      overpressurePercent: 10,
      accumulationPercent: 10,
      superimposedBackpressureKpaG: 0,
      builtUpBackpressureKpaG: 50,
      relievingTemperatureK: 353.15,
      atmosphericPressureKpaA: STANDARD_ATMOSPHERE_KPA,
      valveType: 'conventional',
      ruptureDiskUpstream: false,
      multiplePsvInstallation: false,
      dischargeDestination: 'flare_header',
      kdGas: 0.975,
      kdGasSource: 'ASSUMED',
      kdLiquid: 0.65,
      kdLiquidSource: 'ASSUMED',
      kb: 1.0,
      kbSource: 'ASSUMED',
      kw: 1.0,
      kwSource: 'ASSUMED',
      kvDefault: 1.0,
      kvSource: 'ASSUMED',
      kc: 1.0,
      kcSource: 'ASSUMED',
      steamCorrectionKn: 1.0,
      steamCorrectionKsh: 1.0,
      zDefault: 0.95,
      kDefault: 1.25,
      mwDefault: 28.97,
    },
    gasInput: {
      fluidName: '',
      compositionDescription: '',
      molecularWeight: 28.97,
      compressibilityZ: 1.0,
      isentropicK: 1.4,
      relievingTemperatureK: 323.15,
      loadInputMode: 'kg/h',
      requiredFlowValue: 0,
      standardRefConditions: { ...STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)'] },
      setPressureKpaG: 1000,
      overpressurePercent: 10,
      totalBackpressureKpaG: 50,
      atmosphericPressureKpaA: STANDARD_ATMOSPHERE_KPA,
      kd: 0.975,
      kb: 1.0,
      kc: 1.0,
      valveType: 'conventional',
      outsideScopeFlag: false,
    },
    liquidInput: {
      fluidName: '',
      primaryFlowBasis: 'volumetric',
      requiredMassFlowKgH: 0,
      requiredVolFlowM3H: 0,
      densityKgM3: 1000,
      dynamicViscosityCp: 1.0,
      vapourPressureKpaA: 10,
      relievingTemperatureK: 313.15,
      upstreamPressureKpaG: 1100,
      totalBackpressureKpaG: 50,
      atmosphericPressureKpaA: STANDARD_ATMOSPHERE_KPA,
      kd: 0.65,
      kw: 1.0,
      kc: 1.0,
      useIterativeKv: true,
      manualKv: 1.0,
      flashingOrTwoPhaseFlag: false,
      nonNewtonianFlag: false,
    },
    breakthroughInput: {
      scenarioName: 'Gas Blow-By Scenario',
      sourceEquipment: '',
      destinationEquipment: '',
      failureMode: 'control_valve_fails_open',
      failureDescription: '',
      steadyStateBasis: 'steady_state',
      engineeringNotes: '',
      sourcePressureKpaG: 4000,
      sourceTemperatureK: 313.15,
      sourceMw: 20.0,
      sourceZ: 0.92,
      sourceK: 1.28,
      destinationRelievingPressureKpaG: 1100,
      destinationBackpressureKpaG: 50,
      atmosphericPressureKpaA: STANDARD_ATMOSPHERE_KPA,
      restrictionType: 'control_valve',
      valveCv: 0,
      valveOpeningPercent: 100,
      valveXt: 0.72,
      valveFp: 1.0,
      valveStyle: 'globe',
      orificeBoreMm: 0,
      upstreamPipeDiameterMm: 100,
      orificeCd: 0.85,
      knownEffectiveAreaMm2: 0,
      knownAreaCd: 0.85,
      externallySuppliedMassFlowKgH: 0,
      psvKd: 0.975,
      psvKb: 1.0,
      psvKc: 1.0,
      transientDepletionFlag: false,
    },
    fireInput: {
      equipmentType: 'pressure_vessel',
      geometryType: 'vertical_cylinder_heads',
      insulated: false,
      insulationCertified: false,
      environmentalFactorF: 1.0,
      environmentalFactorSource: 'STANDARD_LOOKUP',
      environmentalFactorBasis: 'Bare / Uninsulated Vessel (F = 1.00)',
      drainageQuality: 'prompt_drainage_firefighting',
      fireExposureLimitM: 7.62,
      diameterM: 2.0,
      tangentLengthM: 5.0,
      headType: '2:1_elliptical',
      normalLiquidLevelM: 2.5,
      relievingLiquidLevelM: 2.5,
      elevationAboveGradeM: 0.5,
      numberOfVessels: 1,
      userOverrideWettedArea: false,
      userWettedAreaM2: 0,
      additionalEquipment: [],
      includePipingAllowance: true,
      pipingAllowancePercent: 10,
      setPressureKpaG: 1000,
      fireOverpressurePercent: 21,
      backpressureKpaG: 50,
      atmosphericPressureKpaA: STANDARD_ATMOSPHERE_KPA,
      relievingTemperatureK: 380.15,
      latentHeatKjKg: 350,
      vapourMw: 44.1,
      vapourZ: 0.9,
      vapourK: 1.15,
      kd: 0.975,
      kb: 1.0,
      kc: 1.0,
    },
    scenarios: [],
    psvSelection: {
      governingScenarioId: null,
      overrideOrificeDesignation: null,
      overrideNote: '',
      selectedTag: '',
      selectedValveType: 'conventional',
      selectedBodyRating: 'ASME Class 150 / 300 (verify)',
      inletOutletSize: 'Per API 526',
      verificationNote: '',
    },
    audit: {},
    revisionHistory: [
      {
        revision: '0',
        date: today,
        author: '',
        description: 'Initial preliminary calculation setup',
      },
    ],
  };
}
