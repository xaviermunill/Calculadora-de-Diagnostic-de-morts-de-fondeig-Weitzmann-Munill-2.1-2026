import React, { useState, useMemo, useEffect } from 'react';
import {
  MortEvaluationRecord,
  SpeciesPresenceOption,
  SubstrateImpactOption,
  DynamismRiskOption,
  StabilityIntegrationOption,
  MortUsageStatus,
  PresenceStatus,
  BlockDimensions,
} from '../types';
import { evaluateDecision } from '../utils/decisionEngine';
import { assessHydrodynamics } from '../utils/hydrodynamics';
import {
  X,
  Save,
  Plus,
  Trash2,
  Copy,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Table,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface InventoryDataTableModalProps {
  isOpen: boolean;
  initialRecords: MortEvaluationRecord[];
  allRecords: MortEvaluationRecord[];
  existingLocations: string[];
  onClose: () => void;
  onSave: (updatedRecords: MortEvaluationRecord[]) => void;
}

// Recalculates decision matrix, scores, and hydrodynamics for a record
export function recalculateRowRecord(r: MortEvaluationRecord): MortEvaluationRecord {
  const isNotFound = r.presenceStatus === 'not_found';
  const hasMobile = r.c2_hasMobileElements || r.c2_substrateImpact === 'active_erosion_halo';

  const dims: BlockDimensions = r.dimensions || {
    lengthCm: 100,
    widthCm: 100,
    heightCm: 50,
    concreteDensityKgM3: 2400,
  };

  const depth = Math.max(0.5, r.depthM || 5);
  const hydro = assessHydrodynamics(dims, depth);

  const result = evaluateDecision(
    r.c1_speciesPresence || 'none',
    r.c2_substrateImpact || 'none',
    r.c3_dynamismRisk || 'no_risk',
    r.c4_stabilityIntegration || 'not_buried_no_void',
    r.usageStatus || 'in_use',
    hasMobile,
    isNotFound
  );

  return {
    ...r,
    dimensions: dims,
    depthM: depth,
    hydrodynamics: hydro,
    result,
  };
}

export const InventoryDataTableModal: React.FC<InventoryDataTableModalProps> = ({
  isOpen,
  initialRecords,
  allRecords,
  existingLocations,
  onClose,
  onSave,
}) => {
  // Working copy of records in the table editor
  const [rows, setRows] = useState<MortEvaluationRecord[]>(() => {
    return initialRecords.map((r) => recalculateRowRecord({ ...r }));
  });

  // Track original copy to highlight modified rows
  const [originalMap] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    initialRecords.forEach((r) => {
      map.set(r.id, JSON.stringify(r));
    });
    return map;
  });

  // Local selection inside table for bulk edits
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Search/Filter inside table editor
  const [tableSearch, setTableSearch] = useState<string>('');
  const [locationQuickFilter, setLocationQuickFilter] = useState<string>('all');

  // Bulk Apply Panel visibility
  const [showBulkApplyPanel, setShowBulkApplyPanel] = useState<boolean>(false);
  const [bulkField, setBulkField] = useState<string>('locationName');
  const [bulkValue, setBulkValue] = useState<string>('');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRecords.map((r) => recalculateRowRecord({ ...r })));
    setSelectedRowIds(new Set());
  }, [initialRecords]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  // Filtered rows for display
  const filteredRows = rows.filter((r) => {
    const matchSearch =
      r.code.toLowerCase().includes(tableSearch.toLowerCase()) ||
      r.locationName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      (r.observerName && r.observerName.toLowerCase().includes(tableSearch.toLowerCase())) ||
      (r.generalNotes && r.generalNotes.toLowerCase().includes(tableSearch.toLowerCase()));

    const matchLoc = locationQuickFilter === 'all' || r.locationName === locationQuickFilter;

    return matchSearch && matchLoc;
  });

  // Check which rows have been modified
  const modifiedRowIds = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const orig = originalMap.get(r.id);
      if (!orig || orig !== JSON.stringify(r)) {
        set.add(r.id);
      }
    });
    return set;
  }, [rows, originalMap]);

  // Update specific field on a row
  const handleCellChange = (id: string, field: string, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        let updated = { ...row };

        if (field.startsWith('dimensions.')) {
          const dimKey = field.split('.')[1] as keyof BlockDimensions;
          updated.dimensions = {
            ...updated.dimensions,
            [dimKey]: Number(value) || 0,
          };
        } else if (field === 'c2_substrateImpact') {
          updated.c2_substrateImpact = value;
          if (value === 'active_erosion_halo') {
            updated.c2_hasMobileElements = true;
          }
        } else if (field === 'c2_hasMobileElements') {
          updated.c2_hasMobileElements = Boolean(value);
          if (value) {
            updated.c2_substrateImpact = 'active_erosion_halo';
          }
        } else {
          (updated as any)[field] = value;
        }

        return recalculateRowRecord(updated);
      })
    );
  };

  // Add a new row to table
  const handleAddNewRow = () => {
    const nextNum = rows.length + 1;
    const newRecord: MortEvaluationRecord = {
      id: `table_mort_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: `M-${String(nextNum).padStart(2, '0')}-NOU`,
      date: new Date().toISOString().split('T')[0],
      locationName: existingLocations[0] || 'Cala Nova',
      depthM: 6,
      usageStatus: 'abandoned',
      presenceStatus: 'located',
      dimensions: {
        lengthCm: 100,
        widthCm: 100,
        heightCm: 50,
        concreteDensityKgM3: 2400,
      },
      c1_speciesPresence: 'none',
      c2_substrateImpact: 'none',
      c2_hasMobileElements: false,
      c3_dynamismRisk: 'no_risk',
      c3_useCustomPhysics: false,
      c4_stabilityIntegration: 'not_buried_no_void',
      observerName: '',
      generalNotes: '',
      result: {
        totalScore: 8,
        category: 'medium_priority',
        categoryTitle: 'Prioritat Mitjana',
        recommendedAction: 'RETIRADA PROGRAMADA',
        mitigationAction: '',
        colorClass: 'bg-amber-100 text-amber-900',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        ecologicalJustification: '',
        operationalRecommendation: '',
        scoresBreakdown: {
          c1_species: 0,
          c2_substrate: 0,
          c3_dynamism: 0,
          c4_stability: 8,
        },
      },
    };

    const calculated = recalculateRowRecord(newRecord);
    setRows((prev) => [calculated, ...prev]);
    showToast("S'ha afegit una nova fila a la taula");
  };

  // Duplicate a row
  const handleDuplicateRow = (row: MortEvaluationRecord) => {
    const copy: MortEvaluationRecord = {
      ...row,
      id: `table_mort_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: `${row.code}_COPIA`,
    };
    const calculated = recalculateRowRecord(copy);
    setRows((prev) => [calculated, ...prev]);
    showToast(`S'ha duplicat el registre ${row.code}`);
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast('Fila eliminada de la taula');
  };

  // Toggle row selection inside table
  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select/Deselect all filtered rows
  const handleToggleSelectAll = () => {
    if (filteredRows.every((r) => selectedRowIds.has(r.id))) {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  // Apply bulk modification to selected rows
  const handleApplyBulk = () => {
    const targetIds = selectedRowIds.size > 0
      ? selectedRowIds
      : new Set(filteredRows.map((r) => r.id));

    if (targetIds.size === 0) {
      alert('Seleccioneu com a mínim una fila per aplicar el canvi en bloc.');
      return;
    }

    setRows((prev) =>
      prev.map((row) => {
        if (!targetIds.has(row.id)) return row;

        let updated = { ...row };

        if (bulkField === 'locationName') {
          updated.locationName = bulkValue;
        } else if (bulkField === 'date') {
          updated.date = bulkValue;
        } else if (bulkField === 'observerName') {
          updated.observerName = bulkValue;
        } else if (bulkField === 'usageStatus') {
          updated.usageStatus = bulkValue as MortUsageStatus;
        } else if (bulkField === 'presenceStatus') {
          updated.presenceStatus = bulkValue as PresenceStatus;
        } else if (bulkField === 'c1_speciesPresence') {
          updated.c1_speciesPresence = bulkValue as SpeciesPresenceOption;
        } else if (bulkField === 'c2_substrateImpact') {
          updated.c2_substrateImpact = bulkValue as SubstrateImpactOption;
          updated.c2_hasMobileElements = bulkValue === 'active_erosion_halo';
        } else if (bulkField === 'c3_dynamismRisk') {
          updated.c3_dynamismRisk = bulkValue as DynamismRiskOption;
        } else if (bulkField === 'c4_stabilityIntegration') {
          updated.c4_stabilityIntegration = bulkValue as StabilityIntegrationOption;
        } else if (bulkField === 'depthM') {
          updated.depthM = Number(bulkValue) || 5;
        }

        return recalculateRowRecord(updated);
      })
    );

    showToast(`Canvi massiu aplicat a ${targetIds.size} files`);
    setShowBulkApplyPanel(false);
  };

  // Reset/Revert changes to initial records
  const handleReset = () => {
    if (confirm('Voleu descartar totes les modificacions fetes en aquesta sessió de taula?')) {
      setRows(initialRecords.map((r) => recalculateRowRecord({ ...r })));
      showToast('Canvis restablerts');
    }
  };

  // Export current table view as CSV
  const handleExportTableCSV = () => {
    const headers = [
      'Codi',
      'Ubicacio',
      'Data',
      'Fondaria_m',
      'Estat_Us',
      'Presencia',
      'Dimensions_cm',
      'Pes_Aire_kg',
      'Pes_Submergit_kg',
      'C1_Punts',
      'C2_Punts',
      'C3_Punts',
      'C4_Punts',
      'Puntuacio_Total',
      'Dictamen_Accio',
      'Auditor',
      'Observacions',
    ];

    const csvRows = rows.map((r) => [
      `"${r.code}"`,
      `"${r.locationName.replace(/"/g, '""')}"`,
      `"${r.date}"`,
      r.depthM,
      `"${r.usageStatus}"`,
      `"${r.presenceStatus}"`,
      `"${r.dimensions.lengthCm}x${r.dimensions.widthCm}x${r.dimensions.heightCm}"`,
      r.hydrodynamics?.weightAirKg || '',
      r.hydrodynamics?.submergedWeightKg || '',
      r.result.scoresBreakdown.c1_species,
      r.result.scoresBreakdown.c2_substrate,
      r.result.scoresBreakdown.c3_dynamism,
      r.result.scoresBreakdown.c4_stability,
      r.result.totalScore,
      `"${r.result.recommendedAction}"`,
      `"${(r.observerName || '').replace(/"/g, '""')}"`,
      `"${(r.generalNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...csvRows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `edicio_taula_morts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save all modified rows back to inventory
  const handleSaveAndClose = () => {
    onSave(rows);
    onClose();
  };

  return (
    <div
      id="modal-inventory-data-table"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col p-2 sm:p-4 overflow-hidden animate-in fade-in"
    >
      <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-3xl shadow-2xl flex flex-col h-full max-h-[96vh] w-full max-w-[98vw] mx-auto overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="bg-[#134E4A] text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-[#0E3B38]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 text-[#FAF9F6] rounded-xl flex items-center justify-center border border-white/15">
              <Table className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight">
                  Editor en Taula de Dades (Full de Càlcul de Camp)
                </h3>
                <span className="text-[10px] font-mono bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded uppercase font-semibold border border-emerald-500/30">
                  Protocol v3.6
                </span>
                {modifiedRowIds.size > 0 && (
                  <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full animate-pulse">
                    {modifiedRowIds.size} {modifiedRowIds.size === 1 ? 'fila modificada' : 'files modificades'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#C5DDCB] font-sans mt-0.5">
                Edició tabular interactiva amb recàlcul instantani de pesos, puntuacions i les 128 casuístiques.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddNewRow}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Afegir una nova fila a la taula"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Fila</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBulkApplyPanel(!showBulkApplyPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                showBulkApplyPanel
                  ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Obrir eines per modificar camps en bloc"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edició en Bloc</span>
            </button>

            <button
              type="button"
              onClick={handleExportTableCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition cursor-pointer"
              title="Exportar aquest full a CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={modifiedRowIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/90 disabled:opacity-40 rounded-xl text-xs font-semibold transition border border-white/15 cursor-pointer"
              title="Restablir als valors originals"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A3C] hover:bg-[#23472F] text-white rounded-xl text-xs font-bold transition shadow-sm border border-emerald-400/40 cursor-pointer ml-1"
              title="Guardar tots els canvis a l'inventari"
            >
              <Save className="w-4 h-4 text-emerald-200" />
              <span>Desar Canvis ({rows.length})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Tancar taula"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulk Apply Bar (collapsible) */}
        {showBulkApplyPanel && (
          <div className="bg-[#E9E9E0] border-b border-[#D1D1C7] p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#134E4A] flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Modificació en bloc per a {selectedRowIds.size > 0 ? `${selectedRowIds.size} files marcades` : `totes les ${filteredRows.length} files visibles`}:
              </span>

              {/* Field Select */}
              <select
                value={bulkField}
                onChange={(e) => {
                  setBulkField(e.target.value);
                  setBulkValue('');
                }}
                className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A] font-semibold"
              >
                <option value="locationName">Ubicació / Cala</option>
                <option value="date">Data d'Avaluació</option>
                <option value="observerName">Auditor / Observador</option>
                <option value="usageStatus">Estat d'Ús</option>
                <option value="presenceStatus">Estat Presència</option>
                <option value="depthM">Fondària (m)</option>
                <option value="c1_speciesPresence">C1 - Espècies colonitzadores</option>
                <option value="c2_substrateImpact">C2 - Substrat / Erosió</option>
                <option value="c3_dynamismRisk">C3 - Dinamisme i Risc</option>
                <option value="c4_stabilityIntegration">C4 - Estabilitat i Soterrament</option>
              </select>

              {/* Value Input */}
              {bulkField === 'locationName' && (
                <input
                  type="text"
                  placeholder="Escriu o tria cala..."
                  list="bulk-loc-list"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A] w-48"
                />
              )}

              {bulkField === 'date' && (
                <input
                  type="date"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                />
              )}

              {bulkField === 'observerName' && (
                <input
                  type="text"
                  placeholder="Nom de l'auditor..."
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A] w-48"
                />
              )}

              {bulkField === 'depthM' && (
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Ex: 8.5"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A] w-24"
                />
              )}

              {bulkField === 'usageStatus' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                >
                  <option value="">Seleccioneu estat...</option>
                  <option value="in_use">En ús actiu</option>
                  <option value="abandoned">En desús / Abandonat</option>
                </select>
              )}

              {bulkField === 'presenceStatus' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                >
                  <option value="">Seleccioneu presència...</option>
                  <option value="located">Localitzat</option>
                  <option value="not_found">No Localitzat / Desaparegut</option>
                </select>
              )}

              {bulkField === 'c1_speciesPresence' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                >
                  <option value="">Seleccioneu opció C1...</option>
                  <option value="high_coverage_or_protected">Espècies protegides / &gt;10% (-12 pts)</option>
                  <option value="low_coverage">Espècies d'interès / &lt;10% (-8 pts)</option>
                  <option value="renaturalized_algal">Recobriment algal / renaturalitzat (-4 pts)</option>
                  <option value="none">Sense espècies d'interès (0 pts)</option>
                </select>
              )}

              {bulkField === 'c2_substrateImpact' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                >
                  <option value="">Seleccioneu opció C2...</option>
                  <option value="active_erosion_halo">Amb erosió activa o cadenes (+6 pts)</option>
                  <option value="none">Sense erosió ni mòbils (0 pts)</option>
                </select>
              )}

              {bulkField === 'c3_dynamismRisk' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                >
                  <option value="">Seleccioneu opció C3...</option>
                  <option value="high_risk">Risc Alt (Blau) (+4 pts)</option>
                  <option value="moderate_risk">Risc Mitjà-Alt (Verd) (+2 pts)</option>
                  <option value="low_risk">Risc Baix (Taronja) (+1 pt)</option>
                  <option value="no_risk">Sense risc (Vermell) (0 pts)</option>
                </select>
              )}

              {bulkField === 'c4_stabilityIntegration' && (
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="bg-white border border-[#D1D1C7] rounded-lg px-2.5 py-1.5 text-xs text-[#134E4A]"
                >
                  <option value="">Seleccioneu opció C4...</option>
                  <option value="not_buried_no_void">Bloc lliure, sense buit (+8 pts)</option>
                  <option value="partial_burial_no_posidonia">Enfonsament parcial (+4 pts)</option>
                  <option value="not_buried_generates_void">Genera buit nou danyós (-6 pts)</option>
                  <option value="fixed_by_roots_or_sediment">Fixat per arrels de Posidònia (-12 pts)</option>
                </select>
              )}

              <datalist id="bulk-loc-list">
                {existingLocations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyBulk}
                disabled={!bulkValue}
                className="px-3.5 py-1.5 bg-[#134E4A] hover:bg-[#0E3B38] text-white font-bold rounded-lg transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar a les files seleccionades</span>
              </button>
            </div>
          </div>
        )}

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter and Quick Stats Bar */}
        <div className="bg-[#FAF9F6] border-b border-[#D1D1C7] p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#7A8A7C] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar per codi, cala, auditor..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D1D1C7] rounded-xl text-xs text-[#134E4A] focus:outline-hidden focus:ring-2 focus:ring-[#134E4A]"
              />
            </div>

            {/* Location quick selector */}
            <select
              value={locationQuickFilter}
              onChange={(e) => setLocationQuickFilter(e.target.value)}
              className="bg-white border border-[#D1D1C7] rounded-xl px-2.5 py-1.5 text-xs text-[#134E4A] font-medium"
            >
              <option value="all">Totes les cales ({rows.length} files)</option>
              {existingLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc} ({rows.filter((r) => r.locationName === loc).length})
                </option>
              ))}
            </select>
          </div>

          {/* Row selection status */}
          <div className="flex items-center gap-3 text-[#5C6B5E] text-xs">
            <span>
              Mostrant <strong>{filteredRows.length}</strong> de {rows.length} registres
            </span>
            {selectedRowIds.size > 0 && (
              <span className="bg-[#E9E9E0] text-[#134E4A] font-bold px-2.5 py-0.5 rounded-full">
                {selectedRowIds.size} marcats per a accions en bloc
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-xs border-collapse min-w-[1700px]">
            <thead className="bg-[#E9E9E0] text-[#134E4A] font-serif font-bold uppercase tracking-wider sticky top-0 z-20 shadow-xs">
              <tr className="border-b border-[#D1D1C7]">
                <th className="p-3 w-10 text-center sticky left-0 bg-[#E9E9E0] z-30">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && filteredRows.every((r) => selectedRowIds.has(r.id))}
                    onChange={handleToggleSelectAll}
                    className="rounded border-[#D1D1C7] text-[#134E4A] cursor-pointer"
                  />
                </th>
                <th className="p-3 w-28 sticky left-10 bg-[#E9E9E0] z-30 border-r border-[#D1D1C7]">
                  Codi Mort
                </th>
                <th className="p-3 w-48">Ubicació / Cala</th>
                <th className="p-3 w-32">Data</th>
                <th className="p-3 w-24">Fondària (m)</th>
                <th className="p-3 w-32">Estat Ús</th>
                <th className="p-3 w-32">Presència</th>
                <th className="p-3 w-48">Dimensions (L x W x H cm)</th>
                <th className="p-3 w-28">Pes Submergit</th>
                <th className="p-3 w-56">C1: Espècies Protegides</th>
                <th className="p-3 w-48">C2: Substrat / Erosió</th>
                <th className="p-3 w-48">C3: Dinamisme (Risc)</th>
                <th className="p-3 w-56">C4: Estabilitat & Buit</th>
                <th className="p-3 w-40 text-center bg-[#E0E7E2]">Punts & Dictamen</th>
                <th className="p-3 w-36">Auditor / Tècnic</th>
                <th className="p-3 w-48">Observacions</th>
                <th className="p-3 w-20 text-center sticky right-0 bg-[#E9E9E0] z-30 border-l border-[#D1D1C7]">
                  Accions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E9E9E0]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-12 text-center text-[#7A8A7C]">
                    Cap fila coincideix amb la cerca o filtres.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const isModified = modifiedRowIds.has(r.id);
                  const isSelected = selectedRowIds.has(r.id);
                  const isNotFound = r.presenceStatus === 'not_found';

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-[#FAF9F6] transition font-sans ${
                        isSelected
                          ? 'bg-[#EBF3ED]/60'
                          : isModified
                          ? 'bg-amber-50/40'
                          : idx % 2 === 1
                          ? 'bg-[#FCFCFA]'
                          : 'bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center sticky left-0 bg-inherit z-10">
                        <div className="flex items-center justify-center gap-1">
                          {isModified && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-500"
                              title="Fila modificada"
                            />
                          )}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(r.id)}
                            className="rounded border-[#D1D1C7] text-[#134E4A] cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Code */}
                      <td className="p-2 sticky left-10 bg-inherit z-10 border-r border-[#D1D1C7]">
                        <input
                          type="text"
                          value={r.code}
                          onChange={(e) => handleCellChange(r.id, 'code', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded font-mono font-bold text-xs text-[#134E4A]"
                        />
                      </td>

                      {/* Location */}
                      <td className="p-2">
                        <input
                          type="text"
                          list="table-loc-list"
                          value={r.locationName}
                          onChange={(e) => handleCellChange(r.id, 'locationName', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A]"
                        />
                      </td>

                      {/* Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => handleCellChange(r.id, 'date', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A]"
                        />
                      </td>

                      {/* Depth */}
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={r.depthM}
                            onChange={(e) => handleCellChange(r.id, 'depthM', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A] font-mono text-right"
                          />
                          <span className="text-[10px] text-[#7A8A7C]">m</span>
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="p-2">
                        <select
                          value={r.usageStatus}
                          onChange={(e) => handleCellChange(r.id, 'usageStatus', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs font-medium ${
                            r.usageStatus === 'in_use'
                              ? 'bg-blue-50 border-blue-200 text-blue-900'
                              : 'bg-stone-50 border-stone-300 text-stone-800'
                          }`}
                        >
                          <option value="in_use">En ús actiu</option>
                          <option value="abandoned">En desús</option>
                        </select>
                      </td>

                      {/* Presence */}
                      <td className="p-2">
                        <select
                          value={r.presenceStatus || 'located'}
                          onChange={(e) => handleCellChange(r.id, 'presenceStatus', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs font-medium ${
                            isNotFound
                              ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold'
                              : 'bg-white border-[#D1D1C7] text-[#134E4A]'
                          }`}
                        >
                          <option value="located">Localitzat</option>
                          <option value="not_found">No Localitzat</option>
                        </select>
                      </td>

                      {/* Dimensions (L x W x H) */}
                      <td className="p-2">
                        <div className="flex items-center gap-1 font-mono text-xs">
                          <input
                            type="number"
                            min="10"
                            step="5"
                            value={r.dimensions.lengthCm}
                            onChange={(e) => handleCellChange(r.id, 'dimensions.lengthCm', e.target.value)}
                            className="w-12 px-1 py-1 bg-white border border-[#D1D1C7] rounded text-center"
                            title="Llargada (cm)"
                          />
                          <span>×</span>
                          <input
                            type="number"
                            min="10"
                            step="5"
                            value={r.dimensions.widthCm}
                            onChange={(e) => handleCellChange(r.id, 'dimensions.widthCm', e.target.value)}
                            className="w-12 px-1 py-1 bg-white border border-[#D1D1C7] rounded text-center"
                            title="Amplada (cm)"
                          />
                          <span>×</span>
                          <input
                            type="number"
                            min="10"
                            step="5"
                            value={r.dimensions.heightCm}
                            onChange={(e) => handleCellChange(r.id, 'dimensions.heightCm', e.target.value)}
                            className="w-12 px-1 py-1 bg-white border border-[#D1D1C7] rounded text-center"
                            title="Alçada (cm)"
                          />
                        </div>
                      </td>

                      {/* Submerged Weight */}
                      <td className="p-2 font-mono text-xs text-[#2D5A3C] font-semibold">
                        {isNotFound ? (
                          <span className="text-[#7A8A7C] italic">Ø</span>
                        ) : (
                          `${r.hydrodynamics?.submergedWeightKg || 0} kg`
                        )}
                      </td>

                      {/* C1: Species */}
                      <td className="p-2">
                        <select
                          value={r.c1_speciesPresence}
                          onChange={(e) => handleCellChange(r.id, 'c1_speciesPresence', e.target.value)}
                          disabled={isNotFound}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A] disabled:opacity-40"
                        >
                          <option value="high_coverage_or_protected">Protegides &gt;10% (-12 pts)</option>
                          <option value="low_coverage">D'interès &lt;10% (-8 pts)</option>
                          <option value="renaturalized_algal">Renaturalitzat (-4 pts)</option>
                          <option value="none">Sense espècies (0 pts)</option>
                        </select>
                      </td>

                      {/* C2: Substrate */}
                      <td className="p-2">
                        <select
                          value={r.c2_substrateImpact}
                          onChange={(e) => handleCellChange(r.id, 'c2_substrateImpact', e.target.value)}
                          disabled={isNotFound}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A] disabled:opacity-40"
                        >
                          <option value="active_erosion_halo">Erosió / Mòbils (+6 pts)</option>
                          <option value="none">Sense erosió (0 pts)</option>
                        </select>
                      </td>

                      {/* C3: Dynamism */}
                      <td className="p-2">
                        <select
                          value={r.c3_dynamismRisk}
                          onChange={(e) => handleCellChange(r.id, 'c3_dynamismRisk', e.target.value)}
                          disabled={isNotFound}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A] disabled:opacity-40"
                        >
                          <option value="high_risk">Risc Alt - Blau (+4 pts)</option>
                          <option value="moderate_risk">Risc Mitjà - Verd (+2 pts)</option>
                          <option value="low_risk">Risc Baix - Taronja (+1 pt)</option>
                          <option value="no_risk">Sense risc - Vermell (0 pts)</option>
                        </select>
                      </td>

                      {/* C4: Stability */}
                      <td className="p-2">
                        <select
                          value={r.c4_stabilityIntegration}
                          onChange={(e) => handleCellChange(r.id, 'c4_stabilityIntegration', e.target.value)}
                          disabled={isNotFound}
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A] disabled:opacity-40"
                        >
                          <option value="not_buried_no_void">Lliure, no toca posidònia (+8 pts)</option>
                          <option value="partial_burial_no_posidonia">Enfonsament parcial (+4 pts)</option>
                          <option value="not_buried_generates_void">Genera buit nou (-6 pts)</option>
                          <option value="fixed_by_roots_or_sediment">Fixat per arrels (-12 pts)</option>
                        </select>
                      </td>

                      {/* Recalculated Score & Action */}
                      <td className="p-2 text-center bg-[#EBF3ED]/30">
                        {isNotFound ? (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
                            NO LOCALITZAT
                          </span>
                        ) : (
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 font-bold font-mono text-xs rounded border ${r.result.badgeClass}`}
                            >
                              {r.result.totalScore > 0 ? `+${r.result.totalScore}` : r.result.totalScore} pts
                            </span>
                            <div className="text-[10px] font-bold text-[#134E4A] mt-0.5 uppercase tracking-tight truncate max-w-[140px]">
                              {r.result.recommendedAction}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Auditor */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={r.observerName || ''}
                          onChange={(e) => handleCellChange(r.id, 'observerName', e.target.value)}
                          placeholder="Auditor..."
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A]"
                        />
                      </td>

                      {/* Notes */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={r.generalNotes || ''}
                          onChange={(e) => handleCellChange(r.id, 'generalNotes', e.target.value)}
                          placeholder="Observacions de camp..."
                          className="w-full px-2 py-1 bg-white border border-[#D1D1C7] rounded text-xs text-[#134E4A]"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center sticky right-0 bg-inherit z-10 border-l border-[#D1D1C7]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(r)}
                            className="p-1 hover:bg-[#E9E9E0] text-[#134E4A] rounded transition cursor-pointer"
                            title="Duplicar aquesta fila"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRow(r.id)}
                            className="p-1 hover:bg-rose-100 text-rose-700 rounded transition cursor-pointer"
                            title="Eliminar aquesta fila de la taula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Status & Actions Footer */}
        <div className="bg-[#E9E9E0] border-t border-[#D1D1C7] p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-4 text-[#5C6B5E]">
            <span className="font-semibold text-[#134E4A]">
              Total files a la taula: <strong>{rows.length}</strong>
            </span>
            <span>•</span>
            <span>
              Files modificades:{' '}
              <strong className={modifiedRowIds.size > 0 ? 'text-amber-800' : 'text-emerald-800'}>
                {modifiedRowIds.size}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#FAF9F6] text-[#4A5D52] font-semibold rounded-xl border border-[#D1D1C7] transition cursor-pointer"
            >
              Cancel·lar / Tancar
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-[#134E4A] hover:bg-[#0E3B38] text-white font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-300" />
              <span>Desar Canvis a l'Inventari</span>
            </button>
          </div>
        </div>

      </div>

      <datalist id="table-loc-list">
        {existingLocations.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </div>
  );
};
