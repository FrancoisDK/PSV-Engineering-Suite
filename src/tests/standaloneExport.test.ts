import { describe, expect, it } from 'vitest';
import { createBlankProjectDocument } from '../constants/defaultFactors';
import {
  buildEmbeddedPayload,
  escapeJsonForHtmlScript,
  getStandaloneExportFilename,
  injectProjectDataIntoHtmlTemplate,
  StandaloneExportOptions,
} from '../export/standaloneHtmlExporter';

const SAMPLE_OPTIONS: StandaloneExportOptions = {
  mode: 'populated',
  includeCurrentProjectData: true,
  includeAllScenarios: true,
  includeAuditTrail: true,
  includeRevisionHistory: true,
  includeEngineeringNotes: true,
  includeDemonstrationCases: true,
  projectNameOverride: 'Fire & PSV Study',
  equipmentTagOverride: 'V-401',
  psvTagOverride: 'PSV-401',
  revisionOverride: 'B',
};

describe('Standalone Offline HTML Exporter', () => {
  it('safely escapes </script> sequences inside JSON payloads', () => {
    const escaped = escapeJsonForHtmlScript({ note: '</script><script>alert(1)</script>' });
    expect(escaped).not.toContain('</script>');
    expect(escaped).toContain('\\u003c/script\\u003e');
  });

  it('injects populated project document cleanly into bundled HTML template', () => {
    const doc = createBlankProjectDocument();
    doc.fireInput.includePipingAllowance = true;
    doc.fireInput.pipingAllowancePercent = 10;

    const payload = buildEmbeddedPayload(doc, SAMPLE_OPTIONS);
    const template =
      '<!doctype html><html><body><div id="root"></div><script id="psv-project-data-script">window.__PSV_PROJECT_DATA__ = null;</script></body></html>';

    const out = injectProjectDataIntoHtmlTemplate(template, payload);
    expect(out).toContain('Fire &amp; PSV Study'.replace('&amp;', '\\u0026'));
    expect(out).toContain('V-401');
    expect(out).toContain('PSV-401');
    expect(out).not.toContain('window.__PSV_PROJECT_DATA__ = null;');
  });

  it('builds deterministic filenames for blank vs populated standalone exports', () => {
    expect(getStandaloneExportFilename(SAMPLE_OPTIONS)).toBe('PSV_V-401_PSV-401_Rev_B.html');
    expect(
      getStandaloneExportFilename({
        ...SAMPLE_OPTIONS,
        mode: 'blank',
        includeCurrentProjectData: false,
      })
    ).toBe('PSV_Engineering_Suite.html');
  });
});
