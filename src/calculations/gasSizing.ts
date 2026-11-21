import {
  APPLICATION_VERSION,
  CALCULATION_ENGINE_VERSION,
  DEFAULT_STANDARD_BASIS,
  UNIVERSAL_GAS_CONSTANT_J_KMOL_K,
} from '../constants/defaultFactors';
import {
  CalculationStatus,
  CalculationStep,
  GasPSVInput,
  GasSizingResult,
  StandardReferenceBasis,
  ValidationMessage,
} from '../models/calculationTypes';
import { selectApiOrifice } from './orificeSelection';
import { gasLoadToMassFlowKgH, IN2_TO_MM2 } from './unitConversions';

export const GAS_METHOD_ID = 'API520-PI-GAS-PRELIM';
export const GAS_METHOD_VERSION = '1.0.0';

/**
 * Pure deterministic gas/vapour PSV sizing engine (internal SI units).
 * Equations: Ideal/real-gas isentropic nozzle flow with compressibility Z
 * per API Standard 520 Part I preliminary effective-area methodology.
 *
 * CRITICAL SAFEGUARDS:
 * - Uses absolute pressures P1 and P2 internally (never gauge pressure).
 * - Automatically classifies Critical (Choked) vs Subcritical (Non-choked) regime.
 * - Uses subcritical F2 formulation when P2/P1 > r_c; never applies choked equation to subcritical flow.
 */
export function sizeGasPSV(
  input: GasPSVInput,
  standardBasis: StandardReferenceBasis = DEFAULT_STANDARD_BASIS,
  overrideOrificeDesignation?: string | null,
  overrideNote?: string
): GasSizingResult {
  const messages: ValidationMessage[] = [];
  const steps: CalculationStep[] = [];

  if (input.outsideScopeFlag) {
    messages.push({
      id: 'gas-outside-scope',
      severity: 'ERROR',
      message: `OUTSIDE IMPLEMENTED METHOD – specialist analysis required. (${input.outsideScopeReason || 'Flagged outside single-phase gas/vapour scope'})`,
    });
  }

  // Convert relieving pressure & backpressure to absolute kPa(a)
  const relievingGaugeKpaG =
    input.setPressureKpaG * (1 + input.overpressurePercent / 100);
  const p1KpaA = relievingGaugeKpaG + input.atmosphericPressureKpaA;
  const p2KpaA = input.totalBackpressureKpaG + input.atmosphericPressureKpaA;
  const governingDiffKpa = p1KpaA - p2KpaA;

  // Resolve required mass flow from selected load input mode
  const flowConv = gasLoadToMassFlowKgH(
    input.requiredFlowValue,
    input.loadInputMode,
    input.molecularWeight,
    input.standardRefConditions,
    input.relievingDensityKgM3
  );

  if (flowConv.error) {
    messages.push({
      id: 'gas-flow-conv',
      field: 'requiredFlowValue',
      severity: 'ERROR',
      message: flowConv.error,
    });
  }
  const requiredMassFlowKgH = flowConv.massFlowKgH ?? 0;

  // Field-level and physics validations
  if (!Number.isFinite(input.atmosphericPressureKpaA) || input.atmosphericPressureKpaA <= 0) {
    messages.push({
      id: 'gas-patm',
      field: 'atmosphericPressureKpaA',
      severity: 'ERROR',
      message: 'Atmospheric pressure must be positive.',
    });
  }
  if (!Number.isFinite(input.setPressureKpaG) || input.setPressureKpaG <= 0) {
    messages.push({
      id: 'gas-pset',
      field: 'setPressureKpaG',
      severity: 'ERROR',
      message: 'Set pressure must be positive.',
    });
  }
  if (!Number.isFinite(input.overpressurePercent) || input.overpressurePercent < 0) {
    messages.push({
      id: 'gas-op',
      field: 'overpressurePercent',
      severity: 'ERROR',
      message: 'Allowable overpressure percentage cannot be negative.',
    });
  }
  if (!Number.isFinite(p1KpaA) || p1KpaA <= 0) {
    messages.push({
      id: 'gas-p1-invalid',
      severity: 'ERROR',
      message: 'Upstream relieving absolute pressure (P1) must be greater than zero.',
    });
  }
  if (!Number.isFinite(p2KpaA) || p2KpaA <= 0) {
    messages.push({
      id: 'gas-p2-invalid',
      field: 'totalBackpressureKpaG',
      severity: 'ERROR',
      message: 'Downstream absolute backpressure (P2) must be greater than zero.',
    });
  }
  if (p2KpaA >= p1KpaA) {
    messages.push({
      id: 'gas-bp-exceeds-p1',
      field: 'totalBackpressureKpaG',
      severity: 'ERROR',
      message: 'Total backpressure (P2) is greater than or equal to upstream relieving pressure (P1). Relief flow cannot occur.',
    });
  }
  if (!Number.isFinite(input.relievingTemperatureK) || input.relievingTemperatureK <= 0) {
    messages.push({
      id: 'gas-temp',
      field: 'relievingTemperatureK',
      severity: 'ERROR',
      message: 'Relieving temperature must be greater than absolute zero (0 K).',
    });
  }
  if (!Number.isFinite(input.molecularWeight) || input.molecularWeight <= 0) {
    messages.push({
      id: 'gas-mw',
      field: 'molecularWeight',
      severity: 'ERROR',
      message: 'Molecular weight must be positive.',
    });
  }
  if (!Number.isFinite(input.compressibilityZ) || input.compressibilityZ <= 0) {
    messages.push({
      id: 'gas-z',
      field: 'compressibilityZ',
      severity: 'ERROR',
      message: 'Compressibility factor Z must be positive.',
    });
  }
  if (!Number.isFinite(input.isentropicK) || input.isentropicK <= 1.0) {
    messages.push({
      id: 'gas-k',
      field: 'isentropicK',
      severity: 'ERROR',
      message: 'Isentropic coefficient k (Cp/Cv) must be greater than 1.0 for the implemented gas sizing method.',
    });
  }
  if (!Number.isFinite(requiredMassFlowKgH) || requiredMassFlowKgH <= 0) {
    messages.push({
      id: 'gas-flow-zero',
      field: 'requiredFlowValue',
      severity: 'ERROR',
      message: 'Required relieving mass flow must be greater than zero.',
    });
  }
  if (!Number.isFinite(input.kd) || input.kd <= 0) {
    messages.push({
      id: 'gas-kd',
      field: 'kd',
      severity: 'ERROR',
      message: 'Discharge coefficient Kd must be positive.',
    });
  } else if (input.kd > 1.0 || input.kd < 0.5) {
    messages.push({
      id: 'gas-kd-range',
      field: 'kd',
      severity: 'WARNING',
      message: `Kd (${input.kd}) is outside typical ASME/API nozzle range (0.50–1.00). Verify manufacturer data.`,
    });
  }
  if (!Number.isFinite(input.kb) || input.kb <= 0) {
    messages.push({
      id: 'gas-kb',
      field: 'kb',
      severity: 'ERROR',
      message: 'Backpressure correction factor Kb must be positive.',
    });
  } else if (input.kb > 1.0 || input.kb < 0.2) {
    messages.push({
      id: 'gas-kb-range',
      field: 'kb',
      severity: 'WARNING',
      message: `Kb (${input.kb}) is outside typical range (0.20–1.00). Verify manufacturer capacity curves.`,
    });
  }
  if (!Number.isFinite(input.kc) || input.kc <= 0) {
    messages.push({
      id: 'gas-kc',
      field: 'kc',
      severity: 'ERROR',
      message: 'Combination factor Kc must be positive.',
    });
  } else if (input.kc > 1.0 || input.kc < 0.5) {
    messages.push({
      id: 'gas-kc-range',
      field: 'kc',
      severity: 'WARNING',
      message: `Kc (${input.kc}) is outside typical range (0.50–1.00).`,
    });
  }

  const hasErrors = messages.some((m) => m.severity === 'ERROR');
  const k = input.isentropicK;

  // Calculate critical pressure ratio & expansion coefficient if k > 1
  const criticalPressureRatio =
    k > 1 ? Math.pow(2 / (k + 1), k / (k - 1)) : 0;
  const pressureRatio = p1KpaA > 0 ? p2KpaA / p1KpaA : 0;

  // Derived SI constant from universal gas constant:
  // 3.6 / sqrt(R_u) where R_u = 8314.4626 J/(kmol*K) => 0.03948075...
  const siUnitFactor = 3.6 / Math.sqrt(UNIVERSAL_GAS_CONSTANT_J_KMOL_K);
  const expansionCoeffC =
    k > 1
      ? siUnitFactor * Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)))
      : 0;

  // Backpressure guidance warnings
  if (!hasErrors) {
    if (input.valveType === 'conventional' && input.totalBackpressureKpaG / input.setPressureKpaG > 0.1) {
      messages.push({
        id: 'gas-conv-bp-warn',
        field: 'totalBackpressureKpaG',
        severity: 'WARNING',
        message: 'Total backpressure exceeds 10% of set pressure for a conventional spring-loaded valve. Verify allowable backpressure limits per API 520 Part I or consider balanced-bellows/pilot valve.',
      });
    }
    if (pressureRatio > criticalPressureRatio) {
      messages.push({
        id: 'gas-subcritical-info',
        severity: 'WARNING',
        message: `Subcritical (non-choked) flow regime detected (P2/P1 = ${pressureRatio.toFixed(4)} > rc = ${criticalPressureRatio.toFixed(4)}). Using subcritical F2 equation; verify Kb/backpressure effects with manufacturer.`,
      });
    }
    if (input.compressibilityZ > 1.3 || input.compressibilityZ < 0.4) {
      messages.push({
        id: 'gas-z-extreme',
        field: 'compressibilityZ',
        severity: 'WARNING',
        message: `Compressibility factor Z = ${input.compressibilityZ} is far from ideal gas (1.0). Confirm real-gas or non-ideal thermodynamic sizing requirements.`,
      });
    }
  }

  let flowRegime: 'CRITICAL' | 'SUBCRITICAL' | 'INVALID' = 'INVALID';
  let subcriticalF2: number | null = null;
  let requiredAreaMm2: number | null = null;
  let selectedOrificeCapacityKgH: number | null = null;

  if (!hasErrors) {
    steps.push({
      label: 'Upstream Absolute Relieving Pressure',
      symbol: 'P1',
      equation: 'P1 = P_set × (1 + OP/100) + P_atm',
      substitution: `${input.setPressureKpaG.toFixed(2)} × (1 + ${input.overpressurePercent.toFixed(1)}/100) + ${input.atmosphericPressureKpaA.toFixed(3)}`,
      value: p1KpaA.toFixed(3),
      unit: 'kPa(a)',
      sourceType: 'CALCULATED',
    });
    steps.push({
      label: 'Downstream Absolute Backpressure',
      symbol: 'P2',
      equation: 'P2 = P_back_gauge + P_atm',
      substitution: `${input.totalBackpressureKpaG.toFixed(2)} + ${input.atmosphericPressureKpaA.toFixed(3)}`,
      value: p2KpaA.toFixed(3),
      unit: 'kPa(a)',
      sourceType: 'CALCULATED',
    });
    steps.push({
      label: 'Critical Pressure Ratio',
      symbol: 'r_c',
      equation: 'r_c = [2 / (k + 1)]^[k / (k - 1)]',
      substitution: `[2 / (${k.toFixed(4)} + 1)]^[${k.toFixed(4)} / (${k.toFixed(4)} - 1)]`,
      value: criticalPressureRatio.toFixed(5),
      unit: '-',
      sourceType: 'CALCULATED',
    });
    steps.push({
      label: 'Actual Pressure Ratio',
      symbol: 'P2 / P1',
      equation: 'r = P2 / P1',
      substitution: `${p2KpaA.toFixed(3)} / ${p1KpaA.toFixed(3)}`,
      value: pressureRatio.toFixed(5),
      unit: '-',
      sourceType: 'CALCULATED',
    });

    if (pressureRatio <= criticalPressureRatio) {
      flowRegime = 'CRITICAL';
      steps.push({
        label: 'Flow Regime Classification',
        value: 'CRITICAL (CHOKED)',
        equation: 'P2 / P1 <= r_c',
        substitution: `${pressureRatio.toFixed(5)} <= ${criticalPressureRatio.toFixed(5)}`,
        sourceType: 'CALCULATED',
      });
      steps.push({
        label: 'Gas Expansion Coefficient (SI basis)',
        symbol: 'C',
        equation: 'C = (3.6 / sqrt(R_u)) × sqrt(k × [2/(k+1)]^[(k+1)/(k-1)])',
        substitution: `${siUnitFactor.toFixed(6)} × sqrt(${k.toFixed(4)} × [2/(${k.toFixed(4)}+1)]^[...])`,
        value: expansionCoeffC.toFixed(6),
        unit: 'kg·K^0.5 / (h·mm²·kPa·kmol^0.5)',
        sourceType: 'CALCULATED',
      });

      const denom = expansionCoeffC * input.kd * p1KpaA * input.kb * input.kc;
      const radical = Math.sqrt(
        (input.relievingTemperatureK * input.compressibilityZ) /
          input.molecularWeight
      );
      requiredAreaMm2 = (requiredMassFlowKgH / denom) * radical;

      steps.push({
        label: 'Required Effective Orifice Area (Critical Flow)',
        symbol: 'A_req',
        equation: 'A = [W / (C × Kd × P1 × Kb × Kc)] × sqrt(T1 × Z / M)',
        substitution: `[${requiredMassFlowKgH.toFixed(2)} / (${expansionCoeffC.toFixed(6)} × ${input.kd} × ${p1KpaA.toFixed(2)} × ${input.kb} × ${input.kc})] × sqrt(${input.relievingTemperatureK.toFixed(2)} × ${input.compressibilityZ} / ${input.molecularWeight})`,
        value: requiredAreaMm2.toFixed(2),
        unit: 'mm²',
        sourceType: 'CALCULATED',
      });
    } else {
      flowRegime = 'SUBCRITICAL';
      const r = pressureRatio;
      const f2Term =
        (k / (k - 1)) *
        Math.pow(r, 2 / k) *
        ((1 - Math.pow(r, (k - 1) / k)) / (1 - r));
      subcriticalF2 = Math.sqrt(Math.max(0, f2Term));
      const subFactorSI = 3.6 * Math.sqrt(2 / UNIVERSAL_GAS_CONSTANT_J_KMOL_K); // ~0.055834

      steps.push({
        label: 'Flow Regime Classification',
        value: 'SUBCRITICAL (NON-CHOKED)',
        equation: 'P2 / P1 > r_c',
        substitution: `${pressureRatio.toFixed(5)} > ${criticalPressureRatio.toFixed(5)}`,
        sourceType: 'CALCULATED',
      });
      steps.push({
        label: 'Subcritical Flow Coefficient',
        symbol: 'F2',
        equation: 'F2 = sqrt([k/(k-1)] × r^(2/k) × [1 - r^((k-1)/k)] / [1 - r])',
        substitution: `r = ${r.toFixed(5)}, k = ${k.toFixed(4)}`,
        value: subcriticalF2.toFixed(5),
        unit: '-',
        sourceType: 'CALCULATED',
      });

      const radicalSub = Math.sqrt(
        (input.compressibilityZ * input.relievingTemperatureK) /
          (input.molecularWeight * p1KpaA * (p1KpaA - p2KpaA))
      );
      requiredAreaMm2 =
        (requiredMassFlowKgH /
          (subFactorSI * subcriticalF2 * input.kd * input.kc)) *
        radicalSub;

      steps.push({
        label: 'Required Effective Orifice Area (Subcritical Flow)',
        symbol: 'A_req',
        equation: 'A = [W / (0.055834 × F2 × Kd × Kc)] × sqrt(Z × T1 / [M × P1 × (P1 - P2)])',
        substitution: `[${requiredMassFlowKgH.toFixed(2)} / (${subFactorSI.toFixed(6)} × ${subcriticalF2.toFixed(5)} × ${input.kd} × ${input.kc})] × sqrt(${input.compressibilityZ} × ${input.relievingTemperatureK.toFixed(2)} / [${input.molecularWeight} × ${p1KpaA.toFixed(2)} × ${(p1KpaA - p2KpaA).toFixed(2)}])`,
        value: requiredAreaMm2.toFixed(2),
        unit: 'mm²',
        sourceType: 'CALCULATED',
      });
    }
  }

  const orificeSelection =
    requiredAreaMm2 !== null && Number.isFinite(requiredAreaMm2) && requiredAreaMm2 > 0
      ? selectApiOrifice(requiredAreaMm2, overrideOrificeDesignation, overrideNote)
      : null;

  let ratedPressure10PctKpaA: number | null = null;
  let ratedCapacityAt10PercentKgH: number | null = null;
  let ratedFlowRegime10Pct: 'CRITICAL' | 'SUBCRITICAL' | 'INVALID' | null = null;

  if (orificeSelection) {
    messages.push(...orificeSelection.messages);
    if (
      orificeSelection.selectedOrifice &&
      requiredAreaMm2 &&
      requiredAreaMm2 > 0
    ) {
      const selOrifice = orificeSelection.selectedOrifice;
      selectedOrificeCapacityKgH =
        requiredMassFlowKgH * (selOrifice.effectiveAreaMm2 / requiredAreaMm2);

      // Rated capacity of the selected API 526 orifice at 10% overpressure (for API 520 Part II line sizing)
      // Note: When overpressurePercent === 0 (used when relieving pressure is supplied directly, e.g. blow-by),
      // p1KpaA already represents the relieving pressure basis; otherwise evaluate P1 at 10% OP = 1.10 * P_set + P_atm.
      ratedPressure10PctKpaA =
        input.overpressurePercent === 0
          ? p1KpaA
          : input.setPressureKpaG * 1.1 + input.atmosphericPressureKpaA;

      if (!hasErrors && ratedPressure10PctKpaA > p2KpaA) {
        const r10 = p2KpaA / ratedPressure10PctKpaA;
        if (r10 <= criticalPressureRatio) {
          ratedFlowRegime10Pct = 'CRITICAL';
          const radicalInv = Math.sqrt(
            input.molecularWeight /
              (input.relievingTemperatureK * input.compressibilityZ)
          );
          ratedCapacityAt10PercentKgH =
            selOrifice.effectiveAreaMm2 *
            expansionCoeffC *
            input.kd *
            ratedPressure10PctKpaA *
            input.kb *
            input.kc *
            radicalInv;
        } else {
          ratedFlowRegime10Pct = 'SUBCRITICAL';
          const subFactorSI = 3.6 * Math.sqrt(2 / UNIVERSAL_GAS_CONSTANT_J_KMOL_K);
          const f2Term10 =
            (k / (k - 1)) *
            Math.pow(r10, 2 / k) *
            ((1 - Math.pow(r10, (k - 1) / k)) / (1 - r10));
          const f2_10 = Math.sqrt(Math.max(0, f2Term10));
          ratedCapacityAt10PercentKgH =
            selOrifice.effectiveAreaMm2 *
            subFactorSI *
            f2_10 *
            input.kd *
            input.kc *
            Math.sqrt(
              (input.molecularWeight *
                ratedPressure10PctKpaA *
                (ratedPressure10PctKpaA - p2KpaA)) /
                (input.compressibilityZ * input.relievingTemperatureK)
            );
        }
      } else {
        ratedFlowRegime10Pct = 'INVALID';
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

      if (ratedCapacityAt10PercentKgH !== null && ratedPressure10PctKpaA !== null) {
        steps.push({
          label: 'PSV Rated Capacity @ 10% Overpressure (Line Sizing Basis)',
          symbol: 'W_rated,10%',
          equation:
            input.overpressurePercent === 0
              ? 'Evaluated for A_sel at relieving pressure P1'
              : 'Evaluated for A_sel at P1,10% = 1.10 × P_set + P_atm',
          substitution: `A_sel = ${selOrifice.effectiveAreaMm2.toFixed(1)} mm², P1,10% = ${ratedPressure10PctKpaA.toFixed(2)} kPa(a), regime = ${ratedFlowRegime10Pct}`,
          value: ratedCapacityAt10PercentKgH.toFixed(2),
          unit: 'kg/h',
          sourceType: 'CALCULATED',
        });
      }
    }
  }

  let status: CalculationStatus = 'INCOMPLETE';
  if (input.outsideScopeFlag) {
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
    methodId: GAS_METHOD_ID,
    methodVersion: GAS_METHOD_VERSION,
    standardReferenceTitle: 'API Standard 520 Part I (Preliminary Gas/Vapour Sizing)',
    adoptedEdition: standardBasis.api520Part1Edition,
    timestamp: new Date().toISOString(),
    applicationVersion: APPLICATION_VERSION,
    inputs: {
      fluidName: { value: input.fluidName || '(Not specified)', sourceType: 'USER_INPUT' as const },
      setPressure: { value: input.setPressureKpaG, unit: 'kPa(g)', sourceType: 'USER_INPUT' as const },
      overpressurePercent: { value: input.overpressurePercent, unit: '%', sourceType: 'USER_INPUT' as const },
      totalBackpressure: { value: input.totalBackpressureKpaG, unit: 'kPa(g)', sourceType: 'USER_INPUT' as const },
      atmosphericPressure: { value: input.atmosphericPressureKpaA, unit: 'kPa(a)', sourceType: 'USER_INPUT' as const },
      relievingTemperature: { value: input.relievingTemperatureK, unit: 'K', sourceType: 'USER_INPUT' as const },
      molecularWeight: { value: input.molecularWeight, unit: 'kg/kmol', sourceType: 'USER_INPUT' as const },
      compressibilityZ: { value: input.compressibilityZ, unit: '-', sourceType: 'USER_INPUT' as const },
      isentropicK: { value: input.isentropicK, unit: '-', sourceType: 'USER_INPUT' as const },
      requiredFlowInput: { value: input.requiredFlowValue, unit: input.loadInputMode, sourceType: 'USER_INPUT' as const },
    },
    internalValues: {
      P1_abs: { value: p1KpaA, unit: 'kPa(a)' },
      P2_abs: { value: p2KpaA, unit: 'kPa(a)' },
      T1: { value: input.relievingTemperatureK, unit: 'K' },
      massFlow: { value: requiredMassFlowKgH, unit: 'kg/h' },
      ...(ratedPressure10PctKpaA !== null ? { P1_10pct_abs: { value: ratedPressure10PctKpaA, unit: 'kPa(a)' } } : {}),
    },
    constants: {
      R_u: { value: UNIVERSAL_GAS_CONSTANT_J_KMOL_K, unit: 'J/(kmol·K)', note: 'Universal gas constant' },
      siFactor: { value: siUnitFactor, unit: '3.6 / sqrt(R_u)' },
    },
    correctionFactors: {
      Kd: { value: input.kd, sourceType: 'USER_INPUT' as const, description: 'Effective discharge coefficient' },
      Kb: { value: input.kb, sourceType: 'USER_INPUT' as const, description: 'Backpressure capacity correction factor' },
      Kc: { value: input.kc, sourceType: 'USER_INPUT' as const, description: 'Rupture-disk combination factor' },
    },
    intermediateValues: {
      pressureRatio: { value: Number(pressureRatio.toFixed(6)), unit: '-' },
      criticalPressureRatio: { value: Number(criticalPressureRatio.toFixed(6)), unit: '-' },
      flowRegime: { value: flowRegime, unit: '-' },
      expansionCoeffC: { value: Number(expansionCoeffC.toFixed(6)), unit: 'SI' },
      ...(subcriticalF2 !== null ? { subcriticalF2: { value: Number(subcriticalF2.toFixed(6)), unit: '-' } } : {}),
      ...(orificeSelection?.nozzleSizeLabel ? { nominalInletOutlet: { value: orificeSelection.nozzleSizeLabel, unit: 'in' } } : {}),
      ...(ratedCapacityAt10PercentKgH !== null ? { ratedCapacityAt10PercentKgH: { value: Number(ratedCapacityAt10PercentKgH.toFixed(2)), unit: 'kg/h' } } : {}),
    },
    finalValue: {
      requiredAreaMm2: requiredAreaMm2 !== null ? Number(requiredAreaMm2.toFixed(3)) : null,
      requiredMassFlowKgH: Number(requiredMassFlowKgH.toFixed(3)),
      status,
    },
    steps,
  };

  return {
    status,
    messages,
    upstreamPressureKpaA: p1KpaA,
    downstreamPressureKpaA: p2KpaA,
    pressureRatio,
    criticalPressureRatio,
    flowRegime,
    expansionCoeffC,
    subcriticalF2,
    requiredMassFlowKgH,
    requiredAreaMm2,
    requiredAreaCm2: requiredAreaMm2 !== null ? requiredAreaMm2 / 100 : null,
    requiredAreaIn2: requiredAreaMm2 !== null ? requiredAreaMm2 / IN2_TO_MM2 : null,
    orificeSelection,
    selectedOrificeCapacityKgH,
    ratedPressure10PctKpaA,
    ratedCapacityAt10PercentKgH,
    ratedFlowRegime10Pct,
    governingDifferentialKpa: governingDiffKpa,
    trace,
  };
}

export const GAS_CALCULATION_ENGINE_META = {
  engineVersion: CALCULATION_ENGINE_VERSION,
  methodId: GAS_METHOD_ID,
  methodVersion: GAS_METHOD_VERSION,
};
