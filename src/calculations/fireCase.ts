import {
  APPLICATION_VERSION,
  DEFAULT_STANDARD_BASIS,
} from '../constants/defaultFactors';
import {
  CalculationStatus,
  CalculationStep,
  FireCaseInput,
  FireCaseResult,
  FireEquipmentBreakdownRow,
  FireGeometryType,
  GasPSVInput,
  HeadType,
  StandardReferenceBasis,
  ValidationMessage,
} from '../models/calculationTypes';
import { sizeGasPSV } from './gasSizing';
import { STANDARD_REF_CONDITION_PRESETS } from '../constants/defaultFactors';
import { BTU_H_TO_KW, LB_TO_KG } from './unitConversions';

export const FIRE_METHOD_ID = 'API521-POOL-FIRE-PRELIM';
export const FIRE_METHOD_VERSION = '1.1.0';

function getHeadDepthM(diameterM: number, headType: HeadType, overrideM?: number): number {
  if (overrideM !== undefined && Number.isFinite(overrideM) && overrideM >= 0) {
    return overrideM;
  }
  switch (headType) {
    case '2:1_elliptical':
      return diameterM / 4;
    case 'hemispherical':
      return diameterM / 2;
    case 'torispherical':
      return 0.1935 * diameterM;
    case 'flat':
      return 0;
  }
}

/**
 * Numerical surface area of a vertical head from z=0 (bottom apex) up to z=hWetted
 * by integrating 2*pi*r(z)*sqrt(1 + (dr/dz)^2) dz.
 */
function verticalHeadWettedArea(
  diameterM: number,
  headDepthM: number,
  hWettedM: number
): number {
  const R = diameterM / 2;
  if (hWettedM <= 0 || R <= 0) return 0;
  if (headDepthM <= 0) {
    // Flat bottom head
    return Math.PI * R * R;
  }
  const hCap = Math.min(hWettedM, headDepthM);
  const steps = 80;
  const dz = hCap / steps;
  let area = 0;

  for (let i = 0; i < steps; i++) {
    const zMid = (i + 0.5) * dz;
    // Ellipsoid profile: (r/R)^2 + ((b - z)/b)^2 = 1
    const u = Math.max(-1, Math.min(1, 1 - zMid / headDepthM));
    const oneMinusU2 = Math.max(1e-12, 1 - u * u);
    const r = R * Math.sqrt(oneMinusU2);
    // dr/dz = (R / b) * (u / sqrt(1 - u^2))
    const drdz = (R / headDepthM) * (u / Math.sqrt(oneMinusU2));
    area += 2 * Math.PI * r * Math.sqrt(1 + drdz * drdz) * dz;
  }
  return area;
}

/**
 * Numerical surface area of ONE horizontal vessel head wetted from y=0 (bottom) to y=hWetted (up to D).
 * Integrates polar disk element dA_projected * sqrt(1 + |grad x|^2) over y <= hWetted.
 */
function horizontalSingleHeadWettedArea(
  diameterM: number,
  headDepthM: number,
  hWettedM: number
): number {
  const R = diameterM / 2;
  if (hWettedM <= 0 || R <= 0) return 0;
  const hCap = Math.min(hWettedM, diameterM);

  const nu = 60;
  const nTheta = 120;
  const du = 1 / nu;
  const dTheta = (2 * Math.PI) / nTheta;
  const bRatioSq = headDepthM <= 0 ? 0 : (headDepthM * headDepthM) / (R * R);
  let area = 0;

  // Singularity-free substitution u = sqrt(1 - (r/R)^2) in [0, 1]
  // r = R * sqrt(1 - u^2), r*dr*stretch = R^2 * sqrt(u^2 + (b/R)^2 * (1 - u^2)) du
  for (let iu = 0; iu < nu; iu++) {
    const u = (iu + 0.5) * du;
    const oneMinusU2 = 1 - u * u;
    const r = R * Math.sqrt(oneMinusU2);
    const jacStretch = R * R * Math.sqrt(u * u + bRatioSq * oneMinusU2);

    for (let it = 0; it < nTheta; it++) {
      const theta = (it + 0.5) * dTheta;
      const yFromBottom = R + r * Math.sin(theta);
      if (yFromBottom <= hCap) {
        area += jacStretch * du * dTheta;
      }
    }
  }
  return area;
}

function getVesselMaxHeightM(params: {
  geometryType: FireGeometryType;
  diameterM: number;
  tangentLengthM: number;
  headType: HeadType;
  headDepthOverrideM?: number;
}): number {
  const hHead = getHeadDepthM(
    params.diameterM,
    params.headType,
    params.headDepthOverrideM
  );
  if (
    params.geometryType === 'vertical_cylinder_heads' ||
    params.geometryType === 'custom'
  ) {
    return params.tangentLengthM + 2 * hHead;
  }
  return params.diameterM;
}

function calculateSingleGeometryWettedArea(params: {
  geometryType: FireGeometryType;
  diameterM: number;
  tangentLengthM: number;
  headType: HeadType;
  headDepthOverrideM?: number;
  relievingLiquidLevelM: number;
  elevationAboveGradeM: number;
  fireExposureLimitM: number;
}): {
  shellAreaM2: number;
  headAreaM2: number;
  perUnitAreaM2: number;
  effectiveLiquidHeightM: number;
  effectiveFireHeightM: number;
} {
  const D = Math.max(0, params.diameterM);
  const L = Math.max(0, params.tangentLengthM);
  const hHead = getHeadDepthM(D, params.headType, params.headDepthOverrideM);
  const effectiveFireHeightM = Math.max(
    0,
    params.fireExposureLimitM - params.elevationAboveGradeM
  );
  const effectiveLiquidHeightM = Math.max(
    0,
    Math.min(params.relievingLiquidLevelM, effectiveFireHeightM)
  );

  let shellAreaM2 = 0;
  let headAreaM2 = 0;

  if (
    params.geometryType === 'vertical_cylinder_heads' ||
    params.geometryType === 'custom'
  ) {
    const bottomHeadArea = verticalHeadWettedArea(
      D,
      hHead,
      effectiveLiquidHeightM
    );
    const hShell = Math.max(
      0,
      Math.min(effectiveLiquidHeightM - hHead, L)
    );
    shellAreaM2 = Math.PI * D * hShell;

    // Top head only if liquid + fire exposure exceed bottom head + shell
    let topHeadArea = 0;
    const hAboveTopTan = effectiveLiquidHeightM - (hHead + L);
    if (hAboveTopTan > 0) {
      const totalSingleHead = verticalHeadWettedArea(D, hHead, hHead);
      const dryTop = verticalHeadWettedArea(
        D,
        hHead,
        Math.max(0, hHead - hAboveTopTan)
      );
      topHeadArea = Math.max(0, totalSingleHead - dryTop);
    }
    headAreaM2 = bottomHeadArea + topHeadArea;
  } else if (
    params.geometryType === 'horizontal_cylinder_heads' ||
    params.geometryType === 'heat_exchanger_shell'
  ) {
    const hClamped = Math.min(effectiveLiquidHeightM, D);
    const R = D / 2;
    if (R > 0 && hClamped > 0) {
      const cosVal = Math.max(-1, Math.min(1, 1 - hClamped / R));
      const theta = 2 * Math.acos(cosVal);
      shellAreaM2 = R * theta * L;
      headAreaM2 = 2 * horizontalSingleHeadWettedArea(D, hHead, hClamped);
    }
  } else if (params.geometryType === 'sphere') {
    const hClamped = Math.min(effectiveLiquidHeightM, D);
    shellAreaM2 = Math.PI * D * hClamped;
    headAreaM2 = 0;
  }

  return {
    shellAreaM2,
    headAreaM2,
    perUnitAreaM2: shellAreaM2 + headAreaM2,
    effectiveLiquidHeightM,
    effectiveFireHeightM,
  };
}

export function calculateWettedArea(input: FireCaseInput): {
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
} {
  const effectiveFireHeightM = Math.max(
    0,
    input.fireExposureLimitM - input.elevationAboveGradeM
  );
  const effectiveLiquidHeightM = Math.max(
    0,
    Math.min(input.relievingLiquidLevelM, effectiveFireHeightM)
  );

  const primaryQty = Math.max(1, Math.round(input.numberOfVessels || 1));
  let primaryShellM2 = 0;
  let primaryHeadM2 = 0;
  let primaryPerUnitM2 = 0;

  const isPrimaryDirect =
    input.userOverrideWettedArea || input.geometryType === 'user_entered_area';

  if (isPrimaryDirect) {
    primaryShellM2 = Math.max(0, input.userWettedAreaM2);
    primaryHeadM2 = 0;
    primaryPerUnitM2 = primaryShellM2;
  } else {
    const primaryGeom = calculateSingleGeometryWettedArea({
      geometryType: input.geometryType,
      diameterM: input.diameterM,
      tangentLengthM: input.tangentLengthM,
      headType: input.headType,
      headDepthOverrideM: input.headDepthOverrideM,
      relievingLiquidLevelM: input.relievingLiquidLevelM,
      elevationAboveGradeM: input.elevationAboveGradeM,
      fireExposureLimitM: input.fireExposureLimitM,
    });
    primaryShellM2 = primaryGeom.shellAreaM2;
    primaryHeadM2 = primaryGeom.headAreaM2;
    primaryPerUnitM2 = primaryGeom.perUnitAreaM2;
  }

  const primaryWettedAreaM2 = primaryPerUnitM2 * primaryQty;
  const itemizedEquipment: FireEquipmentBreakdownRow[] = [
    {
      id: 'primary-equipment',
      tag: 'Primary Vessel / Equipment',
      description: isPrimaryDirect
        ? 'Direct wetted area entry'
        : input.geometryType.replace(/_/g, ' '),
      entryMode: isPrimaryDirect ? 'direct_area' : 'geometry',
      shellAreaPerUnitM2: primaryShellM2,
      headAreaPerUnitM2: primaryHeadM2,
      perUnitAreaM2: primaryPerUnitM2,
      quantity: primaryQty,
      totalAreaM2: primaryWettedAreaM2,
    },
  ];

  let additionalEquipmentWettedAreaM2 = 0;
  const extras = input.additionalEquipment ?? [];
  for (const item of extras) {
    if (!item.enabled) continue;
    const qty = Math.max(1, Math.round(item.quantity || 1));
    let shellPerUnit = 0;
    let headPerUnit = 0;
    let perUnit = 0;

    if (item.entryMode === 'direct_area') {
      perUnit = Math.max(0, item.directWettedAreaM2);
      shellPerUnit = perUnit;
      headPerUnit = 0;
    } else {
      const geom = calculateSingleGeometryWettedArea({
        geometryType: item.geometryType,
        diameterM: item.diameterM,
        tangentLengthM: item.tangentLengthM,
        headType: item.headType,
        headDepthOverrideM: item.headDepthOverrideM,
        relievingLiquidLevelM: item.relievingLiquidLevelM,
        elevationAboveGradeM: item.elevationAboveGradeM,
        fireExposureLimitM: input.fireExposureLimitM,
      });
      shellPerUnit = geom.shellAreaM2;
      headPerUnit = geom.headAreaM2;
      perUnit = geom.perUnitAreaM2;
    }

    const totalAreaM2 = perUnit * qty;
    additionalEquipmentWettedAreaM2 += totalAreaM2;
    itemizedEquipment.push({
      id: item.id,
      tag: item.tag || 'Additional Eq.',
      description:
        item.description ||
        (item.entryMode === 'direct_area'
          ? 'Direct wetted area'
          : item.geometryType.replace(/_/g, ' ')),
      entryMode: item.entryMode,
      shellAreaPerUnitM2: shellPerUnit,
      headAreaPerUnitM2: headPerUnit,
      perUnitAreaM2: perUnit,
      quantity: qty,
      totalAreaM2,
    });
  }

  const equipmentSubtotalWettedAreaM2 =
    primaryWettedAreaM2 + additionalEquipmentWettedAreaM2;
  const includePiping = Boolean(input.includePipingAllowance);
  const rawPct = input.pipingAllowancePercent ?? 10;
  const pipingAllowancePercentApplied = includePiping ? Math.max(0, rawPct) : 0;
  const pipingAllowanceM2 = includePiping
    ? equipmentSubtotalWettedAreaM2 * (pipingAllowancePercentApplied / 100)
    : 0;
  const totalWettedAreaM2 = equipmentSubtotalWettedAreaM2 + pipingAllowanceM2;

  return {
    shellWettedAreaM2: primaryShellM2,
    headWettedAreaM2: primaryHeadM2,
    totalWettedAreaPerVesselM2: primaryPerUnitM2,
    primaryWettedAreaM2,
    additionalEquipmentWettedAreaM2,
    equipmentSubtotalWettedAreaM2,
    pipingAllowanceM2,
    pipingAllowancePercentApplied,
    itemizedEquipment,
    totalWettedAreaM2,
    effectiveLiquidHeightM,
    effectiveFireHeightM,
  };
}

/**
 * Pure deterministic API 521 external fire case sizing engine.
 */
export function calculateFireCaseAndSizePSV(
  input: FireCaseInput,
  standardBasis: StandardReferenceBasis = DEFAULT_STANDARD_BASIS,
  overrideOrificeDesignation?: string | null,
  overrideNote?: string
): FireCaseResult {
  const messages: ValidationMessage[] = [];
  const steps: CalculationStep[] = [];

  // Safeguard: unverified insulation credit
  let outsideMethod = false;
  if (input.insulated && !input.insulationCertified && input.environmentalFactorF < 1.0) {
    outsideMethod = true;
    messages.push({
      id: 'fire-unverified-insulation',
      field: 'environmentalFactorF',
      severity: 'ERROR',
      message:
        'OUTSIDE IMPLEMENTED METHOD – specialist analysis required. Insulation credit (F < 1.0) cannot be claimed without certified fire-rated insulation and mechanical integrity basis.',
    });
  }

  const isPrimaryDirect =
    input.userOverrideWettedArea || input.geometryType === 'user_entered_area';

  if (isPrimaryDirect) {
    if (!Number.isFinite(input.userWettedAreaM2) || input.userWettedAreaM2 < 0) {
      messages.push({
        id: 'fire-user-area',
        field: 'userWettedAreaM2',
        severity: 'ERROR',
        message: 'User-entered wetted surface area cannot be negative.',
      });
    }
  } else {
    if (!Number.isFinite(input.diameterM) || input.diameterM <= 0) {
      messages.push({
        id: 'fire-diameter',
        field: 'diameterM',
        severity: 'ERROR',
        message: 'Vessel diameter must be positive.',
      });
    }
    if (!Number.isFinite(input.relievingLiquidLevelM) || input.relievingLiquidLevelM < 0) {
      messages.push({
        id: 'fire-liq-level',
        field: 'relievingLiquidLevelM',
        severity: 'ERROR',
        message: 'Relieving liquid level cannot be negative.',
      });
    } else {
      const maxHeight = getVesselMaxHeightM({
        geometryType: input.geometryType,
        diameterM: input.diameterM,
        tangentLengthM: input.tangentLengthM,
        headType: input.headType,
        headDepthOverrideM: input.headDepthOverrideM,
      });
      if (input.relievingLiquidLevelM > maxHeight + 1e-6) {
        messages.push({
          id: 'fire-level-exceeds-geom',
          field: 'relievingLiquidLevelM',
          severity: 'ERROR',
          message: `Relieving liquid level (${input.relievingLiquidLevelM.toFixed(2)} m) exceeds vessel internal height (${maxHeight.toFixed(2)} m).`,
        });
      }
    }
  }

  if (!Number.isFinite(input.fireExposureLimitM) || input.fireExposureLimitM < 0) {
    messages.push({
      id: 'fire-limit',
      field: 'fireExposureLimitM',
      severity: 'ERROR',
      message: 'Fire-exposure height limit cannot be negative.',
    });
  }

  // Validate additional equipment items
  for (const item of input.additionalEquipment ?? []) {
    if (!item.enabled) continue;
    const label = item.tag || 'Additional equipment';
    if (!Number.isFinite(item.quantity) || item.quantity < 1) {
      messages.push({
        id: `fire-extra-qty-${item.id}`,
        field: `additionalEquipment.${item.id}.quantity`,
        severity: 'ERROR',
        message: `${label}: quantity must be at least 1.`,
      });
    }
    if (item.entryMode === 'direct_area') {
      if (!Number.isFinite(item.directWettedAreaM2) || item.directWettedAreaM2 < 0) {
        messages.push({
          id: `fire-extra-area-${item.id}`,
          field: `additionalEquipment.${item.id}.directWettedAreaM2`,
          severity: 'ERROR',
          message: `${label}: direct wetted surface area cannot be negative.`,
        });
      }
    } else {
      if (!Number.isFinite(item.diameterM) || item.diameterM <= 0) {
        messages.push({
          id: `fire-extra-dia-${item.id}`,
          field: `additionalEquipment.${item.id}.diameterM`,
          severity: 'ERROR',
          message: `${label}: diameter must be positive.`,
        });
      }
      if (!Number.isFinite(item.relievingLiquidLevelM) || item.relievingLiquidLevelM < 0) {
        messages.push({
          id: `fire-extra-lvl-${item.id}`,
          field: `additionalEquipment.${item.id}.relievingLiquidLevelM`,
          severity: 'ERROR',
          message: `${label}: relieving liquid level cannot be negative.`,
        });
      } else {
        const maxH = getVesselMaxHeightM({
          geometryType: item.geometryType,
          diameterM: item.diameterM,
          tangentLengthM: item.tangentLengthM,
          headType: item.headType,
          headDepthOverrideM: item.headDepthOverrideM,
        });
        if (item.relievingLiquidLevelM > maxH + 1e-6) {
          messages.push({
            id: `fire-extra-lvlexceed-${item.id}`,
            field: `additionalEquipment.${item.id}.relievingLiquidLevelM`,
            severity: 'ERROR',
            message: `${label}: relieving liquid level (${item.relievingLiquidLevelM.toFixed(2)} m) exceeds internal height (${maxH.toFixed(2)} m).`,
          });
        }
      }
    }
  }

  if (input.includePipingAllowance) {
    const pct = input.pipingAllowancePercent ?? 10;
    if (!Number.isFinite(pct) || pct < 0) {
      messages.push({
        id: 'fire-piping-pct',
        field: 'pipingAllowancePercent',
        severity: 'ERROR',
        message: 'Piping wetted area allowance percentage cannot be negative.',
      });
    } else if (pct > 30) {
      messages.push({
        id: 'fire-piping-pct-high',
        field: 'pipingAllowancePercent',
        severity: 'WARNING',
        message: `Piping wetted area allowance (${pct.toFixed(1)}%) exceeds typical 10%–30% range. Confirm explicit fire-zone piping surface calculation.`,
      });
    }
  }

  if (!Number.isFinite(input.environmentalFactorF) || input.environmentalFactorF <= 0) {
    messages.push({
      id: 'fire-f-factor',
      field: 'environmentalFactorF',
      severity: 'ERROR',
      message: 'Environmental factor F must be positive.',
    });
  } else if (input.environmentalFactorF > 1.0) {
    messages.push({
      id: 'fire-f-gt1',
      field: 'environmentalFactorF',
      severity: 'WARNING',
      message: `Environmental factor F (${input.environmentalFactorF}) exceeds 1.0. Verify if conservative multiplier is intended.`,
    });
  }

  if (!Number.isFinite(input.latentHeatKjKg) || input.latentHeatKjKg <= 0) {
    messages.push({
      id: 'fire-latent',
      field: 'latentHeatKjKg',
      severity: 'ERROR',
      message: 'Latent heat of vaporization at relieving conditions must be positive.',
    });
  }

  if (input.fireOverpressurePercent < 21) {
    messages.push({
      id: 'fire-op-note',
      field: 'fireOverpressurePercent',
      severity: 'INFO',
      message:
        'ASME BPVC Section VIII typically allows up to 21% overpressure (121% MAWP) for external fire contingency when set at MAWP. Confirm applicable design code.',
    });
  }

  const wetted = calculateWettedArea(input);

  const c1W =
    input.drainageQuality === 'prompt_drainage_firefighting'
      ? standardBasis.fireHeatConstantPromptDrainageW
      : standardBasis.fireHeatConstantInadequateDrainageW;
  const exponent = standardBasis.fireHeatAreaExponent;

  const heatInputW =
    wetted.totalWettedAreaM2 > 0 && input.environmentalFactorF > 0
      ? c1W * input.environmentalFactorF * Math.pow(wetted.totalWettedAreaM2, exponent)
      : 0;
  const heatInputKw = heatInputW / 1000;
  const heatInputMjH = heatInputKw * 3.6;
  const heatInputBtuH = heatInputKw / BTU_H_TO_KW;

  const vapourGenerationKgH =
    input.latentHeatKjKg > 0 ? (heatInputKw * 3600) / input.latentHeatKjKg : 0;
  const vapourGenerationLbH = vapourGenerationKgH / LB_TO_KG;

  if (wetted.totalWettedAreaM2 <= 0 && !messages.some((m) => m.severity === 'ERROR')) {
    messages.push({
      id: 'fire-zero-wetted',
      severity: 'WARNING',
      message:
        'Calculated wetted surface area within fire-exposure height limit is zero (dry vessel or elevated above fire limit). Review whether gas-filled vessel fire case (API 521) applies instead.',
    });
  }

  const primaryDesc = isPrimaryDirect
    ? `Direct = ${wetted.totalWettedAreaPerVesselM2.toFixed(2)} m² × ${Math.max(1, input.numberOfVessels)}`
    : `Shell = ${wetted.shellWettedAreaM2.toFixed(2)} m², Heads = ${wetted.headWettedAreaM2.toFixed(2)} m², N = ${Math.max(1, input.numberOfVessels)}`;

  steps.push({
    label: 'Primary Equipment Wetted Surface Area',
    symbol: 'A_w,prim',
    equation: isPrimaryDirect
      ? 'A_w,prim = A_direct × N_units'
      : 'Shell + Head wetted area within min(liquid level, fire limit - elevation) × N_vessels',
    substitution: primaryDesc,
    value: wetted.primaryWettedAreaM2.toFixed(2),
    unit: 'm²',
    sourceType: isPrimaryDirect ? 'USER_INPUT' : 'CALCULATED',
  });

  if (wetted.additionalEquipmentWettedAreaM2 > 0 || (input.additionalEquipment ?? []).some((i) => i.enabled)) {
    const enabledCount = (input.additionalEquipment ?? []).filter((i) => i.enabled).length;
    steps.push({
      label: 'Additional Fire-Zone Equipment Wetted Area',
      symbol: 'A_w,add',
      equation: 'Σ (A_item × Qty_item)',
      substitution: `${enabledCount} additional enabled equipment item(s) summed across fire zone`,
      value: wetted.additionalEquipmentWettedAreaM2.toFixed(2),
      unit: 'm²',
      sourceType: 'CALCULATED',
    });
  }

  if (input.includePipingAllowance) {
    steps.push({
      label: 'Piping Wetted Area Allowance',
      symbol: 'A_w,pipe',
      equation: `A_w,pipe = A_w,equip × (${wetted.pipingAllowancePercentApplied.toFixed(1)}% / 100)`,
      substitution: `${wetted.equipmentSubtotalWettedAreaM2.toFixed(2)} m² × ${(wetted.pipingAllowancePercentApplied / 100).toFixed(3)}`,
      value: wetted.pipingAllowanceM2.toFixed(2),
      unit: 'm²',
      sourceType: wetted.pipingAllowancePercentApplied === 10 ? 'ASSUMED' : 'USER_INPUT',
    });
  }

  steps.push({
    label: 'Total Effective Wetted Surface Area',
    symbol: 'A_w',
    equation: 'A_w = A_w,prim + A_w,add + A_w,pipe',
    substitution: `${wetted.primaryWettedAreaM2.toFixed(2)} + ${wetted.additionalEquipmentWettedAreaM2.toFixed(2)} + ${wetted.pipingAllowanceM2.toFixed(2)}`,
    value: wetted.totalWettedAreaM2.toFixed(2),
    unit: 'm²',
    sourceType: 'CALCULATED',
  });

  steps.push({
    label: 'Absorbed Fire Heat Input',
    symbol: 'Q',
    equation: `Q = C1 × F × A_w^${exponent}`,
    substitution: `${c1W} W × ${input.environmentalFactorF} × (${wetted.totalWettedAreaM2.toFixed(2)})^${exponent}`,
    value: heatInputKw.toFixed(2),
    unit: 'kW',
    sourceType: 'CALCULATED',
  });

  steps.push({
    label: 'Generated Vapour Mass Flow',
    symbol: 'W_vap',
    equation: 'W_vap = (Q_kW × 3600) / ΔH_vap',
    substitution: `(${heatInputKw.toFixed(2)} × 3600) / ${input.latentHeatKjKg.toFixed(2)}`,
    value: vapourGenerationKgH.toFixed(2),
    unit: 'kg/h',
    sourceType: 'CALCULATED',
  });

  let psvSizing = null;
  const hasPreErrors = messages.some((m) => m.severity === 'ERROR') || outsideMethod;
  if (!hasPreErrors && vapourGenerationKgH > 0) {
    const gasInput: GasPSVInput = {
      fluidName: 'Fire-Generated Vapour',
      compositionDescription: 'Vapour properties evaluated at fire relieving conditions',
      molecularWeight: input.vapourMw,
      compressibilityZ: input.vapourZ,
      isentropicK: input.vapourK,
      relievingTemperatureK: input.relievingTemperatureK,
      loadInputMode: 'kg/h',
      requiredFlowValue: vapourGenerationKgH,
      standardRefConditions: {
        ...STANDARD_REF_CONDITION_PRESETS['Nm3/h (0 C, 101.325 kPa)'],
      },
      setPressureKpaG: input.setPressureKpaG,
      overpressurePercent: input.fireOverpressurePercent,
      totalBackpressureKpaG: input.backpressureKpaG,
      atmosphericPressureKpaA: input.atmosphericPressureKpaA,
      kd: input.kd,
      kb: input.kb,
      kc: input.kc,
      valveType: 'conventional',
      outsideScopeFlag: false,
    };

    psvSizing = sizeGasPSV(
      gasInput,
      standardBasis,
      overrideOrificeDesignation,
      overrideNote
    );
  }

  const allMessages = [
    ...messages,
    ...(psvSizing ? psvSizing.messages : []),
  ];

  let status: CalculationStatus = 'INCOMPLETE';
  if (outsideMethod) {
    status = 'OUTSIDE_IMPLEMENTED_METHOD';
  } else if (allMessages.some((m) => m.severity === 'ERROR')) {
    status = psvSizing && psvSizing.requiredAreaMm2 !== null ? 'FAIL' : 'INCOMPLETE';
  } else if (psvSizing) {
    status = psvSizing.status;
  }

  const trace = {
    methodId: FIRE_METHOD_ID,
    methodVersion: FIRE_METHOD_VERSION,
    standardReferenceTitle: 'API Standard 521 (Pool Fire Heat Input & Vapour Generation) + API 520 Part I',
    adoptedEdition: `${standardBasis.api521Edition} + ${standardBasis.api520Part1Edition}`,
    timestamp: new Date().toISOString(),
    applicationVersion: APPLICATION_VERSION,
    inputs: {
      geometryType: { value: input.geometryType, sourceType: 'USER_INPUT' as const },
      diameter: { value: input.diameterM, unit: 'm', sourceType: 'USER_INPUT' as const },
      tangentLength: { value: input.tangentLengthM, unit: 'm', sourceType: 'USER_INPUT' as const },
      relievingLiquidLevel: { value: input.relievingLiquidLevelM, unit: 'm', sourceType: 'USER_INPUT' as const },
      fireExposureLimit: { value: input.fireExposureLimitM, unit: 'm', sourceType: 'USER_INPUT' as const },
      additionalEquipmentCount: {
        value: (input.additionalEquipment ?? []).filter((e) => e.enabled).length,
        sourceType: 'USER_INPUT' as const,
      },
      pipingAllowancePercent: {
        value: wetted.pipingAllowancePercentApplied,
        unit: '%',
        sourceType:
          input.includePipingAllowance && wetted.pipingAllowancePercentApplied === 10
            ? ('ASSUMED' as const)
            : ('USER_INPUT' as const),
      },
      environmentalFactorF: { value: input.environmentalFactorF, unit: '-', sourceType: input.environmentalFactorSource },
      latentHeat: { value: input.latentHeatKjKg, unit: 'kJ/kg', sourceType: 'USER_INPUT' as const },
      vapourMw: { value: input.vapourMw, unit: 'kg/kmol', sourceType: 'USER_INPUT' as const },
    },
    internalValues: {
      primaryWettedAreaM2: { value: wetted.primaryWettedAreaM2, unit: 'm²' },
      additionalEquipmentWettedAreaM2: { value: wetted.additionalEquipmentWettedAreaM2, unit: 'm²' },
      pipingAllowanceM2: { value: wetted.pipingAllowanceM2, unit: 'm²' },
      totalWettedAreaM2: { value: wetted.totalWettedAreaM2, unit: 'm²' },
      heatInputKw: { value: heatInputKw, unit: 'kW' },
      vapourGenerationKgH: { value: vapourGenerationKgH, unit: 'kg/h' },
    },
    constants: {
      fireHeatConstantC1: { value: c1W, unit: 'W / m^(2*0.82)', note: standardBasis.api521Edition },
      fireHeatExponent: { value: exponent, unit: '-' },
    },
    correctionFactors: {
      F: { value: input.environmentalFactorF, sourceType: input.environmentalFactorSource, description: input.environmentalFactorBasis },
      Kd: { value: input.kd, sourceType: 'USER_INPUT' as const, description: 'PSV discharge coefficient' },
      Kb: { value: input.kb, sourceType: 'USER_INPUT' as const, description: 'PSV backpressure factor' },
      Kc: { value: input.kc, sourceType: 'USER_INPUT' as const, description: 'PSV combination factor' },
    },
    intermediateValues: {
      shellWettedAreaM2: { value: Number(wetted.shellWettedAreaM2.toFixed(3)), unit: 'm²' },
      headWettedAreaM2: { value: Number(wetted.headWettedAreaM2.toFixed(3)), unit: 'm²' },
      equipmentSubtotalWettedAreaM2: { value: Number(wetted.equipmentSubtotalWettedAreaM2.toFixed(3)), unit: 'm²' },
      pipingAllowanceM2: { value: Number(wetted.pipingAllowanceM2.toFixed(3)), unit: 'm²' },
      heatInputMjH: { value: Number(heatInputMjH.toFixed(2)), unit: 'MJ/h' },
    },
    finalValue: {
      requiredAreaMm2: psvSizing?.requiredAreaMm2 ?? null,
      requiredMassFlowKgH: Number(vapourGenerationKgH.toFixed(3)),
      status,
    },
    steps: [...steps, ...(psvSizing ? psvSizing.trace.steps : [])],
  };

  return {
    status,
    messages: allMessages,
    shellWettedAreaM2: wetted.shellWettedAreaM2,
    headWettedAreaM2: wetted.headWettedAreaM2,
    totalWettedAreaPerVesselM2: wetted.totalWettedAreaPerVesselM2,
    primaryWettedAreaM2: wetted.primaryWettedAreaM2,
    additionalEquipmentWettedAreaM2: wetted.additionalEquipmentWettedAreaM2,
    equipmentSubtotalWettedAreaM2: wetted.equipmentSubtotalWettedAreaM2,
    pipingAllowanceM2: wetted.pipingAllowanceM2,
    pipingAllowancePercentApplied: wetted.pipingAllowancePercentApplied,
    itemizedEquipment: wetted.itemizedEquipment,
    totalWettedAreaM2: wetted.totalWettedAreaM2,
    effectiveLiquidHeightM: wetted.effectiveLiquidHeightM,
    effectiveFireHeightM: wetted.effectiveFireHeightM,
    heatInputCoefficientW: c1W,
    heatInputKw,
    heatInputMjH,
    heatInputBtuH,
    vapourGenerationKgH,
    vapourGenerationLbH,
    psvSizing,
    trace,
  };
}
