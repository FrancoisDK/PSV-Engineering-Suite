import { validateImportedProjectJson } from '../calculations/validation';
import {
  APPLICATION_VERSION,
  LOCAL_STORAGE_ACTIVE_ID_KEY,
  LOCAL_STORAGE_PROJECTS_KEY,
  PROJECT_SCHEMA_VERSION,
} from '../constants/defaultFactors';
import { ProjectDocument } from '../models/calculationTypes';

export interface SavedLocalProject {
  id: string;
  name: string;
  updatedAt: string;
  document: ProjectDocument;
}

export function listLocalProjects(): SavedLocalProject[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        item.document
    );
  } catch {
    return [];
  }
}

function persistLocalProjects(projects: SavedLocalProject[]): void {
  window.localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
}

export function getActiveLocalProjectId(): string | null {
  try {
    return window.localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveLocalProjectId(id: string | null): void {
  try {
    if (id) {
      window.localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, id);
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_ACTIVE_ID_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function saveProjectToLocalStorage(
  doc: ProjectDocument,
  existingId?: string | null,
  customName?: string
): SavedLocalProject {
  const projects = listLocalProjects();
  const displayName =
    (customName ?? doc.project.projectName).trim() ||
    `${doc.project.equipmentTag || 'Untagged'} - ${doc.project.psvTag || 'PSV'}`;
  const now = new Date().toISOString();

  const updatedDoc: ProjectDocument = {
    ...doc,
    application: 'PSV Engineering Suite',
    applicationVersion: APPLICATION_VERSION,
    schemaVersion: PROJECT_SCHEMA_VERSION,
  };

  if (existingId) {
    const idx = projects.findIndex((p) => p.id === existingId);
    if (idx !== -1) {
      const updated: SavedLocalProject = {
        id: existingId,
        name: displayName,
        updatedAt: now,
        document: updatedDoc,
      };
      projects[idx] = updated;
      persistLocalProjects(projects);
      setActiveLocalProjectId(existingId);
      return updated;
    }
  }

  const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created: SavedLocalProject = {
    id: newId,
    name: displayName,
    updatedAt: now,
    document: updatedDoc,
  };
  projects.unshift(created);
  persistLocalProjects(projects);
  setActiveLocalProjectId(newId);
  return created;
}

export function renameLocalProject(id: string, newName: string): SavedLocalProject[] {
  const projects = listLocalProjects();
  const next = projects.map((p) =>
    p.id === id
      ? {
          ...p,
          name: newName.trim() || p.name,
          updatedAt: new Date().toISOString(),
          document: {
            ...p.document,
            project: {
              ...p.document.project,
              projectName: newName.trim() || p.document.project.projectName,
            },
          },
        }
      : p
  );
  persistLocalProjects(next);
  return next;
}

export function duplicateLocalProject(id: string): SavedLocalProject[] {
  const projects = listLocalProjects();
  const source = projects.find((p) => p.id === id);
  if (!source) return projects;
  const copy: SavedLocalProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${source.name} (Copy)`,
    updatedAt: new Date().toISOString(),
    document: JSON.parse(JSON.stringify(source.document)) as ProjectDocument,
  };
  const next = [copy, ...projects];
  persistLocalProjects(next);
  return next;
}

export function deleteLocalProject(id: string): SavedLocalProject[] {
  const projects = listLocalProjects().filter((p) => p.id !== id);
  persistLocalProjects(projects);
  if (getActiveLocalProjectId() === id) {
    setActiveLocalProjectId(null);
  }
  return projects;
}

export function exportProjectJson(doc: ProjectDocument, filenamePrefix?: string): void {
  const payload: ProjectDocument = {
    ...doc,
    application: 'PSV Engineering Suite',
    applicationVersion: APPLICATION_VERSION,
    schemaVersion: PROJECT_SCHEMA_VERSION,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeTag = (doc.project.equipmentTag || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePsv = (doc.project.psvTag || 'PSV').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeRev = (doc.project.revision || '0').replace(/[^a-zA-Z0-9_-]/g, '_');
  const name = filenamePrefix
    ? `${filenamePrefix}.json`
    : `PSV_${safeTag}_${safePsv}_Rev_${safeRev}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parses and validates an imported JSON string strictly as data (never executes JS).
 * Supports schema migration hooks for future schema versions.
 */
export function parseAndValidateProjectJson(jsonText: string): {
  valid: boolean;
  document?: ProjectDocument;
  errors: string[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      valid: false,
      errors: ['Invalid JSON syntax. File could not be parsed.'],
    };
  }

  // Schema migration hook if older schemaVersion is encountered in future
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (record.schemaVersion === undefined) {
      return {
        valid: false,
        errors: ['Missing schemaVersion field in imported project JSON.'],
      };
    }
    if (typeof record.schemaVersion === 'number' && record.schemaVersion > PROJECT_SCHEMA_VERSION) {
      return {
        valid: false,
        errors: [
          `Project schemaVersion (${record.schemaVersion}) is newer than supported version (${PROJECT_SCHEMA_VERSION}).`,
        ],
      };
    }
  }

  const result = validateImportedProjectJson(parsed);
  if (!result.valid || !result.data) {
    return { valid: false, errors: result.errors };
  }
  return { valid: true, document: result.data, errors: [] };
}
