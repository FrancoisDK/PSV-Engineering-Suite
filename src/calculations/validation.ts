import { z } from 'zod';
import {
  DesignBasisData,
  ProjectDocument,
  ProtectedEquipment,
  ValidationMessage,
} from '../models/calculationTypes';

/**
 * Zod schema for validating imported JSON project files strictly as data.
 */
export const ProjectDocumentImportSchema = z.object({
  application: z.literal('PSV Engineering Suite'),
  applicationVersion: z.string().min(1),
  schemaVersion: z.number().int().min(1),
  unitSystem: z.enum(['SI', 'US']),
  unitPreferences: z.object({
    pressure: z.string(),
    deltaPressure: z.string(),
    temperature: z.string(),
    massFlow: z.string(),
    liquidVolFlow: z.string(),
    area: z.string(),
    density: z.string(),
    viscosity: z.string(),
    length: z.string(),
    heatRate: z.string(),
    latentHeat: z.string(),
  }),
  standardBasis: z.object({
    api520Part1Edition: z.string(),
    api520Part2Edition: z.string(),
    api521Edition: z.string(),
    api526Edition: z.string(),
    asmeSectionViiiEdition: z.string(),
    fireHeatConstantPromptDrainageW: z.number().positive(),
    fireHeatConstantInadequateDrainageW: z.number().positive(),
    fireHeatAreaExponent: z.number().positive(),
    fireExposureElevationLimitM: z.number().nonnegative(),
  }),
  project: z.object({
    projectName: z.string(),
    client: z.string(),
    plantFacility: z.string(),
    unit: z.string(),
    equipmentTag: z.string(),
    equipmentDescription: z.string(),
    psvTag: z.string(),
    calculationNumber: z.string(),
    revision: z.string(),
    preparedBy: z.string(),
    checkedBy: z.string(),
    calculationDate: z.string(),
    notes: z.string(),
    isDemonstrationData: z.boolean().optional(),
  }),
  equipment: z.record(z.string(), z.unknown()),
  designBasis: z.record(z.string(), z.unknown()),
  gasInput: z.record(z.string(), z.unknown()),
  liquidInput: z.record(z.string(), z.unknown()),
  breakthroughInput: z.record(z.string(), z.unknown()),
  fireInput: z.record(z.string(), z.unknown()),
  scenarios: z.array(z.record(z.string(), z.unknown())),
  psvSelection: z.record(z.string(), z.unknown()),
  audit: z.record(z.string(), z.unknown()).optional(),
  revisionHistory: z.array(z.record(z.string(), z.unknown())),
});

export function validateDesignBasisAndEquipment(
  equipment: ProtectedEquipment,
  basis: DesignBasisData
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  if (!Number.isFinite(equipment.mawpKpaG) || equipment.mawpKpaG <= 0) {
    messages.push({
      id: 'eq-mawp',
      field: 'mawpKpaG',
      severity: 'ERROR',
      message: 'Equipment MAWP must be positive.',
    });
  }
  if (!Number.isFinite(basis.setPressureKpaG) || basis.setPressureKpaG <= 0) {
    messages.push({
      id: 'db-pset',
      field: 'setPressureKpaG',
      severity: 'ERROR',
      message: 'PSV set pressure must be positive.',
    });
  } else if (basis.setPressureKpaG > equipment.mawpKpaG) {
    messages.push({
      id: 'db-pset-gt-mawp',
      field: 'setPressureKpaG',
      severity: 'WARNING',
      message:
        'PSV set pressure exceeds equipment MAWP. Confirm whether staggered/supplemental multiple-PSV setting applies per ASME Section VIII.',
    });
  }

  if (
    !Number.isFinite(basis.atmosphericPressureKpaA) ||
    basis.atmosphericPressureKpaA <= 0
  ) {
    messages.push({
      id: 'db-patm',
      field: 'atmosphericPressureKpaA',
      severity: 'ERROR',
      message: 'Local atmospheric pressure must be positive.',
    });
  }

  if (basis.ruptureDiskUpstream && basis.kc >= 1.0) {
    messages.push({
      id: 'db-kc-disk',
      field: 'kc',
      severity: 'WARNING',
      message:
        'Rupture disk upstream of PSV is enabled with Kc >= 1.0. Verify certified combination capacity factor or apply default 0.90 per API 520 Part I.',
    });
  }

  if (equipment.diameterM <= 0 || equipment.tangentLengthM < 0) {
    messages.push({
      id: 'eq-dims',
      field: 'diameterM',
      severity: 'ERROR',
      message: 'Equipment diameter must be positive and tangent length cannot be negative.',
    });
  }

  if (equipment.liquidLevelM < 0) {
    messages.push({
      id: 'eq-liq-neg',
      field: 'liquidLevelM',
      severity: 'ERROR',
      message: 'Liquid level cannot be negative.',
    });
  }

  return messages;
}

export function validateImportedProjectJson(raw: unknown): {
  valid: boolean;
  data?: ProjectDocument;
  errors: string[];
} {
  const parsed = ProjectDocumentImportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`
      ),
    };
  }
  return {
    valid: true,
    data: raw as ProjectDocument,
    errors: [],
  };
}
