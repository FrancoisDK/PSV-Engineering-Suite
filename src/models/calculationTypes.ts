export type UnitSystem = 'SI' | 'US';

export type ValueSourceType =
  | 'USER_INPUT'
  | 'CALCULATED'
  | 'ASSUMED'
  | 'STANDARD_LOOKUP';

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationMessage {
  id: string;
  field?: string;
  severity: ValidationSeverity;
  message: string;
  code?: string;
}

export type CalculationStatus =
  | 'PASS'
  | 'PASS_WITH_WARNINGS'
  | 'FAIL'
  | 'INCOMPLETE'
  | 'OUTSIDE_IMPLEMENTED_METHOD';

export type PressureUnit =
  | 'kPa(g)'
  | 'kPa(a)'
  | 'kPa'
  | 'bar(g)'
  | 'bar(a)'
  | 'MPa(g)'
  | 'MPa(a)'
  | 'MPa'
  | 'psig'
  | 'psia';

export type DeltaPressureUnit = 'kPa' | 'bar' | 'MPa' | 'psi';
export type TemperatureUnit = 'C' | 'K' | 'F' | 'R';
export type MassFlowUnit = 'kg/h' | 'kg/s' | 'lb/h';
export type LiquidVolFlowUnit = 'm3/h' | 'US gpm' | 'ft3/min';
export type GasLoadInputMode =
  | 'kg/h'
  | 'kg/s'
  | 'lb/h'
  | 'Nm3/h'
  | 'Sm3/h'
  | 'actual m3/h'
  | 'SCFM';
export type AreaUnit = 'mm2' | 'cm2' | 'in2';
export type DensityUnit = 'kg/m3' | 'lb/ft3';
export type ViscosityUnit = 'cP' | 'Pa·s';
export type KinematicViscosityUnit = 'cSt' | 'mm2/s';
export type LengthUnit = 'mm' | 'm' | 'in' | 'ft';
export type HeatRateUnit = 'kW' | 'MJ/h' | 'Btu/h';
export type LatentHeatUnit = 'kJ/kg' | 'Btu/lb';

export interface UnitPreferences {
  pressure: PressureUnit;
  deltaPressure: DeltaPressureUnit;
  temperature: TemperatureUnit;
  massFlow: MassFlowUnit;
  liquidVolFlow: LiquidVolFlowUnit;
  area: AreaUnit;
  density: DensityUnit;
  viscosity: ViscosityUnit;
  length: LengthUnit;
  heatRate: HeatRateUnit;
  latentHeat: LatentHeatUnit;
}

export interface StandardReferenceBasis {
  api520Part1Edition: string;
  api520Part2Edition: string;
  api521Edition: string;
  api526Edition: string;
  asmeSectionViiiEdition: string;
  fireHeatConstantPromptDrainageW: number;
  fireHeatConstantInadequateDrainageW: number;
  fireHeatAreaExponent: number;
  fireExposureElevationLimitM: number;
}

export interface ProjectInfo {
  projectName: string;
  client: string;
  plantFacility: string;
  unit: string;
  equipmentTag: string;
  equipmentDescription: string;
  psvTag: string;
  calculationNumber: string;
  revision: string;
  preparedBy: string;
  checkedBy: string;
  calculationDate: string;
  notes: string;
  isDemonstrationData?: boolean;
}

export type ProtectedEquipmentType =
  | 'pressure_vessel'
  | 'separator'
  | 'knockout_drum'
  | 'heat_exchanger_shell'
  | 'heat_exchanger_tube'
  | 'column'
  | 'reactor'
  | 'compressor_system'
  | 'pump_discharge_system'
  | 'pipeline'
  | 'other';

export type VesselOrientation = 'vertical' | 'horizontal' | 'spherical';
export type HeadType = '2:1_elliptical' | 'hemispherical' | 'torispherical' | 'flat';

export interface ProtectedEquipment {
  equipmentType: ProtectedEquipmentType;
  mawpKpaG: number;
  designPressureKpaG: number;
  designTemperatureK: number;
  normalOperatingPressureKpaG: number;
  normalOperatingTemperatureK: number;
  orientation: VesselOrientation;
  diameterM: number;
  tangentLengthM: number;
  headType: HeadType;
  liquidLevelM: number;
  insulated: boolean;
  insulationCertified: boolean;
  fireproofingStatus: 'none' | 'certified_fireproofing' | 'unverified';
  elevationAboveGradeM: number;
}

export type ValveType = 'conventional' | 'balanced_bellows' | 'pilot_operated';
export type DischargeDestination =
  | 'atmosphere'
  | 'closed_vent'
  | 'flare_header'
  | 'scrubber'
  | 'other';

export interface DesignBasisData {
  setPressureKpaG: number;
  overpressurePercent: number;
  accumulationPercent: number;
  superimposedBackpressureKpaG: number;
  builtUpBackpressureKpaG: number;
  relievingTemperatureK: number;
  atmosphericPressureKpaA: number;
  valveType: ValveType;
  ruptureDiskUpstream: boolean;
  multiplePsvInstallation: boolean;
  dischargeDestination: DischargeDestination;
  // Correction factors & defaults
  kdGas: number;
  kdGasSource: ValueSourceType;
  kdLiquid: number;
  kdLiquidSource: ValueSourceType;
  kb: number;
  kbSource: ValueSourceType;
  kw: number;
  kwSource: ValueSourceType;
  kvDefault: number;
  kvSource: ValueSourceType;
  kc: number;
  kcSource: ValueSourceType;
  steamCorrectionKn: number;
  steamCorrectionKsh: number;
  zDefault: number;
  kDefault: number;
  mwDefault: number;
}

export interface StandardRefConditions {
  preset: 'Nm3/h (0 C, 101.325 kPa)' | 'Sm3/h (15 C, 101.325 kPa)' | 'SCFM (60 F, 14.696 psia)' | 'Custom';
  tempK: number;
  pressureKpaA: number;
  zRef: number;
}

export interface GasPSVInput {
  fluidName: string;
  compositionDescription: string;
  molecularWeight: number;
  compressibilityZ: number;
  isentropicK: number;
  relievingTemperatureK: number;
  loadInputMode: GasLoadInputMode;
  requiredFlowValue: number;
  standardRefConditions: StandardRefConditions;
  relievingDensityKgM3?: number;
  setPressureKpaG: number;
  overpressurePercent: number;
  totalBackpressureKpaG: number;
  atmosphericPressureKpaA: number;
  kd: number;
  kb: number;
  kc: number;
  valveType: ValveType;
  outsideScopeFlag: boolean;
  outsideScopeReason?: string;
}

export interface LiquidPSVInput {
  fluidName: string;
  primaryFlowBasis: 'mass' | 'volumetric';
  requiredMassFlowKgH: number;
  requiredVolFlowM3H: number;
  densityKgM3: number;
  specificGravityInput?: number;
  dynamicViscosityCp: number;
  vapourPressureKpaA: number;
  relievingTemperatureK: number;
  upstreamPressureKpaG: number;
  setPressureKpaG?: number;
  overpressurePercent?: number;
  totalBackpressureKpaG: number;
  atmosphericPressureKpaA: number;
  kd: number;
  kw: number;
  kc: number;
  useIterativeKv: boolean;
  manualKv: number;
  flashingOrTwoPhaseFlag: boolean;
  nonNewtonianFlag: boolean;
}

export type BreakthroughFailureMode =
  | 'control_valve_fails_open'
  | 'regulator_fails_open'
  | 'bypass_valve_open'
  | 'manual_valve_opened'
  | 'restriction_orifice_connection'
  | 'hx_tube_rupture'
  | 'other';

export type RestrictionDeviceType =
  | 'control_valve'
  | 'restriction_orifice'
  | 'pipe_nozzle'
  | 'known_area'
  | 'known_rated_flow'
  | 'user_entered';

export interface VapourBreakthroughInput {
  scenarioName: string;
  sourceEquipment: string;
  destinationEquipment: string;
  failureMode: BreakthroughFailureMode;
  failureDescription: string;
  steadyStateBasis: 'steady_state' | 'transient_screening';
  engineeringNotes: string;
  // Source & destination
  sourcePressureKpaG: number;
  sourceTemperatureK: number;
  sourceMw: number;
  sourceZ: number;
  sourceK: number;
  sourceDensityKgM3?: number;
  destinationRelievingPressureKpaG: number;
  destinationBackpressureKpaG: number;
  atmosphericPressureKpaA: number;
  // Restriction
  restrictionType: RestrictionDeviceType;
  // Control valve
  valveCv: number;
  valveOpeningPercent: number;
  valveXt: number;
  valveFp: number;
  valveStyle: 'globe' | 'ball' | 'butterfly' | 'plug' | 'other';
  // Restriction orifice / pipe
  orificeBoreMm: number;
  upstreamPipeDiameterMm: number;
  orificeCd: number;
  // Known area
  knownEffectiveAreaMm2: number;
  knownAreaCd: number;
  // Rated / user entered
  externallySuppliedMassFlowKgH: number;
  // Destination PSV factors
  psvKd: number;
  psvKb: number;
  psvKc: number;
  transientDepletionFlag: boolean;
}

export type FireGeometryType =
  | 'vertical_cylinder_heads'
  | 'horizontal_cylinder_heads'
  | 'sphere'
  | 'heat_exchanger_shell'
  | 'user_entered_area'
  | 'custom';

export interface FireEquipmentItem {
  id: string;
  tag: string;
  description: string;
  enabled: boolean;
  entryMode: 'geometry' | 'direct_area';
  geometryType: Exclude<FireGeometryType, 'user_entered_area'>;
  diameterM: number;
  tangentLengthM: number;
  headType: HeadType;
  headDepthOverrideM?: number;
  relievingLiquidLevelM: number;
  elevationAboveGradeM: number;
  directWettedAreaM2: number;
  quantity: number;
}

export interface FireCaseInput {
  equipmentType: ProtectedEquipmentType;
  geometryType: FireGeometryType;
  insulated: boolean;
  insulationCertified: boolean;
  environmentalFactorF: number;
  environmentalFactorSource: ValueSourceType;
  environmentalFactorBasis: string;
  drainageQuality: 'prompt_drainage_firefighting' | 'inadequate_drainage';
  fireExposureLimitM: number;
  diameterM: number;
  tangentLengthM: number;
  headType: HeadType;
  headDepthOverrideM?: number;
  normalLiquidLevelM: number;
  relievingLiquidLevelM: number;
  elevationAboveGradeM: number;
  numberOfVessels: number;
  userOverrideWettedArea: boolean;
  userWettedAreaM2: number;
  additionalEquipment?: FireEquipmentItem[];
  includePipingAllowance?: boolean;
  pipingAllowancePercent?: number;
  // Relief fluid & PSV
  setPressureKpaG: number;
  fireOverpressurePercent: number;
  backpressureKpaG: number;
  atmosphericPressureKpaA: number;
  relievingTemperatureK: number;
  latentHeatKjKg: number;
  vapourMw: number;
  vapourZ: number;
  vapourK: number;
  kd: number;
  kb: number;
  kc: number;
}

export interface ApiOrificeDefinition {
  designation: string;
  effectiveAreaIn2: number;
  effectiveAreaMm2: number;
  nominalInletSizeIn?: string;
  nominalOutletSizeIn?: string;
}

export interface OrificeSelectionResult {
  requiredAreaMm2: number;
  recommendedOrifice: ApiOrificeDefinition | null;
  nextLargerOrifice: ApiOrificeDefinition | null;
  selectedOrifice: ApiOrificeDefinition | null;
  inletNozzleSizeIn: string | null;
  outletNozzleSizeIn: string | null;
  nozzleSizeLabel: string | null;
  isOverride: boolean;
  overrideNote: string;
  exceedsLargestStandard: boolean;
  areaMarginMm2: number | null;
  areaMarginPercent: number | null;
  utilisationPercent: number | null;
  validSelection: boolean;
  messages: ValidationMessage[];
}

export interface CalculationStep {
  label: string;
  symbol?: string;
  equation?: string;
  substitution?: string;
  value: string;
  unit?: string;
  sourceType: ValueSourceType;
}

export interface CalculationTrace {
  methodId: string;
  methodVersion: string;
  standardReferenceTitle: string;
  adoptedEdition: string;
  timestamp: string;
  applicationVersion: string;
  inputs: Record<string, { value: number | string | boolean; unit?: string; sourceType: ValueSourceType }>;
  internalValues: Record<string, { value: number | string | boolean; unit?: string }>;
  constants: Record<string, { value: number | string; unit?: string; note?: string }>;
  correctionFactors: Record<string, { value: number; sourceType: ValueSourceType; description: string }>;
  intermediateValues: Record<string, { value: number | string; unit?: string }>;
  finalValue: { requiredAreaMm2: number | null; requiredMassFlowKgH: number | null; status: CalculationStatus };
  steps: CalculationStep[];
}

export interface GasSizingResult {
  status: CalculationStatus;
  messages: ValidationMessage[];
  upstreamPressureKpaA: number;
  downstreamPressureKpaA: number;
  pressureRatio: number;
  criticalPressureRatio: number;
  flowRegime: 'CRITICAL' | 'SUBCRITICAL' | 'INVALID';
  expansionCoeffC: number;
  subcriticalF2: number | null;
  requiredMassFlowKgH: number;
  requiredAreaMm2: number | null;
  requiredAreaCm2: number | null;
  requiredAreaIn2: number | null;
  orificeSelection: OrificeSelectionResult | null;
  selectedOrificeCapacityKgH: number | null;
  ratedPressure10PctKpaA: number | null;
  ratedCapacityAt10PercentKgH: number | null;
  ratedFlowRegime10Pct: 'CRITICAL' | 'SUBCRITICAL' | 'INVALID' | null;
  governingDifferentialKpa: number;
  trace: CalculationTrace;
}

export interface ViscosityIterationRow {
  iteration: number;
  trialAreaMm2: number;
  reynoldsNumber: number;
  kv: number;
  correctedAreaMm2: number;
  percentChange: number | null;
}

export interface LiquidSizingResult {
  status: CalculationStatus;
  messages: ValidationMessage[];
  upstreamPressureKpaA: number;
  downstreamPressureKpaA: number;
  differentialPressureKpa: number;
  specificGravity: number;
  volumetricFlowM3H: number;
  massFlowKgH: number;
  preliminaryAreaMm2: number | null;
  reynoldsNumber: number | null;
  kvFinal: number | null;
  converged: boolean;
  iterationCount: number;
  iterationHistory: ViscosityIterationRow[];
  requiredAreaMm2: number | null;
  requiredAreaCm2: number | null;
  requiredAreaIn2: number | null;
  orificeSelection: OrificeSelectionResult | null;
  selectedOrificeCapacityM3H: number | null;
  selectedOrificeCapacityKgH: number | null;
  ratedPressure10PctKpaA: number | null;
  ratedCapacityAt10PercentM3H: number | null;
  ratedCapacityAt10PercentKgH: number | null;
  trace: CalculationTrace;
}

export interface VapourBreakthroughResult {
  status: CalculationStatus;
  messages: ValidationMessage[];
  sourcePressureKpaA: number;
  destinationPressureKpaA: number;
  pressureRatio: number;
  criticalPressureRatio: number;
  restrictionFlowRegime: 'CRITICAL' | 'SUBCRITICAL' | 'EXTERNALLY_SUPPLIED' | 'INVALID';
  effectiveRestrictionAreaMm2: number | null;
  betaRatio: number | null;
  breakthroughMassFlowKgH: number | null;
  breakthroughStdVolNm3H: number | null;
  psvSizing: GasSizingResult | null;
  trace: CalculationTrace;
}

export interface FireEquipmentBreakdownRow {
  id: string;
  tag: string;
  description: string;
  entryMode: 'geometry' | 'direct_area';
  shellAreaPerUnitM2: number;
  headAreaPerUnitM2: number;
  perUnitAreaM2: number;
  quantity: number;
  totalAreaM2: number;
}

export interface FireCaseResult {
  status: CalculationStatus;
  messages: ValidationMessage[];
  shellWettedAreaM2: number;
  headWettedAreaM2: number;
  totalWettedAreaPerVesselM2: number;
  primaryWettedAreaM2: number;
  additionalEquipmentWettedAreaM2: number;
  equipmentSubtotalWettedAreaM2: number;
  pipingAllowanceM2: number;
  pipingAllowancePercentApplied: number;
  itemizedEquipment: FireEquipmentBreakdownRow[];
  totalWettedAreaM2: number;
  effectiveLiquidHeightM: number;
  effectiveFireHeightM: number;
  heatInputCoefficientW: number;
  heatInputKw: number;
  heatInputMjH: number;
  heatInputBtuH: number;
  vapourGenerationKgH: number;
  vapourGenerationLbH: number;
  psvSizing: GasSizingResult | null;
  trace: CalculationTrace;
}

export type ScenarioType =
  | 'blocked_outlet'
  | 'gas_blowby'
  | 'vapour_breakthrough'
  | 'external_fire'
  | 'control_valve_failure'
  | 'cooling_failure'
  | 'utility_failure'
  | 'thermal_expansion'
  | 'tube_rupture'
  | 'user_defined';

export type FluidPhase = 'gas_vapour' | 'liquid' | 'two_phase' | 'supercritical';

export interface ReliefScenario {
  id: string;
  name: string;
  scenarioType: ScenarioType;
  linkedModule: 'gas' | 'liquid' | 'breakthrough' | 'fire' | 'manual';
  fluidPhase: FluidPhase;
  enabled: boolean;
  independentlyProtected: boolean;
  simultaneousGroup: string | null;
  simultaneousBasisNote?: string;
  relievingPressureKpaA: number;
  relievingTemperatureK: number;
  relievingMassFlowKgH: number;
  requiredAreaMm2: number | null;
  selectedOrificeDesignation: string | null;
  inletOutletNozzle?: string | null;
  ratedCapacity10PctKgH?: number | null;
  capacityMarginPercent: number | null;
  status: CalculationStatus;
  notes: string;
}

export interface RevisionEntry {
  revision: string;
  date: string;
  author: string;
  description: string;
}

export interface FinalPSVSelection {
  governingScenarioId: string | null;
  overrideOrificeDesignation: string | null;
  overrideNote: string;
  selectedTag: string;
  selectedValveType: ValveType;
  selectedBodyRating: string;
  inletOutletSize: string;
  verificationNote: string;
}

export interface ProjectDocument {
  application: 'PSV Engineering Suite';
  applicationVersion: string;
  schemaVersion: number;
  unitSystem: UnitSystem;
  unitPreferences: UnitPreferences;
  standardBasis: StandardReferenceBasis;
  project: ProjectInfo;
  equipment: ProtectedEquipment;
  designBasis: DesignBasisData;
  gasInput: GasPSVInput;
  liquidInput: LiquidPSVInput;
  breakthroughInput: VapourBreakthroughInput;
  fireInput: FireCaseInput;
  scenarios: ReliefScenario[];
  psvSelection: FinalPSVSelection;
  audit: {
    gas?: CalculationTrace;
    liquid?: CalculationTrace;
    breakthrough?: CalculationTrace;
    fire?: CalculationTrace;
  };
  revisionHistory: RevisionEntry[];
}
