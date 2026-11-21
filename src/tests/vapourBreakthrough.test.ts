import { describe, expect, it } from 'vitest';
import { calculateBreakthroughAndSizePSV } from '../calculations/vapourBreakthrough';
import { DEFAULT_STANDARD_BASIS } from '../constants/defaultFactors';
import { injectProjectDataIntoHtmlTemplate } from '../export/standaloneHtmlExporter';
import { createBlankProjectDocument } from '../constants/defaultFactors';
import { VapourBreakthroughInput } from '../models/calculationTypes';

function makeBaseBreakthroughInput(): VapourBreakthroughInput {
  return {
    scenarioName: 'CV Fail Open',
    sourceEquipment: 'HP Separator',
    destinationEquipment: 'LP Drum',
    failureMode: 'control_valve_fails_open',
    failureDescription: 'Level controller fails open',
    steadyStateBasis: 'steady_state',
    engineeringNotes: '',
    sourcePressureKpaG: 4000,
    sourceTemperatureK: 315,
    sourceMw: 20,
    sourceZ: 0.92,
    sourceK: 1.28,
    destinationRelievingPressureKpaG: 900,
    destinationBackpressureKpaG: 50,
    atmosphericPressureKpaA: 101.325,
    restrictionType: 'control_valve',
    valveCv: 40,
    valveOpeningPercent: 100,
    valveXt: 0.72,
    valveFp: 1.0,
    valveStyle: 'globe',
    orificeBoreMm: 30,
    upstreamPipeDiameterMm: 100,
    orificeCd: 0.85,
    knownEffectiveAreaMm2: 706.8,
    knownAreaCd: 0.85,
    externallySuppliedMassFlowKgH: 0,
    psvKd: 0.975,
    psvKb: 1.0,
    psvKc: 1.0,
    transientDepletionFlag: false,
  };
}

describe('Vapour Breakthrough & Standalone HTML Data Injection', () => {
  it('computes choked breakthrough flow through control valve and sizes destination PSV', () => {
    const res = calculateBreakthroughAndSizePSV(
      makeBaseBreakthroughInput(),
      DEFAULT_STANDARD_BASIS
    );
    expect(res.restrictionFlowRegime).toBe('CRITICAL');
    expect(res.breakthroughMassFlowKgH).toBeGreaterThan(1000);
    expect(res.psvSizing?.requiredAreaMm2).toBeGreaterThan(0);
    expect(res.messages.some((m) => m.message.includes('Gas breakthrough calculations can be sensitive'))).toBe(true);
  });

  it('keeps restriction orifice method separate from control valve Cv method', () => {
    const cvRes = calculateBreakthroughAndSizePSV(
      makeBaseBreakthroughInput(),
      DEFAULT_STANDARD_BASIS
    );
    const roRes = calculateBreakthroughAndSizePSV(
      { ...makeBaseBreakthroughInput(), restrictionType: 'restriction_orifice' },
      DEFAULT_STANDARD_BASIS
    );
    expect(roRes.effectiveRestrictionAreaMm2).toBeCloseTo(
      (Math.PI * 30 * 30) / 4,
      2
    );
    expect(roRes.breakthroughMassFlowKgH).not.toBe(cvRes.breakthroughMassFlowKgH);
  });

  it('safely escapes </script> sequences when embedding project data in standalone HTML', () => {
    const doc = createBlankProjectDocument();
    doc.project.notes = 'Test </script><script>alert(1)</script>';
    const tpl = '<html><body><div id="root"></div><script id="psv-project-data-script">window.__PSV_PROJECT_DATA__ = null;</script></body></html>';
    const out = injectProjectDataIntoHtmlTemplate(tpl, {
      projectDocument: doc,
      includeDemonstrationCases: true,
      exportedAt: '2026-01-01T00:00:00.000Z',
      exportMode: 'populated',
    });
    expect(out).not.toContain('</script><script>');
    expect(out).toContain('\\u003c/script\\u003e');
  });
});
