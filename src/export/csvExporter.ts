import { ProjectDocument, ReliefScenario } from '../models/calculationTypes';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportScenariosToCsv(
  doc: ProjectDocument,
  scenarios: ReliefScenario[]
): void {
  const headers = [
    'Project Name',
    'Equipment Tag',
    'PSV Tag',
    'Calculation Number',
    'Revision',
    'Scenario Name',
    'Scenario Type',
    'Fluid Phase',
    'Enabled',
    'Independently Protected',
    'Simultaneous Group',
    'Relieving Pressure [kPa(a)]',
    'Relieving Temperature [K]',
    'Relieving Mass Flow [kg/h]',
    'Required Effective Area [mm2]',
    'Selected API 526 Orifice',
    'Capacity Margin [%]',
    'Status',
    'Notes',
  ];

  const rows = scenarios.map((sc) => [
    doc.project.projectName,
    doc.project.equipmentTag,
    doc.project.psvTag,
    doc.project.calculationNumber,
    doc.project.revision,
    sc.name,
    sc.scenarioType,
    sc.fluidPhase,
    sc.enabled ? 'Yes' : 'No',
    sc.independentlyProtected ? 'Yes' : 'No',
    sc.simultaneousGroup ?? 'Non-simultaneous',
    sc.relievingPressureKpaA.toFixed(3),
    sc.relievingTemperatureK.toFixed(2),
    sc.relievingMassFlowKgH.toFixed(2),
    sc.requiredAreaMm2 !== null ? sc.requiredAreaMm2.toFixed(2) : '',
    sc.selectedOrificeDesignation ?? '',
    sc.capacityMarginPercent !== null ? sc.capacityMarginPercent.toFixed(2) : '',
    sc.status,
    sc.notes,
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeTag = (doc.project.equipmentTag || 'PSV').replace(/[^a-zA-Z0-9_-]/g, '_');
  const link = document.createElement('a');
  link.href = url;
  link.download = `PSV_Scenarios_${safeTag}_Rev_${doc.project.revision || '0'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
