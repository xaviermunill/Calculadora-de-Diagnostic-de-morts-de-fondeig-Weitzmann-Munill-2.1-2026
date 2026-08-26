import React, { useState, useMemo, useEffect } from 'react';
import {
  MortEvaluationRecord,
  SeabedTypeOption,
  PosidoniaDistanceOption,
  getSeabedTypeLabels,
  getPosidoniaDistanceLabels,
  getActiveEvaluatorCriteriaLabels,
} from '../types';
import { exportInventoryToExcel } from '../utils/excelExport';
import { fetchFullPhotosForMultipleRecords } from '../utils/googleDriveService';
import {
  Printer,
  X,
  FileSpreadsheet,
  Filter,
  CheckSquare,
  Square,
  MapPin,
  Anchor,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  SearchX,
  Camera,
  Layers,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface BatchInspectionDossierModalProps {
  records: MortEvaluationRecord[];
  onClose: () => void;
  initialCalaFilter?: string;
  initialSelectedIds?: string[];
}

export const BatchInspectionDossierModal: React.FC<BatchInspectionDossierModalProps> = ({
  records,
  onClose,
  initialCalaFilter = 'all',
  initialSelectedIds,
}) => {
  // Extract unique locations/calas
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    records.forEach((r) => {
      if (r.locationName) {
        locSet.add(r.locationName);
      }
    });
    return Array.from(locSet).sort();
  }, [records]);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>(initialCalaFilter);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startCode, setStartCode] = useState<string>('');
  const [endCode, setEndCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected individual IDs (set of IDs)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return new Set(initialSelectedIds);
    }
    return new Set(records.map((r) => r.id));
  });

  // Filtered records candidate pool based on location, category, range
  const matchedRecords = useMemo(() => {
    let list = [...records];

    // Filter by location
    if (selectedLocation !== 'all') {
      list = list.filter((r) => r.locationName === selectedLocation || r.locationName.includes(selectedLocation));
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'not_found') {
        list = list.filter((r) => r.presenceStatus === 'not_found');
      } else {
        list = list.filter((r) => r.result.category === selectedCategory);
      }
    }

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          (r.observerName && r.observerName.toLowerCase().includes(q))
      );
    }

    // Filter by Range (Start Code to End Code)
    if (startCode || endCode) {
      const startIndex = startCode
        ? list.findIndex((r) => r.code.toLowerCase() === startCode.toLowerCase())
        : 0;
      const endIndex = endCode
        ? list.findIndex((r) => r.code.toLowerCase() === endCode.toLowerCase())
        : list.length - 1;

      if (startIndex >= 0 && endIndex >= 0) {
        const from = Math.min(startIndex, endIndex);
        const to = Math.max(startIndex, endIndex);
        list = list.slice(from, to + 1);
      } else if (startIndex >= 0) {
        list = list.slice(startIndex);
      } else if (endIndex >= 0) {
        list = list.slice(0, endIndex + 1);
      }
    }

    return list;
  }, [records, selectedLocation, selectedCategory, searchTerm, startCode, endCode]);

  // Actual records included in report (matched + selected)
  const reportRecords = useMemo(() => {
    return matchedRecords.filter((r) => selectedIds.has(r.id));
  }, [matchedRecords, selectedIds]);

  // Full-resolution photos cache state for dossier sheets
  const [fullPhotosMap, setFullPhotosMap] = useState<Record<string, string[]>>({});
  const [isLoadingFullRes, setIsLoadingFullRes] = useState<boolean>(false);

  // Fetch full HD photos on demand for the selected dossier records
  useEffect(() => {
    let isMounted = true;
    if (reportRecords.length === 0) return;

    setIsLoadingFullRes(true);
    fetchFullPhotosForMultipleRecords(reportRecords)
      .then((map) => {
        if (isMounted && map) {
          setFullPhotosMap(map);
        }
      })
      .catch((err) => {
        console.warn('Error loading full photos for batch dossier:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingFullRes(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reportRecords]);

  // Bulk toggle for current filtered list
  const handleSelectAllMatched = () => {
    const next = new Set(selectedIds);
    matchedRecords.forEach((r) => next.add(r.id));
    setSelectedIds(next);
  };

  const handleDeselectAllMatched = () => {
    const next = new Set(selectedIds);
    matchedRecords.forEach((r) => next.delete(r.id));
    setSelectedIds(next);
  };

  const handleToggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Metrics for the dossier
  const dossierStats = useMemo(() => {
    const total = reportRecords.length;
    const notFound = reportRecords.filter((r) => r.presenceStatus === 'not_found').length;
    const conservation = reportRecords.filter((r) => r.result.category === 'conservation').length;
    const lowPriority = reportRecords.filter((r) => r.result.category === 'low_priority').length;
    const mediumPriority = reportRecords.filter((r) => r.result.category === 'medium_priority').length;
    const highPriority = reportRecords.filter((r) => r.result.category === 'high_priority').length;

    const totalWeightAirKg = reportRecords.reduce(
      (sum, r) => sum + (r.hydrodynamics?.weightAirKg || 0),
      0
    );
    const totalSubmergedWeightKg = reportRecords.reduce(
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
  }, [reportRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportInventoryToExcel(reportRecords);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#134E4A]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[95vh] flex flex-col shadow-2xl border border-[#D1D1C7] overflow-hidden print:border-none print:shadow-none print:max-w-full print:h-auto print:static my-auto">
        
        {/* Dossier Control Header (Hidden on Print) */}
        <div className="bg-[#134E4A] text-white p-4 sm:p-5 flex flex-col gap-4 border-b border-[#0E3B38] shrink-0 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-300" />
              <div>
                <h2 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                  Dossier de Fitxes d'Inspecció de Morts (1 A4 per Fitxa)
                </h2>
                <p className="text-xs text-[#A3C7BD]">
                  Generador i impressió oficial de fitxes tècniques individuals i dossier conjunt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-export-excel-dossier"
                onClick={handleExportExcel}
                disabled={reportRecords.length === 0}
                className="hidden sm:flex items-center gap-1.5 bg-[#0E3B38] hover:bg-[#1E293B] text-white text-xs font-semibold px-3 py-2 rounded-full transition border border-emerald-800 disabled:opacity-50 cursor-pointer"
                title="Exportar llistat seleccionat a Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>

              <button
                id="btn-print-batch-dossier"
                onClick={handlePrint}
                disabled={reportRecords.length === 0}
                className="flex items-center gap-2 bg-[#F5F5F0] hover:bg-[#E9E9E0] text-[#134E4A] text-xs font-bold px-4 py-2 rounded-full transition shadow-xs disabled:opacity-50 cursor-pointer"
                title="Imprimir el dossier complet o fitxes seleccionades (1 pàgina A4 per mort)"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Dossier ({reportRecords.length} A4)</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-[#0E3B38] text-white/80 hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10 text-xs">
            <div>
              <label className="text-[11px] text-white/70 block mb-1">Filtrar per Cala / Zona</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-[#0E3B38] text-white border border-white/20 rounded-xl px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-400"
              >
                <option value="all">Totes les cales ({records.length} registres)</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-white/70 block mb-1">Filtrar per Dictamen</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#0E3B38] text-white border border-white/20 rounded-xl px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-400"
              >
                <option value="all">Totes les categories</option>
                <option value="conservation">No retirar (Conservació)</option>
                <option value="low_priority">Prioritat Baixa (Mitigació)</option>
                <option value="medium_priority">Prioritat Mitjana (Retirada)</option>
                <option value="high_priority">Prioritat Alta (Immediata)</option>
                <option value="not_found">No localitzat / Soterrat</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-white/70 block mb-1">Cerca ràpida (Codi / Text)</label>
              <input
                type="text"
                placeholder="Ex: BLO-001, cala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0E3B38] text-white border border-white/20 rounded-xl px-2.5 py-1.5 text-xs placeholder:text-white/40"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleSelectAllMatched}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium py-1.5 px-2 rounded-xl transition text-center cursor-pointer"
              >
                Seleccionar tots ({matchedRecords.length})
              </button>
              <button
                onClick={handleDeselectAllMatched}
                className="flex-1 bg-white/5 hover:bg-white/15 text-white/80 text-[11px] font-medium py-1.5 px-2 rounded-xl transition text-center cursor-pointer"
              >
                Desmarcar tots
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Area for Print Document */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 bg-[#F5F5F0] print:bg-white print:p-0 print:space-y-0">
          
          {reportRecords.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-[#5C6B5E] border border-[#D1D1C7] space-y-3">
              <Anchor className="w-12 h-12 text-[#D1D1C7] mx-auto" />
              <h3 className="text-base font-serif font-bold text-[#134E4A]">
                No hi ha cap bloc seleccionat amb aquests filtres
              </h3>
              <p className="text-xs text-[#5C6B5E]">
                Modifica els filtres de cala, rang o cerca a la barra superior per incloure blocs al dossier.
              </p>
            </div>
          ) : (
            <>
              {/* COVER PAGE / EXECUTIVE DOSSIER SUMMARY - 1 A4 Page */}
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D1D1C7] shadow-sm print:border-none print:shadow-none print:p-0 print-a4-page space-y-3">
                
                {/* Official Header */}
                <div className="border-b-2 border-[#134E4A] pb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#3D5A45] uppercase tracking-widest font-sans">
                      Protocol Oficial de Diagnosi • Restauració d'Hàbitats Marins (v3.6)
                    </div>
                    <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#134E4A] tracking-tight leading-tight mt-0.5">
                      DOSSIER OFICIAL D'INSPECCIÓ I DIAGNOSI DE FONDEJOS
                    </h1>
                    <p className="text-[11px] text-[#5C6B5E]">
                      Avaluació tècnica i ambiental d'estructures artificials (morts) segons protocol científic
                    </p>
                  </div>
                  <div className="text-right shrink-0 bg-[#FAF9F6] border border-[#D1D1C7] px-3 py-1 rounded-xl">
                    <div className="text-xs font-mono font-bold text-[#134E4A]">
                      CAMPANYA: {new Date().getFullYear()}-REST-HABITAT
                    </div>
                    <div className="text-[10px] text-[#5C6B5E]">Data: {new Date().toLocaleDateString('ca-ES')}</div>
                    <div className="text-[10px] font-semibold text-[#3D5A45]">
                      Àmbit: {selectedLocation === 'all' ? 'Litoral (General)' : selectedLocation}
                    </div>
                  </div>
                </div>

                {/* Scope & Parameter Description */}
                <div className="grid grid-cols-3 gap-2.5 my-2">
                  <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider">Zona / Cala</span>
                    <p className="text-sm font-serif font-bold text-[#134E4A] mt-0.5 truncate">
                      {selectedLocation === 'all' ? 'Totes les localitzacions' : selectedLocation}
                    </p>
                    <span className="text-[10px] text-[#7A8A7C]">
                      {selectedLocation === 'all' ? `${uniqueLocations.length} zones` : 'Sector delimitat'}
                    </span>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider">Fitxes Incloses</span>
                    <p className="text-sm font-serif font-bold text-[#134E4A] font-mono mt-0.5">
                      {reportRecords.length} estructures
                    </p>
                    <span className="text-[10px] text-[#7A8A7C]">1 A4 per fitxa</span>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider">Massa de Formigó</span>
                    <p className="text-sm font-serif font-bold text-[#134E4A] mt-0.5">
                      {dossierStats.totalWeightAirTonnes} tones
                    </p>
                    <span className="text-[10px] text-[#7A8A7C]">
                      Submergit: {dossierStats.totalSubmergedWeightTonnes} t
                    </span>
                  </div>
                </div>

                {/* Executive Breakdown Table */}
                <div className="space-y-1.5">
                  <h3 className="font-serif font-bold text-xs text-[#134E4A] uppercase tracking-wider">
                    Resum de Classificació i Dictamen d'Actuació
                  </h3>
                  <div className="border border-[#D1D1C7] rounded-xl overflow-hidden">
                    <table className="w-full text-[10.5px] text-left">
                      <thead className="bg-[#E9E9E0] text-[#134E4A] font-bold uppercase font-serif text-[10px]">
                        <tr>
                          <th className="p-2">Categoria del Dictamen</th>
                          <th className="p-2">Llindar de Puntuació</th>
                          <th className="p-2 text-center">Recompte</th>
                          <th className="p-2 text-center">Percentatge</th>
                          <th className="p-2">Mesura Operativa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E9E0]">
                        <tr className="bg-[#EBF3ED]/40">
                          <td className="p-2 font-bold text-[#2D5A3C] flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>NO RETIRAR (Conservar)</span>
                          </td>
                          <td className="p-2 font-mono text-[#5C6B5E]">&lt; 0 punts</td>
                          <td className="p-2 text-center font-bold text-[#2D5A3C] text-xs">{dossierStats.conservation}</td>
                          <td className="p-2 text-center text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.conservation / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-2 text-[#5C6B5E]">Preservació in situ (biodiversitat / integració)</td>
                        </tr>

                        <tr className="bg-[#EEF5F8]/40">
                          <td className="p-2 font-bold text-[#204E6B] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>PRIORITAT BAIXA (Mitigació)</span>
                          </td>
                          <td className="p-2 font-mono text-[#5C6B5E]">0 a 4 punts</td>
                          <td className="p-2 text-center font-bold text-[#204E6B] text-xs">{dossierStats.lowPriority}</td>
                          <td className="p-2 text-center text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.lowPriority / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-2 text-[#5C6B5E]">Retirada de cadenes / mitigació in situ</td>
                        </tr>

                        <tr className="bg-[#FDF6E2]/40">
                          <td className="p-2 font-bold text-[#7D5B18] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>PRIORITAT MITJANA (Retirada)</span>
                          </td>
                          <td className="p-2 font-mono text-[#5C6B5E]">5 a 9 punts</td>
                          <td className="p-2 text-center font-bold text-[#7D5B18] text-xs">{dossierStats.mediumPriority}</td>
                          <td className="p-2 text-center text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.mediumPriority / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-2 text-[#5C6B5E]">Retirada planificada segons disponibilitat</td>
                        </tr>

                        <tr className="bg-[#FBF0EE]/40">
                          <td className="p-2 font-bold text-[#8B322C] flex items-center gap-1.5">
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                            <span>PRIORITAT ALTA (Immediata)</span>
                          </td>
                          <td className="p-2 font-mono text-[#5C6B5E]">≥ 10 punts</td>
                          <td className="p-2 text-center font-bold text-[#8B322C] text-xs">{dossierStats.highPriority}</td>
                          <td className="p-2 text-center text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.highPriority / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-2 text-[#5C6B5E]">Extracció urgent amb globus d'elevació</td>
                        </tr>

                        {dossierStats.notFound > 0 && (
                          <tr className="bg-[#FFFBEB]/40">
                            <td className="p-2 font-bold text-amber-900 flex items-center gap-1.5">
                              <SearchX className="w-3.5 h-3.5 shrink-0" />
                              <span>NO LOCALITZAT / SOTERRAT</span>
                            </td>
                            <td className="p-2 font-mono text-[#5C6B5E]">N/A</td>
                            <td className="p-2 text-center font-bold text-amber-900 text-xs">{dossierStats.notFound}</td>
                            <td className="p-2 text-center text-[#5C6B5E]">
                              {reportRecords.length > 0 ? Math.round((dossierStats.notFound / reportRecords.length) * 100) : 0}%
                            </td>
                            <td className="p-2 text-[#5C6B5E]">Revisió batimètrica o baixa del cens</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Index of Included Records (compact table) */}
                <div className="space-y-1.5">
                  <h3 className="font-serif font-bold text-xs text-[#134E4A] uppercase tracking-wider">
                    Índex de Blocs Inclosos en el Present Dossier ({reportRecords.length})
                  </h3>
                  <div className="border border-[#D1D1C7] rounded-xl overflow-hidden max-h-56 print:max-h-none">
                    <table className="w-full text-[10px] text-left">
                      <thead className="bg-[#E9E9E0] text-[#134E4A] font-bold">
                        <tr>
                          <th className="p-1.5">#</th>
                          <th className="p-1.5">Codi</th>
                          <th className="p-1.5">Cala / Ubicació</th>
                          <th className="p-1.5 text-right">Fondària</th>
                          <th className="p-1.5 text-right">Pes Subm.</th>
                          <th className="p-1.5 text-center">Punts</th>
                          <th className="p-1.5">Dictamen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E9E0] bg-white">
                        {reportRecords.slice(0, 16).map((r, idx) => (
                          <tr key={r.id}>
                            <td className="p-1 text-[#7A8A7C] font-mono">{idx + 1}</td>
                            <td className="p-1 font-mono font-bold text-[#134E4A]">{r.code}</td>
                            <td className="p-1 text-[#5C6B5E] truncate max-w-40">{r.locationName}</td>
                            <td className="p-1 text-right font-mono">-{r.depthM} m</td>
                            <td className="p-1 text-right font-mono font-semibold">{r.hydrodynamics?.submergedWeightKg || 0} kg</td>
                            <td className="p-1 text-center font-mono font-bold">
                              {r.presenceStatus === 'not_found' ? 'Ø' : (r.result.totalScore > 0 ? `+${r.result.totalScore}` : r.result.totalScore)}
                            </td>
                            <td className="p-1">
                              <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${r.result.badgeClass}`}>
                                {r.result.recommendedAction}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportRecords.length > 16 && (
                    <div className="text-[10px] text-[#7A8A7C] italic text-right print:hidden">
                      + {reportRecords.length - 16} fitxes addicionals incloses a continuació...
                    </div>
                  )}
                </div>

                {/* Cover Signatures */}
                <div className="pt-3 border-t border-[#D1D1C7] grid grid-cols-2 gap-8 text-[10px] text-[#5C6B5E] mt-auto">
                  <div>
                    <div className="font-semibold text-[#134E4A]">Responsable Tècnic de la Diagnosi:</div>
                    <div className="mt-4 border-b border-[#D1D1C7] w-44"></div>
                    <div className="mt-0.5 text-[9px] text-[#7A8A7C]">Signatura i núm. de col·legiat / tècnic</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#134E4A]">Conformitat Autoritat Ambiental / Marítima:</div>
                    <div className="mt-4 border-b border-[#D1D1C7] w-44"></div>
                    <div className="mt-0.5 text-[9px] text-[#7A8A7C]">Segell o Vist-i-plau oficial</div>
                  </div>
                </div>

              </section>

              {/* INDIVIDUAL INSPECTION SHEETS (EXACTLY 1 A4 PAGE PER RECORD) */}
              {reportRecords.map((record, index) => {
                const isNotFound = record.presenceStatus === 'not_found';
                const fullResPhotos = fullPhotosMap[record.id];
                const allPhotos =
                  fullResPhotos && fullResPhotos.length > 0
                    ? fullResPhotos
                    : record.photos && record.photos.length > 0
                    ? record.photos
                    : record.thumbnails && record.thumbnails.length > 0
                    ? record.thumbnails
                    : record.photoUrl
                    ? [record.photoUrl]
                    : [];

                const recordSeabedTypes = record.seabedTypes && record.seabedTypes.length > 0
                  ? record.seabedTypes
                  : (record.blocks?.flatMap((b) => b.seabedTypes || []).filter(Boolean) || []);
                const uniqueRecordSeabedTypes = Array.from(new Set(recordSeabedTypes)) as SeabedTypeOption[];

                const recordPosidoniaDistances = record.posidoniaDistances && record.posidoniaDistances.length > 0
                  ? record.posidoniaDistances
                  : (record.blocks?.flatMap((b) => b.posidoniaDistances || []).filter(Boolean) || []);
                const uniqueRecordPosidoniaDistances = Array.from(new Set(recordPosidoniaDistances)) as PosidoniaDistanceOption[];

                const recordEvaluatorCriteriaLabels = record.evaluatorCriteria
                  ? getActiveEvaluatorCriteriaLabels(record.evaluatorCriteria)
                  : (record.blocks?.flatMap((b) => (b.evaluatorCriteria ? getActiveEvaluatorCriteriaLabels(b.evaluatorCriteria) : [])).filter(Boolean) || []);
                const uniqueRecordEvaluatorCriteriaLabels = Array.from(new Set(recordEvaluatorCriteriaLabels));

                return (
                  <section
                    key={record.id}
                    className="bg-white rounded-3xl p-5 sm:p-8 border border-[#D1D1C7] shadow-sm space-y-3.5 print:border-none print:shadow-none print:p-0 print-a4-page"
                  >
                    {/* Header */}
                    <div className="border-b-2 border-[#134E4A] pb-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-[#3D5A45] uppercase tracking-widest font-sans">
                          FITXA D'INSPECCIÓ TÈCNICA • BLOC {index + 1} DE {reportRecords.length} (v3.6)
                        </div>
                        <h2 className="text-base sm:text-lg font-serif font-bold text-[#134E4A] tracking-tight leading-snug">
                          DIAGNOSI D'ESTRUCTURA SUBMERGIDA: {record.code}
                        </h2>
                      </div>
                      <div className="text-right shrink-0 bg-[#FAF9F6] border border-[#D1D1C7] px-3 py-1 rounded-xl">
                        <div className="font-bold text-[#134E4A] font-mono text-sm leading-tight">{record.code}</div>
                        <div className="text-[10px] text-[#5C6B5E]">Data: {record.date} • Fondària: -{record.depthM} m</div>
                      </div>
                    </div>

                    {/* Official Verdict Banner */}
                    <div className="p-2.5 px-3.5 rounded-xl border border-[#D1D1C7] bg-[#FAF9F6] flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#5C6B5E] block mb-0.5 leading-none">
                          Dictamen Oficial del Protocol
                        </span>
                        <div className="text-base font-serif font-bold text-[#134E4A] leading-tight">
                          {record.result.recommendedAction}
                        </div>
                        <div className="text-[11px] text-[#5C6B5E] font-medium flex items-center gap-2 mt-0.5">
                          <span>{record.result.categoryTitle} • Suma:{' '}
                            <strong>
                              {isNotFound ? 'Ø (Sense punts)' : `${record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore} pts`}
                            </strong>
                          </span>
                          {record.result.casuistica128Id && (
                            <span className="px-1.5 py-0.2 rounded bg-[#134E4A]/10 text-[#134E4A] font-bold font-mono text-[10px]">
                              Casuística #{record.result.casuistica128Id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`px-2.5 py-1 font-bold rounded-lg uppercase text-xs ${record.result.badgeClass}`}>
                          {record.result.recommendedAction}
                        </span>
                      </div>
                    </div>

                    {/* 2-Column Info Grid */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="border border-[#D1D1C7] rounded-xl p-2.5 space-y-1 bg-[#FAF9F6]">
                        <h3 className="font-serif font-bold text-[10px] uppercase text-[#134E4A] tracking-wider border-b border-[#E9E9E0] pb-1">
                          1. Localització i Paràmetres Operatius
                        </h3>
                        <ul className="space-y-0.5 text-[10.5px] text-[#5C6B5E]">
                          <li><strong>Estat presència:</strong> {isNotFound ? '⚠️ No localitzat / Soterrat' : '🟢 Localitzat in situ'}</li>
                          {isNotFound && record.notFoundReason && (
                            <li className="text-amber-900 font-medium"><strong>Motiu:</strong> {record.notFoundReason}</li>
                          )}
                          <li><strong>Ubicació:</strong> {record.locationName}</li>
                          <li><strong>Fondària:</strong> -{record.depthM} metres</li>
                          <li><strong>Estat d'ús:</strong> {record.usageStatus === 'in_use' ? 'En ús actiu' : 'En desús / Abandonat'}</li>
                          <li><strong>GPS:</strong> {record.latitude && record.longitude ? `${record.latitude.toFixed(5)}°N, ${record.longitude.toFixed(5)}°E` : 'No especificat'}</li>
                          <li><strong>Auditor:</strong> {record.observerName || 'Equip de camp'}</li>
                          {uniqueRecordSeabedTypes.length > 0 && (
                            <li>
                              <strong>Tipus de Fons:</strong>{' '}
                              <span className="font-semibold text-emerald-950">
                                {getSeabedTypeLabels(uniqueRecordSeabedTypes).join(', ')}
                              </span>
                            </li>
                          )}
                          {uniqueRecordPosidoniaDistances.length > 0 && (
                            <li>
                              <strong>Distància a Posidònia:</strong>{' '}
                              <span className="font-semibold text-teal-950">
                                {getPosidoniaDistanceLabels(uniqueRecordPosidoniaDistances).join(', ')}
                              </span>
                            </li>
                          )}
                          {uniqueRecordEvaluatorCriteriaLabels.length > 0 && (
                            <li>
                              <strong>Criteri Avaluador:</strong>{' '}
                              <span className="font-semibold text-sky-950">
                                {uniqueRecordEvaluatorCriteriaLabels.join(' + ')}
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="border border-[#D1D1C7] rounded-xl p-2.5 space-y-1 bg-[#FAF9F6]">
                        <h3 className="font-serif font-bold text-[10px] uppercase text-[#134E4A] tracking-wider border-b border-[#E9E9E0] pb-1">
                          2. Característiques Físiques {record.blocks && record.blocks.length > 1 ? `(${record.blocks.length} Morts)` : 'del Mort'}
                        </h3>
                        {isNotFound ? (
                          <div className="p-2 text-[10px] text-[#5C6B5E] italic">
                            Sense dimensions registrades per no contacte visual.
                          </div>
                        ) : record.blocks && record.blocks.length > 1 ? (
                          <div className="space-y-1">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[10px] border border-[#D1D1C7] rounded-md">
                                <thead className="bg-[#E9E9E0] text-[#134E4A]">
                                  <tr>
                                    <th className="p-1">Mort</th>
                                    <th className="p-1">Dimensions</th>
                                    <th className="p-1 text-right">Pes Subm.</th>
                                    <th className="p-1 text-center">Punts</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E5DF] bg-white">
                                  {record.blocks.map((b, bIdx) => (
                                    <tr key={b.id || bIdx}>
                                      <td className="p-1 font-medium">{b.label || `M${bIdx + 1}`}</td>
                                      <td className="p-1 font-mono text-[9px]">
                                        {b.structureType === 'other_structure' 
                                          ? (b.otherStructure?.customTypeDescription || 'Especial')
                                          : `${b.dimensions.lengthCm}×${b.dimensions.widthCm}×${b.dimensions.heightCm}`}
                                      </td>
                                      <td className="p-1 text-right font-mono font-semibold">{b.hydrodynamics?.submergedWeightKg || 0} kg</td>
                                      <td className="p-1 text-center font-mono font-bold">
                                        {b.result ? (b.result.totalScore > 0 ? `+${b.result.totalScore}` : b.result.totalScore) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : record.structureType === 'other_structure' && record.otherStructure ? (
                          <ul className="space-y-0.5 text-[10.5px] text-[#5C6B5E]">
                            <li><strong>Tipologia:</strong> {record.otherStructure.customTypeDescription || "Estructura especial"}</li>
                            <li><strong>Volum:</strong> {record.otherStructure.estimatedVolumeM3 || record.hydrodynamics?.volumeM3 || 0} m³</li>
                            <li><strong>Pes submergit:</strong> {record.otherStructure.estimatedSubmergedWeightKg?.toLocaleString() || record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                            {record.otherStructure.structureNotes && (
                              <li className="truncate"><strong>Notes:</strong> {record.otherStructure.structureNotes}</li>
                            )}
                          </ul>
                        ) : (
                          <ul className="space-y-0.5 text-[10.5px] text-[#5C6B5E]">
                            <li>
                              <strong>Dimensions:</strong> {record.dimensions.lengthCm} × {record.dimensions.widthCm} × {record.dimensions.heightCm} cm
                            </li>
                            <li><strong>Volum:</strong> {record.hydrodynamics?.volumeM3 || 0} m³ &nbsp;|&nbsp; <strong>Pes aire:</strong> {record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                            <li><strong>Pes submergit:</strong> {record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                            <li><strong>Velocitat crítica u_b:</strong> {record.hydrodynamics?.criticalBottomVelocityUb} m/s</li>
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Criteria Scoring Breakdown */}
                    {!isNotFound && (
                      <div className="border border-[#D1D1C7] rounded-xl overflow-hidden">
                        <table className="w-full text-[10.5px] text-left">
                          <thead className="bg-[#E9E9E0] text-[#134E4A] font-bold uppercase font-serif text-[10px]">
                            <tr>
                              <th className="p-1.5 px-2.5">Criteri Avaluat</th>
                              <th className="p-1.5 px-2.5">Estat Observat a la Immersió</th>
                              <th className="p-1.5 px-2.5 text-right">Puntuació</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E9E9E0]">
                            <tr>
                              <td className="p-1.5 px-2.5 font-semibold text-[#134E4A] w-1/3">1. Espècies amenaçades</td>
                              <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                                {record.c1_speciesPresence === 'high_coverage_or_protected'
                                  ? 'Cobertura >10% o espècies protegides'
                                  : record.c1_speciesPresence === 'low_coverage'
                                  ? 'Presència <10% espècies d\'interès'
                                  : record.c1_speciesPresence === 'renaturalized_algal'
                                  ? 'Recobriment algal / renaturalitzat'
                                  : 'Absència d\'espècies d\'interès'}
                                {record.c1_speciesNotes && <span className="text-[9.5px] text-[#2D5A3C] font-medium ml-1">({record.c1_speciesNotes})</span>}
                              </td>
                              <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#2D5A3C]">
                                {record.result.scoresBreakdown.c1_species} pts
                              </td>
                            </tr>

                            <tr>
                              <td className="p-1.5 px-2.5 font-semibold text-[#134E4A]">2. Impacte sobre substrat</td>
                              <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                                {record.c2_substrateImpact === 'active_erosion_halo'
                                  ? `Ferida/calva activa (Superfície: ${record.c2_abrasionAreaM2 ?? record.c2_haloRadiusM ?? 0} m²)`
                                  : 'Absència d\'abrasió activa'}
                              </td>
                              <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#8B322C]">
                                +{record.result.scoresBreakdown.c2_substrate} pts
                              </td>
                            </tr>

                            <tr>
                              <td className="p-1.5 px-2.5 font-semibold text-[#134E4A]">3. Dinamisme i risc</td>
                              <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                                {record.hydrodynamics?.willSlideInSevereStorm
                                  ? `Risc de lliscament (Onada: ${record.hydrodynamics.criticalWaveHeightM} m)`
                                  : 'Estable per inèrcia hidrodinàmica'}
                              </td>
                              <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#7D5B18]">
                                +{record.result.scoresBreakdown.c3_dynamism} pts
                              </td>
                            </tr>

                            <tr>
                              <td className="p-1.5 px-2.5 font-semibold text-[#134E4A]">4. Estabilitat i integració</td>
                              <td className="p-1.5 px-2.5 text-[#5C6B5E]">
                                {record.c4_stabilityIntegration === 'fixed_by_roots_or_sediment'
                                  ? 'Fixat per rizomes/sediment'
                                  : record.c4_stabilityIntegration === 'not_buried_generates_void'
                                  ? 'No enterrat, retirada crea buit danyós'
                                  : record.c4_stabilityIntegration === 'not_buried_no_void'
                                  ? 'No enterrat, retirada neta possible'
                                  : 'Estable'}
                              </td>
                              <td className="p-1.5 px-2.5 text-right font-mono font-bold text-[#134E4A]">
                                {record.result.scoresBreakdown.c4_stability > 0
                                  ? `+${record.result.scoresBreakdown.c4_stability}`
                                  : record.result.scoresBreakdown.c4_stability}{' '}
                                pts
                              </td>
                            </tr>

                            <tr className="bg-[#FAF9F6] font-bold">
                              <td colSpan={2} className="p-1.5 px-2.5 text-[#134E4A] uppercase font-serif text-[10px]">
                                PUNTUACIÓ TOTAL ACUMULADA
                              </td>
                              <td className="p-1.5 px-2.5 text-right font-mono text-xs text-[#134E4A]">
                                {record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Attached Photo Gallery - strictly sized for A4 */}
                    {allPhotos.length > 0 && (
                      <div className="border border-[#D1D1C7] rounded-xl p-2 bg-[#FAF9F6] space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#134E4A]" />
                            <h3 className="font-serif font-bold text-[10px] uppercase text-[#134E4A] tracking-wider">
                              Registre Fotogràfic Subaquàtic ({allPhotos.length} imatge{allPhotos.length > 1 ? 's' : ''})
                            </h3>
                          </div>
                          {isLoadingFullRes && !fullResPhotos ? (
                            <span className="text-[9px] text-amber-700 flex items-center gap-1 font-mono print:hidden">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Carregant HD...
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-full font-mono font-bold flex items-center gap-1 border border-emerald-300 print:hidden">
                              <Sparkles className="w-2.5 h-2.5" />
                              HD
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1.5">
                          {allPhotos.slice(0, 4).map((photo, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-[#D1D1C7] bg-black/5 aspect-4/3 max-h-24 print:max-h-18 print:h-18">
                              <img
                                src={photo}
                                alt={`Foto ${idx + 1} - ${record.code}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Operational Recommendations & Notes */}
                    <div className="space-y-1 text-[10.5px]">
                      <div className="border-l-3 border-[#134E4A] pl-2">
                        <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Justificació Ecològica</h4>
                        <p className="text-[#5C6B5E] leading-tight mt-0.5">{record.result.ecologicalJustification}</p>
                      </div>

                      <div className="border-l-3 border-[#7D5B18] pl-2">
                        <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Mesura Específica de Mitigació</h4>
                        <p className="text-[#5C6B5E] leading-tight mt-0.5 font-medium">
                          {record.result.mitigationAction || record.result.operationalRecommendation}
                        </p>
                      </div>

                      {record.generalNotes && (
                        <div className="border-l-3 border-[#7A8A7C] pl-2">
                          <h4 className="font-bold text-[10px] uppercase text-[#134E4A]">Notes de Camp</h4>
                          <p className="text-[#5C6B5E] leading-tight mt-0.5">{record.generalNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Individual Sheet Sign-off */}
                    <div className="pt-2.5 border-t border-[#D1D1C7] flex items-center justify-between text-[9.5px] text-[#7A8A7C] mt-auto">
                      <span>Validació tècnica: {record.observerName || 'Tècnic Responsable'}</span>
                      <span>Protocol Oficial de Diagnosi • REF: {record.code}</span>
                    </div>

                  </section>
                );
              })}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
