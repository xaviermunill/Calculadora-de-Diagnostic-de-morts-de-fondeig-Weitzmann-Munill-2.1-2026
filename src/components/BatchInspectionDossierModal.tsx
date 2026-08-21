import React, { useState, useMemo, useEffect } from 'react';
import { MortEvaluationRecord } from '../types';
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
}

export const BatchInspectionDossierModal: React.FC<BatchInspectionDossierModalProps> = ({
  records,
  onClose,
  initialCalaFilter = 'all',
}) => {
  // Extract unique locations/calas
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    records.forEach((r) => {
      if (r.locationName) {
        // Extract base cala name if enclosed in parenthesis or full name
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

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Export Excel of selected
  const handleExportExcel = () => {
    if (reportRecords.length === 0) return;
    exportInventoryToExcel(reportRecords);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#134E4A]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-[#D1D1C7] overflow-hidden print:border-none print:shadow-none print:max-w-full my-auto flex flex-col max-h-[94vh] print:max-h-none">
        
        {/* Top App Bar (Hidden on Print) */}
        <div className="bg-[#134E4A] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0E3B38] rounded-xl text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base sm:text-lg">
                Generador de Dossier i Fitxes d'Inspecció Oficials
              </h2>
              <p className="text-xs text-white/80 font-sans">
                Emissió de fitxes d'inventari per cala, rang de punts o selecció personalitzada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={reportRecords.length === 0}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-full transition shadow-xs"
              title="Exportar la selecció a Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel ({reportRecords.length})</span>
            </button>

            <button
              id="btn-print-batch-dossier"
              onClick={handlePrint}
              disabled={reportRecords.length === 0}
              className="flex items-center gap-1.5 bg-[#FAF9F6] hover:bg-[#E9E9E0] disabled:opacity-50 text-[#134E4A] text-xs font-semibold px-4 py-2 rounded-full transition shadow-xs"
              title="Imprimir o desar en PDF tot el dossier"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF Dossier ({reportRecords.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-[#0E3B38] text-white/80 hover:text-white rounded-full transition"
              title="Tancar generador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration & Filter Panel (Hidden on Print) */}
        <div className="bg-[#FAF9F6] border-b border-[#D1D1C7] p-4 sm:p-5 shrink-0 space-y-4 print:hidden">
          
          {/* Main Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Cala / Location Selector */}
            <div>
              <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
                1. Filtrar per Cala / Zona
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full text-xs bg-white border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-medium focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
              >
                <option value="all">Totes les cales ({records.length} blocs)</option>
                {uniqueLocations.map((loc) => {
                  const count = records.filter((r) => r.locationName === loc).length;
                  return (
                    <option key={loc} value={loc}>
                      {loc} ({count} blocs)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Range Start Code */}
            <div>
              <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
                2. Des del Codi
              </label>
              <select
                value={startCode}
                onChange={(e) => setStartCode(e.target.value)}
                className="w-full text-xs bg-white border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-mono focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
              >
                <option value="">-- Primer registre --</option>
                {records.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} ({r.locationName})
                  </option>
                ))}
              </select>
            </div>

            {/* Range End Code */}
            <div>
              <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
                3. Fins al Codi
              </label>
              <select
                value={endCode}
                onChange={(e) => setEndCode(e.target.value)}
                className="w-full text-xs bg-white border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-mono focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
              >
                <option value="">-- Últim registre --</option>
                {records.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} ({r.locationName})
                  </option>
                ))}
              </select>
            </div>

            {/* Category / Priority Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[#134E4A] uppercase tracking-wider mb-1">
                4. Dictamen / Prioritat
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs bg-white border border-[#D1D1C7] rounded-xl px-3 py-2 text-[#134E4A] font-medium focus:ring-2 focus:ring-[#134E4A] focus:outline-hidden"
              >
                <option value="all">Totes les categories</option>
                <option value="conservation">🟢 Conservar (Refugi / Escull)</option>
                <option value="low_priority">🔵 Prioritat Baixa (Mitigació)</option>
                <option value="medium_priority">🟡 Prioritat Mitjana (Retirada)</option>
                <option value="high_priority">🔴 Prioritat Alta (Retirada urgent)</option>
                <option value="not_found">⚠️ No localitzat / Soterrat</option>
              </select>
            </div>

          </div>

          {/* Quick Selection Actions & Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E9E9E0] text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#134E4A]">
                Seleccionats per al dossier: <strong>{reportRecords.length}</strong> de {records.length} blocs
              </span>
              <button
                onClick={handleSelectAllMatched}
                className="text-[#134E4A] hover:underline font-medium flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Marcar tots els filtrats ({matchedRecords.length})</span>
              </button>
              <button
                onClick={handleDeselectAllMatched}
                className="text-[#7A8A7C] hover:underline font-medium flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Desmarcar</span>
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#5C6B5E]">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                {dossierStats.conservation} Cons.
              </span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold">
                {dossierStats.lowPriority} P.Baixa
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                {dossierStats.mediumPriority} P.Mitj.
              </span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                {dossierStats.highPriority} P.Alta
              </span>
              {dossierStats.notFound > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-bold">
                  {dossierStats.notFound} No Loc.
                </span>
              )}
              <span className="font-mono font-bold text-[#134E4A] ml-2">
                {dossierStats.totalWeightAirTonnes} t formigó
              </span>
            </div>
          </div>

        </div>

        {/* Scrollable Preview Area for Print Document */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 bg-[#F5F5F0] print:bg-white print:p-0 print:space-y-8">
          
          {reportRecords.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-[#5C6B5E] border border-[#D1D1C7] space-y-3">
              <Anchor className="w-12 h-12 text-[#D1D1C7] mx-auto" />
              <h3 className="text-base font-serif font-bold text-[#134E4A]">
                No hi ha cap bloc seleccionat amb aquests filtres
              </h3>
              <p className="text-xs text-[#5C6B5E]">
                Modifica els filtres de cala, rang o categoria a la barra superior per incloure blocs al dossier.
              </p>
            </div>
          ) : (
            <>
              {/* COVER PAGE / EXECUTIVE DOSSIER SUMMARY */}
              <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#D1D1C7] shadow-sm print:border-none print:shadow-none print:p-6 print:break-after-page">
                
                {/* Official Header */}
                <div className="border-b-2 border-[#134E4A] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-[#3D5A45] uppercase tracking-widest font-sans">
                      Generalitat de Catalunya • Departament d'Acció Climàtica, Alimentació i Agenda Rural
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#134E4A] tracking-tight mt-1">
                      DOSSIER OFICIAL D'INSPECCIÓ I DIAGNOSI DE FONDEJOS
                    </h1>
                    <p className="text-xs text-[#5C6B5E] mt-0.5">
                      Avaluació tècnica i ambiental d'estructures artificials (morts de formigó) segons protocol científic
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-[#134E4A]">
                      CAMPANYA: {new Date().getFullYear()}-REST-HABITAT
                    </div>
                    <div className="text-xs text-[#5C6B5E]">Data d'emissió: {new Date().toLocaleDateString('ca-ES')}</div>
                    <div className="text-xs font-semibold text-[#3D5A45]">
                      Àmbit: {selectedLocation === 'all' ? 'Litoral de Catalunya (General)' : selectedLocation}
                    </div>
                  </div>
                </div>

                {/* Scope & Parameter Description */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                  <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-4 rounded-2xl">
                    <span className="text-[11px] font-bold text-[#5C6B5E] uppercase tracking-wider">Zona / Cala</span>
                    <p className="text-base font-serif font-bold text-[#134E4A] mt-1">
                      {selectedLocation === 'all' ? 'Totes les localitzacions' : selectedLocation}
                    </p>
                    <span className="text-xs text-[#7A8A7C]">
                      {selectedLocation === 'all' ? `${uniqueLocations.length} cales avaluades` : 'Sector delimitat'}
                    </span>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-4 rounded-2xl">
                    <span className="text-[11px] font-bold text-[#5C6B5E] uppercase tracking-wider">Rang de Registres</span>
                    <p className="text-base font-serif font-bold text-[#134E4A] font-mono mt-1">
                      {startCode || reportRecords[0]?.code} ➔ {endCode || reportRecords[reportRecords.length - 1]?.code}
                    </p>
                    <span className="text-xs text-[#7A8A7C]">Total: {reportRecords.length} fitxes tècniques</span>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#D1D1C7] p-4 rounded-2xl">
                    <span className="text-[11px] font-bold text-[#5C6B5E] uppercase tracking-wider">Massa de Formigó</span>
                    <p className="text-base font-serif font-bold text-[#134E4A] mt-1">
                      {dossierStats.totalWeightAirTonnes} tones
                    </p>
                    <span className="text-xs text-[#7A8A7C]">
                      Submergit: {dossierStats.totalSubmergedWeightTonnes} t
                    </span>
                  </div>
                </div>

                {/* Executive Breakdown Table */}
                <div className="my-6 space-y-2">
                  <h3 className="font-serif font-bold text-sm text-[#134E4A] uppercase tracking-wider">
                    Resum de Classificació i Dictamen d'Actuació
                  </h3>
                  <div className="border border-[#D1D1C7] rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#E9E9E0] text-[#134E4A] font-bold uppercase font-serif">
                        <tr>
                          <th className="p-3">Categoria del Dictamen</th>
                          <th className="p-3">Llindar de Puntuació</th>
                          <th className="p-3 text-center">Recompte</th>
                          <th className="p-3 text-center">Percentatge</th>
                          <th className="p-3">Mesura Operativa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E9E0]">
                        <tr className="bg-[#EBF3ED]/40">
                          <td className="p-3 font-bold text-[#2D5A3C] flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>NO RETIRAR (Conservar)</span>
                          </td>
                          <td className="p-3 font-mono text-[#5C6B5E]">&lt; 0 punts</td>
                          <td className="p-3 text-center font-bold text-[#2D5A3C] text-sm">{dossierStats.conservation}</td>
                          <td className="p-3 text-center font-semibold text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.conservation / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-3 text-[#5C6B5E]">Integrat a la biocenosi com a escull o microhàbitat.</td>
                        </tr>

                        <tr className="bg-[#EAF0F4]/40">
                          <td className="p-3 font-bold text-[#204E6B] flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>PRIORITAT BAIXA</span>
                          </td>
                          <td className="p-3 font-mono text-[#5C6B5E]">0 a 4 punts</td>
                          <td className="p-3 text-center font-bold text-[#204E6B] text-sm">{dossierStats.lowPriority}</td>
                          <td className="p-3 text-center font-semibold text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.lowPriority / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-3 text-[#5C6B5E]">Mitigació in situ (flotadors, retirada cadena mòbil).</td>
                        </tr>

                        <tr className="bg-[#F8F3E8]/40">
                          <td className="p-3 font-bold text-[#7D5B18] flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>PRIORITAT MITJANA</span>
                          </td>
                          <td className="p-3 font-mono text-[#5C6B5E]">5 a 9 punts</td>
                          <td className="p-3 text-center font-bold text-[#7D5B18] text-sm">{dossierStats.mediumPriority}</td>
                          <td className="p-3 text-center font-semibold text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.mediumPriority / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-3 text-[#5C6B5E]">Retirada programada de bloc inert amb impacte moderat.</td>
                        </tr>

                        <tr className="bg-[#FBF0EE]/40">
                          <td className="p-3 font-bold text-[#8B322C] flex items-center gap-1.5">
                            <AlertOctagon className="w-4 h-4 shrink-0" />
                            <span>PRIORITAT ALTA</span>
                          </td>
                          <td className="p-3 font-mono text-[#5C6B5E]">&ge; 10 punts</td>
                          <td className="p-3 text-center font-bold text-[#8B322C] text-sm">{dossierStats.highPriority}</td>
                          <td className="p-3 text-center font-semibold text-[#5C6B5E]">
                            {reportRecords.length > 0 ? Math.round((dossierStats.highPriority / reportRecords.length) * 100) : 0}%
                          </td>
                          <td className="p-3 text-[#5C6B5E]">Retirada immediata; erosió severa en praderia o risc.</td>
                        </tr>

                        {dossierStats.notFound > 0 && (
                          <tr className="bg-amber-50/40">
                            <td className="p-3 font-bold text-amber-900 flex items-center gap-1.5">
                              <SearchX className="w-4 h-4 shrink-0" />
                              <span>NO LOCALITZATS</span>
                            </td>
                            <td className="p-3 font-mono text-[#5C6B5E]">Ø</td>
                            <td className="p-3 text-center font-bold text-amber-900 text-sm">{dossierStats.notFound}</td>
                            <td className="p-3 text-center font-semibold text-[#5C6B5E]">
                              {Math.round((dossierStats.notFound / reportRecords.length) * 100)}%
                            </td>
                            <td className="p-3 text-[#5C6B5E]">Soterrats per mata, arrossegats o ja extrets.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Synthesis Table of All Selected Points */}
                <div className="my-6 space-y-2">
                  <h3 className="font-serif font-bold text-sm text-[#134E4A] uppercase tracking-wider">
                    Taula de Síntesi Georeferenciada de Blocs ({reportRecords.length} registres)
                  </h3>
                  <div className="border border-[#D1D1C7] rounded-2xl overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-[#E9E9E0] text-[#134E4A] font-bold uppercase font-serif">
                        <tr>
                          <th className="p-2.5">Codi</th>
                          <th className="p-2.5">Localització</th>
                          <th className="p-2.5">Coordenades (Lat, Lng)</th>
                          <th className="p-2.5">Fondària</th>
                          <th className="p-2.5">Estat Ús</th>
                          <th className="p-2.5 text-center">Puntuació</th>
                          <th className="p-2.5">Dictamen Oficial</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E9E9E0]">
                        {reportRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-[#FAF9F6]">
                            <td className="p-2.5 font-bold font-mono text-[#134E4A]">{r.code}</td>
                            <td className="p-2.5 text-[#134E4A] font-medium">{r.locationName}</td>
                            <td className="p-2.5 font-mono text-[#5C6B5E]">
                              {r.latitude && r.longitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'Sense dades'}
                            </td>
                            <td className="p-2.5 font-semibold text-[#134E4A]">-{r.depthM} m</td>
                            <td className="p-2.5 text-[#5C6B5E]">{r.usageStatus === 'in_use' ? 'En ús' : 'En desús'}</td>
                            <td className="p-2.5 text-center font-mono font-bold">
                              {r.presenceStatus === 'not_found' ? (
                                <span className="text-[#7A8A7C]">Ø</span>
                              ) : (
                                <span className={r.result.totalScore < 0 ? 'text-[#2D5A3C]' : r.result.totalScore <= 4 ? 'text-[#204E6B]' : r.result.totalScore <= 9 ? 'text-[#7D5B18]' : 'text-[#8B322C]'}>
                                  {r.result.totalScore > 0 ? `+${r.result.totalScore}` : r.result.totalScore}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${r.result.badgeClass}`}>
                                {r.result.recommendedAction}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cover Signatures */}
                <div className="pt-8 border-t border-[#D1D1C7] grid grid-cols-2 gap-8 text-xs text-[#5C6B5E]">
                  <div>
                    <div className="font-semibold text-[#134E4A]">Responsable Tècnic de la Diagnosi:</div>
                    <div className="mt-8 border-b border-[#D1D1C7] w-48"></div>
                    <div className="mt-1 text-[11px] text-[#7A8A7C]">Signatura i núm. de col·legiat / tècnic</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#134E4A]">Conformitat Autoritat Marítima / Medi Ambient:</div>
                    <div className="mt-8 border-b border-[#D1D1C7] w-48"></div>
                    <div className="mt-1 text-[11px] text-[#7A8A7C]">Segell o Vist-i-plau oficial</div>
                  </div>
                </div>

              </section>

              {/* INDIVIDUAL INSPECTION SHEETS (ONE PER RECORD) */}
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

                return (
                  <section
                    key={record.id}
                    className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D1D1C7] shadow-sm space-y-5 print:border-none print:shadow-none print:p-4 print:break-after-page"
                  >
                    {/* Header */}
                    <div className="border-b-2 border-[#134E4A] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-[#3D5A45] uppercase tracking-widest font-sans">
                          FITXA D'INSPECCIÓ TÈCNICA • BLOC {index + 1} DE {reportRecords.length}
                        </div>
                        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#134E4A] tracking-tight">
                          DIAGNOSI D'ESTRUCTURA SUBMERGIDA: {record.code}
                        </h2>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-[#134E4A] font-mono text-base">{record.code}</div>
                        <div className="text-[11px] text-[#5C6B5E]">Data: {record.date} • Fondària: -{record.depthM} m</div>
                      </div>
                    </div>

                    {/* Official Verdict Banner */}
                    <div className="p-3.5 rounded-2xl border border-[#D1D1C7] bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#5C6B5E] block mb-0.5">
                          Dictamen Oficial del Protocol
                        </span>
                        <div className="text-base sm:text-lg font-serif font-bold text-[#134E4A]">
                          {record.result.recommendedAction}
                        </div>
                        <div className="text-xs text-[#5C6B5E] font-medium">
                          {record.result.categoryTitle} • Suma de puntuació:{' '}
                          <strong>
                            {isNotFound ? 'Ø (Sense puntuació)' : `${record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore} punts`}
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span className={`px-3 py-1 font-bold rounded-lg uppercase text-xs ${record.result.badgeClass}`}>
                          {record.result.recommendedAction}
                        </span>
                      </div>
                    </div>

                    {/* 2-Column Info Grid: Identification & Physical characteristics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div className="border border-[#D1D1C7] rounded-2xl p-3.5 space-y-1.5 bg-[#FAF9F6]">
                        <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                          1. Localització i Paràmetres Operatius
                        </h3>
                        <ul className="space-y-1 text-[#5C6B5E]">
                          <li><strong>Estat de presència:</strong> {isNotFound ? '⚠️ No localitzat / Desaparegut / Soterrat' : '🟢 Localitzat i auditat in situ'}</li>
                          {isNotFound && record.notFoundReason && (
                            <li className="text-amber-900 font-medium"><strong>Motiu diagnòstic:</strong> {record.notFoundReason}</li>
                          )}
                          <li><strong>Ubicació:</strong> {record.locationName}</li>
                          <li><strong>Fondària de fons:</strong> -{record.depthM} metres</li>
                          <li><strong>Estat d'ús:</strong> {record.usageStatus === 'in_use' ? 'En ús actiu' : 'En desús / Abandonat'}</li>
                          <li><strong>Coordenades GPS:</strong> {record.latitude && record.longitude ? `${record.latitude}, ${record.longitude}` : 'No especificades'}</li>
                          <li><strong>Tècnic auditor:</strong> {record.observerName || 'Equip de camp'}</li>
                        </ul>
                      </div>

                      <div className="border border-[#D1D1C7] rounded-2xl p-3.5 space-y-1.5 bg-[#FAF9F6]">
                        <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                          2. Característiques Físiques {record.blocks && record.blocks.length > 1 ? `(${record.blocks.length} Morts)` : 'del Mort'}
                        </h3>
                        {isNotFound ? (
                          <div className="p-2 text-xs text-[#5C6B5E] italic">
                            Sense dimensions registrades per impossibilitat de contacte visual o soterrat complet.
                          </div>
                        ) : record.blocks && record.blocks.length > 1 ? (
                          <div className="space-y-1.5 text-xs text-[#5C6B5E]">
                            <div>Total estructures inspeccionades: <strong>{record.blocks.length}</strong></div>
                            <div className="space-y-1">
                              {record.blocks.map((b, bIdx) => (
                                <div key={b.id || bIdx} className="text-[11px] bg-white p-1.5 rounded border border-[#E9E9E0] flex justify-between items-center">
                                  <span className="font-medium text-[#134E4A]">{b.label || `Mort ${bIdx + 1}`}:</span>
                                  <span className="font-mono">
                                    {b.structureType === 'other_structure' 
                                      ? (b.otherStructure?.customTypeDescription || 'Estructura especial')
                                      : `${b.dimensions.lengthCm}×${b.dimensions.widthCm}×${b.dimensions.heightCm} cm`}
                                  </span>
                                  <span className="font-bold text-[#134E4A]">{b.hydrodynamics?.submergedWeightKg || 0} kg</span>
                                  <span className="text-[10px] px-1 py-0.2 bg-gray-100 rounded">{b.result?.decisionLabel}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : record.structureType === 'other_structure' && record.otherStructure ? (
                          <ul className="space-y-1 text-[#5C6B5E]">
                            <li><strong>Tipologia:</strong> {record.otherStructure.customTypeDescription || "Estructura especial / Altres"}</li>
                            <li><strong>Volum:</strong> {record.otherStructure.estimatedVolumeM3 || record.hydrodynamics?.volumeM3 || 0} m³</li>
                            <li><strong>Pes a l'aire:</strong> {record.otherStructure.estimatedWeightAirKg?.toLocaleString() || record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                            <li><strong>Pes submergit:</strong> {record.otherStructure.estimatedSubmergedWeightKg?.toLocaleString() || record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                            {record.otherStructure.structureNotes && (
                              <li><strong>Notes:</strong> {record.otherStructure.structureNotes}</li>
                            )}
                          </ul>
                        ) : (
                          <ul className="space-y-1 text-[#5C6B5E]">
                            <li>
                              <strong>Dimensions:</strong> {record.dimensions.lengthCm} x {record.dimensions.widthCm} x {record.dimensions.heightCm} cm
                            </li>
                            <li><strong>Volum:</strong> {record.hydrodynamics?.volumeM3 || 0} m³</li>
                            <li><strong>Pes a l'aire:</strong> {record.hydrodynamics?.weightAirKg.toLocaleString() || 0} kg</li>
                            <li><strong>Pes submergit en aigua salada:</strong> {record.hydrodynamics?.submergedWeightKg.toLocaleString() || 0} kg</li>
                            <li><strong>Velocitat crítica u_b:</strong> {record.hydrodynamics?.criticalBottomVelocityUb} m/s</li>
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Scoring Table Breakdown (if located) */}
                    {!isNotFound && (
                      <div className="border border-[#D1D1C7] rounded-2xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-[#E9E9E0] uppercase text-[#134E4A] font-serif font-bold">
                            <tr>
                              <th className="p-2.5">Criteri Avaluat</th>
                              <th className="p-2.5">Estat Observat a la Immersió</th>
                              <th className="p-2.5 text-right">Puntuació</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E9E9E0]">
                            <tr>
                              <td className="p-2.5 font-semibold text-[#134E4A]">1. Espècies amenaçades / protegides</td>
                              <td className="p-2.5 text-[#5C6B5E]">
                                {record.c1_speciesPresence === 'high_coverage_or_protected'
                                  ? 'Cobertura >10% o exemplars protegits'
                                  : record.c1_speciesPresence === 'low_coverage'
                                  ? 'Presència <10% espècies d\'interès'
                                  : record.c1_speciesPresence === 'renaturalized_algal'
                                  ? 'Recobriment algal general'
                                  : 'Absència d\'espècies d\'interès'}
                                {record.c1_speciesNotes && <span className="text-[10px] text-[#2D5A3C] font-medium ml-1">({record.c1_speciesNotes})</span>}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#2D5A3C]">
                                {record.result.scoresBreakdown.c1_species} pts
                              </td>
                            </tr>

                            <tr>
                              <td className="p-2.5 font-semibold text-[#134E4A]">2. Impacte sobre substrat annex</td>
                              <td className="p-2.5 text-[#5C6B5E]">
                                {record.c2_substrateImpact === 'active_erosion_halo'
                                  ? `Halo d'abrasió actiu en praderia (Radi: ${record.c2_haloRadiusM || 0} m)`
                                  : 'Sense abrasió'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#8B322C]">
                                +{record.result.scoresBreakdown.c2_substrate} pts
                              </td>
                            </tr>

                            <tr>
                              <td className="p-2.5 font-semibold text-[#134E4A]">3. Dinamisme i risc (Tamany/fondària)</td>
                              <td className="p-2.5 text-[#5C6B5E]">
                                {record.hydrodynamics?.willSlideInSevereStorm
                                  ? `Risc de lliscament en temporal (Onada: ${record.hydrodynamics.criticalWaveHeightM} m)`
                                  : 'Estable per inèrcia o fondària segura'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#7D5B18]">
                                +{record.result.scoresBreakdown.c3_dynamism} pts
                              </td>
                            </tr>

                            <tr>
                              <td className="p-2.5 font-semibold text-[#134E4A]">4. Estabilitat i integració</td>
                              <td className="p-2.5 text-[#5C6B5E]">
                                {record.c4_stabilityIntegration === 'fixed_by_roots_or_sediment'
                                  ? 'Fixat per rizomes/sediment'
                                  : record.c4_stabilityIntegration === 'not_buried_generates_void'
                                  ? 'No enterrat, retirada crea buit danyós'
                                  : 'Extreta neta sense buit'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-[#134E4A]">
                                {record.result.scoresBreakdown.c4_stability > 0
                                  ? `+${record.result.scoresBreakdown.c4_stability}`
                                  : record.result.scoresBreakdown.c4_stability}{' '}
                                pts
                              </td>
                            </tr>

                            <tr className="bg-[#FAF9F6] font-bold">
                              <td colSpan={2} className="p-2.5 text-[#134E4A] uppercase font-serif">
                                PUNTUACIÓ TOTAL ACUMULADA
                              </td>
                              <td className="p-2.5 text-right font-mono text-sm text-[#134E4A]">
                                {record.result.totalScore > 0 ? `+${record.result.totalScore}` : record.result.totalScore}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Attached Photo Gallery */}
                    {allPhotos.length > 0 && (
                      <div className="border border-[#D1D1C7] rounded-2xl p-3 bg-[#FAF9F6] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Camera className="w-3.5 h-3.5 text-[#134E4A]" />
                            <h3 className="font-serif font-bold text-xs uppercase text-[#134E4A] tracking-wider">
                              Registre Fotogràfic Subaquàtic ({allPhotos.length} imatge{allPhotos.length > 1 ? 's' : ''})
                            </h3>
                          </div>
                          {isLoadingFullRes && !fullResPhotos ? (
                            <span className="text-[10px] text-amber-700 flex items-center gap-1 font-mono print:hidden">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Carregant HD...
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border border-emerald-300 print:hidden">
                              <Sparkles className="w-3 h-3" />
                              Màxima Resolució (HD)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {allPhotos.map((photo, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-[#D1D1C7] bg-black/5 aspect-4/3">
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
                    <div className="space-y-2 text-xs">
                      <div className="border-l-4 border-[#134E4A] pl-3">
                        <h4 className="font-bold text-xs uppercase text-[#134E4A]">Justificació Ecològica</h4>
                        <p className="text-[#5C6B5E] mt-0.5 leading-relaxed">{record.result.ecologicalJustification}</p>
                      </div>

                      <div className="border-l-4 border-[#7D5B18] pl-3">
                        <h4 className="font-bold text-xs uppercase text-[#134E4A]">Mesura Específica de Mitigació</h4>
                        <p className="text-[#5C6B5E] mt-0.5 leading-relaxed font-medium">
                          {record.result.mitigationAction || record.result.operationalRecommendation}
                        </p>
                      </div>

                      {record.generalNotes && (
                        <div className="border-l-4 border-[#7A8A7C] pl-3">
                          <h4 className="font-bold text-xs uppercase text-[#134E4A]">Notes de Camp</h4>
                          <p className="text-[#5C6B5E] mt-0.5 leading-relaxed">{record.generalNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Individual Sheet Sign-off */}
                    <div className="pt-4 border-t border-[#D1D1C7] flex items-center justify-between text-[10px] text-[#7A8A7C]">
                      <span>Validació tècnica: {record.observerName || 'Tècnic Responsable'}</span>
                      <span>Protocol Generalitat de Catalunya • REF: {record.code}</span>
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
