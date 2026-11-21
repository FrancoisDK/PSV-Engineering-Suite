import React, { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { calculateFireCaseAndSizePSV } from '../calculations/fireCase';
import { sizeGasPSV } from '../calculations/gasSizing';
import { sizeLiquidPSV } from '../calculations/liquidSizing';
import { calculateBreakthroughAndSizePSV } from '../calculations/vapourBreakthrough';
import {
  createBlankProjectDocument,
  ENGINEERING_NOTICE,
} from '../constants/defaultFactors';
import { DEMONSTRATION_CASES } from '../constants/demonstrationCases';
import { DEFAULT_UNIT_PREFERENCES } from '../constants/unitDefinitions';
import { exportScenariosToCsv } from '../export/csvExporter';
import {
  exportProjectJson,
  getActiveLocalProjectId,
  setActiveLocalProjectId,
} from '../export/projectExporter';
import { triggerPrintCalculationReport } from '../export/reportExporter';
import {
  EmbeddedStandalonePayload,
  isRunningInStandaloneOrProductionBundle,
} from '../export/standaloneHtmlExporter';
import {
  ProjectDocument,
  ReliefScenario,
  UnitPreferences,
  UnitSystem,
} from '../models/calculationTypes';
import { BreakthroughTab } from '../components/forms/BreakthroughTab';
import { CalculationReportTab } from '../components/forms/CalculationReportTab';
import { DesignBasisTab } from '../components/forms/DesignBasisTab';
import { FireCaseTab } from '../components/forms/FireCaseTab';
import { FinalSelectionTab } from '../components/forms/FinalSelectionTab';
import { GasSizingTab } from '../components/forms/GasSizingTab';
import { LiquidSizingTab } from '../components/forms/LiquidSizingTab';
import { ScenarioComparisonTab } from '../components/forms/ScenarioComparisonTab';
import { CalculationAuditDrawer } from '../components/layout/CalculationAuditDrawer';
import { GlossaryDrawer } from '../components/layout/GlossaryDrawer';
import { HeaderBar } from '../components/layout/HeaderBar';
import { ProjectManagerModal } from '../components/layout/ProjectManagerModal';
import { StandaloneExportModal } from '../components/layout/StandaloneExportModal';
import {
  ActiveResultsSummary,
  StickyResultsCard,
} from '../components/results/StickyResultsCard';

declare global {
  interface Window {
    __PSV_PROJECT_DATA__?: EmbeddedStandalonePayload | ProjectDocument | null;
  }
}

type PrimaryTab =
  | 'design_basis'
  | 'gas'
  | 'liquid'
  | 'breakthrough'
  | 'fire'
  | 'comparison'
  | 'selection'
  | 'report';

const PRIMARY_TABS: { id: PrimaryTab; label: string }[] = [
  { id: 'design_basis', label: '1. Design Basis' },
  { id: 'gas', label: '2. Gas / Vapour PSV' },
  { id: 'liquid', label: '3. Liquid PSV' },
  { id: 'breakthrough', label: '4. Vapour Breakthrough' },
  { id: 'fire', label: '5. Fire Case' },
  { id: 'comparison', label: '6. Scenario Comparison' },
  { id: 'selection', label: '7. Final PSV Selection' },
  { id: 'report', label: '8. Calculation Report' },
];

function getInitialProjectState(): {
  doc: ProjectDocument;
  allowDemoCases: boolean;
} {
  if (typeof window !== 'undefined' && window.__PSV_PROJECT_DATA__) {
    const embedded = window.__PSV_PROJECT_DATA__;
    if ('projectDocument' in embedded) {
      return {
        doc: embedded.projectDocument ?? createBlankProjectDocument(),
        allowDemoCases: embedded.includeDemonstrationCases !== false,
      };
    }
    if ('application' in embedded && embedded.application === 'PSV Engineering Suite') {
      return {
        doc: embedded as ProjectDocument,
        allowDemoCases: true,
      };
    }
  }
  return {
    doc: createBlankProjectDocument(),
    allowDemoCases: true,
  };
}

export const PSVCalculator: React.FC = () => {
  const initial = useMemo(() => getInitialProjectState(), []);
  const [doc, setDoc] = useState<ProjectDocument>(initial.doc);
  const [activeTab, setActiveTab] = useState<PrimaryTab>('design_basis');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [activeLocalId, setActiveLocalId] = useState<string | null>(() =>
    getActiveLocalProjectId()
  );

  // Modals & Drawers
  const [projectModalMode, setProjectModalMode] = useState<'save' | 'load' | null>(
    null
  );
  const [standaloneModalOpen, setStandaloneModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const isStandaloneMode = useMemo(
    () => isRunningInStandaloneOrProductionBundle(),
    []
  );

  const updateDoc = (updater: (prev: ProjectDocument) => ProjectDocument) => {
    setDoc((prev) => updater(prev));
    setIsUnsaved(true);
  };

  // Run deterministic sizing calculations
  const gasResult = useMemo(
    () =>
      sizeGasPSV(
        doc.gasInput,
        doc.standardBasis,
        doc.psvSelection.overrideOrificeDesignation,
        doc.psvSelection.overrideNote
      ),
    [
      doc.gasInput,
      doc.standardBasis,
      doc.psvSelection.overrideOrificeDesignation,
      doc.psvSelection.overrideNote,
    ]
  );

  const liquidResult = useMemo(
    () =>
      sizeLiquidPSV(
        doc.liquidInput,
        doc.standardBasis,
        doc.psvSelection.overrideOrificeDesignation,
        doc.psvSelection.overrideNote
      ),
    [
      doc.liquidInput,
      doc.standardBasis,
      doc.psvSelection.overrideOrificeDesignation,
      doc.psvSelection.overrideNote,
    ]
  );

  const breakthroughResult = useMemo(
    () =>
      calculateBreakthroughAndSizePSV(
        doc.breakthroughInput,
        doc.standardBasis,
        doc.psvSelection.overrideOrificeDesignation,
        doc.psvSelection.overrideNote
      ),
    [
      doc.breakthroughInput,
      doc.standardBasis,
      doc.psvSelection.overrideOrificeDesignation,
      doc.psvSelection.overrideNote,
    ]
  );

  const fireResult = useMemo(
    () =>
      calculateFireCaseAndSizePSV(
        doc.fireInput,
        doc.standardBasis,
        doc.psvSelection.overrideOrificeDesignation,
        doc.psvSelection.overrideNote
      ),
    [
      doc.fireInput,
      doc.standardBasis,
      doc.psvSelection.overrideOrificeDesignation,
      doc.psvSelection.overrideNote,
    ]
  );

  // Evaluate scenario comparison rows against live engines
  const evaluatedScenarios: ReliefScenario[] = useMemo(() => {
    return doc.scenarios.map((sc) => {
      if (sc.linkedModule === 'gas') {
        return {
          ...sc,
          relievingPressureKpaA: gasResult.upstreamPressureKpaA,
          relievingTemperatureK: doc.gasInput.relievingTemperatureK,
          relievingMassFlowKgH: gasResult.requiredMassFlowKgH,
          requiredAreaMm2: gasResult.requiredAreaMm2,
          selectedOrificeDesignation:
            gasResult.orificeSelection?.selectedOrifice?.designation ?? null,
          capacityMarginPercent:
            gasResult.orificeSelection?.areaMarginPercent ?? null,
          status: gasResult.status,
        };
      }
      if (sc.linkedModule === 'liquid') {
        return {
          ...sc,
          relievingPressureKpaA: liquidResult.upstreamPressureKpaA,
          relievingTemperatureK: doc.liquidInput.relievingTemperatureK,
          relievingMassFlowKgH: liquidResult.massFlowKgH,
          requiredAreaMm2: liquidResult.requiredAreaMm2,
          selectedOrificeDesignation:
            liquidResult.orificeSelection?.selectedOrifice?.designation ?? null,
          capacityMarginPercent:
            liquidResult.orificeSelection?.areaMarginPercent ?? null,
          status: liquidResult.status,
        };
      }
      if (sc.linkedModule === 'breakthrough') {
        return {
          ...sc,
          relievingPressureKpaA:
            breakthroughResult.psvSizing?.upstreamPressureKpaA ??
            breakthroughResult.destinationPressureKpaA,
          relievingTemperatureK: doc.breakthroughInput.sourceTemperatureK,
          relievingMassFlowKgH: breakthroughResult.breakthroughMassFlowKgH ?? 0,
          requiredAreaMm2:
            breakthroughResult.psvSizing?.requiredAreaMm2 ?? null,
          selectedOrificeDesignation:
            breakthroughResult.psvSizing?.orificeSelection?.selectedOrifice
              ?.designation ?? null,
          capacityMarginPercent:
            breakthroughResult.psvSizing?.orificeSelection?.areaMarginPercent ??
            null,
          status: breakthroughResult.status,
        };
      }
      if (sc.linkedModule === 'fire') {
        return {
          ...sc,
          relievingPressureKpaA:
            fireResult.psvSizing?.upstreamPressureKpaA ??
            doc.fireInput.setPressureKpaG *
              (1 + doc.fireInput.fireOverpressurePercent / 100) +
              doc.fireInput.atmosphericPressureKpaA,
          relievingTemperatureK: doc.fireInput.relievingTemperatureK,
          relievingMassFlowKgH: fireResult.vapourGenerationKgH,
          requiredAreaMm2: fireResult.psvSizing?.requiredAreaMm2 ?? null,
          selectedOrificeDesignation:
            fireResult.psvSizing?.orificeSelection?.selectedOrifice
              ?.designation ?? null,
          capacityMarginPercent:
            fireResult.psvSizing?.orificeSelection?.areaMarginPercent ?? null,
          status: fireResult.status,
        };
      }
      return sc;
    });
  }, [
    doc.scenarios,
    doc.gasInput.relievingTemperatureK,
    doc.liquidInput.relievingTemperatureK,
    doc.breakthroughInput.sourceTemperatureK,
    doc.fireInput,
    gasResult,
    liquidResult,
    breakthroughResult,
    fireResult,
  ]);

  // Governing scenario selected primarily by largest required effective area
  const governingScenario = useMemo(() => {
    const candidates = evaluatedScenarios.filter(
      (s) =>
        s.enabled &&
        s.requiredAreaMm2 !== null &&
        Number.isFinite(s.requiredAreaMm2)
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, cur) =>
      (cur.requiredAreaMm2 ?? 0) > (best.requiredAreaMm2 ?? 0) ? cur : best
    );
  }, [evaluatedScenarios]);

  // Build document with latest audit traces when exporting
  const documentWithLiveTraces: ProjectDocument = useMemo(
    () => ({
      ...doc,
      scenarios: evaluatedScenarios,
      psvSelection: {
        ...doc.psvSelection,
        governingScenarioId: governingScenario?.id ?? null,
      },
      audit: {
        gas: gasResult.trace,
        liquid: liquidResult.trace,
        breakthrough: breakthroughResult.trace,
        fire: fireResult.trace,
      },
    }),
    [
      doc,
      evaluatedScenarios,
      governingScenario,
      gasResult.trace,
      liquidResult.trace,
      breakthroughResult.trace,
      fireResult.trace,
    ]
  );

  // Active sticky card summary based on current tab
  const stickySummary: ActiveResultsSummary = useMemo(() => {
    if (activeTab === 'liquid') {
      return {
        scenarioLabel: doc.liquidInput.fluidName || 'Liquid PSV Sizing',
        fluidPhaseLabel: 'Liquid (Single-Phase)',
        requiredMassFlowKgH: liquidResult.massFlowKgH,
        relievingPressureKpaA: liquidResult.upstreamPressureKpaA,
        relievingTemperatureK: doc.liquidInput.relievingTemperatureK,
        atmosphericPressureKpaA: doc.liquidInput.atmosphericPressureKpaA,
        requiredAreaMm2: liquidResult.requiredAreaMm2,
        orificeSelection: liquidResult.orificeSelection,
        status: liquidResult.status,
      };
    }
    if (activeTab === 'breakthrough') {
      return {
        scenarioLabel:
          doc.breakthroughInput.scenarioName || 'Vapour Breakthrough',
        fluidPhaseLabel: 'Gas / Vapour Blow-By',
        flowRegimeLabel: breakthroughResult.restrictionFlowRegime,
        requiredMassFlowKgH: breakthroughResult.breakthroughMassFlowKgH,
        relievingPressureKpaA:
          breakthroughResult.psvSizing?.upstreamPressureKpaA ??
          breakthroughResult.destinationPressureKpaA,
        relievingTemperatureK: doc.breakthroughInput.sourceTemperatureK,
        atmosphericPressureKpaA: doc.breakthroughInput.atmosphericPressureKpaA,
        requiredAreaMm2:
          breakthroughResult.psvSizing?.requiredAreaMm2 ?? null,
        orificeSelection:
          breakthroughResult.psvSizing?.orificeSelection ?? null,
        status: breakthroughResult.status,
      };
    }
    if (activeTab === 'fire') {
      return {
        scenarioLabel: 'External Pool Fire Case',
        fluidPhaseLabel: 'Vapour (Fire Generated)',
        flowRegimeLabel: fireResult.psvSizing?.flowRegime,
        requiredMassFlowKgH: fireResult.vapourGenerationKgH,
        relievingPressureKpaA:
          fireResult.psvSizing?.upstreamPressureKpaA ?? null,
        relievingTemperatureK: doc.fireInput.relievingTemperatureK,
        atmosphericPressureKpaA: doc.fireInput.atmosphericPressureKpaA,
        requiredAreaMm2: fireResult.psvSizing?.requiredAreaMm2 ?? null,
        orificeSelection: fireResult.psvSizing?.orificeSelection ?? null,
        status: fireResult.status,
      };
    }
    // Default / Gas / Design Basis / Comparison / Selection
    if (
      (activeTab === 'comparison' || activeTab === 'selection') &&
      governingScenario
    ) {
      const govMod = governingScenario.linkedModule;
      const govOrifice =
        govMod === 'liquid'
          ? liquidResult.orificeSelection
          : govMod === 'breakthrough'
            ? breakthroughResult.psvSizing?.orificeSelection ?? null
            : govMod === 'fire'
              ? fireResult.psvSizing?.orificeSelection ?? null
              : gasResult.orificeSelection;
      return {
        scenarioLabel: `Governing: ${governingScenario.name}`,
        fluidPhaseLabel: governingScenario.fluidPhase.replace('_', '/'),
        requiredMassFlowKgH: governingScenario.relievingMassFlowKgH,
        relievingPressureKpaA: governingScenario.relievingPressureKpaA,
        relievingTemperatureK: governingScenario.relievingTemperatureK,
        atmosphericPressureKpaA: doc.designBasis.atmosphericPressureKpaA,
        requiredAreaMm2: governingScenario.requiredAreaMm2,
        orificeSelection: govOrifice,
        status: governingScenario.status,
      };
    }
    return {
      scenarioLabel: doc.gasInput.fluidName || 'Gas / Vapour PSV Sizing',
      fluidPhaseLabel: 'Gas / Vapour',
      flowRegimeLabel: gasResult.flowRegime,
      requiredMassFlowKgH: gasResult.requiredMassFlowKgH,
      relievingPressureKpaA: gasResult.upstreamPressureKpaA,
      relievingTemperatureK: doc.gasInput.relievingTemperatureK,
      atmosphericPressureKpaA: doc.gasInput.atmosphericPressureKpaA,
      requiredAreaMm2: gasResult.requiredAreaMm2,
      orificeSelection: gasResult.orificeSelection,
      status: gasResult.status,
    };
  }, [
    activeTab,
    doc,
    gasResult,
    liquidResult,
    breakthroughResult,
    fireResult,
    governingScenario,
  ]);

  const handleChangeUnitSystem = (sys: UnitSystem) => {
    updateDoc((prev) => ({
      ...prev,
      unitSystem: sys,
      unitPreferences: { ...DEFAULT_UNIT_PREFERENCES[sys] },
    }));
  };

  const handleChangeUnitPref = <K extends keyof UnitPreferences>(
    key: K,
    val: UnitPreferences[K]
  ) => {
    updateDoc((prev) => ({
      ...prev,
      unitPreferences: { ...prev.unitPreferences, [key]: val },
    }));
  };

  const handleSyncBasisToModules = () => {
    updateDoc((prev) => {
      const db = prev.designBasis;
      const eq = prev.equipment;
      const totalBp = db.superimposedBackpressureKpaG + db.builtUpBackpressureKpaG;
      const relG = db.setPressureKpaG * (1 + db.overpressurePercent / 100);
      return {
        ...prev,
        gasInput: {
          ...prev.gasInput,
          setPressureKpaG: db.setPressureKpaG,
          overpressurePercent: db.overpressurePercent,
          totalBackpressureKpaG: totalBp,
          atmosphericPressureKpaA: db.atmosphericPressureKpaA,
          relievingTemperatureK: db.relievingTemperatureK,
          valveType: db.valveType,
          kd: db.kdGas,
          kb: db.kb,
          kc: db.kc,
        },
        liquidInput: {
          ...prev.liquidInput,
          upstreamPressureKpaG: relG,
          totalBackpressureKpaG: totalBp,
          atmosphericPressureKpaA: db.atmosphericPressureKpaA,
          relievingTemperatureK: db.relievingTemperatureK,
          kd: db.kdLiquid,
          kw: db.kw,
          kc: db.kc,
        },
        breakthroughInput: {
          ...prev.breakthroughInput,
          destinationRelievingPressureKpaG: relG,
          destinationBackpressureKpaG: totalBp,
          atmosphericPressureKpaA: db.atmosphericPressureKpaA,
          psvKd: db.kdGas,
          psvKb: db.kb,
          psvKc: db.kc,
        },
        fireInput: {
          ...prev.fireInput,
          equipmentType: eq.equipmentType,
          diameterM: eq.diameterM,
          tangentLengthM: eq.tangentLengthM,
          headType: eq.headType,
          normalLiquidLevelM: eq.liquidLevelM,
          relievingLiquidLevelM: eq.liquidLevelM,
          elevationAboveGradeM: eq.elevationAboveGradeM,
          insulated: eq.insulated,
          insulationCertified: eq.insulationCertified,
          setPressureKpaG: db.setPressureKpaG,
          backpressureKpaG: totalBp,
          atmosphericPressureKpaA: db.atmosphericPressureKpaA,
          kd: db.kdGas,
          kb: db.kb,
          kc: db.kc,
        },
      };
    });
  };

  const handleLoadDemoCase = (demoId: string) => {
    const found = DEMONSTRATION_CASES.find((d) => d.id === demoId);
    if (!found) return;
    setDoc(found.buildProject());
    setActiveTab(found.primaryTab);
    setActiveLocalId(null);
    setActiveLocalProjectId(null);
    setIsUnsaved(true);
  };

  const lastCalcTimestamp = new Date(
    gasResult.trace.timestamp
  ).toLocaleTimeString();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HeaderBar
        document={documentWithLiveTraces}
        isUnsaved={isUnsaved}
        advancedMode={advancedMode}
        allowDemoCases={initial.allowDemoCases}
        onChangeUnitSystem={handleChangeUnitSystem}
        onToggleAdvancedMode={() => setAdvancedMode((a) => !a)}
        onSaveProject={() => setProjectModalMode('save')}
        onLoadProject={() => setProjectModalMode('load')}
        onExportStandaloneHtml={() => setStandaloneModalOpen(true)}
        onExportJson={() => exportProjectJson(documentWithLiveTraces)}
        onExportCsv={() =>
          exportScenariosToCsv(documentWithLiveTraces, evaluatedScenarios)
        }
        onPrintReport={() => {
          setActiveTab('report');
          setTimeout(() => triggerPrintCalculationReport(), 120);
        }}
        onOpenGlossary={() => setGlossaryOpen(true)}
        onOpenAudit={() => setAuditDrawerOpen(true)}
        onLoadDemoCase={handleLoadDemoCase}
        onResetProject={() => setResetConfirmOpen(true)}
      />

      {/* Demonstration Data Banner */}
      {doc.project.isDemonstrationData && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-center text-xs font-bold text-amber-950 no-print">
          DEMONSTRATION DATA – NOT FOR DESIGN · Verify all fluid properties, codes, and valve capacity data before engineering use.
        </div>
      )}

      {/* Primary Tab Navigation */}
      <nav
        aria-label="Primary calculation tabs"
        className="bg-white border-b border-slate-200 no-print"
      >
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 flex overflow-x-auto gap-1 py-1.5">
          {PRIMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-5">
        {activeTab === 'report' ? (
          <CalculationReportTab
            document={documentWithLiveTraces}
            gasResult={gasResult}
            liquidResult={liquidResult}
            breakthroughResult={breakthroughResult}
            fireResult={fireResult}
            evaluatedScenarios={evaluatedScenarios}
            governingScenario={governingScenario}
            onPrint={triggerPrintCalculationReport}
            onExportStandaloneHtml={() => setStandaloneModalOpen(true)}
            onExportJson={() => exportProjectJson(documentWithLiveTraces)}
            onExportCsv={() =>
              exportScenariosToCsv(documentWithLiveTraces, evaluatedScenarios)
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_370px] gap-5 items-start">
            <div className="min-w-0">
              {activeTab === 'design_basis' && (
                <DesignBasisTab
                  document={doc}
                  advancedMode={advancedMode}
                  onChangeDocument={updateDoc}
                  onChangeUnitPref={handleChangeUnitPref}
                  onSyncBasisToModules={handleSyncBasisToModules}
                />
              )}
              {activeTab === 'gas' && (
                <GasSizingTab
                  document={doc}
                  result={gasResult}
                  advancedMode={advancedMode}
                  onChangeGasInput={(patch) =>
                    updateDoc((d) => ({
                      ...d,
                      gasInput: { ...d.gasInput, ...patch },
                    }))
                  }
                  onChangeUnitPref={handleChangeUnitPref}
                />
              )}
              {activeTab === 'liquid' && (
                <LiquidSizingTab
                  document={doc}
                  result={liquidResult}
                  advancedMode={advancedMode}
                  onChangeLiquidInput={(patch) =>
                    updateDoc((d) => ({
                      ...d,
                      liquidInput: { ...d.liquidInput, ...patch },
                    }))
                  }
                  onChangeUnitPref={handleChangeUnitPref}
                />
              )}
              {activeTab === 'breakthrough' && (
                <BreakthroughTab
                  document={doc}
                  result={breakthroughResult}
                  onChangeBreakthroughInput={(patch) =>
                    updateDoc((d) => ({
                      ...d,
                      breakthroughInput: { ...d.breakthroughInput, ...patch },
                    }))
                  }
                  onChangeUnitPref={handleChangeUnitPref}
                />
              )}
              {activeTab === 'fire' && (
                <FireCaseTab
                  document={doc}
                  result={fireResult}
                  onChangeFireInput={(patch) =>
                    updateDoc((d) => ({
                      ...d,
                      fireInput: { ...d.fireInput, ...patch },
                    }))
                  }
                  onChangeUnitPref={handleChangeUnitPref}
                />
              )}
              {activeTab === 'comparison' && (
                <ScenarioComparisonTab
                  document={doc}
                  evaluatedScenarios={evaluatedScenarios}
                  governingScenario={governingScenario}
                  onUpdateScenarios={(next) =>
                    updateDoc((d) => ({ ...d, scenarios: next }))
                  }
                  onNavigateToModule={(mod) => setActiveTab(mod)}
                />
              )}
              {activeTab === 'selection' && (
                <FinalSelectionTab
                  document={doc}
                  governingScenario={governingScenario}
                  activeModuleRequiredAreaMm2={gasResult.requiredAreaMm2}
                  onChangeSelection={(patch) =>
                    updateDoc((d) => ({
                      ...d,
                      psvSelection: { ...d.psvSelection, ...patch },
                    }))
                  }
                />
              )}
            </div>

            <StickyResultsCard
              summary={stickySummary}
              unitPrefs={doc.unitPreferences}
              isStandaloneMode={isStandaloneMode}
              isSaved={!isUnsaved}
              lastCalcTimestamp={lastCalcTimestamp}
              onOpenAudit={() => setAuditDrawerOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Engineering Notice Footer */}
      <footer className="bg-white border-t border-slate-200 px-4 lg:px-6 py-3 text-[11px] text-slate-600 no-print">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>{ENGINEERING_NOTICE}</span>
          <span className="text-slate-400">
            Not API-certified or ASME-certified software · Preliminary sizing aid only
          </span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProjectManagerModal
        open={projectModalMode !== null}
        mode={projectModalMode ?? 'load'}
        currentDocument={documentWithLiveTraces}
        activeProjectId={activeLocalId}
        onClose={() => setProjectModalMode(null)}
        onSaved={(saved) => {
          setActiveLocalId(saved.id);
          setIsUnsaved(false);
        }}
        onLoaded={(loadedDoc, localId) => {
          setDoc(loadedDoc);
          setActiveLocalId(localId);
          setActiveLocalProjectId(localId);
          setIsUnsaved(false);
        }}
      />

      <StandaloneExportModal
        open={standaloneModalOpen}
        document={documentWithLiveTraces}
        onClose={() => setStandaloneModalOpen(false)}
      />

      <CalculationAuditDrawer
        open={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
        traces={[
          { label: 'Gas / Vapour PSV', trace: gasResult.trace },
          { label: 'Liquid PSV', trace: liquidResult.trace },
          { label: 'Vapour Breakthrough', trace: breakthroughResult.trace },
          { label: 'Fire Case', trace: fireResult.trace },
        ]}
      />

      <GlossaryDrawer
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print">
          <div className="w-full max-w-md rounded bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-sm font-semibold">Confirm Project Reset</span>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 text-xs space-y-4">
              <div className="flex items-start gap-2.5 text-amber-900 bg-amber-50 border border-amber-200 rounded p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  Resetting will clear all unsaved project entries, scenarios, and calculation inputs and restore a blank project.
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(false)}
                  className="rounded border border-slate-300 bg-white px-3.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDoc(createBlankProjectDocument());
                    setActiveLocalId(null);
                    setActiveLocalProjectId(null);
                    setIsUnsaved(false);
                    setResetConfirmOpen(false);
                    setActiveTab('design_basis');
                  }}
                  className="rounded bg-red-700 px-3.5 py-1.5 font-medium text-white hover:bg-red-800"
                >
                  Clear & Reset Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
