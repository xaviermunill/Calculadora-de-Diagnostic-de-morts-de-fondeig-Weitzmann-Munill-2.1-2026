import React, { useState, useMemo } from 'react';
import { MortEvaluationRecord, ActionCategory } from '../types';
import { exportInventoryToExcel } from '../utils/excelExport';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { sendPointEmailNotification, TARGET_NOTIFICATION_EMAIL } from '../utils/emailNotifier';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  Printer,
  Edit,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Anchor,
  Scale,
  Waves,
  MapPin,
  RefreshCw,
  FileSpreadsheet,
  Camera,
  SearchX,
  FileText,
  Compass,
  CheckSquare,
  Square,
  Mail,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface InventoryManagerProps {
  records: MortEvaluationRecord[];
  onSelectRecordForEdit: (record: MortEvaluationRecord) => void;
  onPrintRecord: (record: MortEvaluationRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMultipleRecords?: (ids: string[]) => void;
  onNewEvaluation: () => void;
  onImportRecords: (imported: MortEvaluationRecord[]) => void;
  onResetToSample: () => void;
  onOpenBatchDossier?: (cala?: string) => void;
  onGoToMap?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  records,
  onSelectRecordForEdit,
  onPrintRecord,
  onDeleteRecord,
  onDeleteMultipleRecords,
  onNewEvaluation,
  onImportRecords,
  onResetToSample,
  onOpenBatchDossier,
  onGoToMap,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');

  // Selected records set for batch actions
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // Delete modal state
  const [deleteModalRecords, setDeleteModalRecords] = useState<MortEvaluationRecord[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Email action state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sentEmailId, setSentEmailId] = useState<string | null>(null);

  const handleSendRecordEmail = async (record: MortEvaluationRecord) => {
    setSendingEmailId(record.id);
    try {
      await sendPointEmailNotification(record, TARGET_NOTIFICATION_EMAIL);
      setSentEmailId(record.id);
      setTimeout(() => setSentEmailId(null), 3500);
    } catch (e) {
      setSentEmailId(record.id);
      setTimeout(() => setSentEmailId(null), 3500);
    } finally {
      setSendingEmailId(null);
    }
  };

  // Extract unique locations
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    records.forEach((r) => {
      if (r.locationName) locSet.add(r.locationName);
    });
    return Array.from(locSet).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observerName && r.observerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.generalNotes && r.generalNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.notFoundReason && r.notFoundReason.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        categoryFilter === 'all' ||
        (categoryFilter === 'not_found' && r.presenceStatus === 'not_found') ||
        r.result.category === categoryFilter;

      const matchLocation =
        selectedLocationFilter === 'all' ||
        r.locationName === selectedLocationFilter ||
        r.locationName.includes(selectedLocationFilter);

      return matchSearch && matchCategory && matchLocation;
    });
  }, [records, searchTerm, categoryFilter, selectedLocationFilter]);

  // Handle single deletion request
  const handleRequestDeleteSingle = (record: MortEvaluationRecord) => {
    setDeleteModalRecords([record]);
    setIsDeleteModalOpen(true);
  };

  // Handle bulk deletion request
  const handleRequestDeleteSelected = () => {
    const toDelete = records.filter((r) => selectedRecordIds.has(r.id));
    if (toDelete.length === 0) return;
    setDeleteModalRecords(toDelete);
    setIsDeleteModalOpen(true);
  };

  // Confirm deletion
  const handleConfirmDelete = () => {
    if (deleteModalRecords.length === 1) {
      onDeleteRecord(deleteModalRecords[0].id);
      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteModalRecords[0].id);
        return next;
      });
    } else if (deleteModalRecords.length > 1) {
      if (onDeleteMultipleRecords) {
        onDeleteMultipleRecords(deleteModalRecords.map((r) => r.id));
      } else {
        deleteModalRecords.forEach((r) => onDeleteRecord(r.id));
      }
      setSelectedRecordIds(new Set());
    }
    setIsDeleteModalOpen(false);
    setDeleteModalRecords([]);
  };

  // Toggle selection for single item
  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle selection for all filtered items
  const handleToggleSelectAllFiltered = () => {
    if (filteredRecords.every((r) => selectedRecordIds.has(r.id))) {
      // Deselect all filtered
      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedRecordIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  // Statistics Summary
  const stats = useMemo(() => {
    const total = records.length;
    const notFound = records.filter((r) => r.presenceStatus === 'not_found').length;
    const conservation = records.filter((r) => r.result.category === 'conservation').length;
    const lowPriority = records.filter((r) => r.result.category === 'low_priority').length;
    const mediumPriority = records.filter((r) => r.result.category === 'medium_priority').length;
    const highPriority = records.filter((r) => r.result.category === 'high_priority').length;

    const totalWeightAirKg = records.reduce(
      (sum, r) => sum + (r.hydrodynamics?.weightAirKg || 0),
      0
    );
    const totalSubmergedWeightKg = records.reduce(
      (sum, r) => sum + (r.hydrodynamics?.submergedWeightKg || 0),
      0
    );

    const locatedCount = total - notFound;
    const conservationRate = locatedCount > 0 ? Math.round(((conservation + lowPriority) / locatedCount) * 100) : 0;

    return {
      total,
      notFound,
      conservation,
      lowPriority,
      mediumPriority,
      highPriority,
      totalWeightAirTonnes: Math.round((totalWeightAirKg / 1000) * 10) / 10,
      totalSubmergedWeightTonnes: Math.round((totalSubmergedWeightKg / 1000) * 10) / 10,
      conservationRate,
    };
  }, [records]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (records.length === 0) return;
    exportInventoryToExcel(records);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Codi',
      'Data',
      'Localitzacio',
      'Latitud',
      'Longitud',
      'Presencia',
      'Motiu_No_Localitzat',
      'Fondaria_m',
      'Estat_Us',
      'Dimensions_cm',
      'Pes_Aire_kg',
      'Pes_Submergit_kg',
      'C1_Especies_Punts',
      'C2_Substrat_Punts',
      'C3_Dinamisme_Punts',
      'C4_Estabilitat_Punts',
      'Puntuacio_Total',
      'Classificacio',
      'Accio_Recomanada',
      'Num_Fotos',
      'Auditor',
      'Observacions',
    ];

    const rows = records.map((r) => [
      `"${r.code}"`,
      `"${r.date}"`,
      `"${r.locationName.replace(/"/g, '""')}"`,
      r.latitude || '',
      r.longitude || '',
      `"${r.presenceStatus === 'not_found' ? 'No Localitzat' : 'Localitzat'}"`,
      `"${(r.notFoundReason || '').replace(/"/g, '""')}"`,
      r.depthM,
      `"${r.usageStatus}"`,
      `"${r.dimensions.lengthCm}x${r.dimensions.widthCm}x${r.dimensions.heightCm}"`,
      r.hydrodynamics?.weightAirKg || '',
      r.hydrodynamics?.submergedWeightKg || '',
      r.result.scoresBreakdown.c1_species,
      r.result.scoresBreakdown.c2_substrate,
      r.result.scoresBreakdown.c3_dynamism,
      r.result.scoresBreakdown.c4_stability,
      r.result.totalScore,
      `"${r.result.categoryTitle}"`,
      `"${r.result.recommendedAction}"`,
      r.photos?.length || (r.photoUrl ? 1 : 0),
      `"${(r.observerName || '').replace(/"/g, '""')}"`,
      `"${(r.generalNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `diagnosi_morts_fondeig_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(records, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute(
      'download',
      `inventari_morts_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportRecords(parsed);
          }
        } catch (err) {
          alert('Error en format del fitxer JSON.');
        }
      };
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D1D1C7] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E9E9E0] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold uppercase tracking-wider mb-2">
              <Anchor className="w-3.5 h-3.5" />
              <span>Base de Dades i Registre Georeferenciat</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#134E4A] tracking-tight">
              Inventari de Fondejos i Diagnosi de Campanya
            </h2>
            <p className="text-xs sm:text-sm text-[#5C6B5E] mt-1 font-sans">
              Registre georeferenciat d'estructures artificials, gestió de fitxes d'inspecció i priorització de conservació / retirada.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            
            {onGoToMap && (
              <button
                id="btn-goto-map-inventory"
                onClick={onGoToMap}
                className="flex items-center gap-2 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3.5 py-2.5 rounded-full transition border border-[#D1D1C7] shadow-xs"
                title="Veure tots els punts en el mapa interactiu"
              >
                <Compass className="w-4 h-4" />
                <span>Veure Mapa</span>
              </button>
            )}

            {onOpenBatchDossier && (
              <button
                id="btn-batch-dossier-inventory"
                onClick={() => onOpenBatchDossier()}
                className="flex items-center gap-2 bg-[#134E4A] hover:bg-[#0E3B38] text-white text-xs font-semibold px-4 py-2.5 rounded-full transition shadow-xs"
                title="Descarregar o imprimir dossier de fitxes d'inspecció de tot l'inventari o per cala/rang"
              >
                <FileText className="w-4 h-4" />
                <span>Baixar Fitxes / Dossier</span>
              </button>
            )}

            <button
              id="btn-new-eval-inventory"
              onClick={onNewEvaluation}
              className="flex items-center gap-2 bg-[#134E4A] hover:bg-[#0E3B38] text-white text-xs font-semibold px-3.5 py-2.5 rounded-full transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Avaluació</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-full transition shadow-xs"
              title="Baixar l'inventari complet en format Excel (.xlsx) amb fulls de dades, resum i criteris"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3 py-2.5 rounded-full transition border border-[#D1D1C7] shadow-xs"
              title="Exportar a full de càlcul CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>

            <label className="flex items-center gap-2 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-semibold px-3 py-2.5 rounded-full transition cursor-pointer border border-[#D1D1C7] shadow-xs">
              <Upload className="w-4 h-4" />
              <span>Importar</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={onResetToSample}
              className="flex items-center gap-1.5 bg-[#E9E9E0]/70 hover:bg-[#E9E9E0] text-[#3D5A45] text-xs font-medium px-3 py-2.5 rounded-full border border-[#D1D1C7] transition"
              title="Carregar exemples de la Costa Brava"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Exemples</span>
            </button>
          </div>
        </div>

        {/* 6 Summary Stat Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-[#5C6B5E] uppercase tracking-wider">Total Registres</span>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#134E4A] mt-1">{stats.total}</p>
            <span className="text-[11px] text-[#7A8A7C] font-medium">
              {stats.totalWeightAirTonnes} t de formigó
            </span>
          </div>

          <div className="bg-[#EBF3ED] border border-[#C5DDCB] p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#2D5A3C] uppercase tracking-wider">Conservar</span>
              <ShieldCheck className="w-4 h-4 text-[#2D5A3C]" />
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#1A4526] mt-1">{stats.conservation}</p>
            <span className="text-[11px] text-[#2D5A3C] font-medium">Refugi / Escull</span>
          </div>

          <div className="bg-[#EAF0F4] border border-[#BFD4E2] p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#204E6B] uppercase tracking-wider">P. Baixa</span>
              <CheckCircle2 className="w-4 h-4 text-[#204E6B]" />
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#133E59] mt-1">{stats.lowPriority}</p>
            <span className="text-[11px] text-[#204E6B] font-medium">Mitigació in situ</span>
          </div>

          <div className="bg-[#F8F3E8] border border-[#E8DCC0] p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#7D5B18] uppercase tracking-wider">P. Mitjana</span>
              <AlertTriangle className="w-4 h-4 text-[#7D5B18]" />
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#5F430E] mt-1">{stats.mediumPriority}</p>
            <span className="text-[11px] text-[#7D5B18] font-medium">Retirada programada</span>
          </div>

          <div className="bg-[#FBF0EE] border border-[#EDC5C0] p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#8B322C] uppercase tracking-wider">P. Alta</span>
              <AlertOctagon className="w-4 h-4 text-[#8B322C]" />
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#6B221D] mt-1">{stats.highPriority}</p>
            <span className="text-[11px] text-[#8B322C] font-medium">Retirada immediata</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">No Localitzats</span>
              <SearchX className="w-4 h-4 text-amber-700" />
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-950 mt-1">{stats.notFound}</p>
            <span className="text-[11px] text-amber-800 font-medium">Soterrats / Baixa</span>
          </div>

        </div>
      </div>

      {/* Filter, Search and Multi-Action Bar */}
      <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#D1D1C7] shadow-xs">
        
        {/* Row 1: Search and Location filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#7A8A7C] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cercar per codi, cala, observador, motiu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-[#D1D1C7] rounded-xl bg-[#FAF9F6] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#134E4A] transition"
            />
          </div>

          {/* Location / Cala filter */}
          <div className="w-full sm:w-64">
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="w-full text-xs bg-[#FAF9F6] border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-medium focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
            >
              <option value="all">Totes les cales ({records.length} blocs)</option>
              {uniqueLocations.map((loc) => {
                const count = records.filter((r) => r.locationName === loc).length;
                return (
                  <option key={loc} value={loc}>
                    {loc} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-[#134E4A] text-white shadow-xs'
                  : 'bg-[#FAF9F6] text-[#3D5A45] hover:bg-[#E9E9E0] border border-[#D1D1C7]'
              }`}
            >
              Tots ({records.length})
            </button>

            <button
              onClick={() => setCategoryFilter('conservation')}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                categoryFilter === 'conservation'
                  ? 'bg-[#2D5A3C] text-white shadow-xs'
                  : 'bg-[#EBF3ED] text-[#2D5A3C] hover:bg-[#DCEDE0] border border-[#C5DDCB]'
              }`}
            >
              Conservar ({stats.conservation})
            </button>

            <button
              onClick={() => setCategoryFilter('low_priority')}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                categoryFilter === 'low_priority'
                  ? 'bg-[#204E6B] text-white shadow-xs'
                  : 'bg-[#EAF0F4] text-[#204E6B] hover:bg-[#DCE7EF] border border-[#BFD4E2]'
              }`}
            >
              Baixa ({stats.lowPriority})
            </button>

            <button
              onClick={() => setCategoryFilter('medium_priority')}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                categoryFilter === 'medium_priority'
                  ? 'bg-[#7D5B18] text-white shadow-xs'
                  : 'bg-[#F8F3E8] text-[#7D5B18] hover:bg-[#F2E8D2] border border-[#E8DCC0]'
              }`}
            >
              Mitjana ({stats.mediumPriority})
            </button>

            <button
              onClick={() => setCategoryFilter('high_priority')}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                categoryFilter === 'high_priority'
                  ? 'bg-[#8B322C] text-white shadow-xs'
                  : 'bg-[#FBF0EE] text-[#8B322C] hover:bg-[#F6DFDC] border border-[#EDC5C0]'
              }`}
            >
              Alta ({stats.highPriority})
            </button>

            <button
              onClick={() => setCategoryFilter('not_found')}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                categoryFilter === 'not_found'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              No Loc. ({stats.notFound})
            </button>
          </div>
        </div>

        {/* Row 2: Multi-selection and Batch Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E9E9E0] text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAllFiltered}
              className="flex items-center gap-1.5 text-[#134E4A] font-semibold hover:underline"
            >
              {filteredRecords.length > 0 && filteredRecords.every((r) => selectedRecordIds.has(r.id)) ? (
                <CheckSquare className="w-4 h-4 text-[#134E4A]" />
              ) : (
                <Square className="w-4 h-4 text-[#7A8A7C]" />
              )}
              <span>
                {filteredRecords.length > 0 && filteredRecords.every((r) => selectedRecordIds.has(r.id))
                  ? 'Desmarcar tots els filtrats'
                  : `Marcar tots els filtrats (${filteredRecords.length})`}
              </span>
            </button>

            {selectedRecordIds.size > 0 && (
              <span className="text-xs bg-[#E9E9E0] text-[#134E4A] px-2.5 py-0.5 rounded-full font-bold">
                {selectedRecordIds.size} seleccionat{selectedRecordIds.size > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedRecordIds.size > 0 && (
              <button
                id="btn-delete-selected-inventory"
                onClick={handleRequestDeleteSelected}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-1.5 rounded-full border border-red-200 transition shadow-2xs"
                title="Eliminar els registres seleccionats"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar seleccionats ({selectedRecordIds.size})</span>
              </button>
            )}

            {onOpenBatchDossier && (
              <button
                onClick={() => onOpenBatchDossier(selectedLocationFilter !== 'all' ? selectedLocationFilter : undefined)}
                className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#E9E9E0] text-[#134E4A] font-semibold px-3 py-1.5 rounded-full border border-[#D1D1C7] transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generar Dossier</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Table of Records */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D1D1C7] overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-[#5C6B5E] space-y-3">
            <Anchor className="w-12 h-12 text-[#D1D1C7] mx-auto" />
            <p className="text-sm font-medium font-serif text-[#134E4A]">No s'ha trobat cap bloc amb aquests filtres.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setSelectedLocationFilter('all');
              }}
              className="text-xs text-[#134E4A] underline font-semibold hover:text-[#0E3B38]"
            >
              Netejar filtres
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left text-[#134E4A]">
              <thead className="text-xs uppercase bg-[#E9E9E0] text-[#134E4A] font-serif font-bold tracking-wider">
                <tr>
                  <th className="pl-4 pr-2 py-4 w-8">
                    <input
                      type="checkbox"
                      checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedRecordIds.has(r.id))}
                      onChange={handleToggleSelectAllFiltered}
                      className="rounded border-[#D1D1C7] text-[#134E4A] focus:ring-[#134E4A] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-4">Codi & Foto</th>
                  <th className="px-4 py-4">Ubicació & Fondària</th>
                  <th className="px-4 py-4">Dimensions & Pes</th>
                  <th className="px-4 py-4">Estat Ús</th>
                  <th className="px-4 py-4">Punts Protocol</th>
                  <th className="px-5 py-4">Dictamen i Acció</th>
                  <th className="px-5 py-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E9E0]">
                {filteredRecords.map((r) => {
                  const photoCount = r.photos?.length || (r.photoUrl ? 1 : 0);
                  const primaryPhoto = r.photos?.[0] || r.photoUrl;
                  const isSelected = selectedRecordIds.has(r.id);

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-[#FAF9F6] transition ${
                        isSelected ? 'bg-[#EBF3ED]/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRecord(r.id)}
                          className="rounded border-[#D1D1C7] text-[#134E4A] focus:ring-[#134E4A] cursor-pointer"
                        />
                      </td>

                      {/* Code & Photo Thumbnail */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {primaryPhoto ? (
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#D1D1C7] shrink-0 bg-[#E9E9E0]">
                              <img
                                src={primaryPhoto}
                                alt={r.code}
                                className="w-full h-full object-cover"
                              />
                              {photoCount > 1 && (
                                <span className="absolute bottom-0 right-0 bg-[#134E4A]/90 text-white text-[9px] font-bold px-1 rounded-tl">
                                  +{photoCount - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-[#E9E9E0] border border-[#D1D1C7] flex items-center justify-center text-[#7A8A7C] shrink-0">
                              <Camera className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[#134E4A] font-mono text-sm">{r.code}</div>
                            {r.presenceStatus === 'not_found' ? (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
                                ⚠️ No localitzat
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#5C6B5E]">{r.date}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Depth */}
                      <td className="px-4 py-4">
                        <div className="text-xs font-semibold text-[#134E4A] flex items-center gap-1 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-[#7A8A7C] shrink-0" />
                          <span>{r.locationName}</span>
                        </div>
                        <div className="text-[11px] text-[#5C6B5E] mt-0.5 font-medium">
                          Fondària: -{r.depthM} m {r.latitude && r.longitude && `(${r.latitude}, ${r.longitude})`}
                        </div>
                        {r.notFoundReason && (
                          <div className="text-[10px] text-amber-800 mt-0.5 italic">
                            {r.notFoundReason}
                          </div>
                        )}
                      </td>

                      {/* Dimensions */}
                      <td className="px-4 py-4">
                        {r.presenceStatus === 'not_found' ? (
                          <span className="text-xs text-[#7A8A7C] italic">Sense dades físiques</span>
                        ) : (
                          <>
                            <div className="text-[#134E4A] font-mono text-xs">
                              {r.dimensions.lengthCm}x{r.dimensions.widthCm}x{r.dimensions.heightCm} cm
                            </div>
                            <div className="text-[11px] text-[#3D5A45] font-medium mt-0.5">
                              Submergit: {r.hydrodynamics?.submergedWeightKg || 0} kg
                            </div>
                          </>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="px-4 py-4">
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                            r.usageStatus === 'in_use'
                              ? 'bg-[#EAF0F4] text-[#204E6B] border border-[#BFD4E2]'
                              : 'bg-[#FAF9F6] text-[#5C6B5E] border border-[#D1D1C7]'
                          }`}
                        >
                          {r.usageStatus === 'in_use' ? 'En ús actiu' : 'En desús'}
                        </span>
                      </td>

                      {/* Score Breakdown */}
                      <td className="px-4 py-4">
                        {r.presenceStatus === 'not_found' ? (
                          <span className="font-mono text-xs text-[#7A8A7C] font-bold">Ø (0 pts)</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 font-mono font-bold text-sm">
                              <span
                                className={
                                  r.result.totalScore < 0
                                    ? 'text-[#2D5A3C]'
                                    : r.result.totalScore <= 4
                                    ? 'text-[#204E6B]'
                                    : r.result.totalScore <= 9
                                    ? 'text-[#7D5B18]'
                                    : 'text-[#8B322C]'
                                }
                              >
                                {r.result.totalScore > 0 ? `+${r.result.totalScore}` : r.result.totalScore}
                              </span>
                              <span className="text-[10px] text-[#7A8A7C] font-normal">pts</span>
                            </div>
                            <div className="text-[10px] text-[#7A8A7C] font-mono">
                              [{r.result.scoresBreakdown.c1_species}, +{r.result.scoresBreakdown.c2_substrate}, +{r.result.scoresBreakdown.c3_dynamism}, {r.result.scoresBreakdown.c4_stability > 0 ? `+${r.result.scoresBreakdown.c4_stability}` : r.result.scoresBreakdown.c4_stability}]
                            </div>
                          </>
                        )}
                      </td>

                      {/* Action Pill */}
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider inline-block ${r.result.badgeClass}`}
                        >
                          {r.result.recommendedAction}
                        </span>
                        <div className="text-[11px] text-[#5C6B5E] mt-1 line-clamp-1">
                          {r.result.categoryTitle}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSendRecordEmail(r)}
                            disabled={sendingEmailId === r.id}
                            className={`p-2 rounded-xl transition ${
                              sentEmailId === r.id
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'hover:bg-[#E9E9E0] text-[#134E4A]'
                            }`}
                            title={`Enviar tota la informació per correu a ${TARGET_NOTIFICATION_EMAIL}`}
                          >
                            {sendingEmailId === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#134E4A]" />
                            ) : sentEmailId === r.id ? (
                              <CheckCircle className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => onSelectRecordForEdit(r)}
                            className="p-2 hover:bg-[#E9E9E0] text-[#134E4A] rounded-xl transition"
                            title="Carregar a la Calculadora per editar o revisar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onPrintRecord(r)}
                            className="p-2 hover:bg-[#E9E9E0] text-[#3D5A45] rounded-xl transition"
                            title="Imprimir Fitxa d'Inspecció Oficial"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleRequestDeleteSingle(r)}
                            className="p-2 hover:bg-red-50 text-red-700 rounded-xl transition"
                            title="Eliminar de l'inventari"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-app Deletion Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        recordsToDelete={deleteModalRecords}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteModalRecords([]);
        }}
      />

    </div>
  );
};
