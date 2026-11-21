import {
  APPLICATION_VERSION,
  BREAKTHROUGH_WARNING,
  DEFAULT_STANDARD_BASIS,
  STANDARD_REF_CONDITION_PRESETS,
  UNIVERSAL_GAS_CONSTANT_J_KMOL_K,
} from '../constants/defaultFactors';
import {
  CalculationStatus,
  CalculationStep,
  GasPSVInput,
  StandardReferenceBasis,
  ValidationMessage,
  VapourBreakthroughInput,
  VapourBreakthroughResult,
} from '../models/calculationTypes';
import { sizeGasPSV } from './gasSizing';
import { massFlowKgHToStandardVolM3H } from './unitConversions';

export const BREAKTHROUGH_METHOD_ID = 'API521-GAS-BLOWBY-PRELIM';
export const BREAKTHROUGH_METHOD_VERSION = '1.0.0';

/**
 * Pure deterministic Vapour Breakthrough / Gas Blow-By sizing engine.
 * Strictly separates:
 *   1) Control-valve compressible sizing (ISA S75.01 / IEC 60534-2-1 N8*Fp*Cv*P1*Y*sqrt(x*M/(T1*Z)))
 *   2) Restriction-orifice / nozzle / known-area compressible flow
 *   3) Externally supplied / manufacturer-rated mass flow
 * Never conflates Cv with physical bore area.
 */
export function calculateBreakthroughAndSizePSV(
  input: VapourBreakthroughInput,
  standardBasis: StandardReferenceBasis = DEFAULT_STANDARD_BASIS,
  overrideOrificeDesignation?: string | null,
  overrideNote?: string
): VapourBreakthroughResult {
  const messages: ValidationMessage[] = [];
  const steps: CalculationStep[] = [];

  messages.push({
    id: 'bb-mandatory-warning',
    severity: 'WARNING',
    message: BREAKTHROUGH_WARNING,
  });

  if (input.transientDepletionFlag) {
    messages.push({
      id: 'bb-transient-outside',
      severity: 'ERROR',
      message:
        'OUTSIDE IMPLEMENTED METHOD – specialist analysis required. Transient source depletion or dynamic depressuring requires dynamic simulation.',
    });
  }

  const p1KpaA = input.sourcePressureKpaG + input.atmosphericPressureKpaA;
  const p2DestKpaA =
    input.destinationRelievingPressureKpaG + input.atmosphericPressureKpaA;

  if (!Number.isFinite(input.atmosphericPressureKpaA) || input.atmosphericPressureKpaA <= 0) {
    messages.push({
      id: 'bb-patm',
      field: 'atmosphericPressureKpaA',
      severity: 'ERROR',
      message: 'Atmospheric pressure must be positive.',
    });
  }
  if (!Number.isFinite(p1KpaA) || p1KpaA <= 0) {
    messages.push({
      id: 'bb-p1',
      field: 'sourcePressureKpaG',
      severity: 'ERROR',
      message: 'High-pressure source absolute pressure must be greater than zero.',
    });
  }
  if (!Number.isFinite(p2DestKpaA) || p2DestKpaA <= 0) {
    messages.push({
      id: 'bb-p2',
      field: 'destinationRelievingPressureKpaG',
      severity: 'ERROR',
      message: 'Destination relieving absolute pressure must be greater than zero.',
    });
  }
  if (p1KpaA <= p2DestKpaA) {
    messages.push({
      id: 'bb-p1-le-p2',
      field: 'sourcePressureKpaG',
      severity: 'ERROR',
      message:
        'Source absolute pressure must exceed destination relieving absolute pressure for gas blow-by to occur.',
    });
  }
  if (!Number.isFinite(input.sourceTemperatureK) || input.sourceTemperatureK <= 0) {
    messages.push({
      id: 'bb-temp',
      field: 'sourceTemperatureK',
      severity: 'ERROR',
      message: 'Source gas temperature must be greater than 0 K.',
    });
  }
  if (!Number.isFinite(input.sourceMw) || input.sourceMw <= 0) {
    messages.push({
      id: 'bb-mw',
      field: 'sourceMw',
      severity: 'ERROR',
      message: 'Source molecular weight must be positive.',
    });
  }
  if (!Number.isFinite(input.sourceZ) || input.sourceZ <= 0) {
    messages.push({
      id: 'bb-z',
      field: 'sourceZ',
      severity: 'ERROR',
      message: 'Source compressibility factor Z must be positive.',
    });
  }
  if (!Number.isFinite(input.sourceK) || input.sourceK <= 1) {
    messages.push({
      id: 'bb-k',
      field: 'sourceK',
      severity: 'ERROR',
      message: 'Source Cp/Cv (k) must be greater than 1.0.',
    });
  }

  const k = input.sourceK;
  const criticalPressureRatio =
    k > 1 ? Math.pow(2 / (k + 1), k / (k - 1)) : 0;
  const pressureRatio = p1KpaA > 0 ? p2DestKpaA / p1KpaA : 0;

  let restrictionFlowRegime:
    | 'CRITICAL'
    | 'SUBCRITICAL'
    | 'EXTERNALLY_SUPPLIED'
    | 'INVALID' = 'INVALID';
  let effectiveRestrictionAreaMm2: number | null = null;
  let betaRatio: number | null = null;
  let breakthroughMassFlowKgH: number | null = null;

  const hasBaseErrors = messages.some((m) => m.severity === 'ERROR');

  if (!hasBaseErrors) {
    steps.push({
      label: 'Source Absolute Pressure',
      symbol: 'P_src',
      equation: 'P_src = P_src_g + P_atm',
      substitution: `${input.sourcePressureKpaG.toFixed(2)} + ${input.atmosphericPressureKpaA.toFixed(3)}`,
      value: p1KpaA.toFixed(3),
      unit: 'kPa(a)',
      sourceType: 'CALCULATED',
    });
    steps.push({
      label: 'Destination Relieving Absolute Pressure',
      symbol: 'P_dest',
      equation: 'P_dest = P_dest_g + P_atm',
      substitution: `${input.destinationRelievingPressureKpaG.toFixed(2)} + ${input.atmosphericPressureKpaA.toFixed(3)}`,
      value: p2DestKpaA.toFixed(3),
      unit: 'kPa(a)',
      sourceType: 'CALCULATED',
    });

    if (
      input.restrictionType === 'known_rated_flow' ||
      input.restrictionType === 'user_entered'
    ) {
      if (
        !Number.isFinite(input.externallySuppliedMassFlowKgH) ||
        input.externallySuppliedMassFlowKgH <= 0
      ) {
        messages.push({
          id: 'bb-ext-flow',
          field: 'externallySuppliedMassFlowKgH',
          severity: 'ERROR',
          message: 'Externally supplied / rated breakthrough flow must be positive.',
        });
      } else {
        restrictionFlowRegime = 'EXTERNALLY_SUPPLIED';
        breakthroughMassFlowKgH = input.externallySuppliedMassFlowKgH;
        steps.push({
          label: 'Externally Supplied / Rated Breakthrough Load',
          symbol: 'W_bb',
          value: breakthroughMassFlowKgH.toFixed(2),
          unit: 'kg/h',
          sourceType: 'USER_INPUT',
        });
      }
    } else if (input.restrictionType === 'control_valve') {
      // ISA S75.01 / IEC 60534-2-1 compressible gas valve sizing (strictly separate from orifice area)
      if (!Number.isFinite(input.valveCv) || input.valveCv <= 0) {
        messages.push({
          id: 'bb-cv',
          field: 'valveCv',
          severity: 'ERROR',
          message: 'Control valve Cv must be positive.',
        });
      }
      if (!Number.isFinite(input.valveXt) || input.valveXt <= 0 || input.valveXt > 1.2) {
        messages.push({
          id: 'bb-xt',
          field: 'valveXt',
          severity: 'ERROR',
          message: 'Pressure differential ratio factor xT must be > 0 (typically 0.15–0.90).',
        });
      }
      if (!Number.isFinite(input.valveFp) || input.valveFp <= 0) {
        messages.push({
          id: 'bb-fp',
          field: 'valveFp',
          severity: 'ERROR',
          message: 'Piping geometry factor Fp must be positive.',
        });
      }
      if (!Number.isFinite(input.valveOpeningPercent) || input.valveOpeningPercent <= 0 || input.valveOpeningPercent > 100) {
        messages.push({
          id: 'bb-opening',
          field: 'valveOpeningPercent',
          severity: 'ERROR',
          message: 'Valve opening percentage must be between > 0% and 100%.',
        });
      }

      if (!messages.some((m) => m.severity === 'ERROR')) {
        const effectiveCv = input.valveCv * (input.valveOpeningPercent / 100);
        const fk = k / 1.4;
        const xActual = (p1KpaA - p2DestKpaA) / p1KpaA;
        const xChoked = fk * input.valveXt;
        const isChoked = xActual >= xChoked;
        const xEff = Math.min(xActual, xChoked);
        const expansionY = Math.max(0.667, 1 - xEff / (3 * fk * input.valveXt));
        const n8Si = 0.948; // IEC 60534-2-1 N8 for W [kg/h], P1 [kPa], Cv

        breakthroughMassFlowKgH =
          n8Si *
          input.valveFp *
          effectiveCv *
          p1KpaA *
          expansionY *
          Math.sqrt(
            (xEff * input.sourceMw) /
              (input.sourceTemperatureK * input.sourceZ)
          );
        restrictionFlowRegime = isChoked ? 'CRITICAL' : 'SUBCRITICAL';

        steps.push({
          label: 'Control Valve Choked Threshold',
          symbol: 'Fk × xT',
          equation: 'Fk = k / 1.4;  x_actual = (P_src - P_dest) / P_src',
          substitution: `Fk·xT = ${(fk * input.valveXt).toFixed(4)}, x_actual = ${xActual.toFixed(4)}`,
          value: isChoked ? 'CHOKED AT VALVE' : 'SUBCRITICAL AT VALVE',
          sourceType: 'CALCULATED',
        });
        steps.push({
          label: 'Gas Expansion Factor',
          symbol: 'Y',
          equation: 'Y = 1 - x_eff / (3 × Fk × xT)',
          substitution: `1 - ${xEff.toFixed(4)} / (3 × ${fk.toFixed(4)} × ${input.valveXt})`,
          value: expansionY.toFixed(4),
          unit: '-',
          sourceType: 'CALCULATED',
        });
        steps.push({
          label: 'Breakthrough Mass Flow (Control Valve)',
          symbol: 'W_bb',
          equation: 'W = N8 × Fp × Cv_eff × P_src × Y × sqrt(x_eff × M / (T_src × Z))',
          substitution: `${n8Si} × ${input.valveFp} × ${effectiveCv.toFixed(2)} × ${p1KpaA.toFixed(2)} × ${expansionY.toFixed(4)} × sqrt(${xEff.toFixed(4)} × ${input.sourceMw} / (${input.sourceTemperatureK.toFixed(2)} × ${input.sourceZ}))`,
          value: breakthroughMassFlowKgH.toFixed(2),
          unit: 'kg/h',
          sourceType: 'CALCULATED',
        });
      }
    } else {
      // restriction_orifice, pipe_nozzle, known_area
      let cd = input.orificeCd;
      let areaMm2 = 0;

      if (input.restrictionType === 'known_area') {
        areaMm2 = input.knownEffectiveAreaMm2;
        cd = input.knownAreaCd;
        if (!Number.isFinite(areaMm2) || areaMm2 <= 0) {
          messages.push({
            id: 'bb-known-area',
            field: 'knownEffectiveAreaMm2',
            severity: 'ERROR',
            message: 'Effective restriction area must be positive.',
          });
        }
      } else {
        if (!Number.isFinite(input.orificeBoreMm) || input.orificeBoreMm <= 0) {
          messages.push({
            id: 'bb-bore',
            field: 'orificeBoreMm',
            severity: 'ERROR',
            message: 'Restriction bore diameter must be positive.',
          });
        } else {
          areaMm2 = (Math.PI * Math.pow(input.orificeBoreMm, 2)) / 4;
          if (
            Number.isFinite(input.upstreamPipeDiameterMm) &&
            input.upstreamPipeDiameterMm > 0
          ) {
            betaRatio = input.orificeBoreMm / input.upstreamPipeDiameterMm;
            if (betaRatio > 0.75) {
              messages.push({
                id: 'bb-beta-high',
                field: 'orificeBoreMm',
                severity: 'WARNING',
                message: `Beta ratio (${betaRatio.toFixed(3)}) exceeds 0.75. Velocity of approach / line losses may be significant.`,
              });
            }
          }
        }
      }

      if (!Number.isFinite(cd) || cd <= 0 || cd > 1.05) {
        messages.push({
          id: 'bb-cd',
          field: 'orificeCd',
          severity: 'ERROR',
          message: 'Restriction discharge coefficient Cd must be positive (typically 0.60–0.98).',
        });
      }

      if (!messages.some((m) => m.severity === 'ERROR') && areaMm2 > 0) {
        effectiveRestrictionAreaMm2 = areaMm2;
        const siUnitFactor = 3.6 / Math.sqrt(UNIVERSAL_GAS_CONSTANT_J_KMOL_K);
        const coeffC =
          siUnitFactor *
          Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1)));

        if (pressureRatio <= criticalPressureRatio) {
          restrictionFlowRegime = 'CRITICAL';
          breakthroughMassFlowKgH =
            coeffC *
            cd *
            areaMm2 *
            p1KpaA *
            Math.sqrt(input.sourceMw / (input.sourceTemperatureK * input.sourceZ));

          steps.push({
            label: 'Restriction Flow Regime',
            value: 'CRITICAL (CHOKED)',
            equation: 'P_dest / P_src <= r_c',
            substitution: `${pressureRatio.toFixed(4)} <= ${criticalPressureRatio.toFixed(4)}`,
            sourceType: 'CALCULATED',
          });
          steps.push({
            label: 'Breakthrough Mass Flow (Critical Orifice/Area)',
            symbol: 'W_bb',
            equation: 'W = C × Cd × A_eff × P_src × sqrt(M / (T_src × Z))',
            substitution: `${coeffC.toFixed(6)} × ${cd} × ${areaMm2.toFixed(2)} × ${p1KpaA.toFixed(2)} × sqrt(${input.sourceMw} / (${input.sourceTemperatureK.toFixed(2)} × ${input.sourceZ}))`,
            value: breakthroughMassFlowKgH.toFixed(2),
            unit: 'kg/h',
            sourceType: 'CALCULATED',
          });
        } else {
          restrictionFlowRegime = 'SUBCRITICAL';
          const r = pressureRatio;
          const f2 = Math.sqrt(
            Math.max(
              0,
              (k / (k - 1)) *
                Math.pow(r, 2 / k) *
                ((1 - Math.pow(r, (k - 1) / k)) / (1 - r))
            )
          );
          const subFactorSI = 3.6 * Math.sqrt(2 / UNIVERSAL_GAS_CONSTANT_J_KMOL_K);
          breakthroughMassFlowKgH =
            subFactorSI *
            f2 *
            cd *
            areaMm2 *
            Math.sqrt(
              (input.sourceMw * p1KpaA * (p1KpaA - p2DestKpaA)) /
                (input.sourceZ * input.sourceTemperatureK)
            );

          steps.push({
            label: 'Restriction Flow Regime',
            value: 'SUBCRITICAL (NON-CHOKED)',
            equation: 'P_dest / P_src > r_c',
            substitution: `${pressureRatio.toFixed(4)} > ${criticalPressureRatio.toFixed(4)}`,
            sourceType: 'CALCULATED',
          });
          steps.push({
            label: 'Breakthrough Mass Flow (Subcritical Orifice/Area)',
            symbol: 'W_bb',
            equation: 'W = 0.055834 × F2 × Cd × A_eff × sqrt(M × P_src × (P_src - P_dest) / (Z × T_src))',
            substitution: `${subFactorSI.toFixed(6)} × ${f2.toFixed(4)} × ${cd} × ${areaMm2.toFixed(2)} × sqrt(...)`,
            value: breakthroughMassFlowKgH.toFixed(2),
            unit: 'kg/h',
            sourceType: 'CALCULATED',
          });
        }
      }
    }
  }

  // Pass calculated breakthrough mass flow into destination Gas PSV sizing engine
  let psvSizing = null;
  if (breakthroughMassFlowKgH !== null && breakthroughMassFlowKgH > 0) {
    const gasInput: GasPSVInput = {
      fluidName: `Breakthrough Gas (${input.scenarioName || 'Source'})`,
      compositionDescription: `From ${input.sourceEquipment || 'HP Source'} to ${input.destinationEquipment || 'LP System'}`,
      molecularWeight: input.sourceMw,
      compressibilityZ: input.sourceZ,
      isentropicK: input.sourceK,
      relievingTemperatureK: input.sourceTemperatureK,
      loadInputMode: 'kg/h',
      requiredFlowValue: breakthroughMassFlowKgH,
      standardRefConditions: {
        ...STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)'],
      },
      setPressureKpaG: input.destinationRelievingPressureKpaG,
      overpressurePercent: 0, // destinationRelievingPressureKpaG is already the relieving pressure
      totalBackpressureKpaG: input.destinationBackpressureKpaG,
      atmosphericPressureKpaA: input.atmosphericPressureKpaA,
      kd: input.psvKd,
      kb: input.psvKb,
      kc: input.psvKc,
      valveType: 'conventional',
      outsideScopeFlag: input.transientDepletionFlag,
    };

    psvSizing = sizeGasPSV(
      gasInput,
      standardBasis,
      overrideOrificeDesignation,
      overrideNote
    );
  }

  const breakthroughStdVolNm3H =
    breakthroughMassFlowKgH !== null
      ? massFlowKgHToStandardVolM3H(
          breakthroughMassFlowKgH,
          input.sourceMw,
          STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)']
        )
      : null;

  const allMessages = [
    ...messages,
    ...(psvSizing ? psvSizing.messages : []),
  ];

  let status: CalculationStatus = 'INCOMPLETE';
  if (input.transientDepletionFlag) {
    status = 'OUTSIDE_IMPLEMENTED_METHOD';
  } else if (allMessages.some((m) => m.severity === 'ERROR')) {
    status =
      psvSizing && psvSizing.requiredAreaMm2 !== null ? 'FAIL' : 'INCOMPLETE';
  } else if (psvSizing) {
    status = psvSizing.status;
  }

  const trace = {
    methodId: BREAKTHROUGH_METHOD_ID,
    methodVersion: BREAKTHROUGH_METHOD_VERSION,
    standardReferenceTitle:
      'API Standard 521 / IEC 60534 / API Standard 520 Part I (Vapour Breakthrough Screening)',
    adoptedEdition: `${standardBasis.api521Edition} + ${standardBasis.api520Part1Edition}`,
    timestamp: new Date().toISOString(),
    applicationVersion: APPLICATION_VERSION,
    inputs: {
      restrictionType: { value: input.restrictionType, sourceType: 'USER_INPUT' as const },
      sourcePressure: { value: input.sourcePressureKpaG, unit: 'kPa(g)', sourceType: 'USER_INPUT' as const },
      destinationRelievingPressure: { value: input.destinationRelievingPressureKpaG, unit: 'kPa(g)', sourceType: 'USER_INPUT' as const },
      sourceTemperature: { value: input.sourceTemperatureK, unit: 'K', sourceType: 'USER_INPUT' as const },
      sourceMw: { value: input.sourceMw, unit: 'kg/kmol', sourceType: 'USER_INPUT' as const },
      sourceZ: { value: input.sourceZ, unit: '-', sourceType: 'USER_INPUT' as const },
      sourceK: { value: input.sourceK, unit: '-', sourceType: 'USER_INPUT' as const },
    },
    internalValues: {
      P_src_abs: { value: p1KpaA, unit: 'kPa(a)' },
      P_dest_abs: { value: p2DestKpaA, unit: 'kPa(a)' },
      pressureRatio: { value: pressureRatio, unit: '-' },
      criticalPressureRatio: { value: criticalPressureRatio, unit: '-' },
    },
    constants: {
      universalGasConstant: { value: UNIVERSAL_GAS_CONSTANT_J_KMOL_K, unit: 'J/(kmol·K)' },
    },
    correctionFactors: {
      psvKd: { value: input.psvKd, sourceType: 'USER_INPUT' as const, description: 'Destination PSV discharge coefficient' },
      psvKb: { value: input.psvKb, sourceType: 'USER_INPUT' as const, description: 'Destination PSV backpressure factor' },
      psvKc: { value: input.psvKc, sourceType: 'USER_INPUT' as const, description: 'Destination PSV combination factor' },
    },
    intermediateValues: {
      restrictionFlowRegime: { value: restrictionFlowRegime },
      breakthroughMassFlowKgH: { value: breakthroughMassFlowKgH ?? 'N/A', unit: 'kg/h' },
      effectiveRestrictionAreaMm2: { value: effectiveRestrictionAreaMm2 ?? 'N/A', unit: 'mm²' },
    },
    finalValue: {
      requiredAreaMm2: psvSizing?.requiredAreaMm2 ?? null,
      requiredMassFlowKgH: breakthroughMassFlowKgH,
      status,
    },
    steps: [...steps, ...(psvSizing ? psvSizing.trace.steps : [])],
  };

  return {
    status,
    messages: allMessages,
    sourcePressureKpaA: p1KpaA,
    destinationPressureKpaA: p2DestKpaA,
    pressureRatio,
    criticalPressureRatio,
    restrictionFlowRegime,
    effectiveRestrictionAreaMm2,
    betaRatio,
    breakthroughMassFlowKgH,
    breakthroughStdVolNm3H,
    psvSizing,
    trace,
  };
}
