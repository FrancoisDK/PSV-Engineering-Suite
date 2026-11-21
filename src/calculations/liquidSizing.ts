import {
  APPLICATION_VERSION,
  DEFAULT_STANDARD_BASIS,
} from '../constants/defaultFactors';
import {
  CalculationStatus,
  CalculationStep,
  LiquidPSVInput,
  LiquidSizingResult,
  StandardReferenceBasis,
  ValidationMessage,
  ViscosityIterationRow,
} from '../models/calculationTypes';
import { selectApiOrifice } from './orificeSelection';
import { IN2_TO_MM2 } from './unitConversions';

export const LIQUID_METHOD_ID = 'API520-PI-LIQ-PRELIM';
export const LIQUID_METHOD_VERSION = '1.0.0';
export const MAX_KV_ITERATIONS = 50;
export const KV_CONVERGENCE_TOL_PERCENT = 0.001;

/**
 * Computes Reynolds parameter and viscosity correction factor Kv
 * for liquid PSV sizing per standard API 520 Part I viscous correlation:
 *   R = (18800 * Q_L_min * G) / (mu_cP * sqrt(A_mm2))
 *   Kv = (0.9935 + 2.878 / R^0.5 + 342.75 / R^1.5)^(-1)
 *
 * Verify this correlation against your licensed copy of API Standard 520 Part I.
 */
export function computeLiquidReynoldsAndKv(
  volFlowM3H: number,
  specificGravity: number,
  viscosityCp: number,
  areaMm2: number
): { reynoldsNumber: number; kv: number } {
  const qLMin = (volFlowM3H * 1000) / 60;
  const reynoldsNumber =
    (18800 * qLMin * specificGravity) /
    (viscosityCp * Math.sqrt(Math.max(areaMm2, 1e-9)));

  if (!Number.isFinite(reynoldsNumber) || reynoldsNumber <= 0) {
    return { reynoldsNumber: 0, kv: 0.01 };
  }

  const rawInv =
    0.9935 +
    2.878 / Math.pow(reynoldsNumber, 0.5) +
    342.75 / Math.pow(reynoldsNumber, 1.5);
  const kv = Math.min(1.0, 1 / rawInv);
  return { reynoldsNumber, kv };
}

/**
 * Pure deterministic single-phase incompressible liquid PSV sizing engine.
 * Blocks/rejects flashing or two-phase flow as OUTSIDE_IMPLEMENTED_METHOD.
 */
export function sizeLiquidPSV(
  input: LiquidPSVInput,
  standardBasis: StandardReferenceBasis = DEFAULT_STANDARD_BASIS,
  overrideOrificeDesignation?: string | null,
  overrideNote?: string
): LiquidSizingResult {
  const messages: ValidationMessage[] = [];
  const steps: CalculationStep[] = [];

  const p1KpaA = input.upstreamPressureKpaG + input.atmosphericPressureKpaA;
  const p2KpaA = input.totalBackpressureKpaG + input.atmosphericPressureKpaA;
  const deltaPKpa = p1KpaA - p2KpaA;

  const densityKgM3 = input.densityKgM3;
  const specificGravity = densityKgM3 > 0 ? densityKgM3 / 1000 : 0;

  let volFlowM3H = input.requiredVolFlowM3H;
  let massFlowKgH = input.requiredMassFlowKgH;
  if (input.primaryFlowBasis === 'mass') {
    volFlowM3H = densityKgM3 > 0 ? massFlowKgH / densityKgM3 : 0;
  } else {
    massFlowKgH = densityKgM3 > 0 ? volFlowM3H * densityKgM3 : 0;
  }

  // Safeguard checks for non-single-phase / outside scope
  let outsideMethod = false;
  if (input.flashingOrTwoPhaseFlag) {
    outsideMethod = true;
    messages.push({
      id: 'liq-two-phase-flag',
      severity: 'ERROR',
      message:
        'OUTSIDE IMPLEMENTED METHOD – specialist analysis required. Flashing or two-phase liquid service cannot be sized with the single-phase incompressible liquid equation.',
    });
  }
  if (input.nonNewtonianFlag) {
    outsideMethod = true;
    messages.push({
      id: 'liq-non-newtonian',
      severity: 'ERROR',
      message:
        'OUTSIDE IMPLEMENTED METHOD – specialist analysis required. Non-Newtonian viscosity behaviour is outside the implemented API 520 liquid correlation.',
    });
  }

  // Validation checks
  if (!Number.isFinite(input.atmosphericPressureKpaA) || input.atmosphericPressureKpaA <= 0) {
    messages.push({
      id: 'liq-patm',
      field: 'atmosphericPressureKpaA',
      severity: 'ERROR',
      message: 'Atmospheric pressure must be positive.',
    });
  }
  if (!Number.isFinite(p1KpaA) || p1KpaA <= 0) {
    messages.push({
      id: 'liq-p1',
      field: 'upstreamPressureKpaG',
      severity: 'ERROR',
      message: 'Upstream absolute pressure must be greater than zero.',
    });
  }
  if (!Number.isFinite(p2KpaA) || p2KpaA <= 0) {
    messages.push({
      id: 'liq-p2',
      field: 'totalBackpressureKpaG',
      severity: 'ERROR',
      message: 'Downstream absolute backpressure must be greater than zero.',
    });
  }
  if (deltaPKpa <= 0) {
    messages.push({
      id: 'liq-dp',
      field: 'totalBackpressureKpaG',
      severity: 'ERROR',
      message: 'Differential pressure (P1 - P2) must be positive. Relief flow cannot occur.',
    });
  }
  if (!Number.isFinite(densityKgM3) || densityKgM3 <= 0) {
    messages.push({
      id: 'liq-density',
      field: 'densityKgM3',
      severity: 'ERROR',
      message: 'Liquid density at relieving temperature must be positive.',
    });
  }
  if (!Number.isFinite(volFlowM3H) || volFlowM3H <= 0) {
    messages.push({
      id: 'liq-flow',
      field: 'requiredVolFlowM3H',
      severity: 'ERROR',
      message: 'Required relieving volumetric/mass flow must be greater than zero.',
    });
  }
  if (!Number.isFinite(input.dynamicViscosityCp) || input.dynamicViscosityCp <= 0) {
    messages.push({
      id: 'liq-visc',
      field: 'dynamicViscosityCp',
      severity: 'ERROR',
      message: 'Dynamic viscosity must be positive.',
    });
  }
  if (!Number.isFinite(input.vapourPressureKpaA) || input.vapourPressureKpaA < 0) {
    messages.push({
      id: 'liq-pvap',
      field: 'vapourPressureKpaA',
      severity: 'ERROR',
      message: 'Vapour pressure cannot be negative.',
    });
  }
  if (!Number.isFinite(input.kd) || input.kd <= 0) {
    messages.push({
      id: 'liq-kd',
      field: 'kd',
      severity: 'ERROR',
      message: 'Discharge coefficient Kd must be positive.',
    });
  }
  if (!Number.isFinite(input.kw) || input.kw <= 0) {
    messages.push({
      id: 'liq-kw',
      field: 'kw',
      severity: 'ERROR',
      message: 'Liquid backpressure factor Kw must be positive.',
    });
  }
  if (!Number.isFinite(input.kc) || input.kc <= 0) {
    messages.push({
      id: 'liq-kc',
      field: 'kc',
      severity: 'ERROR',
      message: 'Combination factor Kc must be positive.',
    });
  }

  // Flashing / vaporisation checks:
  // If vapour pressure >= upstream or downstream pressure, liquid will flash across the valve!
  if (Number.isFinite(input.vapourPressureKpaA) && input.vapourPressureKpaA > 0) {
    if (input.vapourPressureKpaA >= p1KpaA) {
      outsideMethod = true;
      messages.push({
        id: 'liq-flash-inlet',
        field: 'vapourPressureKpaA',
        severity: 'ERROR',
        message: `OUTSIDE IMPLEMENTED METHOD – specialist analysis required. Vapour pressure (${input.vapourPressureKpaA.toFixed(1)} kPa(a)) >= inlet pressure (${p1KpaA.toFixed(1)} kPa(a)). Fluid is boiling/two-phase at inlet.`,
      });
    } else if (input.vapourPressureKpaA >= p2KpaA) {
      outsideMethod = true;
      messages.push({
        id: 'liq-flash-outlet',
        field: 'vapourPressureKpaA',
        severity: 'ERROR',
        message: `OUTSIDE IMPLEMENTED METHOD – specialist analysis required. Vapour pressure (${input.vapourPressureKpaA.toFixed(1)} kPa(a)) >= backpressure (${p2KpaA.toFixed(1)} kPa(a)). Liquid will flash across PSV; two-phase sizing (e.g. HEM/Omega) is required.`,
      });
    } else if (p2KpaA - input.vapourPressureKpaA < Math.max(20, 0.1 * p2KpaA)) {
      messages.push({
        id: 'liq-near-flash',
        field: 'vapourPressureKpaA',
        severity: 'WARNING',
        message: `Backpressure (${p2KpaA.toFixed(1)} kPa(a)) is close to vapour pressure (${input.vapourPressureKpaA.toFixed(1)} kPa(a)). Verify single-phase stability and nozzle throat cavitation.`,
      });
    }
  }

  const hasErrors = messages.some((m) => m.severity === 'ERROR') || outsideMethod;

  let preliminaryAreaMm2: number | null = null;
  let reynoldsNumber: number | null = null;
  let kvFinal: number | null = null;
  let converged = false;
  let iterationCount = 0;
  const iterationHistory: ViscosityIterationRow[] = [];
  let requiredAreaMm2: number | null = null;
  let selectedOrificeCapacityM3H: number | null = null;

  // Constant derived from incompressible orifice continuity:
  // Q [m3/h] = 3.6e-3 * A [mm2] * Kd * Kw * Kc * Kv * sqrt(2000 * dP_kPa / rho_kg_m3)
  // => A [mm2] = (1000 / (3.6 * sqrt(2000))) * Q_m3_h / (Kd * Kw * Kc * Kv) * sqrt(rho / dP_kPa)
  const liquidSiConstant = 1000 / (3.6 * Math.sqrt(2000)); // ~6.2112998

  if (!hasErrors) {
    steps.push({
      label: 'Upstream Absolute Pressure',
      symbol: 'P1',
      equation: 'P1 = P_up_g + P_atm',
      substitution: `${input.upstreamPressureKpaG.toFixed(2)} + ${input.atmosphericPressureKpaA.toFixed(3)}`,
      value: p1KpaA.toFixed(3),
      unit: 'kPa(a)',
      sourceType: 'CALCULATED',
    });
    steps.push({
      label: 'Downstream Absolute Pressure',
      symbol: 'P2',
      equation: 'P2 = P_back_g + P_atm',
      substitution: `${input.totalBackpressureKpaG.toFixed(2)} + ${input.atmosphericPressureKpaA.toFixed(3)}`,
      value: p2KpaA.toFixed(3),
      unit: 'kPa(a)',
      sourceType: 'CALCULATED',
    });
    steps.push({
      label: 'Differential Pressure',
      symbol: 'ΔP',
      equation: 'ΔP = P1 - P2',
      substitution: `${p1KpaA.toFixed(3)} - ${p2KpaA.toFixed(3)}`,
      value: deltaPKpa.toFixed(3),
      unit: 'kPa',
      sourceType: 'CALCULATED',
    });

    preliminaryAreaMm2 =
      ((liquidSiConstant * volFlowM3H) / (input.kd * input.kw * input.kc)) *
      Math.sqrt(densityKgM3 / deltaPKpa);

    steps.push({
      label: 'Provisional Area (Kv = 1.0)',
      symbol: 'A_0',
      equation: 'A_0 = [6.2113 × Q / (Kd × Kw × Kc)] × sqrt(ρ / ΔP)',
      substitution: `[${liquidSiConstant.toFixed(4)} × ${volFlowM3H.toFixed(3)} / (${input.kd} × ${input.kw} × ${input.kc})] × sqrt(${densityKgM3.toFixed(1)} / ${deltaPKpa.toFixed(2)})`,
      value: preliminaryAreaMm2.toFixed(2),
      unit: 'mm²',
      sourceType: 'CALCULATED',
    });

    if (input.useIterativeKv) {
      let currentArea = preliminaryAreaMm2;
      let prevArea = preliminaryAreaMm2;
      let lastKv = 1.0;
      let lastRe = 0;

      for (let i = 1; i <= MAX_KV_ITERATIONS; i++) {
        iterationCount = i;
        const { reynoldsNumber: re, kv } = computeLiquidReynoldsAndKv(
          volFlowM3H,
          specificGravity,
          input.dynamicViscosityCp,
          currentArea
        );
        const nextArea = preliminaryAreaMm2 / kv;
        const pctChange =
          i === 1 ? null : (Math.abs(nextArea - prevArea) / prevArea) * 100;

        iterationHistory.push({
          iteration: i,
          trialAreaMm2: Number(currentArea.toFixed(4)),
          reynoldsNumber: Number(re.toFixed(2)),
          kv: Number(kv.toFixed(5)),
          correctedAreaMm2: Number(nextArea.toFixed(4)),
          percentChange: pctChange !== null ? Number(pctChange.toFixed(5)) : null,
        });

        lastKv = kv;
        lastRe = re;

        if (pctChange !== null && pctChange <= KV_CONVERGENCE_TOL_PERCENT) {
          converged = true;
          currentArea = nextArea;
          break;
        }
        prevArea = nextArea;
        currentArea = nextArea;
      }

      reynoldsNumber = lastRe;
      kvFinal = lastKv;
      requiredAreaMm2 = currentArea;

      if (!converged) {
        messages.push({
          id: 'liq-kv-no-converge',
          severity: 'WARNING',
          message: `Viscosity correction Kv did not converge within ${MAX_KV_ITERATIONS} iterations. Review high-viscosity regime.`,
        });
      }
      if (reynoldsNumber < 10) {
        messages.push({
          id: 'liq-low-re',
          severity: 'WARNING',
          message: `Reynolds parameter R = ${reynoldsNumber.toFixed(1)} is very low (< 10). High-viscosity correlation may lose accuracy; confirm with valve manufacturer.`,
        });
      }

      steps.push({
        label: 'Reynolds Parameter (Converged)',
        symbol: 'R',
        equation: 'R = (18800 × Q_L/min × G) / (μ_cP × sqrt(A_mm2))',
        substitution: `Converged in ${iterationCount} iteration(s)`,
        value: reynoldsNumber.toFixed(1),
        unit: '-',
        sourceType: 'CALCULATED',
      });
      steps.push({
        label: 'Viscosity Correction Factor',
        symbol: 'Kv',
        equation: 'Kv = (0.9935 + 2.878/R^0.5 + 342.75/R^1.5)^(-1)',
        value: kvFinal.toFixed(5),
        unit: '-',
        sourceType: 'CALCULATED',
      });
    } else {
      if (!Number.isFinite(input.manualKv) || input.manualKv <= 0 || input.manualKv > 1) {
        messages.push({
          id: 'liq-manual-kv',
          field: 'manualKv',
          severity: 'WARNING',
          message: `Manual Kv (${input.manualKv}) is outside typical bounds (0 < Kv <= 1.0).`,
        });
      }
      kvFinal = input.manualKv > 0 ? input.manualKv : 1.0;
      converged = true;
      iterationCount = 0;
      requiredAreaMm2 = preliminaryAreaMm2 / kvFinal;
      const reCheck = computeLiquidReynoldsAndKv(
        volFlowM3H,
        specificGravity,
        input.dynamicViscosityCp,
        requiredAreaMm2
      );
      reynoldsNumber = reCheck.reynoldsNumber;
    }

    steps.push({
      label: 'Corrected Required Effective Area',
      symbol: 'A_req',
      equation: 'A_req = A_0 / Kv',
      substitution: `${preliminaryAreaMm2.toFixed(2)} / ${kvFinal.toFixed(5)}`,
      value: requiredAreaMm2.toFixed(2),
      unit: 'mm²',
      sourceType: 'CALCULATED',
    });
  }

  const orificeSelection =
    !outsideMethod && requiredAreaMm2 !== null && Number.isFinite(requiredAreaMm2) && requiredAreaMm2 > 0
      ? selectApiOrifice(requiredAreaMm2, overrideOrificeDesignation, overrideNote)
      : null;

  let selectedOrificeCapacityKgH: number | null = null;
  let ratedPressure10PctKpaA: number | null = null;
  let ratedCapacityAt10PercentM3H: number | null = null;
  let ratedCapacityAt10PercentKgH: number | null = null;

  if (orificeSelection) {
    messages.push(...orificeSelection.messages);
    if (
      orificeSelection.selectedOrifice &&
      requiredAreaMm2 &&
      requiredAreaMm2 > 0
    ) {
      const selOrifice = orificeSelection.selectedOrifice;
      selectedOrificeCapacityM3H =
        volFlowM3H * (selOrifice.effectiveAreaMm2 / requiredAreaMm2);
      selectedOrificeCapacityKgH = selectedOrificeCapacityM3H * densityKgM3;

      // Evaluate rated capacity of selected orifice at 10% overpressure for API 520 Part II line sizing
      if (
        input.setPressureKpaG !== undefined &&
        Number.isFinite(input.setPressureKpaG) &&
        input.setPressureKpaG > 0
      ) {
        ratedPressure10PctKpaA =
          input.setPressureKpaG * 1.1 + input.atmosphericPressureKpaA;
      } else if (
        input.overpressurePercent !== undefined &&
        Number.isFinite(input.overpressurePercent) &&
        input.overpressurePercent > 0
      ) {
        const inferredSetG =
          input.upstreamPressureKpaG / (1 + input.overpressurePercent / 100);
        ratedPressure10PctKpaA = inferredSetG * 1.1 + input.atmosphericPressureKpaA;
      } else {
        ratedPressure10PctKpaA = p1KpaA;
      }

      const deltaP10 = ratedPressure10PctKpaA - p2KpaA;
      if (!hasErrors && deltaP10 > 0 && densityKgM3 > 0) {
        const qKv1 =
          ((selOrifice.effectiveAreaMm2 * input.kd * input.kw * input.kc) /
            liquidSiConstant) *
          Math.sqrt(deltaP10 / densityKgM3);

        if (input.useIterativeKv) {
          let qTrial = qKv1 * (kvFinal ?? 1.0);
          for (let iter = 0; iter < 8; iter++) {
            const { kv } = computeLiquidReynoldsAndKv(
              qTrial,
              specificGravity,
              input.dynamicViscosityCp,
              selOrifice.effectiveAreaMm2
            );
            qTrial = qKv1 * kv;
          }
          ratedCapacityAt10PercentM3H = qTrial;
        } else {
          ratedCapacityAt10PercentM3H = qKv1 * (kvFinal ?? 1.0);
        }
        ratedCapacityAt10PercentKgH = ratedCapacityAt10PercentM3H * densityKgM3;
      }

      if (orificeSelection.nozzleSizeLabel) {
        steps.push({
          label: 'Selected API 526 Orifice & Nozzle Sizes',
          symbol: 'Orifice',
          equation: 'Smallest standard API 526 orifice with A_eff >= A_req',
          substitution: `Orifice ${selOrifice.designation} (${selOrifice.effectiveAreaMm2.toFixed(1)} mm²) · Nominal Inlet × Outlet = ${orificeSelection.nozzleSizeLabel}`,
          value: `${selOrifice.designation} (${orificeSelection.nozzleSizeLabel})`,
          sourceType: orificeSelection.isOverride ? 'USER_INPUT' : 'STANDARD_LOOKUP',
        });
      }

      if (ratedCapacityAt10PercentM3H !== null && ratedCapacityAt10PercentKgH !== null) {
        steps.push({
          label: 'PSV Rated Capacity @ 10% Overpressure (Line Sizing Basis)',
          symbol: 'Q_rated,10%',
          equation: 'Evaluated for A_sel at P1,10% = 1.10 × P_set + P_atm',
          substitution: `A_sel = ${selOrifice.effectiveAreaMm2.toFixed(1)} mm², P1,10% = ${(ratedPressure10PctKpaA ?? p1KpaA).toFixed(2)} kPa(a)`,
          value: `${ratedCapacityAt10PercentM3H.toFixed(2)} m³/h (${ratedCapacityAt10PercentKgH.toFixed(1)} kg/h)`,
          sourceType: 'CALCULATED',
        });
      }
    }
  }

  let status: CalculationStatus = 'INCOMPLETE';
  if (outsideMethod) {
    status = 'OUTSIDE_IMPLEMENTED_METHOD';
  } else if (messages.some((m) => m.severity === 'ERROR')) {
    status = requiredAreaMm2 !== null ? 'FAIL' : 'INCOMPLETE';
    if (orificeSelection && !orificeSelection.validSelection && requiredAreaMm2 !== null) {
      status = 'FAIL';
    }
  } else if (messages.some((m) => m.severity === 'WARNING')) {
    status = 'PASS_WITH_WARNINGS';
  } else if (orificeSelection && orificeSelection.validSelection) {
    status = 'PASS';
  }

  const trace = {
    methodId: LIQUID_METHOD_ID,
    methodVersion: LIQUID_METHOD_VERSION,
    standardReferenceTitle: 'API Standard 520 Part I (Single-Phase Incompressible Liquid Sizing)',
    adoptedEdition: standardBasis.api520Part1Edition,
    timestamp: new Date().toISOString(),
    applicationVersion: APPLICATION_VERSION,
    inputs: {
      fluidName: { value: input.fluidName || '(Not specified)', sourceType: 'USER_INPUT' as const },
      primaryFlowBasis: { value: input.primaryFlowBasis, sourceType: 'USER_INPUT' as const },
      volumetricFlow: { value: volFlowM3H, unit: 'm³/h', sourceType: input.primaryFlowBasis === 'volumetric' ? ('USER_INPUT' as const) : ('CALCULATED' as const) },
      massFlow: { value: massFlowKgH, unit: 'kg/h', sourceType: input.primaryFlowBasis === 'mass' ? ('USER_INPUT' as const) : ('CALCULATED' as const) },
      density: { value: densityKgM3, unit: 'kg/m³', sourceType: 'USER_INPUT' as const },
      dynamicViscosity: { value: input.dynamicViscosityCp, unit: 'cP', sourceType: 'USER_INPUT' as const },
      vapourPressure: { value: input.vapourPressureKpaA, unit: 'kPa(a)', sourceType: 'USER_INPUT' as const },
      upstreamPressure: { value: input.upstreamPressureKpaG, unit: 'kPa(g)', sourceType: 'USER_INPUT' as const },
      totalBackpressure: { value: input.totalBackpressureKpaG, unit: 'kPa(g)', sourceType: 'USER_INPUT' as const },
      atmosphericPressure: { value: input.atmosphericPressureKpaA, unit: 'kPa(a)', sourceType: 'USER_INPUT' as const },
    },
    internalValues: {
      P1_abs: { value: p1KpaA, unit: 'kPa(a)' },
      P2_abs: { value: p2KpaA, unit: 'kPa(a)' },
      deltaP: { value: deltaPKpa, unit: 'kPa' },
      specificGravity: { value: specificGravity, unit: '-' },
      ...(ratedPressure10PctKpaA !== null ? { P1_10pct_abs: { value: ratedPressure10PctKpaA, unit: 'kPa(a)' } } : {}),
    },
    constants: {
      liquidSiConstant: { value: liquidSiConstant, unit: 'mm²·(kPa·m³/kg)^0.5 / (m³/h)' },
    },
    correctionFactors: {
      Kd: { value: input.kd, sourceType: 'USER_INPUT' as const, description: 'Liquid discharge coefficient' },
      Kw: { value: input.kw, sourceType: 'USER_INPUT' as const, description: 'Liquid backpressure correction factor' },
      Kc: { value: input.kc, sourceType: 'USER_INPUT' as const, description: 'Rupture-disk combination factor' },
      Kv: { value: kvFinal ?? 1, sourceType: input.useIterativeKv ? ('CALCULATED' as const) : ('USER_INPUT' as const), description: 'Viscosity correction factor' },
    },
    intermediateValues: {
      preliminaryAreaMm2: { value: preliminaryAreaMm2 !== null ? Number(preliminaryAreaMm2.toFixed(3)) : 'N/A', unit: 'mm²' },
      reynoldsNumber: { value: reynoldsNumber !== null ? Number(reynoldsNumber.toFixed(2)) : 'N/A', unit: '-' },
      iterationCount: { value: iterationCount, unit: 'iterations' },
      converged: { value: String(converged), unit: '-' },
      ...(orificeSelection?.nozzleSizeLabel ? { nominalInletOutlet: { value: orificeSelection.nozzleSizeLabel, unit: 'in' } } : {}),
      ...(ratedCapacityAt10PercentKgH !== null ? { ratedCapacityAt10PercentKgH: { value: Number(ratedCapacityAt10PercentKgH.toFixed(2)), unit: 'kg/h' } } : {}),
    },
    finalValue: {
      requiredAreaMm2: requiredAreaMm2 !== null ? Number(requiredAreaMm2.toFixed(3)) : null,
      requiredMassFlowKgH: Number(massFlowKgH.toFixed(3)),
      status,
    },
    steps,
  };

  return {
    status,
    messages,
    upstreamPressureKpaA: p1KpaA,
    downstreamPressureKpaA: p2KpaA,
    differentialPressureKpa: deltaPKpa,
    specificGravity,
    volumetricFlowM3H: volFlowM3H,
    massFlowKgH,
    preliminaryAreaMm2,
    reynoldsNumber,
    kvFinal,
    converged,
    iterationCount,
    iterationHistory,
    requiredAreaMm2,
    requiredAreaCm2: requiredAreaMm2 !== null ? requiredAreaMm2 / 100 : null,
    requiredAreaIn2: requiredAreaMm2 !== null ? requiredAreaMm2 / IN2_TO_MM2 : null,
    orificeSelection,
    selectedOrificeCapacityM3H,
    selectedOrificeCapacityKgH,
    ratedPressure10PctKpaA,
    ratedCapacityAt10PercentM3H,
    ratedCapacityAt10PercentKgH,
    trace,
  };
}
