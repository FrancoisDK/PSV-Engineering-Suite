import React, { useRef, useState } from 'react';
import {
  Copy,
  Edit3,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  deleteLocalProject,
  duplicateLocalProject,
  listLocalProjects,
  parseAndValidateProjectJson,
  renameLocalProject,
  SavedLocalProject,
  saveProjectToLocalStorage,
} from '../../export/projectExporter';
import { ProjectDocument } from '../../models/calculationTypes';

interface ProjectManagerModalProps {
  open: boolean;
  mode: 'save' | 'load';
  currentDocument: ProjectDocument;
  activeProjectId: string | null;
  onClose: () => void;
  onSaved: (saved: SavedLocalProject) => void;
  onLoaded: (doc: ProjectDocument, localId: string | null) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  open,
  mode,
  currentDocument,
  activeProjectId,
  onClose,
  onSaved,
  onLoaded,
}) => {
  const [projects, setProjects] = useState<SavedLocalProject[]>(() =>
    listLocalProjects()
  );
  const [saveAsName, setSaveAsName] = useState(
    currentDocument.project.projectName ||
      `${currentDocument.project.equipmentTag || 'PSV'} Calculation`
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const refresh = () => setProjects(listLocalProjects());

  const handleSaveCurrent = () => {
    const saved = saveProjectToLocalStorage(
      currentDocument,
      activeProjectId,
      saveAsName
    );
    refresh();
    onSaved(saved);
    onClose();
  };

  const handleSaveAsNew = () => {
    const saved = saveProjectToLocalStorage(currentDocument, null, saveAsName);
    refresh();
    onSaved(saved);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const text = await file.text();
    const res = parseAndValidateProjectJson(text);
    if (!res.valid || !res.document) {
      setImportError(res.errors.join(' | '));
      return;
    }
    onLoaded(res.document, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print">
      <div className="w-full max-w-2xl rounded bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {mode === 'save'
                ? 'Save Project to Browser Storage'
                : 'Load Project or Import JSON'}
            </h2>
            <p className="text-[11px] text-slate-300">
              Namespace: psvEngineeringSuite.projects (localStorage) · *.json import validated as data
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project modal"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Save / Save As Section */}
          <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="font-semibold text-slate-800">
              Save Current Project Locally
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="Project save name"
                className="flex-1 min-w-[200px] rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
              />
              {activeProjectId && (
                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  className="inline-flex items-center gap-1.5 rounded bg-blue-700 px-3.5 py-1.5 font-medium text-white hover:bg-blue-800"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Overwrite Active</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveAsNew}
                className="inline-flex items-center gap-1.5 rounded border border-blue-700 bg-white px-3.5 py-1.5 font-medium text-blue-700 hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save As New</span>
              </button>
            </div>
          </div>

          {/* Open Project JSON */}
          <div className="rounded border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800">
                  Open Project JSON (*.json)
                </div>
                <div className="text-[11px] text-slate-500">
                  Validates application identifier, schemaVersion, and numerical structure.
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Select JSON File</span>
              </button>
            </div>
            {importError && (
              <div className="rounded border border-red-300 bg-red-50 p-2 text-red-800">
                Import failed: {importError}
              </div>
            )}
          </div>

          {/* Saved Browser Projects */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-800">
              Saved Projects in Browser ({projects.length})
            </div>
            {projects.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 p-6 text-center text-slate-500">
                No locally saved projects yet. Use Save As New above to store your project.
              </div>
            ) : (
              <div className="border border-slate-200 rounded divide-y divide-slate-200">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      {renamingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setProjects(renameLocalProject(p.id, renameText));
                              setRenamingId(null);
                            }}
                            className="px-2 py-1 rounded bg-blue-700 text-white"
                          >
                            Apply
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-900 truncate">
                            {p.name}
                            {p.id === activeProjectId && (
                              <span className="ml-2 text-[11px] font-medium text-blue-700">
                                (Active)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.document.project.equipmentTag || 'No Eq Tag'} ·{' '}
                            {p.document.project.psvTag || 'No PSV Tag'} · Rev{' '}
                            {p.document.project.revision || '0'} · Updated{' '}
                            {new Date(p.updatedAt).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onLoaded(p.document, p.id);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-white hover:bg-slate-800"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Load</span>
                      </button>
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => {
                          setRenamingId(p.id);
                          setRenameText(p.name);
                        }}
                        className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Duplicate"
                        onClick={() => setProjects(duplicateLocalProject(p.id))}
                        className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setProjects(deleteLocalProject(p.id))}
                        className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
